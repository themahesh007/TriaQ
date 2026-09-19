let prisma = null;
let usePrisma = false;

if (process.env.DATABASE_URL) {
  try {
    const { PrismaClient } = require("@prisma/client");
    prisma = new PrismaClient();
    usePrisma = true;
  } catch (err) {
    console.warn("Notice: PrismaClient not generated or database not ready, using memory store:", err.message);
    usePrisma = false;
  }
}

// In-memory / local fallback store
const memoryStore = {
  patients: [],
  triageNotes: [],
  auditLogs: []
};

let tokenCounter = 10;

const RISK_PRIORITY = {
  RED: 1,
  AMBER: 2,
  YELLOW: 2,
  GREEN: 3
};

function generateCuid() {
  return "c" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
}

/**
 * Storage interface supporting both Prisma (PostgreSQL) and zero-config local fallback
 */
const storage = {
  async createPatient() {
    tokenCounter += 1;
    const tokenId = `Ward-${tokenCounter}`;

    if (usePrisma && prisma) {
      try {
        return await prisma.patient.create({
          data: { tokenId }
        });
      } catch (err) {
        console.warn("Prisma createPatient failed, falling back to memory:", err.message);
      }
    }

    const patient = {
      id: generateCuid(),
      tokenId,
      createdAt: new Date()
    };
    memoryStore.patients.push(patient);
    return patient;
  },

  async findPatientById(id) {
    if (usePrisma && prisma) {
      try {
        return await prisma.patient.findUnique({ where: { id } });
      } catch (err) {
        // fallback
      }
    }
    return memoryStore.patients.find(p => p.id === id) || null;
  },

  async createTriageNote(data) {
    if (usePrisma && prisma) {
      try {
        return await prisma.triageNote.create({
          data: {
            patientId: data.patientId,
            rawSymptomText: data.rawSymptomText,
            language: data.language || "en",
            summary: data.summary,
            riskTag: data.riskTag,
            matchedRiskKeywords: data.matchedRiskKeywords || [],
            missingInfo: data.missingInfo || [],
            followUpQuestions: data.followUpQuestions || [],
            extractedReportData: data.extractedReportData || null,
            status: "PENDING"
          },
          include: { patient: true }
        });
      } catch (err) {
        console.warn("Prisma createTriageNote failed, falling back to memory:", err.message);
      }
    }

    const patient = memoryStore.patients.find(p => p.id === data.patientId);
    const note = {
      id: generateCuid(),
      patientId: data.patientId,
      patient: patient || { id: data.patientId, tokenId: `Ward-${tokenCounter}` },
      rawSymptomText: data.rawSymptomText,
      language: data.language || "en",
      summary: data.summary,
      vitals: data.vitals || null,
      prescription: data.prescription || null,
      disposition: data.disposition || null,
      riskTag: data.riskTag,
      matchedRiskKeywords: data.matchedRiskKeywords || [],
      missingInfo: data.missingInfo || [],
      followUpQuestions: data.followUpQuestions || [],
      extractedReportData: data.extractedReportData || null,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
      auditLogs: []
    };

    memoryStore.triageNotes.unshift(note);
    return note;
  },

  async getPendingNotes() {
    let notes = [];

    if (usePrisma && prisma) {
      try {
        notes = await prisma.triageNote.findMany({
          where: { status: "PENDING" },
          include: { patient: true, auditLogs: true },
          orderBy: { createdAt: "desc" }
        });
      } catch (err) {
        console.warn("Prisma getPendingNotes failed, falling back to memory:", err.message);
        notes = memoryStore.triageNotes.filter(n => n.status === "PENDING");
      }
    } else {
      notes = memoryStore.triageNotes.filter(n => n.status === "PENDING");
    }

    // Sort RED -> AMBER -> GREEN, and newest first within each tier
    return notes.sort((a, b) => {
      const priorityA = RISK_PRIORITY[a.riskTag] || 99;
      const priorityB = RISK_PRIORITY[b.riskTag] || 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },

  async getNoteById(id) {
    if (usePrisma && prisma) {
      try {
        return await prisma.triageNote.findUnique({
          where: { id },
          include: { patient: true, auditLogs: true }
        });
      } catch (err) {
        // fallback
      }
    }
    return memoryStore.triageNotes.find(n => n.id === id) || null;
  },

  async updateNoteAction(id, { action, editedSummary, reviewerId, note: comment, prescription, disposition }) {
    let newStatus = "APPROVED";
    if (action === "EDIT_APPROVE") newStatus = "EDITED";
    else if (action === "REJECT") newStatus = "REJECTED";
    else if (action === "APPROVE") newStatus = "APPROVED";

    if (usePrisma && prisma) {
      try {
        const updateData = {
          status: newStatus,
          updatedAt: new Date()
        };
        if (editedSummary && action === "EDIT_APPROVE") {
          updateData.summary = editedSummary;
        }

        const [updatedNote] = await prisma.$transaction([
          prisma.triageNote.update({
            where: { id },
            data: updateData,
            include: { patient: true, auditLogs: true }
          }),
          prisma.auditLogEntry.create({
            data: {
              triageNoteId: id,
              action,
              reviewerId: reviewerId || "reviewer",
              note: comment || null
            }
          })
        ]);

        return updatedNote;
      } catch (err) {
        console.warn("Prisma updateNoteAction failed, falling back to memory:", err.message);
      }
    }

    const existing = memoryStore.triageNotes.find(n => n.id === id);
    if (!existing) {
      return null;
    }

    existing.status = newStatus;
    if (editedSummary && action === "EDIT_APPROVE") {
      existing.summary = editedSummary;
    }
    if (prescription) {
      existing.prescription = prescription;
    }
    if (disposition) {
      existing.disposition = disposition;
    }
    existing.updatedAt = new Date();

    const auditEntry = {
      id: generateCuid(),
      triageNoteId: id,
      action,
      reviewerId: reviewerId || "reviewer",
      note: comment || null,
      disposition: disposition || existing.disposition || null,
      prescription: prescription || existing.prescription || null,
      timestamp: new Date(),
      triageNote: {
        tokenId: existing.patient?.tokenId || "Ward-?"
      }
    };

    if (!existing.auditLogs) existing.auditLogs = [];
    existing.auditLogs.unshift(auditEntry);
    memoryStore.auditLogs.unshift(auditEntry);

    return existing;
  },

  async getAuditLogs(limit = 50) {
    if (usePrisma && prisma) {
      try {
        return await prisma.auditLogEntry.findMany({
          take: parseInt(limit, 10) || 50,
          orderBy: { timestamp: "desc" },
          include: { triageNote: { include: { patient: true } } }
        });
      } catch (err) {
        console.warn("Prisma getAuditLogs failed, falling back to memory:", err.message);
      }
    }

    return memoryStore.auditLogs.slice(0, parseInt(limit, 10) || 50);
  },

  async getAllNotes() {
    return memoryStore.triageNotes;
  }
};

module.exports = storage;
