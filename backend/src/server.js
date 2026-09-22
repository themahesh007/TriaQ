require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const storage = require("./services/storage");
const { evaluateRisk } = require("./rules/riskEngine");
const { detectMissingInfo } = require("./rules/missingInfoEngine");
const { getFollowUpQuestions } = require("./rules/followUpEngine");
const { processReportImage } = require("./services/ocrService");
const { generateSummary, evaluateRiskWithAI } = require("./services/llmService");
const {
  hashPassword,
  comparePassword,
  createToken,
  generateOTP,
  verifyOTP,
  verifyMaster2FA,
  authMiddleware,
  requireRole
} = require("./services/authService");
const { sendPasswordResetOTP } = require("./services/emailService");
const { generateTriageReceiptPDF } = require("./services/pdfService");

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

// Middleware
app.use(
  cors({
    origin: ALLOWED_ORIGIN === "*" ? true : ALLOWED_ORIGIN.split(","),
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(authMiddleware);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "TriaQ Backend API", timestamp: new Date() });
});

// Helper functions for strict 10-digit Indian Contact Number validation
function cleanIndianPhone(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

function isValidIndianPhone(raw) {
  const digits = cleanIndianPhone(raw);
  return /^[6-9]\d{9}$/.test(digits);
}

// ==========================================
// 1. PATIENT PORTAL ROUTES
// ==========================================

/**
 * POST /api/patients/register
 * Register with email or phone + password
 */
app.post("/api/patients/register", async (req, res) => {
  try {
    const { email, password, phone, name } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    if (!email && !phone) {
      return res.status(400).json({ error: "Either email or Contact Number is required." });
    }

    if (email) {
      const existing = await storage.findPatientByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "An account with this email already exists. Please login." });
      }
    }

    let cleanedPhone = null;
    if (phone) {
      if (!isValidIndianPhone(phone)) {
        return res.status(400).json({ error: "Please enter a valid 10-digit Indian Contact Number (starting with 6, 7, 8, or 9)." });
      }
      cleanedPhone = cleanIndianPhone(phone);
      const existing = await storage.findPatientByPhone(cleanedPhone);
      if (existing) {
        return res.status(400).json({ error: "An account with this Contact Number already exists. Please login." });
      }
    }

    const passwordHash = await hashPassword(password);
    const patient = await storage.createPatient({
      email,
      phone: cleanedPhone,
      name,
      passwordHash,
      consentGiven: true
    });

    const token = createToken({
      id: patient.id,
      tokenId: patient.tokenId,
      email: patient.email,
      phone: patient.phone,
      role: "PATIENT"
    });

    return res.status(201).json({
      success: true,
      token,
      patient: {
        id: patient.id,
        tokenId: patient.tokenId,
        email: patient.email,
        phone: patient.phone,
        role: "PATIENT"
      }
    });
  } catch (err) {
    console.error("Patient register error:", err);
    return res.status(500).json({ error: "Failed to register patient account." });
  }
});

/**
 * POST /api/patients/login
 * Login via Email & Password OR Phone & OTP
 */
