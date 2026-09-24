require("dotenv").config();
const path = require("path");
const fs = require("fs");
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
/**
 * GET /api/health
 * Live deployment health check and version verification
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    version: "1.1.0",
    service: "TriaQ Clinical API",
    deployedAt: new Date().toISOString()
  });
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
      status: "PENDING",
      requiresPasswordChange: false
    });

    return res.status(201).json({
      success: true,
      pendingApproval: true,
      message: `Registration submitted successfully for ${staff.name}! Your account is pending verification and approval by your Hospital HOD. Once approved, you can log in to the Staff Desk.`,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        facility: staff.facility,
        status: staff.status
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
    if (!staff) {
      return res.status(401).json({ error: "Invalid staff credentials." });
    }

    if (staff.status === "PENDING") {
      return res.status(403).json({
        error: "Your account is pending verification and approval by your Hospital HOD. Please contact your hospital administration."
      });
    }

    if (staff.status === "REJECTED" || !staff.isActive) {
      return res.status(403).json({
        error: "Your account request was rejected or disabled by the Hospital Administration."
      });
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

    const cleanEmail = email.trim().toLowerCase();
    let master = await storage.findStaffByEmail(cleanEmail);

    // Official hardcoded Master credentials fallback for instant access
    const isOfficialMaster = cleanEmail === "triaqproject@gmail.com" && password === "TriaQ@2026";

    if (!master && !isOfficialMaster) {
      return res.status(401).json({ error: "Invalid ID or Password." });
    }

    if (!master && isOfficialMaster) {
      const hash = await hashPassword("TriaQ@2026");
      master = await storage.createStaff({
        id: "staff-master-official",
        name: "TriaQ Master Administrator",
        email: "triaqproject@gmail.com",
        passwordHash: hash,
        role: "MASTER",
        facility: "Global Central Hub",
        isActive: true,
        status: "APPROVED"
      });
    }

    if (master.role !== "MASTER" || !master.isActive) {
      return res.status(401).json({ error: "Unauthorized. Master access restricted." });
    }

    const isMatch = isOfficialMaster || (await comparePassword(password, master.passwordHash));
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid ID or Password." });
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
 * Strict Patient Medical Privacy Protection:
 * Master CANNOT view private clinical notes, diagnoses, symptoms, or prescriptions.
 * Only operational registry metadata (token, facility, timestamp) is exposed.
 */
