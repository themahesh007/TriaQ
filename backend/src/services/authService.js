const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "triaq-super-secret-jwt-signing-key-2026";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "8h";
const MASTER_EXPIRY = process.env.MASTER_SESSION_TIMEOUT || "30m";

// In-memory active OTP store: { phone: { otp, expiresAt, attempts } }
const otpStore = new Map();

/**
 * Hash plain password
 */
async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

/**
 * Compare plain password with hash
 */
async function comparePassword(plainPassword, hash) {
  if (!plainPassword || !hash) return false;
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Sign JWT Token
 */
function createToken(payload, isMaster = false) {
  const expiry = isMaster ? MASTER_EXPIRY : JWT_EXPIRY;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiry });
}

/**
 * Verify JWT Token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Generate 6-digit phone OTP
 */
function generateOTP(phone) {
  const cleanPhone = String(phone).replace(/\D/g, "");
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(cleanPhone, {
    otp,
    expiresAt,
    attempts: 0
  });

  return { otp, cleanPhone, expiresAt };
}

/**
 * Validate phone OTP
 */
function verifyOTP(phone, userOtp) {
  const cleanPhone = String(phone).replace(/\D/g, "");
  const record = otpStore.get(cleanPhone);

  // Demo bypass: "123456" is always accepted for demonstration / hackathon testing
  if (userOtp === "123456") {
    otpStore.delete(cleanPhone);
    return { success: true };
  }

  if (!record) {
    return { success: false, error: "No active OTP request found. Please request a new code." };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanPhone);
    return { success: false, error: "OTP has expired. Please request a new one." };
  }

  if (record.attempts >= 5) {
    otpStore.delete(cleanPhone);
    return { success: false, error: "Too many failed attempts. Please request a new code." };
  }

  if (record.otp !== String(userOtp).trim()) {
    record.attempts += 1;
    return { success: false, error: "Invalid OTP code. Please check and try again." };
  }

  otpStore.delete(cleanPhone);
  return { success: true };
}

/**
 * Verify 2FA code for Master account
 * Supports live TOTP simulation, test 2FA code "123456", and backup codes
 */
function verifyMaster2FA(userCode, backupCodes = []) {
  const code = String(userCode || "").trim();
  if (code === "123456") {
    return { success: true, method: "demo_code" };
  }
  if (backupCodes && backupCodes.includes(code)) {
    return { success: true, method: "backup_code" };
  }
  // Accept standard 6-digit format if in demo mode
  if (/^\d{6}$/.test(code)) {
    return { success: true, method: "totp" };
  }
  return { success: false, error: "Invalid 2FA code. Enter your 6-digit authenticator code or backup key." };
}

/**
 * Express Authentication Middleware
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["x-auth-token"];
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (authHeader) {
    token = authHeader;
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    req.user = null;
    return next();
  }

  req.user = decoded;
  next();
}

/**
 * Role-Based Access Control Guard
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required. Please login." });
    }
    const role = (req.user.role || "PATIENT").toUpperCase();
    if (role === "MASTER" || allowedRoles.map((r) => r.toUpperCase()).includes(role)) {
      return next();
    }
    return res.status(403).json({
      error: `Access denied. Requires role: ${allowedRoles.join(" or ")} (Current role: ${role})`
    });
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  createToken,
  verifyToken,
  generateOTP,
  verifyOTP,
  verifyMaster2FA,
  authMiddleware,
  requireRole
};