app.post("/api/patients/login", async (req, res) => {
  try {
    const { email, password, phone, otp } = req.body;

    // A. Phone + OTP flow
    if (phone && otp) {
      if (!isValidIndianPhone(phone)) {
        return res.status(400).json({ error: "Please enter a valid 10-digit Indian Contact Number (starting with 6, 7, 8, or 9)." });
      }
      const cleanPhone = cleanIndianPhone(phone);
      const otpCheck = verifyOTP(cleanPhone, otp);
      if (!otpCheck.success) {
        return res.status(400).json({ error: otpCheck.error });
      }

      let patient = await storage.findPatientByPhone(cleanPhone);
      if (!patient) {
        // Auto-create patient profile on first valid phone OTP
        patient = await storage.createPatient({ phone: cleanPhone });
      }

      const token = createToken({
        id: patient.id,
        tokenId: patient.tokenId,
        phone: patient.phone,
        role: "PATIENT"
      });

      return res.json({
        success: true,
        token,
        patient: {
          id: patient.id,
          tokenId: patient.tokenId,
          phone: patient.phone,
          role: "PATIENT"
        }
      });
    }

    // B. Email + Password flow
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const patient = await storage.findPatientByEmail(email);
    if (!patient || !patient.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await comparePassword(password, patient.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = createToken({
      id: patient.id,
      tokenId: patient.tokenId,
      email: patient.email,
      phone: patient.phone,
      role: "PATIENT"
    });

    return res.json({
      success: true,
      token,
      patient: {
        id: patient.id,
        tokenId: patient.tokenId,
        email: patient.email,
        phone: patient.phone,
        role: "PATIENT"
      }
    });
  } catch (err) {
    console.error("Patient login error:", err);
    return res.status(500).json({ error: "Failed to login patient." });
  }
});

/**
 * POST /api/patients/login/send-otp
 * Generates and returns a 6-digit OTP for 10-digit Indian contact number
 */
app.post("/api/patients/login/send-otp", (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !isValidIndianPhone(phone)) {
      return res.status(400).json({ error: "Please enter a valid 10-digit Indian Contact Number (starting with 6, 7, 8, or 9)." });
    }

    const cleanPhone = cleanIndianPhone(phone);
    const { otp, expiresAt } = generateOTP(cleanPhone);

    console.log(`[SMS GATEWAY] Delivered 6-digit OTP [${otp}] to Indian Contact Number +91-${cleanPhone}`);

    return res.json({
      success: true,
      otpSent: true,
      message: `6-digit OTP sent to +91-${cleanPhone}. (Valid for 5 minutes)`,
      demoOtp: otp,
      phone: cleanPhone,
      expiresAt
    });
  } catch (err) {
    console.error("Send OTP error:", err);
    return res.status(500).json({ error: "Failed to send OTP code." });
  }
});

/**
 * POST /api/auth/forgot-password/send-otp
 * Dispatches a 6-digit OTP to user's registered email (and SMS preview)
 */
app.post("/api/auth/forgot-password/send-otp", async (req, res) => {
  try {
    const { email, phone } = req.body;

    let targetEmail = null;
    let targetPhone = null;
    let userName = "User";
    let accountType = null;
    let userId = null;

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      // 1. Check patient
      const patient = await storage.findPatientByEmail(cleanEmail);
      if (patient) {
        targetEmail = cleanEmail;
        targetPhone = patient.phone;
        userName = "Patient";
        accountType = "PATIENT";
        userId = patient.id;
      } else {
        // 2. Check staff
        const staff = await storage.findStaffByEmail(cleanEmail);
        if (staff) {
          targetEmail = cleanEmail;
          targetPhone = staff.phone;
          userName = staff.name || staff.role;
          accountType = staff.role;
          userId = staff.id;
        }
      }
    } else if (phone && phone.trim()) {
      const cleanPhone = cleanIndianPhone(phone);
      const patient = await storage.findPatientByPhone(cleanPhone);
      if (patient) {
        targetPhone = cleanPhone;
        targetEmail = patient.email;
        userName = "Patient";
        accountType = "PATIENT";
        userId = patient.id;
      }
    }

    if (!targetEmail && !targetPhone) {
      return res.status(404).json({
        error: "No registered account found matching that email or contact number. Please check and try again."
      });
    }

    // Generate 6-digit OTP stored by identifier (email or phone)
    const identifier = targetEmail || targetPhone;
    const { otp, expiresAt } = generateOTP(identifier);

    // Also store by the alternate identifier if available
    if (targetEmail && targetPhone) {
      generateOTP(targetPhone);
    }

    let liveEmailSent = false;
    let emailMessage = null;

    // Send Real Live Email if email exists
    if (targetEmail) {
      const emailResult = await sendPasswordResetOTP(targetEmail, otp, userName);
      liveEmailSent = emailResult.deliveredLive;
      emailMessage = emailResult.message;
    }

    console.log(`[PASSWORD RESET] Generated OTP [${otp}] for ${userName} (${identifier}). Live email sent: ${liveEmailSent}`);

    return res.json({
      success: true,
      identifier,
      email: targetEmail,
      phone: targetPhone ? `+91-${targetPhone.slice(0, 2)}*****${targetPhone.slice(-3)}` : null,
      accountType,
      expiresAt,
      liveEmailSent,
      demoOtp: !liveEmailSent ? otp : undefined,
      message: liveEmailSent
        ? `A 6-digit security code was dispatched directly to your real inbox (${targetEmail}). Please check your email!`
        : `Security code generated for ${identifier}. (Valid for 5 minutes)`
    });
  } catch (err) {
    console.error("Forgot password send-otp error:", err);
    return res.status(500).json({ error: "Failed to dispatch password reset code." });
  }
});