app.get("/api/master/all-patients", requireRole(["MASTER"]), async (req, res) => {
  try {
    const rawPatients = await storage.getAllPatients("NURSE"); // Masked PII
    // 100% Medical Privacy Lock: strip any sensitive clinical data
    const privacyPreservedPatients = rawPatients.map((p) => ({
      id: p.id,
      tokenId: p.tokenId,
      facility: p.facility,
      consentGiven: p.consentGiven,
      createdAt: p.createdAt,
      isActive: p.isActive
    }));
    return res.json(privacyPreservedPatients);
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
 * POST /api/master/clear-all-data
 * Completely resets patient records, triage queue, and audit trail for a fresh slate
 */
app.post("/api/master/clear-all-data", requireRole(["MASTER"]), async (req, res) => {
  try {
    await storage.clearAllData();
    console.log(`[MASTER ACTION] All project data cleared by ${req.user?.name || "Master"}`);
    return res.json({
      success: true,
      message: "All patient records, triage tickets, and audit history have been completely cleared!"
    });
  } catch (err) {
    console.error("Clear all data error:", err);
    return res.status(500).json({ error: "Failed to clear project data." });
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
// 3.5. HOSPITAL & FACILITY MANAGEMENT ROUTES
// ==========================================

/**
 * GET /api/facilities
 * Public endpoint to list active hospitals and clinics
 */
app.get("/api/facilities", async (req, res) => {
  try {
    const facilities = await storage.getAllFacilities();
    return res.json(facilities);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch facilities." });
  }
});

/**
 * POST /api/hospital/register
 * Public Self-Registration for Hospitals and Clinics (Status: PENDING Master Approval)
 */
app.post("/api/hospital/register", async (req, res) => {
  try {
    const { name, type, state, district, city } = req.body;
    const licenseNumber = req.body.licenseNumber || req.body.regLicenseNumber;
    const phone = req.body.phone || req.body.contactNumber;
    const adminEmail = req.body.adminEmail || req.body.email;
    const adminPassword = req.body.adminPassword || req.body.password;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Hospital or Clinic name is required." });
    }
    if (!licenseNumber || licenseNumber.trim().length < 3) {
      return res.status(400).json({ error: "Hospital / Medical License Number is required (e.g. Clinical Establishment Act Reg No)." });
    }
    if (!state || !state.trim()) {
      return res.status(400).json({ error: "State is required." });
    }
    if (!district || !district.trim()) {
      return res.status(400).json({ error: "District is required." });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ error: "City is required." });
    }
    if (!phone || !isValidIndianPhone(phone)) {
      return res.status(400).json({ error: "Valid 10-digit Indian Contact Number is required." });
    }
    if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
      return res.status(400).json({ error: "Valid Administrator official email address is required." });
    }
    if (!adminPassword || adminPassword.length < 8) {
      return res.status(400).json({ error: "Administrator password must be at least 8 characters long." });
    }

    const cleanEmail = adminEmail.trim().toLowerCase();
    const existingStaff = await storage.findStaffByEmail(cleanEmail);
    const existingFac = await storage.findFacilityByEmail(cleanEmail);
    if (existingStaff || existingFac) {
      return res.status(400).json({ error: "An account or facility with this administrator email already exists." });
    }

    const adminPasswordHash = await hashPassword(adminPassword);
    const cleanedPhone = cleanIndianPhone(phone);

    const facility = await storage.createFacility({
      name: name.trim(),
      type: type || "HOSPITAL",
      licenseNumber: licenseNumber.trim().toUpperCase(),
      phone: cleanedPhone,
      address: `${city.trim()}, ${district.trim()}, ${state.trim()}`,
      state: state.trim(),
      district: district.trim(),
      city: city.trim(),
      adminEmail: cleanEmail,
      adminPasswordHash,
      status: "PENDING"
    });

    // Also register the Admin staff record linked to this facility with PENDING status
    await storage.createStaff({
      name: `${facility.name} Admin`,
      email: cleanEmail,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      facility: facility.name,
      phone: cleanedPhone,
      status: "PENDING"
    });

    return res.status(201).json({
      success: true,
      pendingApproval: true,
      message: `Registration for "${facility.name}" submitted successfully! Your hospital is pending Master verification. Once approved by the Master Desk, you can log in.`,
      facility
    });
  } catch (err) {
    console.error("Hospital register error:", err);
    return res.status(500).json({ error: "Hospital registration failed." });
  }
});

/**
 * GET /api/master/pending-facilities
 * Master fetches queue of hospitals awaiting verification
 */
app.get("/api/master/pending-facilities", requireRole(["MASTER"]), async (req, res) => {
  try {
    const pending = await storage.getPendingFacilities();
    return res.json(pending);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch pending facilities." });
  }
});

/**
 * PATCH /api/master/facilities/:id/status
 * Master approves or rejects a hospital entity
 */
app.patch("/api/master/facilities/:id/status", requireRole(["MASTER"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Status must be APPROVED or REJECTED." });
    }

    const facility = await storage.updateFacilityStatus(id, status);
    if (!facility) {
      return res.status(404).json({ error: "Facility not found." });
    }

    // Sync status with associated administrator staff
    if (facility.adminEmail) {
      const staff = await storage.findStaffByEmail(facility.adminEmail);
      if (staff) {
        await storage.updateStaffStatus(staff.id, status);
      }
    }

    return res.json({
      success: true,
      message: `Facility "${facility.name}" has been ${status === "APPROVED" ? "approved" : "rejected"}.`,
      facility
    });
  } catch (err) {
    console.error("Master facility status error:", err);
    return res.status(500).json({ error: "Failed to update facility status." });
  }
});

/**
 * POST /api/master/facilities
 * Master directly provisions a hospital/clinic (status: APPROVED)
 */
app.post("/api/master/facilities", requireRole(["MASTER"]), async (req, res) => {
  try {
    const { name, type, state, district, city, phone, address, adminEmail, adminPassword } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Hospital or Clinic name is required." });
    }

    let adminPasswordHash = null;
    if (adminPassword && adminPassword.length >= 8) {
      adminPasswordHash = await hashPassword(adminPassword);
    }

    const facility = await storage.createFacility({
      name: name.trim(),
      type: type || "HOSPITAL",
      phone: phone ? cleanIndianPhone(phone) : null,
      address: address ? address.trim() : `${city || ""}, ${district || ""}, ${state || ""}`.trim(),
      state: state ? state.trim() : null,
      district: district ? district.trim() : null,
      city: city ? city.trim() : null,
      adminEmail: adminEmail ? adminEmail.trim().toLowerCase() : null,
      adminPasswordHash,
      status: "APPROVED"
    });

    if (adminEmail && adminPasswordHash) {
      const existingStaff = await storage.findStaffByEmail(adminEmail);
      if (!existingStaff) {
        await storage.createStaff({
          name: `${facility.name} Admin`,
          email: adminEmail.trim().toLowerCase(),
          passwordHash: adminPasswordHash,
          role: "ADMIN",
          facility: facility.name,
          status: "APPROVED"
        });
      }
    }

    return res.status(201).json({ success: true, facility });
  } catch (err) {
    console.error("Create facility error:", err);
    return res.status(500).json({ error: "Failed to create facility." });
  }
});

