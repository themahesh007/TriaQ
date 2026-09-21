const crypto = require("crypto");

// 32-byte key derived from env or secure default for development
const ENCRYPTION_SECRET = process.env.PII_ENCRYPTION_KEY || "triaq-ultra-secure-encryption-key-2026";
const KEY = crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

/**
 * Encrypt a string value at rest using AES-256-CBC
 */
function encryptPII(plainText) {
  if (plainText === null || plainText === undefined || plainText === "") {
    return plainText;
  }
  const str = String(plainText);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(str, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a previously encrypted cipher string
 */
function decryptPII(cipherText) {
  if (!cipherText || typeof cipherText !== "string" || !cipherText.includes(":")) {
    return cipherText;
  }
  try {
    const [ivHex, encryptedHex] = cipherText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    // If text was not encrypted with this key, return original safely
    return cipherText;
  }
}

/**
 * Mask PII string for Nurse or unauthorized viewers
 * Example: "Ramesh Sharma" -> "R***h S****a"
 * Example: "9876543210" -> "98*****210"
 */
function maskString(val, isPhone = false) {
  if (!val || typeof val !== "string") return "--";
  const str = val.trim();
  if (isPhone) {
    if (str.length <= 4) return "****";
    return `${str.slice(0, 2)}******${str.slice(-2)}`;
  }
  return str
    .split(" ")
    .map((word) => {
      if (word.length <= 2) return word[0] + "*";
      return word[0] + "*".repeat(Math.max(1, word.length - 2)) + word[word.length - 1];
    })
    .join(" ");
}

/**
 * Return masked patient profile suitable for NURSE or audit view
 */
function maskPatientProfile(patient) {
  if (!patient) return null;
  const name = decryptPII(patient.encryptedName || patient.name);
  const phone = decryptPII(patient.encryptedPhone || patient.phone);
  const age = decryptPII(patient.encryptedAge || patient.age);
  const address = decryptPII(patient.encryptedAddress || patient.address);

  return {
    ...patient,
    name: maskString(name),
    phone: maskString(phone, true),
    age: age ? `${age} yrs` : "--",
    address: address ? maskString(address) : "--",
    isMasked: true
  };
}

/**
 * Return full decrypted patient profile for DOCTOR or MASTER
 */
function decryptPatientProfile(patient) {
  if (!patient) return null;
  return {
    ...patient,
    name: decryptPII(patient.encryptedName || patient.name) || patient.name || "Anonymous Patient",
    phone: decryptPII(patient.encryptedPhone || patient.phone) || patient.phone || "--",
    age: decryptPII(patient.encryptedAge || patient.age) || patient.age || "--",
    address: decryptPII(patient.encryptedAddress || patient.address) || patient.address || "--",
    medications: decryptPII(patient.encryptedMedications || patient.medications) || patient.medications || "--",
    conditions: decryptPII(patient.encryptedConditions || patient.conditions) || patient.conditions || "--",
    isMasked: false
  };
}

module.exports = {
  encryptPII,
  decryptPII,
  maskString,
  maskPatientProfile,
  decryptPatientProfile
};