/**
 * POST /api/auth/forgot-password/reset
 * Verifies 6-digit OTP and securely updates password in Supabase PostgreSQL
 */
app.post("/api/auth/forgot-password/reset", async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ error: "Identifier, verification code, and new password are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    const verifyResult = verifyOTP(identifier, otp);
    if (!verifyResult.success) {
      return res.status(400).json({ error: verifyResult.error });
    }

    const cleanId = String(identifier).trim();
    const newHash = await hashPassword(newPassword);
    let updated = false;

    // Check if email
    if (cleanId.includes("@")) {
      const cleanEmail = cleanId.toLowerCase();
      // Try patient
      const patient = await storage.findPatientByEmail(cleanEmail);
      if (patient) {
        await storage.updatePatientPassword(patient.id, newHash);
        updated = true;
      }
      // Try staff
      const staff = await storage.findStaffByEmail(cleanEmail);
      if (staff) {
        await storage.updateStaff(staff.id, { passwordHash: newHash, requiresPasswordChange: false });
        updated = true;
      }
    } else {
      // Phone
      const cleanPhone = cleanIndianPhone(cleanId);
      const patient = await storage.findPatientByPhone(cleanPhone);
      if (patient) {
        await storage.updatePatientPassword(patient.id, newHash);
        updated = true;
      }
    }

    if (!updated) {
      return res.status(404).json({ error: "Account record not found to update." });
    }

    console.log(`[PASSWORD RESET] Successfully updated password for ${cleanId} and synced with Supabase.`);

    return res.json({
      success: true,
      message: "Password reset successfully! You can now log in with your new password."
    });
  } catch (err) {
    console.error("Forgot password reset error:", err);
    return res.status(500).json({ error: "Failed to reset password." });
  }
});

/**
 * POST /api/patients/profile
 * Saves patient demographics with AES-256 PII encryption
 */
app.post("/api/patients/profile", async (req, res) => {
  try {
    const patientId = req.user?.id || req.body.patientId;
    if (!patientId) {
      return res.status(401).json({ error: "Authentication required to update profile." });
    }

    const { name, age, phone, address, medications, conditions, facility } = req.body;
    const updated = await storage.updatePatientProfile(patientId, {
      name,
      age,
      phone,
      address,
      medications,
      conditions,
      facility
    });

    if (!updated) {
      return res.status(404).json({ error: "Patient record not found." });
    }

    return res.json({ success: true, saved: true, patientId: updated.id, tokenId: updated.tokenId });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ error: "Failed to save profile." });
  }
});

/**
 * GET /api/patients/status
 * Returns status of patient's latest submitted triage case
 */