/**
 * DELETE /api/master/facilities/:id
 */
app.delete("/api/master/facilities/:id", requireRole(["MASTER"]), async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteFacility(id);
    return res.json({ success: true, message: "Facility removed successfully." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete facility." });
  }
});

/**
 * POST /api/hospital/login
 * Hospital Administrator Login (Enforces Master Approval Clearance)
 */
app.post("/api/hospital/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if facility admin credentials directly
    const facility = await storage.findFacilityByEmail(cleanEmail);
    if (facility && facility.adminPasswordHash) {
      const match = await comparePassword(password, facility.adminPasswordHash);
      if (match) {
        if (facility.status === "PENDING") {
          return res.status(403).json({
            error: "Your Hospital / Clinic registration is pending Master verification and approval. Please wait for Master clearance."
          });
        }
        if (facility.status === "REJECTED") {
          return res.status(403).json({
            error: "Your Hospital registration request was rejected by the Master Administrator."
          });
        }

        const token = createToken({
          id: facility.id,
          name: `${facility.name} Admin`,
          email: facility.adminEmail,
          role: "HOSPITAL_ADMIN",
          facility: facility.name,
          facilityId: facility.id
        });
        return res.json({
          success: true,
          token,
          facility: {
            id: facility.id,
            name: facility.name,
            type: facility.type,
            phone: facility.phone,
            address: facility.address,
            state: facility.state,
            district: facility.district,
            city: facility.city,
            code: facility.code,
            adminEmail: facility.adminEmail,
            status: facility.status
          }
        });
      }
    }

    // 2. Check if a staff account with role ADMIN or DOCTOR for this facility
    const staff = await storage.findStaffByEmail(cleanEmail);
    if (staff && staff.isActive) {
      if (staff.status === "PENDING") {
        return res.status(403).json({
          error: "Your administrator account is pending Master verification and approval."
        });
      }
      if (staff.status === "REJECTED") {
        return res.status(403).json({
          error: "Your administrator account was rejected."
        });
      }

      const match = await comparePassword(password, staff.passwordHash);
      if (match) {
        const allFacs = await storage.getAllFacilities();
        const matchingFac = allFacs.find(
          (f) => f.name.toLowerCase() === staff.facility.toLowerCase()
        ) || {
          id: "fac-" + staff.facility.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          name: staff.facility,
          type: "HOSPITAL",
          code: staff.facility.toUpperCase().slice(0, 8),
          status: "APPROVED"
        };

        const token = createToken({
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: "HOSPITAL_ADMIN",
          facility: staff.facility,
          facilityId: matchingFac.id
        });

        return res.json({
          success: true,
          token,
          facility: matchingFac
        });
      }
    }

    return res.status(401).json({ error: "Invalid hospital administrator credentials." });
  } catch (err) {
    console.error("Hospital login error:", err);
    return res.status(500).json({ error: "Hospital authentication failed." });
  }
});

