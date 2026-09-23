require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { getPool, initDatabaseSchema, saveStaffToCloud } = require("../services/db");

const DATA_DIR = path.join(__dirname, "../../data");
const STORE_FILE = path.join(DATA_DIR, "triaq_store.json");

const DEFAULT_SALT = bcrypt.genSaltSync(10);
const DOCTOR_HASH = bcrypt.hashSync("Doctor@123", DEFAULT_SALT);
const NURSE_HASH = bcrypt.hashSync("Nurse@123", DEFAULT_SALT);
const ADMIN_HASH = bcrypt.hashSync("Admin@123", DEFAULT_SALT);
const MASTER_HASH = bcrypt.hashSync("Master@123", DEFAULT_SALT);

const initialStaff = [
  {
    id: "staff-doc-1",
    email: "doctor@triaq.org",
    passwordHash: DOCTOR_HASH,
    name: "Dr. Sharma",
    role: "DOCTOR",
    facility: "Apollo PHC Hub, Delhi",
    isActive: true,
    requiresPasswordChange: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "staff-nurse-1",
    email: "nurse@triaq.org",
    passwordHash: NURSE_HASH,
    name: "Nurse Priya",
    role: "NURSE",
    facility: "Apollo PHC Hub, Delhi",
    isActive: true,
    requiresPasswordChange: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "staff-admin-1",
    email: "admin@triaq.org",
    passwordHash: ADMIN_HASH,
    name: "Admin Officer",
    role: "ADMIN",
    facility: "Apollo PHC Hub, Delhi",
    isActive: true,
    requiresPasswordChange: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "staff-master-1",
    email: "master@triaq.org",
    passwordHash: MASTER_HASH,
    name: "System Master",
    role: "MASTER",
    facility: "Global Central Hub",
    isActive: true,
    twoFactorSecret: "TRIAQ2FASECRETGLOBAL2026",
    backupCodes: ["TRIAQ-BACKUP-01", "TRIAQ-BACKUP-02", "TRIAQ-BACKUP-03"],
    createdAt: new Date().toISOString()
  }
];

const initialFacilities = [
  { id: "fac-1", name: "Apollo PHC Hub, Delhi", phone: "+91-11-2338-9000", address: "Sector 14, Delhi" },
  { id: "fac-2", name: "Rural Health Centre, Odisha", phone: "+91-674-239-0000", address: "Puri Road, Odisha" }
];

async function resetAll() {
  console.log("=========================================");
  console.log("🧹 TriaQ Full Database & Project Reset");
  console.log("=========================================");

  // 1. Wipe local JSON store
  const cleanStore = {
    patients: [],
    staff: initialStaff,
    triageNotes: [],
    auditLogs: [],
    facilities: initialFacilities
  };

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(STORE_FILE, JSON.stringify(cleanStore, null, 2), "utf8");
  console.log("✅ Local JSON storage reset: 0 patients, 0 triage notes, 0 audit logs.");

  // 2. Wipe and re-seed Supabase Cloud Database
  const pool = getPool();
  if (pool) {
    console.log("📡 Connecting to Supabase Cloud Database to wipe tables...");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("TRUNCATE TABLE triaq_patients CASCADE");
      await client.query("TRUNCATE TABLE triaq_triage_notes CASCADE");
      await client.query("TRUNCATE TABLE triaq_audit_logs CASCADE");
      await client.query("TRUNCATE TABLE triaq_staff CASCADE");
      await client.query("COMMIT");
      console.log("✅ Cloud tables truncated (triaq_patients, triaq_triage_notes, triaq_audit_logs, triaq_staff).");

      // Seed initial staff to cloud
      console.log("🌱 Seeding default clean staff to cloud database...");
      for (const staff of initialStaff) {
        await saveStaffToCloud(staff);
      }
      console.log("✅ Default staff seeded: doctor@triaq.org, nurse@triaq.org, admin@triaq.org, master@triaq.org");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("❌ Cloud truncation error:", err.message);
    } finally {
      client.release();
    }
  } else {
    console.warn("⚠️ No DATABASE_URL found for cloud database.");
  }

  console.log("=========================================");
  console.log("✨ ALL DATA HAS BEEN CLEARED FOR A FRESH START!");
  console.log("=========================================");
  process.exit(0);
}

resetAll().catch(err => {
  console.error("Reset failed:", err);
  process.exit(1);
});