app.get("/api/patients/status", async (req, res) => {
  try {
    const patientId = req.user?.id || req.query.patientId;
    if (!patientId) {
      return res.status(400).json({ error: "Patient identification required." });
    }

    const latestNote = await storage.getLatestNoteForPatient(patientId);
    if (!latestNote) {
      return res.json({ hasNote: false, status: "NO_RECORD" });
    }

    return res.json({
      hasNote: true,
      receiptNumber: latestNote.receiptNumber,
      tokenId: latestNote.patient?.tokenId,
      status: latestNote.status,
      riskTag: latestNote.riskTag,
      submittedAt: latestNote.createdAt,
      summary: latestNote.summary,
      disposition: latestNote.disposition,
      prescription: latestNote.prescription
    });
  } catch (err) {
    console.error("Patient status error:", err);
    return res.status(500).json({ error: "Failed to fetch patient status." });
  }
});

/**
 * GET /api/patients/receipt/:receiptNumber/pdf
 * Downloads a generated medical PDF pass for the case
 */
app.get("/api/patients/receipt/:receiptNumber/pdf", async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    const note = await storage.getNoteByReceiptNumber(receiptNumber);

    if (!note) {
      return res.status(404).send("Triage receipt not found.");
    }

    const pdfBuffer = await generateTriageReceiptPDF({
      receiptNumber: note.receiptNumber,
      createdAt: note.createdAt,
      riskTag: note.riskTag,
      facility: note.facility,
      patientName: note.patient?.name,
      age: note.patient?.age,
      phone: note.patient?.phone,
      address: note.patient?.address,
      vitals: note.vitals,
      rawSymptomText: note.summary || note.rawSymptomText
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${receiptNumber}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation error:", err);
    return res.status(500).send("Error generating PDF pass.");
  }
});

/**
 * POST /api/patients/logout
 */
app.post("/api/patients/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ loggedOut: true });
});

// ==========================================
// 2. STAFF PORTAL ROUTES
// ==========================================

/**
 * POST /api/staff/register
 * Self-registration for Doctors, Nurses, and Hospital Facility Admins
 */
app.post("/api/staff/register", async (req, res) => {
  try {
    const { name, email, password, role, facility, phone } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Please enter your full name." });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Please enter a valid staff email address." });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    const normalizedRole = (role || "NURSE").toUpperCase().trim();
    if (!["DOCTOR", "NURSE", "ADMIN"].includes(normalizedRole)) {
      return res.status(400).json({ error: "Role must be DOCTOR, NURSE, or ADMIN." });
    }

    let cleanedPhone = null;
    if (phone) {
      if (!isValidIndianPhone(phone)) {
        return res.status(400).json({ error: "Please enter a valid 10-digit Indian Contact Number (starting with 6, 7, 8, or 9)." });
      }
      cleanedPhone = cleanIndianPhone(phone);
    }

    const existing = await storage.findStaffByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "A staff account with this email already exists. Please login." });
    }

    const passwordHash = await hashPassword(password);
    const staff = await storage.createStaff({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: normalizedRole,
      facility: (facility && facility.trim()) || "Apollo PHC Hub, Delhi",
      phone: cleanedPhone,
      requiresPasswordChange: false
    });

    const token = createToken({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      facility: staff.facility
    });

    return res.status(201).json({
      success: true,
      message: `Staff account registered successfully as ${staff.role}!`,
      token,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        facility: staff.facility,
        phone: staff.phone,
        requiresPasswordChange: false
      }
    });
  } catch (err) {
    console.error("Staff register error:", err);
    return res.status(500).json({ error: "Staff registration failed." });
  }
});

/**
 * POST /api/staff/login
 * Doctor / Nurse / Admin Login
 */
app.post("/api/staff/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const staff = await storage.findStaffByEmail(email);
    if (!staff || !staff.isActive) {
      return res.status(401).json({ error: "Invalid staff credentials or account disabled." });
    }

    const isMatch = await comparePassword(password, staff.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid staff credentials." });
    }

    const token = createToken({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      facility: staff.facility
    });

    return res.json({
      success: true,
      token,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        facility: staff.facility,
        phone: staff.phone || null,
        requiresPasswordChange: staff.requiresPasswordChange || false
      }
    });
  } catch (err) {
    console.error("Staff login error:", err);
    return res.status(500).json({ error: "Staff authentication failed." });
  }
});