/**
 * GET /api/hospital/staff
 * Lists approved doctors & nurses assigned to this hospital
 */
app.get("/api/hospital/staff", requireRole(["HOSPITAL_ADMIN", "ADMIN", "MASTER"]), async (req, res) => {
  try {
    const facilityName = req.query.facility || req.user?.facility;
    const staff = await storage.getAllStaff({ facility: facilityName });
    // Filter to active & approved staff for roster
    const approvedStaff = staff.filter((s) => s.status !== "PENDING" && s.status !== "REJECTED");
    return res.json(approvedStaff);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch hospital staff." });
  }
});

/**
 * GET /api/hospital/pending-staff
 * Hospital HOD fetches doctors and nurses awaiting verification for their facility
 */
app.get("/api/hospital/pending-staff", requireRole(["HOSPITAL_ADMIN", "ADMIN", "MASTER"]), async (req, res) => {
  try {
    const facilityName = req.query.facility || req.user?.facility;
    const pending = await storage.getPendingStaff(facilityName);
    return res.json(pending);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch pending staff." });
  }
});

/**
 * PATCH /api/hospital/staff/:id/status
 * Hospital HOD approves or rejects doctor/nurse sign-up (Method B)
 */
app.patch("/api/hospital/staff/:id/status", requireRole(["HOSPITAL_ADMIN", "ADMIN", "MASTER"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Status must be APPROVED or REJECTED." });
    }

    const staff = await storage.updateStaffStatus(id, status);
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found." });
    }

    return res.json({
      success: true,
      message: `${staff.role === "DOCTOR" ? "Dr." : "Nurse"} ${staff.name} has been ${status === "APPROVED" ? "approved" : "rejected"}!`,
      staff
    });
  } catch (err) {
    console.error("Staff status update error:", err);
    return res.status(500).json({ error: "Failed to update staff status." });
  }
});

/**
 * DELETE /api/hospital/staff/:id
 * Hospital HOD removes a doctor or nurse from their facility roster
 */
app.delete("/api/hospital/staff/:id", requireRole(["HOSPITAL_ADMIN", "ADMIN", "MASTER"]), async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteStaff(id);
    return res.json({ success: true, message: "Staff member removed from hospital roster." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to remove staff member." });
  }
});

/**
 * POST /api/hospital/staff
 * Hospital Admin directly adds a new Doctor or Nurse to their facility (Status: APPROVED)
 */
