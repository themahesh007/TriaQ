require("dotenv").config();
const express = require("express");
const cors = require("cors");
const storage = require("./services/storage");
const { evaluateRisk } = require("./rules/riskEngine");
const { detectMissingInfo } = require("./rules/missingInfoEngine");
const { getFollowUpQuestions } = require("./rules/followUpEngine");
const { processReportImage } = require("./services/ocrService");
const { generateSummary, evaluateRiskWithAI } = require("./services/llmService");

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

// Middleware
app.use(cors({
  origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN.split(","),
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  credentials: true
}));

// Body parser with 15MB limit for Base64 report images
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "TriaQ Backend API", timestamp: new Date() });
});

/**
 * POST /api/patients
 * Creates an anonymized patient token for one intake session
 */
app.post("/api/patients", async (req, res) => {
  try {
    const patient = await storage.createPatient();
    return res.status(201).json({
      id: patient.id,
      tokenId: patient.tokenId,
      createdAt: patient.createdAt
    });
  } catch (error) {
    console.error("Error creating patient:", error);
    return res.status(500).json({ error: "Failed to create patient session" });
  }
});

/**
 * POST /api/triage-notes
 * Submits raw symptom text, runs rules engines & OCR, and produces a triage note
 */
app.post("/api/triage-notes", async (req, res) => {
  try {
    const { patientId, symptomText, additionalAnswers = [], language = "en", reportImageBase64, vitals } = req.body;

    if (!patientId || typeof patientId !== "string") {
      return res.status(400).json({ error: "patientId is required" });
    }
    if (!symptomText || typeof symptomText !== "string") {
      return res.status(400).json({ error: "symptomText is required" });
    }

    // Build safety evaluation context from both primary symptoms and answered questions
    const answersText = Array.isArray(additionalAnswers)
      ? additionalAnswers.map(a => `${a.question || ""} ${a.answer || ""}`).join(" ")
      : "";
    const combinedEvaluationText = `${symptomText} ${answersText}`.trim();

    // Optional OCR on lab report image
    let extractedReportData = null;
    if (reportImageBase64) {
      extractedReportData = await processReportImage(reportImageBase64);
    }

    // 1. AI-assisted clinical urgency evaluation with deterministic safety fallback (including vitals)
    const riskResult = await evaluateRiskWithAI(symptomText, language, additionalAnswers, evaluateRisk, vitals);
    const riskTag = riskResult.riskTag;
    const matchedRiskKeywords = riskResult.matchedRiskKeywords;

    // 2. Missing info detection (multilingual) - checks both symptom text and answered questions
    const missingInfo = detectMissingInfo(combinedEvaluationText, language);

    // 3. Follow-up questions (intelligent clinical analysis based on symptoms & gaps)
    const followUpQuestions = getFollowUpQuestions(riskTag, language, combinedEvaluationText);

    // 4. Summarizer: outputs ONLY actual patient symptoms and answered questions without bulky boilerplate
    const summary = await generateSummary(symptomText, language, additionalAnswers);

    // 5. Store as PENDING with vitals
    const note = await storage.createTriageNote({
      patientId,
      rawSymptomText: symptomText.trim(),
      language,
      summary,
      vitals: vitals || null,
      riskTag,
      matchedRiskKeywords,
      missingInfo,
      followUpQuestions,
      extractedReportData
    });

    return res.status(201).json(note);
  } catch (error) {
    console.error("Error processing triage note:", error);
    return res.status(500).json({ error: "Failed to process triage note" });
  }
});

/**
 * GET /api/triage-notes?status=PENDING
 * Returns triage notes, sorted RED -> AMBER -> GREEN, newest first
 */
app.get("/api/triage-notes", async (req, res) => {
  try {
    const status = req.query.status;
    if (status && status !== "PENDING") {
      // In this version, only PENDING queue is queried directly
    }
    const notes = await storage.getPendingNotes();
    return res.json(notes);
  } catch (error) {
    console.error("Error fetching triage notes:", error);
    return res.status(500).json({ error: "Failed to fetch triage notes" });
  }
});

/**
 * GET /api/triage-notes/:id
 * Returns one full TriageNote
 */
app.get("/api/triage-notes/:id", async (req, res) => {
  try {
    const note = await storage.getNoteById(req.params.id);
    if (!note) {
      return res.status(404).json({ error: "Triage note not found" });
    }
    return res.json(note);
  } catch (error) {
    console.error("Error fetching triage note by ID:", error);
    return res.status(500).json({ error: "Failed to fetch triage note" });
  }
});

/**
 * PATCH /api/triage-notes/:id
 * Reviewer decision: APPROVE, EDIT_APPROVE, or REJECT with optional prescription and disposition
 */
app.patch("/api/triage-notes/:id", async (req, res) => {
  try {
    const { action, editedSummary, reviewerId, note: comment, prescription, disposition } = req.body;

    if (!action || !["APPROVE", "EDIT_APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ error: "action must be one of: APPROVE, EDIT_APPROVE, REJECT" });
    }
    if (!reviewerId || typeof reviewerId !== "string") {
      return res.status(400).json({ error: "reviewerId is required" });
    }

    const updatedNote = await storage.updateNoteAction(req.params.id, {
      action,
      editedSummary,
      reviewerId,
      note: comment,
      prescription,
      disposition
    });

    if (!updatedNote) {
      return res.status(404).json({ error: "Triage note not found" });
    }

    return res.json(updatedNote);
  } catch (error) {
    console.error("Error updating triage note:", error);
    return res.status(500).json({ error: "Failed to update triage note" });
  }
});

/**
 * GET /api/export-csv
 * Exports daily triage registry as standard CSV
 */
app.get("/api/export-csv", async (req, res) => {
  try {
    const notes = await storage.getAllNotes();
    const headers = [
      "Token ID",
      "Created At",
      "Status",
      "Risk Tag",
      "Language",
      "BP (mmHg)",
      "Pulse (bpm)",
      "SpO2 (%)",
      "Temp (F)",
      "Symptoms Summary",
      "Disposition",
      "Prescription",
      "Reviewer ID"
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""').replace(/\n/g, ' ');
      return `"${str}"`;
    };

    const rows = notes.map(n => [
      escapeCsv(n.patient?.tokenId || n.tokenId || "Patient"),
      escapeCsv(new Date(n.createdAt).toLocaleString()),
      escapeCsv(n.status),
      escapeCsv(n.riskTag),
      escapeCsv(n.language),
      escapeCsv(n.vitals ? `${n.vitals.bpSystolic || '-'}/${n.vitals.bpDiastolic || '-'}` : "-"),
      escapeCsv(n.vitals?.pulse || "-"),
      escapeCsv(n.vitals?.spo2 || "-"),
      escapeCsv(n.vitals?.temp || "-"),
      escapeCsv(n.summary || n.rawSymptomText),
      escapeCsv(n.disposition || "-"),
      escapeCsv(n.prescription || "-"),
      escapeCsv(n.auditLogs?.[0]?.reviewerId || "-")
    ].join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    const dateStr = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="triaq_daily_registry_${dateStr}.csv"`);
    return res.send(csvContent);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    return res.status(500).json({ error: "Failed to export CSV registry" });
  }
});

/**
 * GET /api/audit-log
 * Returns audit log entries, newest first
 */
app.get("/api/audit-log", async (req, res) => {
  try {
    const limit = req.query.limit || 50;
    const logs = await storage.getAuditLogs(limit);
    return res.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return res.status(500).json({ error: "Failed to fetch audit log entries" });
  }
});

// Start listening if not imported as module
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[TriaQ API] Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