/**
 * POST /api/staff/change-password
 * Enforces first-login password update
 */
app.post("/api/staff/change-password", async (req, res) => {
  try {
    const staffId = req.user?.id || req.body.staffId;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters long." });
    }

    const passwordHash = await hashPassword(newPassword);
    await storage.updateStaff(staffId, {
      passwordHash,
      requiresPasswordChange: false
    });

    return res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({ error: "Failed to update password." });
  }
});

/**
 * POST /api/staff/logout
 */
app.post("/api/staff/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ loggedOut: true });
});

// ==========================================
// 3. MASTER PORTAL ROUTES (2FA RESTRICTED)
// ==========================================

/**
 * POST /api/master/login
 * Master login with mandatory 2FA code
 */
app.post("/api/master/login", async (req, res) => {
  try {
    const { email, password, totpCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const master = await storage.findStaffByEmail(email);
    if (!master || master.role !== "MASTER" || !master.isActive) {
      return res.status(401).json({ error: "Unauthorized. Master access restricted." });
    }

    const isMatch = await comparePassword(password, master.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid master credentials." });
    }

    // Verify 2FA
    const twoFactorCheck = verifyMaster2FA(totpCode, master.backupCodes);
    if (!twoFactorCheck.success) {
      return res.status(401).json({ error: twoFactorCheck.error || "2FA code verification failed." });
    }

    const token = createToken(
      {
        id: master.id,
        name: master.name,
        email: master.email,
        role: "MASTER",
        facility: "GLOBAL"
      },
      true
    );

    return res.json({
      success: true,
      token,
      master: {
        id: master.id,
        name: master.name,
        email: master.email,
        role: "MASTER"
      }
    });
  } catch (err) {
    console.error("Master login error:", err);
    return res.status(500).json({ error: "Master login failed." });
  }
});

/**
 * GET /api/master/all-patients
 */
app.get("/api/master/all-patients", requireRole(["MASTER"]), async (req, res) => {
  try {
    const patients = await storage.getAllPatients("MASTER");
    return res.json(patients);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch master patients list." });
  }
});

/**
 * GET /api/master/all-staff
 */
app.get("/api/master/all-staff", requireRole(["MASTER", "ADMIN"]), async (req, res) => {
  try {
    const staff = await storage.getAllStaff();
    return res.json(staff);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch staff list." });
  }
});

/**
 * POST /api/master/suspend-staff
 */
app.post("/api/master/suspend-staff", requireRole(["MASTER", "ADMIN"]), async (req, res) => {
  try {
    const { staffId, reason } = req.body;
    const updated = await storage.updateStaff(staffId, { isActive: false, suspensionReason: reason });
    return res.json({ success: true, staff: updated });
  } catch (err) {
    return res.status(500).json({ error: "Failed to suspend staff." });
  }
});

/**
 * POST /api/master/reset-staff-password
 * Master administrator override to reset any staff member's password
 */
app.post("/api/master/reset-staff-password", requireRole(["MASTER"]), async (req, res) => {
  try {
    const { staffId, newPassword } = req.body;
    if (!staffId || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "Valid staff ID and a new password (minimum 8 characters) are required." });
    }

    const staff = await storage.findStaffById(staffId);
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found." });
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await storage.updateStaff(staffId, {
      passwordHash,
      requiresPasswordChange: true
    });

    console.log(`[MASTER OVERRIDE] Password reset for staff ${staff.email} by ${req.user?.name || "Master"}`);

    return res.json({
      success: true,
      message: `Password reset successfully for ${staff.name} (${staff.email}).`,
      staff: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        requiresPasswordChange: true
      }
    });
  } catch (err) {
    console.error("Master reset staff password error:", err);
    return res.status(500).json({ error: "Failed to reset staff password." });
  }
});