app.post("/api/hospital/staff", requireRole(["HOSPITAL_ADMIN", "ADMIN", "MASTER"]), async (req, res) => {
  try {
    const { name, email, password, role, phone, department } = req.body;
    const facility = req.body.facility || req.user?.facility;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: "Staff name is required." });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid staff email is required." });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await storage.findStaffByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: "A staff account with this email already exists." });
    }

    const normalizedRole = (role || "DOCTOR").toUpperCase();
    if (!["DOCTOR", "NURSE", "ADMIN"].includes(normalizedRole)) {
      return res.status(400).json({ error: "Role must be DOCTOR or NURSE." });
    }

    const passwordHash = await hashPassword(password);
    const newStaff = await storage.createStaff({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: normalizedRole,
      facility: facility || "Apollo PHC Hub, Delhi",
      phone: phone ? cleanIndianPhone(phone) : null,
      department: department ? department.trim() : null,
      status: "APPROVED"
    });

    return res.status(201).json({
      success: true,
      message: `${normalizedRole === "DOCTOR" ? "Doctor" : "Nurse"} ${newStaff.name} added successfully!`,
      staff: newStaff
    });
  } catch (err) {
    console.error("Hospital add staff error:", err);
    return res.status(500).json({ error: "Failed to add medical staff." });
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
 * GET /api/triage-notes/:id/pdf
 * Generates and downloads official printable triage PDF pass
 */
app.get("/api/triage-notes/:id/pdf", async (req, res) => {
  try {
    const role = req.user?.role || "DOCTOR";
    const note = await storage.getNoteById(req.params.id, role);
    if (!note) {
      return res.status(404).json({ error: "Triage note not found" });
    }
    const pdfBuffer = await generateTriageReceiptPDF(note);
    const filename = `TriaQ_Slip_${(note.patient?.tokenId || note.tokenId || "Pass").replace(/\\s+/g, "_")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF pass:", error);
    return res.status(500).json({ error: "Failed to generate triage PDF pass" });
  }
});

/**
 * PATCH /api/triage-notes/:id
 * Reviewer decision (APPROVE, EDIT_APPROVE, REJECT, ESCALATE)
 */
app.patch("/api/triage-notes/:id", async (req, res) => {
  try {
    const { action, reviewerId, editedSummary, note: reviewerNote, disposition, prescription, reason, assignedRoom } = req.body;

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
      assignedRoom,
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


// ==========================================
// HOSPITAL ROOMS & OPD WARDS MANAGEMENT
// ==========================================

/**
 * GET /api/hospital/rooms
 * Fetch rooms/wards for the logged-in hospital facility
 */
app.get("/api/hospital/rooms", requireRole(["HOSPITAL_ADMIN", "ADMIN", "DOCTOR", "NURSE", "MASTER"]), async (req, res) => {
  try {
    const facilityId = req.query.facilityId || req.user?.facilityId || req.user?.facility;
    const rooms = await storage.getFacilityRooms(facilityId);
    return res.json(rooms);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch facility rooms." });
  }
});

/**
 * POST /api/hospital/rooms
 * Add a new room or OPD ward to the hospital
 */
app.post("/api/hospital/rooms", requireRole(["HOSPITAL_ADMIN", "ADMIN", "MASTER"]), async (req, res) => {
  try {
    const facilityId = req.body.facilityId || req.user?.facilityId || req.user?.facility;
    const { roomNumber, name, category, floor, urgency } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Room or Ward name is required." });
    }
    const newRoom = await storage.addFacilityRoom(facilityId, { roomNumber, name, category, floor, urgency });
    if (!newRoom) {
      return res.status(404).json({ error: "Facility not found." });
    }
    return res.status(201).json(newRoom);
  } catch (err) {
    return res.status(500).json({ error: "Failed to add room." });
  }
});

/**
 * DELETE /api/hospital/rooms/:roomId
 * Delete a room or OPD ward from the hospital
 */
app.delete("/api/hospital/rooms/:roomId", requireRole(["HOSPITAL_ADMIN", "ADMIN", "MASTER"]), async (req, res) => {
  try {
    const facilityId = req.query.facilityId || req.user?.facilityId || req.user?.facility;
    const success = await storage.deleteFacilityRoom(facilityId, req.params.roomId);
    if (!success) {
      return res.status(404).json({ error: "Room not found." });
    }
    return res.json({ success: true, message: "Room removed successfully." });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete room." });
  }
});

/**
 * GET /api/facilities/:facilityId/rooms
 * Public/Staff accessible rooms for a specific facility
 */
app.get("/api/facilities/:facilityId/rooms", async (req, res) => {
  try {
    const rooms = await storage.getFacilityRooms(req.params.facilityId);
    return res.json(rooms);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch facility rooms." });
  }
});

// Serve frontend single-page application (SPA) build if available
const publicDir = path.join(__dirname, "../public");
const frontendDistDir = path.join(__dirname, "../../frontend/dist");

if (fs.existsSync(publicDir) && fs.existsSync(path.join(publicDir, "index.html"))) {
  app.use(express.static(publicDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api") || req.path.startsWith("/health")) return next();
    res.sendFile(path.join(publicDir, "index.html"));
  });
} else if (fs.existsSync(frontendDistDir) && fs.existsSync(path.join(frontendDistDir, "index.html"))) {
  app.use(express.static(frontendDistDir));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api") || req.path.startsWith("/health")) return next();
    res.sendFile(path.join(frontendDistDir, "index.html"));
  });
}

// Start listening if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[TriaQ API] Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