/**
 * POST /api/master/override-decision
 * Administrative override with mandatory rationale
 */
app.post("/api/master/override-decision", requireRole(["MASTER"]), async (req, res) => {
  try {
    const { triageNoteId, newStatus, reason } = req.body;
    if (!triageNoteId || !newStatus || !reason) {
      return res.status(400).json({ error: "Note ID, new status, and clinical rationale are required." });
    }

    const result = await storage.overrideDecision(triageNoteId, {
      newStatus,
      reason,
      masterId: req.user?.name || "System Master",
      ipAddress: req.ip || "127.0.0.1"
    });

    return res.json({ success: true, note: result.note, audit: result.auditEntry });
  } catch (err) {
    console.error("Master override error:", err);
    return res.status(500).json({ error: "Failed to execute override." });
  }
});

/**
 * GET /api/master/analytics
 */
app.get("/api/master/analytics", requireRole(["MASTER", "ADMIN"]), async (req, res) => {
  try {
    const analytics = await storage.getSystemAnalytics();
    return res.json(analytics);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch analytics." });
  }
});

// ==========================================
// 4. CORE CLINICAL TRIAGE ROUTES
// ==========================================

/**
 * POST /api/patients (Legacy / Anonymous Session Generator)
 */
app.post("/api/patients", async (req, res) => {
  try {
    const { name, age, gender, contactNumber, facility } = req.body || {};
    const patient = await storage.createPatient({
      name,
      age,
      phone: contactNumber,
      facility
    });
    return res.status(201).json({
      id: patient.id,
      tokenId: patient.tokenId,
      createdAt: patient.createdAt
    });
  } catch (error) {
    console.error("Error creating patient session:", error);
    return res.status(500).json({ error: "Failed to create patient session" });
  }
});

/**
 * POST /api/triage-notes
 * Submits symptom text, evaluates risk engine & AI, generates note & receipt number
 */
app.post("/api/triage-notes", async (req, res) => {
  try {
    const { patientId, symptomText, additionalAnswers = [], language = "en", reportImageBase64, vitals, facility } = req.body;

    if (!patientId || typeof patientId !== "string") {
      return res.status(400).json({ error: "patientId is required" });
    }
    if (!symptomText || typeof symptomText !== "string") {
      return res.status(400).json({ error: "symptomText is required" });
    }

    const answersText = Array.isArray(additionalAnswers)
      ? additionalAnswers.map((a) => `${a.question || ""} ${a.answer || ""}`).join(" ")
      : "";
    const combinedEvaluationText = `${symptomText} ${answersText}`.trim();

    let extractedReportData = null;
    if (reportImageBase64) {
      extractedReportData = await processReportImage(reportImageBase64);
    }

    // 1. AI-assisted risk evaluation with deterministic fallback (incorporating vitals)
    const riskResult = await evaluateRiskWithAI(symptomText, language, additionalAnswers, evaluateRisk, vitals);
    const riskTag = riskResult.riskTag;
    const matchedRiskKeywords = riskResult.matchedRiskKeywords;

    // 2. Missing info detection
    const missingInfo = detectMissingInfo(combinedEvaluationText, language);

    // 3. Clinical follow-up questions
    const followUpQuestions = getFollowUpQuestions(riskTag, language, combinedEvaluationText);

    // 4. Structured non-diagnostic summary
    const summary = await generateSummary(symptomText, language, additionalAnswers);

    // 5. Store note with receipt number and vitals
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
      extractedReportData,
      facility
    });

    return res.status(201).json(note);
  } catch (error) {
    console.error("Error processing triage note:", error);
    return res.status(500).json({ error: "Failed to process triage note" });
  }
});

/**
 * GET /api/triage-notes
 * Returns queue items. Decrypts PII for DOCTOR/MASTER, masks PII for NURSE.
 */
app.get("/api/triage-notes", async (req, res) => {
  try {
    const role = req.user?.role || "DOCTOR";
    const facility = req.query.facility;
    const notes = await storage.getPendingNotes({ facility, role });
    return res.json(notes);
  } catch (error) {
    console.error("Error fetching triage notes:", error);
    return res.status(500).json({ error: "Failed to fetch triage notes" });
  }
});

/**
 * GET /api/triage-notes/:id
 */
app.get("/api/triage-notes/:id", async (req, res) => {
  try {
    const role = req.user?.role || "DOCTOR";
    const note = await storage.getNoteById(req.params.id, role);
    if (!note) {
      return res.status(404).json({ error: "Triage note not found" });
    }
    return res.json(note);
  } catch (error) {
    console.error("Error fetching note details:", error);
    return res.status(500).json({ error: "Failed to fetch triage note" });
  }
});

/**
 * PATCH /api/triage-notes/:id
 * Reviewer decision (APPROVE, EDIT_APPROVE, REJECT, ESCALATE)
 */
app.patch("/api/triage-notes/:id", async (req, res) => {
  try {
    const { action, reviewerId, editedSummary, note: reviewerNote, disposition, prescription, reason } = req.body;

    if (!["APPROVE", "EDIT_APPROVE", "REJECT", "ESCALATE"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be APPROVE, EDIT_APPROVE, REJECT, or ESCALATE" });
    }

    if (action === "EDIT_APPROVE" && (!editedSummary || typeof editedSummary !== "string")) {
      return res.status(400).json({ error: "editedSummary is required for EDIT_APPROVE action" });
    }

    const userRole = req.user?.role || "DOCTOR";
    // All authenticated staff roles (DOCTOR, NURSE, ADMIN, MASTER) can approve, edit, reject, and escalate


    const result = await storage.updateTriageDecision(req.params.id, {
      action,
      reviewerId: reviewerId || req.user?.name || "Clinical Officer",
      editedSummary,
      note: reviewerNote,
      disposition,
      prescription,
      reason,
      ipAddress: req.ip || "127.0.0.1",
      userAgent: req.headers["user-agent"]
    });

    if (!result) {
      return res.status(404).json({ error: "Triage note not found" });
    }

    return res.json(result.note);
  } catch (error) {
    console.error("Error updating triage note decision:", error);
    return res.status(500).json({ error: "Failed to update triage decision" });
  }
});

/**
 * GET /api/export-csv
 */
app.get("/api/export-csv", async (req, res) => {
  try {
    const notes = await storage.getAllNotes();
    const headers = [
      "Token ID",
      "Receipt Number",
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

    const escapeCsv = (val) => `"${String(val || "").replace(/"/g, '""').replace(/\n/g, " ")}"`;

    const rows = notes.map((n) =>
      [
        escapeCsv(n.patient?.tokenId || "Token"),
        escapeCsv(n.receiptNumber || "-"),
        escapeCsv(new Date(n.createdAt).toLocaleString()),
        escapeCsv(n.status),
        escapeCsv(n.riskTag),
        escapeCsv(n.language),
        escapeCsv(n.vitals ? `${n.vitals.bpSystolic || "-"}/${n.vitals.bpDiastolic || "-"}` : "-"),
        escapeCsv(n.vitals?.pulse || "-"),
        escapeCsv(n.vitals?.spo2 || "-"),
        escapeCsv(n.vitals?.temp || "-"),
        escapeCsv(n.summary || n.rawSymptomText),
        escapeCsv(n.disposition || "-"),
        escapeCsv(n.prescription || "-"),
        escapeCsv(n.auditLogs?.[0]?.reviewerId || "-")
      ].join(",")
    );

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
 */
app.get("/api/audit-log", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const facility = req.query.facility;
    const logs = await storage.getAuditLogs(limit, facility);
    return res.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return res.status(500).json({ error: "Failed to fetch audit log entries" });
  }
});

// Start listening if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[TriaQ API] Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
