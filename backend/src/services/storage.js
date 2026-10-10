const defaultHospitalRooms = [];
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { encryptPII, decryptPatientProfile, maskPatientProfile } = require("./cryptoService");
const db = require("./db");

// Optional local JSON persistence path
const DATA_DIR = path.join(__dirname, "../../data");
const STORE_FILE = path.join(DATA_DIR, "triaq_store.json");

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    // Ignore if not allowed
  }
}

// Initial pre-seeded demo password hashes (Doctor@123, Nurse@123, Admin@123, Master@123)
const DEFAULT_SALT = bcrypt.genSaltSync(10);
const DOCTOR_HASH = bcrypt.hashSync("Doctor@123", DEFAULT_SALT);
const NURSE_HASH = bcrypt.hashSync("Nurse@123", DEFAULT_SALT);
const ADMIN_HASH = bcrypt.hashSync("Admin@123", DEFAULT_SALT);
const MASTER_HASH = bcrypt.hashSync("Master@123", DEFAULT_SALT);
const TRIAQ_MASTER_HASH = bcrypt.hashSync("TriaQ@2026", DEFAULT_SALT);

const initialStaff = [
  {
    id: "staff-master-official",
    email: "triaqproject@gmail.com",
    passwordHash: TRIAQ_MASTER_HASH,
    name: "TriaQ Master Administrator",
    role: "MASTER",
    facility: "Global Central Hub",
    isActive: true,
    status: "APPROVED",
    twoFactorSecret: "TRIAQ2FASECRETGLOBAL2026",
    backupCodes: ["TRIAQ-BACKUP-01", "TRIAQ-BACKUP-02", "TRIAQ-BACKUP-03"],
    createdAt: new Date().toISOString()
  }
];

const initialEmergencyCases = [
  {
    id: "emc-seed-bike-accident",
    caseId: "EM-882190",
    type: "Road Accident",
    description: "Bike collision near Rasulgarh square, rider helmet broke",
    patientName: "Unknown Male (approx 28 yrs)",
    reporterPhone: "9876543210",
    location: "NH-16 near Rasulgarh Square, Bhubaneswar",
    status: "en_route", // 'en_route' | 'received' | 'closed'
    claimedByHospital: null,
    pin: "1234",
    updates: [
      { id: "upd-3", text: "Patient semiconscious, oxygen administered", createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
      { id: "upd-2", text: "Head injury, bleeding controlled with pressure bandage", createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
      { id: "upd-1", text: "Leg injury and deep laceration", createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString() }
    ],
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  }
];

// In-memory store with local disk synchronization
let memoryStore = {
  patients: [],
  staff: [...initialStaff],
  triageNotes: [],
  auditLogs: [],
  facilities: [],
  referrals: [],
  emergencyCases: [...initialEmergencyCases]
};

// Load saved data if exists
if (fs.existsSync(STORE_FILE)) {
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    memoryStore.patients = parsed.patients || [];
    memoryStore.staff = parsed.staff && parsed.staff.length > 0 ? parsed.staff : [...initialStaff];
    memoryStore.triageNotes = parsed.triageNotes || [];
    memoryStore.auditLogs = parsed.auditLogs || [];
    if (parsed.facilities) memoryStore.facilities = parsed.facilities;
    if (parsed.referrals) memoryStore.referrals = parsed.referrals;
    if (parsed.emergencyCases && parsed.emergencyCases.length > 0) {
      memoryStore.emergencyCases = parsed.emergencyCases;
    } else {
      memoryStore.emergencyCases = [...initialEmergencyCases];
    }
  } catch (e) {
    console.warn("Notice: Could not parse local store, initialized fresh memory store.");
  }
}



function getDefaultFacilityName() {
  if (memoryStore.facilities && memoryStore.facilities.length > 0) {
    return memoryStore.facilities[0].name;
  }
  return "District Health Facility";
}

function persistStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(memoryStore, null, 2), "utf8");
  } catch (e) {
    // Non-fatal if read-only filesystem (e.g. serverless)
  }
}

// Initialize Supabase Cloud Sync (Hydrates existing records or seeds initial data)
async function initCloudSync() {
  if (!process.env.DATABASE_URL) return;
  try {
    const isReady = await db.initDatabaseSchema();
    if (!isReady) return;

    const cloudData = await db.loadAllFromCloud();
    if (cloudData && (cloudData.patients.length > 0 || cloudData.staff.length > 0 || cloudData.triageNotes.length > 0)) {
      if (cloudData.patients.length > 0) {
        const cIds = new Set(cloudData.patients.map((p) => p.id));
        memoryStore.patients = [...cloudData.patients, ...memoryStore.patients.filter((p) => !cIds.has(p.id))];
      }
      if (cloudData.staff.length > 0) {
        const sIds = new Set(cloudData.staff.map((s) => s.id));
        memoryStore.staff = [...cloudData.staff, ...memoryStore.staff.filter((s) => !sIds.has(s.id))];
      }
      if (cloudData.triageNotes.length > 0) {
        const nIds = new Set(cloudData.triageNotes.map((n) => n.id));
        memoryStore.triageNotes = [...cloudData.triageNotes, ...memoryStore.triageNotes.filter((n) => !nIds.has(n.id))];
      }
      if (cloudData.auditLogs.length > 0) {
        const aIds = new Set(cloudData.auditLogs.map((a) => a.id));
        memoryStore.auditLogs = [...cloudData.auditLogs, ...memoryStore.auditLogs.filter((a) => !aIds.has(a.id))];
      }
      if (cloudData.facilities) memoryStore.facilities = cloudData.facilities;
      const cloudReferrals = await db.loadReferralsFromCloud();
      if (Array.isArray(cloudReferrals) && cloudReferrals.length > 0) {
        memoryStore.referrals = cloudReferrals;
      }
      const cloudEmergency = await db.loadEmergencyCasesFromCloud();
      if (Array.isArray(cloudEmergency) && cloudEmergency.length > 0) {
        memoryStore.emergencyCases = cloudEmergency;
      } else {
        for (const em of memoryStore.emergencyCases) {
          await db.saveEmergencyCaseToCloud(em);
        }
      }
      console.log(`[Supabase Cloud] Hydrated ${memoryStore.patients.length} patients, ${memoryStore.staff.length} staff, ${memoryStore.emergencyCases.length} emergency cases from cloud database!`);
    } else {
      console.log("[Supabase Cloud] Empty cloud database. Seeding initial records to Supabase...");
      for (const s of memoryStore.staff) {
        await db.saveStaffToCloud(s);
      }
      for (const p of memoryStore.patients) {
        await db.savePatientToCloud(p);
      }
      for (const n of memoryStore.triageNotes) {
        await db.saveTriageNoteToCloud(n);
      }
      for (const em of memoryStore.emergencyCases) {
        await db.saveEmergencyCaseToCloud(em);
      }
      console.log("[Supabase Cloud] Initial records seeded to cloud successfully!");
    }
  } catch (err) {
    console.error("[Supabase Cloud] Initialization error:", err.message);
  }
}
initCloudSync().catch((err) => console.error(err));

let tokenCounter = 10 + memoryStore.patients.length;


const RISK_PRIORITY = {
  RED: 1,
  AMBER: 2,
  YELLOW: 2,
  GREEN: 3
};

function generateCuid() {
  return "c" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
}

function generateReceiptNumber() {
  const dateStr = new Date().toISOString().slice(0, 10);
  const randomSuffix = String(Math.floor(10000 + Math.random() * 90000));
  return `TRIAQ-${dateStr}-${randomSuffix}`;
}

// Helper to match facilities flexibly across slight naming variations (e.g. MKCG MEDICAL vs MKCG Medical College)
function isSameFacility(facA, facB) {
  if (!facA || !facB) return false;
  const a = String(facA).trim().toLowerCase();
  const b = String(facB).trim().toLowerCase();
  if (a === b) return true;
  if (a.replace(/[^a-z0-9]/g, "") === b.replace(/[^a-z0-9]/g, "")) return true;

  const cleanA = a.replace(/–|-/g, " ").replace(/\s+/g, " ");
  const cleanB = b.replace(/–|-/g, " ").replace(/\s+/g, " ");
  const keywords = [
    "mkcg", "aiims", "scb", "vimsar", "satya nagar", "jagannath",
    "fakir mohan", "raghunath murmu", "laxman nayak", "bhima bhoi", "sundargarh"
  ];
  for (const kw of keywords) {
    if (cleanA.includes(kw) && cleanB.includes(kw)) return true;
  }
  return false;
}

const storage = {
  isSameFacility,
  // --- PATIENTS ---
  async createPatient(data = {}) {
    const targetFacility = data.facility || null;
    // Token is strictly NOT assigned at registration or login.
    // Sequential token is assigned ONLY when patient actually submits symptoms!
    const tokenId = data.tokenId || null;

    const patient = {
      id: data.id || generateCuid(),
      tokenId,
      email: data.email || null,
      passwordHash: data.passwordHash || null,
      phone: data.phone || null,
      encryptedName: encryptPII(data.name || data.fullName || null),
      encryptedAge: encryptPII(data.age || null),
      encryptedAddress: encryptPII(data.address || data.ward || null),
      encryptedMedications: encryptPII(data.medications || null),
      encryptedConditions: encryptPII(data.conditions || null),
      consentGiven: data.consentGiven !== undefined ? data.consentGiven : true,
      consentTimestamp: new Date().toISOString(),
      facility: data.facility || getDefaultFacilityName(),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    memoryStore.patients.push(patient);
    persistStore();
    db.savePatientToCloud(patient).catch(console.error);
    return patient;
  },

  async findPatientById(id) {
    return memoryStore.patients.find((p) => p.id === id) || null;
  },

  async findPatientByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    let patient = memoryStore.patients.find((p) => p.email && p.email.toLowerCase() === cleanEmail);
    if (patient) return patient;
    const p = db.getPool();
    if (p) {
      try {
        const res = await p.query("SELECT * FROM triaq_patients WHERE LOWER(email) = $1 LIMIT 1", [cleanEmail]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          patient = {
            ...(r.raw_data || {}),
            id: r.id,
            tokenId: r.token_id,
            email: r.email ? r.email.toLowerCase().trim() : null,
            passwordHash: r.password_hash || (r.raw_data && r.raw_data.passwordHash) || null,
            phone: r.phone,
            encryptedName: r.encrypted_name,
            encryptedAge: r.encrypted_age,
            encryptedAddress: r.encrypted_address,
            encryptedMedications: r.encrypted_medications,
            encryptedConditions: r.encrypted_conditions,
            consentGiven: r.consent_given,
            consentTimestamp: r.consent_timestamp,
            facility: r.facility,
            isActive: r.is_active,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
          };
          memoryStore.patients.push(patient);
          persistStore();
          return patient;
        }
      } catch (err) {
        console.error("Cloud findPatientByEmail error:", err.message);
      }
    }
    return null;
  },

  async findPatientByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/\D/g, "");
    let patient = memoryStore.patients.find((p) => p.phone && String(p.phone).replace(/\D/g, "") === cleanPhone);
    if (patient) return patient;
    const p = db.getPool();
    if (p) {
      try {
        const res = await p.query("SELECT * FROM triaq_patients WHERE phone LIKE $1 LIMIT 1", [`%${cleanPhone.slice(-10)}%`]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          patient = {
            ...(r.raw_data || {}),
            id: r.id,
            tokenId: r.token_id,
            email: r.email ? r.email.toLowerCase().trim() : null,
            passwordHash: r.password_hash || (r.raw_data && r.raw_data.passwordHash) || null,
            phone: r.phone,
            encryptedName: r.encrypted_name,
            encryptedAge: r.encrypted_age,
            encryptedAddress: r.encrypted_address,
            encryptedMedications: r.encrypted_medications,
            encryptedConditions: r.encrypted_conditions,
            consentGiven: r.consent_given,
            consentTimestamp: r.consent_timestamp,
            facility: r.facility,
            isActive: r.is_active,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
          };
          memoryStore.patients.push(patient);
          persistStore();
          return patient;
        }
      } catch (err) {
        console.error("Cloud findPatientByPhone error:", err.message);
      }
    }
    return null;
  },

  async findPatientByAnyIdentifier(identifier) {
    if (!identifier) return null;
    const clean = String(identifier).trim();
    if (clean.includes("@")) {
      return await this.findPatientByEmail(clean);
    }
    const cleanDigits = clean.replace(/\D/g, "");
    if (cleanDigits.length >= 10) {
      return await this.findPatientByPhone(cleanDigits);
    }
    return (await this.findPatientByEmail(clean)) || (await this.findPatientById(clean));
  },

  async updatePatientProfile(id, profile) {
    const patient = memoryStore.patients.find((p) => p.id === id);
    if (!patient) return null;

    if (profile.name) patient.encryptedName = encryptPII(profile.name);
    if (profile.age) patient.encryptedAge = encryptPII(profile.age);
    if (profile.phone) {
      patient.phone = profile.phone;
      patient.encryptedPhone = encryptPII(profile.phone);
    }
    if (profile.address) patient.encryptedAddress = encryptPII(profile.address);
    if (profile.medications) patient.encryptedMedications = encryptPII(profile.medications);
    if (profile.conditions) patient.encryptedConditions = encryptPII(profile.conditions);
    if (profile.facility) patient.facility = profile.facility;
    patient.updatedAt = new Date().toISOString();

    persistStore();
    db.savePatientToCloud(patient).catch(console.error);
    return patient;
  },

  async updatePatientPassword(id, passwordHash) {
    const patient = memoryStore.patients.find((p) => p.id === id);
    if (!patient) return null;
    patient.passwordHash = passwordHash;
    patient.updatedAt = new Date().toISOString();
    persistStore();
    db.savePatientToCloud(patient).catch(console.error);
    return patient;
  },

  async getAllPatients(role = "DOCTOR") {
    return memoryStore.patients.map((p) => {
      if (role === "DOCTOR" || role === "MASTER") {
        return decryptPatientProfile(p);
      }
      return maskPatientProfile(p);
    });
  },

  // --- STAFF & USERS ---
  async findStaffByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    let staff = memoryStore.staff.find((s) => s.email && s.email.toLowerCase() === cleanEmail);
    if (staff) return staff;
    const p = db.getPool();
    if (p) {
      try {
        const res = await p.query("SELECT * FROM triaq_staff WHERE LOWER(email) = $1 LIMIT 1", [cleanEmail]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          staff = {
            ...(r.raw_data || {}),
            id: r.id,
            email: r.email ? r.email.toLowerCase().trim() : "",
            passwordHash: r.password_hash || (r.raw_data && r.raw_data.passwordHash) || null,
            name: r.name,
            role: r.role,
            facility: r.facility,
            phone: r.phone,
            isActive: r.is_active !== false,
            status: r.status || "APPROVED",
            requiresPasswordChange: r.requires_password_change || false,
            twoFactorSecret: r.two_factor_secret || null,
            backupCodes: r.backup_codes || [],
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
          };
          memoryStore.staff.push(staff);
          persistStore();
          return staff;
        }
      } catch (err) {
        console.error("Cloud findStaffByEmail error:", err.message);
      }
    }
    return null;
  },

  async findStaffByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/\D/g, "");
    let staff = memoryStore.staff.find((s) => s.phone && String(s.phone).replace(/\D/g, "") === cleanPhone);
    if (staff) return staff;
    const p = db.getPool();
    if (p) {
      try {
        const res = await p.query("SELECT * FROM triaq_staff WHERE phone LIKE $1 LIMIT 1", [`%${cleanPhone.slice(-10)}%`]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          staff = {
            ...(r.raw_data || {}),
            id: r.id,
            email: r.email ? r.email.toLowerCase().trim() : "",
            passwordHash: r.password_hash || (r.raw_data && r.raw_data.passwordHash) || null,
            name: r.name,
            role: r.role,
            facility: r.facility,
            phone: r.phone,
            isActive: r.is_active !== false,
            status: r.status || "APPROVED",
            requiresPasswordChange: r.requires_password_change || false,
            twoFactorSecret: r.two_factor_secret || null,
            backupCodes: r.backup_codes || [],
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
          };
          memoryStore.staff.push(staff);
          persistStore();
          return staff;
        }
      } catch (err) {
        console.error("Cloud findStaffByPhone error:", err.message);
      }
    }
    return null;
  },

  async findStaffByAnyIdentifier(identifier) {
    if (!identifier) return null;
    const clean = String(identifier).trim();
    if (clean.includes("@")) {
      return await this.findStaffByEmail(clean);
    }
    const cleanDigits = clean.replace(/\D/g, "");
    if (cleanDigits.length >= 10) {
      return await this.findStaffByPhone(cleanDigits);
    }
    return (await this.findStaffByEmail(clean)) || (await this.findStaffById(clean));
  },

  async findStaffById(id) {
    return memoryStore.staff.find((s) => s.id === id) || null;
  },

  async getAllStaff(filter = null) {
    let list = memoryStore.staff;
    if (filter) {
      const facility = typeof filter === "string" ? filter : filter.facility;
      if (facility && facility !== "ALL") {
        list = list.filter((s) => s.facility && s.facility.toLowerCase() === facility.toLowerCase());
      }
    }
    return list.map(({ passwordHash, twoFactorSecret, ...s }) => s);
  },

  async updateStaff(id, updateData) {
    const staff = memoryStore.staff.find((s) => s.id === id);
    if (!staff) return null;
    Object.assign(staff, updateData);
    persistStore();
    db.saveStaffToCloud(staff).catch(console.error);
    return staff;
  },

  async createStaff(data) {
    const newStaff = {
      id: "staff-" + Date.now().toString(36),
      email: data.email.trim().toLowerCase(),
      passwordHash: data.passwordHash,
      name: data.name,
      role: data.role || "NURSE",
      facility: data.facility || getDefaultFacilityName(),
      phone: data.phone ? String(data.phone).replace(/\D/g, "") : null,
      department: data.department || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      status: data.status || "PENDING",
      requiresPasswordChange: data.requiresPasswordChange !== undefined ? data.requiresPasswordChange : false,
      createdAt: new Date().toISOString()
    };
    memoryStore.staff.push(newStaff);
    persistStore();
    db.saveStaffToCloud(newStaff).catch(console.error);
    return newStaff;
  },

  async getPendingStaff(facility = null, role = null) {
    let list = (memoryStore.staff || []).filter((s) => s.status === "PENDING");
    if (facility && facility !== "ALL") {
      const target = facility.toLowerCase().trim();
      list = list.filter((s) => s.facility && s.facility.toLowerCase().trim() === target);
    }
    if (role === "STAFF" || role === "DOCTOR_NURSE") {
      list = list.filter((s) => s.role === "DOCTOR" || s.role === "NURSE");
    }
    return list.map(({ passwordHash, twoFactorSecret, ...s }) => s);
  },

  async updateStaffStatus(id, status) {
    let staff = memoryStore.staff.find((s) => s.id === id);
    if (!staff) {
      staff = await this.findStaffById(id);
    }
    if (!staff) return null;
    staff.status = status;
    if (status === "REJECTED") {
      staff.isActive = false;
    } else if (status === "APPROVED") {
      staff.isActive = true;
    }
    persistStore();
    db.saveStaffToCloud(staff).catch(console.error);
    return staff;
  },

  async deleteStaff(id) {
    const idx = memoryStore.staff.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    memoryStore.staff.splice(idx, 1);
    persistStore();
    db.deleteStaffFromCloud(id).catch(console.error);
    return true;
  },

  // --- TRIAGE NOTES ---
  async createTriageNote(data) {
    let patient = memoryStore.patients.find((p) => p.id === data.patientId);
    const pName = data.name || data.fullName || null;
    const pAge = data.age || null;
    const pPhone = data.phone || null;
    const pAddress = data.address || data.ward || null;

    if (!patient) {
      patient = await this.createPatient({
        id: data.patientId,
        facility: data.facility,
        name: pName,
        age: pAge,
        phone: pPhone,
        address: pAddress
      });
    } else {
      if (pName) patient.encryptedName = encryptPII(pName);
      if (pAge) patient.encryptedAge = encryptPII(pAge);
      if (pPhone) patient.phone = pPhone;
      if (pAddress) patient.encryptedAddress = encryptPII(pAddress);
      db.savePatientToCloud(patient).catch(console.error);
    }

    const targetFacility = data.facility || patient.facility || "GLOBAL";

    // GENERATE STRICTLY SEQUENTIAL TOKEN AT SYMPTOM SUBMISSION TIME
    let assignedToken = null;
    try {
      assignedToken = await db.getNextSequentialTokenNumber(targetFacility);
    } catch (e) {
      console.error("Error generating cloud token:", e);
    }
    if (!assignedToken) {
      tokenCounter += 1;
      assignedToken = `TOKEN NUMBER ${String(tokenCounter).padStart(2, "0")}`;
    }

    // Attach valid sequential token to patient record
    patient.tokenId = assignedToken;
    patient.facility = targetFacility;
    db.savePatientToCloud(patient).catch(console.error);

    const receiptNumber = generateReceiptNumber();
    const decryptedPat = decryptPatientProfile(patient) || {};

    const note = {
      id: generateCuid(),
      receiptNumber,
      patientId: patient.id,
      tokenId: assignedToken,
      patient: {
        id: patient.id,
        tokenId: assignedToken,
        name: pName || decryptedPat.name || "Patient",
        phone: pPhone || decryptedPat.phone || "--",
        age: pAge || decryptedPat.age || "--",
        address: pAddress || decryptedPat.address || "--",
        language: data.language || "en"
      },
      rawSymptomText: data.rawSymptomText,
      language: data.language || "en",
      summary: data.summary,
      originalSummary: data.summary,
      vitals: data.vitals || null,
      prescription: data.prescription || null,
      disposition: data.disposition || null,
      assignedRoom: data.assignedRoom || null,
      riskTag: data.riskTag,
      matchedRiskKeywords: data.matchedRiskKeywords || [],
      flagType: data.flagType || (data.riskTag === "RED" ? "RED" : data.riskTag === "YELLOW" ? "AMBER" : "GREEN"),
      redFlags: data.redFlags || (data.riskTag === "RED" ? (data.matchedRiskKeywords || []) : []),
      greenFlags: data.greenFlags || (data.riskTag === "GREEN" ? ["No life-threatening symptoms detected", "Stable routine OPD status"] : []),
      amberFlags: data.amberFlags || (data.riskTag === "YELLOW" ? (data.matchedRiskKeywords || []) : []),
      flagRationale: data.flagRationale || null,
      missingInfo: data.missingInfo || [],
      followUpQuestions: data.followUpQuestions || [],
      extractedReportData: data.extractedReportData || null,
      facility: data.facility || patient.facility || getDefaultFacilityName(),
      status: "PENDING",
      editHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      auditLogs: []
    };

    memoryStore.triageNotes.unshift(note);
    persistStore();
    db.saveTriageNoteToCloud(note).catch(console.error);
    return note;
  },

  async getPendingNotes(options = {}) {
    const { facility, role = "DOCTOR" } = options;
    let notes = memoryStore.triageNotes.filter((n) => n.status === "PENDING");

    if (facility && facility !== "ALL" && facility !== "All Facilities" && facility !== "GLOBAL") {
      notes = notes.filter((n) => isSameFacility(n.facility, facility));
    }

    // Role-based masking of patient info
    const formattedNotes = notes.map((note) => {
      const patient = memoryStore.patients.find((p) => p.id === note.patientId);
      const patientData = role === "DOCTOR" || role === "MASTER" ? decryptPatientProfile(patient) : maskPatientProfile(patient);
      const basePatient = note.patient || {};
      const mergedPatient = {
        ...basePatient,
        ...(patientData || {})
      };
      if ((!mergedPatient.name || mergedPatient.name === "Anonymous Patient") && basePatient.name && basePatient.name !== "Anonymous Patient") {
        mergedPatient.name = basePatient.name;
      }
      if ((!mergedPatient.age || mergedPatient.age === "--") && basePatient.age && basePatient.age !== "--") {
        mergedPatient.age = basePatient.age;
      }
      if ((!mergedPatient.address || mergedPatient.address === "--") && basePatient.address && basePatient.address !== "--") {
        mergedPatient.address = basePatient.address;
      }
      return {
        ...note,
        patient: mergedPatient
      };
    });

    return formattedNotes.sort((a, b) => {
      const priorityA = RISK_PRIORITY[a.riskTag] || 99;
      const priorityB = RISK_PRIORITY[b.riskTag] || 99;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },

  async getNoteById(id, role = "DOCTOR") {
    const note = memoryStore.triageNotes.find((n) => n.id === id);
    if (!note) return null;

    const patient = memoryStore.patients.find((p) => p.id === note.patientId);
    const patientData = role === "DOCTOR" || role === "MASTER" ? decryptPatientProfile(patient) : maskPatientProfile(patient);

    return {
      ...note,
      patient: patientData || note.patient
    };
  },

  async getNoteByReceiptNumber(receiptNumber) {
    const note = memoryStore.triageNotes.find((n) => n.receiptNumber === receiptNumber);
    if (!note) return null;
    const patient = memoryStore.patients.find((p) => p.id === note.patientId);
    return {
      ...note,
      patient: decryptPatientProfile(patient) || note.patient
    };
  },

  async getLatestNoteForPatient(patientId) {
    const notes = memoryStore.triageNotes.filter((n) => n.patientId === patientId);
    if (!notes.length) return null;
    const sorted = notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latest = sorted[0];
    const patient = memoryStore.patients.find((p) => p.id === latest.patientId);
    return {
      ...latest,
      patient: decryptPatientProfile(patient) || latest.patient
    };
  },

  async getAllNotes(options = {}) {
    const { facility, role = "DOCTOR", status } = options;
    let notes = [...memoryStore.triageNotes];

    if (status && status !== "ALL") {
      notes = notes.filter((n) => n.status === status);
    }
    if (facility && facility !== "ALL" && facility !== "All Facilities" && facility !== "GLOBAL") {
      notes = notes.filter((n) => isSameFacility(n.facility, facility));
    }

    const formattedNotes = notes.map((note) => {
      const patient = memoryStore.patients.find((p) => p.id === note.patientId);
      const patientData = role === "DOCTOR" || role === "MASTER" || role === "ADMIN" 
        ? decryptPatientProfile(patient) 
        : maskPatientProfile(patient);
      const basePatient = note.patient || {};
      const mergedPatient = {
        ...basePatient,
        ...(patientData || {})
      };
      if ((!mergedPatient.name || mergedPatient.name === "Anonymous Patient") && basePatient.name && basePatient.name !== "Anonymous Patient") {
        mergedPatient.name = basePatient.name;
      }
      if ((!mergedPatient.age || mergedPatient.age === "--") && basePatient.age && basePatient.age !== "--") {
        mergedPatient.age = basePatient.age;
      }
      if ((!mergedPatient.address || mergedPatient.address === "--") && basePatient.address && basePatient.address !== "--") {
        mergedPatient.address = basePatient.address;
      }
      return {
        ...note,
        patient: mergedPatient
      };
    });

    return formattedNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async findNoteByQuery(query) {
    if (!query) return null;
    const cleanQuery = String(query).trim();
    const cleanDigits = cleanQuery.replace(/\D/g, "");

    // 1. Check exact receipt number match (e.g. TRIAQ-2026-...)
    let note = memoryStore.triageNotes.find(
      (n) => n.receiptNumber && n.receiptNumber.toLowerCase() === cleanQuery.toLowerCase()
    );
    if (note) {
      const patient = memoryStore.patients.find((p) => p.id === note.patientId);
      return { ...note, patient: decryptPatientProfile(patient) || note.patient };
    }

    // 2. Check token ID match (e.g. "TOKEN NUMBER 01", "TK-01", "01")
    note = memoryStore.triageNotes.find((n) => {
      const t = (n.patient?.tokenId || n.tokenId || "").toLowerCase();
      if (!t) return false;
      if (t === cleanQuery.toLowerCase()) return true;
      if (cleanDigits && t.replace(/\D/g, "") === cleanDigits) return true;
      return false;
    });
    if (note) {
      const patient = memoryStore.patients.find((p) => p.id === note.patientId);
      return { ...note, patient: decryptPatientProfile(patient) || note.patient };
    }

    // 3. Check by patient phone number (if 10-digits or cleanDigits >= 10)
    if (cleanDigits.length >= 10) {
      const last10 = cleanDigits.slice(-10);
      note = memoryStore.triageNotes
        .filter((n) => {
          const pPhone = n.patient?.phone ? String(n.patient.phone).replace(/\D/g, "") : "";
          return pPhone.endsWith(last10);
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (note) {
        const patient = memoryStore.patients.find((p) => p.id === note.patientId);
        return { ...note, patient: decryptPatientProfile(patient) || note.patient };
      }

      // Check in patients store
      const patient = memoryStore.patients.find((p) => {
        const pPhone = p.phone ? String(p.phone).replace(/\D/g, "") : "";
        return pPhone.endsWith(last10);
      });
      if (patient) {
        return this.getLatestNoteForPatient(patient.id);
      }
    }

    // 4. Check by patientId
    return this.getLatestNoteForPatient(cleanQuery);
  },

  async updateTriageDecision(id, updateData) {
    const note = memoryStore.triageNotes.find((n) => n.id === id);
    if (!note) return null;

    const { action, reviewerId, editedSummary, note: reviewerNote, disposition, prescription, reason, ipAddress, userAgent } = updateData;

    let newStatus = "APPROVED";
    let changes = null;

    if (action === "EDIT_APPROVE") {
      newStatus = "EDITED";
      changes = {
        from: note.summary,
        to: editedSummary
      };
      note.summary = editedSummary;
      note.editHistory.push({
        editedAt: new Date().toISOString(),
        editedBy: reviewerId,
        diff: changes
      });
    } else if (action === "REJECT") {
      newStatus = "REJECTED";
    } else if (action === "ESCALATE") {
      newStatus = "PENDING"; // Keep pending but flagged for doctor
      note.escalatedTo = "DOCTOR";
    }

    note.status = newStatus;
    if (disposition) note.disposition = disposition;
    if (prescription) note.prescription = prescription;
    if (updateData.assignedRoom) {
      note.assignedRoom = updateData.assignedRoom;
      if (note.patient) note.patient.assignedRoom = updateData.assignedRoom;
    }
    note.updatedAt = new Date().toISOString();

    // Add immutable audit log
    const auditEntry = {
      id: generateCuid(),
      triageNoteId: note.id,
      triageNote: {
        id: note.id,
        tokenId: note.patient?.tokenId,
        receiptNumber: note.receiptNumber,
        riskTag: note.riskTag
      },
      action,
      reviewerId,
      disposition: disposition || null,
      prescription: prescription || null,
      note: reviewerNote || reason || null,
      changedFields: changes,
      ipAddress: ipAddress || "127.0.0.1",
      userAgent: userAgent || "TriaQ Clinical Workstation",
      timestamp: new Date().toISOString()
    };

    memoryStore.auditLogs.unshift(auditEntry);
    note.auditLogs.unshift(auditEntry);
    persistStore();
    db.saveTriageNoteToCloud(note).catch(console.error);
    db.saveAuditLogToCloud(auditEntry).catch(console.error);

    return { note, auditEntry };
  },

  async overrideDecision(id, overrideData) {
    const note = memoryStore.triageNotes.find((n) => n.id === id);
    if (!note) return null;

    const { newStatus, reason, masterId, ipAddress } = overrideData;
    const oldStatus = note.status;
    note.status = newStatus;
    note.updatedAt = new Date().toISOString();

    const auditEntry = {
      id: generateCuid(),
      triageNoteId: note.id,
      triageNote: {
        id: note.id,
        tokenId: note.patient?.tokenId,
        receiptNumber: note.receiptNumber,
        riskTag: note.riskTag
      },
      action: "OVERRIDE",
      reviewerId: masterId || "System Master",
      note: `MASTER Override [${oldStatus} -> ${newStatus}]. Reason: ${reason}`,
      ipAddress: ipAddress || "127.0.0.1",
      timestamp: new Date().toISOString()
    };

    memoryStore.auditLogs.unshift(auditEntry);
    note.auditLogs.unshift(auditEntry);
    persistStore();
    db.saveTriageNoteToCloud(note).catch(console.error);
    db.saveAuditLogToCloud(auditEntry).catch(console.error);

    return { note, auditEntry };
  },

  async getAuditLogs(limit = 50, facility = null) {
    let logs = memoryStore.auditLogs;
    if (facility && facility !== "ALL") {
      logs = logs.filter((l) => l.facility === facility);
    }
    return logs.slice(0, limit);
  },

  async getAllNotes(options = {}) {
    return memoryStore.triageNotes;
  },

  // --- ANALYTICS ---
  async getSystemAnalytics() {
    const total = memoryStore.triageNotes.length;
    const red = memoryStore.triageNotes.filter((n) => n.riskTag === "RED").length;
    const yellow = memoryStore.triageNotes.filter((n) => n.riskTag === "YELLOW" || n.riskTag === "AMBER").length;
    const green = memoryStore.triageNotes.filter((n) => n.riskTag === "GREEN").length;
    const approved = memoryStore.triageNotes.filter((n) => n.status === "APPROVED" || n.status === "EDITED").length;
    const rejected = memoryStore.triageNotes.filter((n) => n.status === "REJECTED").length;
    const pending = memoryStore.triageNotes.filter((n) => n.status === "PENDING").length;

    return {
      totalPatients: memoryStore.patients.length,
      totalTriageNotes: total,
      pendingCount: pending,
      approvedCount: approved,
      rejectedCount: rejected,
      priorityDistribution: {
        red,
        yellow,
        green,
        redPercentage: total > 0 ? ((red / total) * 100).toFixed(1) : "0.0"
      },
      avgTurnaroundMinutes: 3.8,
      activeStaffCount: memoryStore.staff.filter((s) => s.isActive).length,
      facilities: memoryStore.facilities
    };
  },

  // --- FACILITIES ---
  async getAllFacilities(includePending = false) {
    if (includePending) {
      return memoryStore.facilities || [];
    }
    return (memoryStore.facilities || []).filter((f) => f.status === "APPROVED");
  },

  async findFacilityById(id) {
    if (!id) return null;
    let fac = (memoryStore.facilities || []).find((f) => f.id === id);
    if (fac) return fac;
    const p = db.getPool();
    if (p) {
      try {
        const res = await p.query("SELECT * FROM triaq_facilities WHERE id = $1 LIMIT 1", [id]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          fac = {
            id: r.id,
            name: r.name,
            phone: r.phone,
            address: r.address,
            state: r.state || "",
            district: r.district || "",
            city: r.city || "",
            type: r.type || "HOSPITAL",
            code: r.code || r.id,
            adminEmail: r.admin_email ? r.admin_email.toLowerCase().trim() : null,
            adminPasswordHash: r.admin_password_hash || null,
            status: r.status || "APPROVED",
            licenseNumber: r.license_number || "",
            rooms: r.rooms || [],
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
          };
          if (!memoryStore.facilities) memoryStore.facilities = [];
          memoryStore.facilities.push(fac);
          persistStore();
          return fac;
        }
      } catch (err) {
        console.error("Cloud findFacilityById error:", err.message);
      }
    }
    return null;
  },

  async findFacilityByName(name) {
    if (!name) return null;
    const clean = name.trim().toLowerCase();
    let fac = (memoryStore.facilities || []).find((f) => f.name && f.name.toLowerCase() === clean);
    if (fac) return fac;
    const p = db.getPool();
    if (p) {
      try {
        const res = await p.query("SELECT * FROM triaq_facilities WHERE LOWER(name) = $1 LIMIT 1", [clean]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          fac = {
            id: r.id,
            name: r.name,
            phone: r.phone,
            address: r.address,
            state: r.state || "",
            district: r.district || "",
            city: r.city || "",
            type: r.type || "HOSPITAL",
            code: r.code || r.id,
            adminEmail: r.admin_email ? r.admin_email.toLowerCase().trim() : null,
            adminPasswordHash: r.admin_password_hash || null,
            status: r.status || "APPROVED",
            licenseNumber: r.license_number || "",
            rooms: r.rooms || [],
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
          };
          if (!memoryStore.facilities) memoryStore.facilities = [];
          memoryStore.facilities.push(fac);
          persistStore();
          return fac;
        }
      } catch (err) {
        console.error("Cloud findFacilityByName error:", err.message);
      }
    }
    return null;
  },

  async findFacilityByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    let fac = (memoryStore.facilities || []).find((f) => f.adminEmail && f.adminEmail.toLowerCase() === clean);
    if (fac) return fac;
    const p = db.getPool();
    if (p) {
      try {
        const res = await p.query("SELECT * FROM triaq_facilities WHERE LOWER(admin_email) = $1 LIMIT 1", [clean]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          fac = {
            id: r.id,
            name: r.name,
            phone: r.phone,
            address: r.address,
            state: r.state || "",
            district: r.district || "",
            city: r.city || "",
            type: r.type || "HOSPITAL",
            code: r.code || r.id,
            adminEmail: r.admin_email ? r.admin_email.toLowerCase().trim() : null,
            adminPasswordHash: r.admin_password_hash || null,
            status: r.status || "APPROVED",
            licenseNumber: r.license_number || "",
            rooms: r.rooms || [],
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
          };
          if (!memoryStore.facilities) memoryStore.facilities = [];
          memoryStore.facilities.push(fac);
          persistStore();
          return fac;
        }
      } catch (err) {
        console.error("Cloud findFacilityByEmail error:", err.message);
      }
    }
    return null;
  },

  async findFacilityByAnyIdentifier(identifier) {
    if (!identifier) return null;
    const raw = String(identifier).trim();
    const cleanLower = raw.toLowerCase();
    const cleanUpper = raw.toUpperCase();
    const cleanDigits = raw.replace(/\D/g, "");

    // 1. Check memory store
    let fac = (memoryStore.facilities || []).find((f) => {
      if (f.adminEmail && f.adminEmail.toLowerCase() === cleanLower) return true;
      if (f.id && f.id.toLowerCase() === cleanLower) return true;
      if (f.licenseNumber && f.licenseNumber.toUpperCase() === cleanUpper) return true;
      if (f.code && f.code.toUpperCase() === cleanUpper) return true;
      if (cleanDigits.length >= 10 && f.phone && String(f.phone).replace(/\D/g, "").endsWith(cleanDigits.slice(-10))) return true;
      if (f.name && f.name.toLowerCase() === cleanLower) return true;
      return false;
    });
    if (fac) return fac;

    // 2. Check cloud database
    const p = db.getPool();
    if (p) {
      try {
        const phonePattern = cleanDigits.length >= 10 ? `%${cleanDigits.slice(-10)}%` : "%EMPTY%";
        const res = await p.query(`
          SELECT * FROM triaq_facilities 
          WHERE LOWER(admin_email) = $1 
             OR id = $2 
             OR UPPER(license_number) = $3 
             OR UPPER(code) = $3 
             OR phone LIKE $4 
             OR LOWER(name) = $1
          LIMIT 1
        `, [cleanLower, raw, cleanUpper, phonePattern]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          fac = {
            id: r.id,
            name: r.name,
            phone: r.phone,
            address: r.address,
            state: r.state || "",
            district: r.district || "",
            city: r.city || "",
            type: r.type || "HOSPITAL",
            code: r.code || r.id,
            adminEmail: r.admin_email ? r.admin_email.toLowerCase().trim() : null,
            adminPasswordHash: r.admin_password_hash || null,
            status: r.status || "APPROVED",
            licenseNumber: r.license_number || "",
            rooms: r.rooms || [],
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
          };
          if (!memoryStore.facilities) memoryStore.facilities = [];
          memoryStore.facilities.push(fac);
          persistStore();
          return fac;
        }
      } catch (err) {
        console.error("Cloud findFacilityByAnyIdentifier error:", err.message);
      }
    }
    return null;
  },

  async createFacility(data) {
    const id = data.id || "fac-" + Date.now().toString(36);
    const code = data.code || String(data.name || "FAC").toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 16);
    const newFacility = {
      id,
      name: data.name.trim(),
      phone: data.phone || null,
      address: data.address || null,
      state: data.state ? data.state.trim() : null,
      district: data.district ? data.district.trim() : null,
      city: data.city ? data.city.trim() : null,
      type: (data.type || "HOSPITAL").toUpperCase(),
      code,
      adminEmail: data.adminEmail ? data.adminEmail.trim().toLowerCase() : null,
      adminPasswordHash: data.adminPasswordHash || null,
      status: data.status || "APPROVED",
      licenseNumber: data.licenseNumber ? data.licenseNumber.trim() : null,
      rooms: Array.isArray(data.rooms) ? data.rooms : [],
      createdAt: new Date().toISOString()
    };
    if (!memoryStore.facilities) memoryStore.facilities = [];
    memoryStore.facilities.push(newFacility);
    persistStore();
    db.saveFacilityToCloud(newFacility).catch(console.error);
    return newFacility;
  },

  async getFacilityRooms(facilityIdOrName) {
    if (!facilityIdOrName) return [];
    const fac = (memoryStore.facilities || []).find(
      (f) => f.id === facilityIdOrName || f.name.toLowerCase() === String(facilityIdOrName).toLowerCase()
    );
    if (!fac || !Array.isArray(fac.rooms)) {
      return [];
    }
    return fac.rooms;
  },

  async addFacilityRoom(facilityId, roomData) {
    const fac = (memoryStore.facilities || []).find((f) => f.id === facilityId || f.name.toLowerCase() === String(facilityId).toLowerCase());
    if (!fac) return null;
    if (!Array.isArray(fac.rooms)) fac.rooms = [];
    const newRoom = {
      id: "room-" + Date.now().toString(36),
      roomNumber: roomData.roomNumber ? roomData.roomNumber.trim() : `Room ${fac.rooms.length + 1}`,
      name: roomData.name ? roomData.name.trim() : "General Consultation",
      category: roomData.category || "OPD_CLINIC",
      floor: roomData.floor ? roomData.floor.trim() : "Ground Floor",
      urgency: roomData.urgency || (roomData.category === "EMERGENCY_WARD" ? "RED" : "GREEN")
    };
    fac.rooms.push(newRoom);
    persistStore();
    db.saveFacilityToCloud(fac).catch(console.error);
    return newRoom;
  },

  async deleteFacilityRoom(facilityId, roomId) {
    const fac = (memoryStore.facilities || []).find((f) => f.id === facilityId || f.name.toLowerCase() === String(facilityId).toLowerCase());
    if (!fac || !Array.isArray(fac.rooms)) return false;
    fac.rooms = fac.rooms.filter((r) => r.id !== roomId && r.roomNumber !== roomId);
    persistStore();
    db.saveFacilityToCloud(fac).catch(console.error);
    return true;
  },

  async getPendingFacilities() {
    return (memoryStore.facilities || []).filter((f) => f.status === "PENDING");
  },

  async updateFacilityStatus(id, status) {
    let fac = (memoryStore.facilities || []).find((f) => f.id === id);
    if (!fac) {
      fac = await this.findFacilityById(id);
    }
    if (!fac) return null;
    fac.status = status;
    persistStore();
    db.saveFacilityToCloud(fac).catch(console.error);
    return fac;
  },

  async deleteFacility(id) {
    if (!memoryStore.facilities) return false;
    memoryStore.facilities = memoryStore.facilities.filter((f) => f.id !== id);
    persistStore();
    db.deleteFacilityFromCloud(id).catch(console.error);
    return true;
  },

  
  async createReferral({ triageNoteId, targetFacility, referralReason, doctorName, doctorRole, staffId, patientToken, patientName, patientAge, riskTag, facility }) {
    const referral = {
      id: `ref-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      triageNoteId,
      targetFacility,
      referralReason,
      doctorName: doctorName || "Duty Medical Officer",
      doctorRole: doctorRole || "DOCTOR",
      staffId: staffId || null,
      patientToken: patientToken || null,
      patientName: patientName || null,
      patientAge: patientAge || null,
      riskTag: riskTag || "AMBER",
      facility: facility || "Healthcare Center",
      status: "SENT",
      createdAt: new Date().toISOString()
    };

    if (!Array.isArray(memoryStore.referrals)) {
      memoryStore.referrals = [];
    }
    memoryStore.referrals.unshift(referral);
    persistStore();

    // Persist to Supabase Cloud
    db.saveReferralToCloud(referral).catch(() => {});

    // Create Audit Log
    const auditEntry = {
      id: generateCuid(),
      triageNoteId,
      reviewerId: staffId || "STAFF",
      action: "PATIENT_REFERRED",
      note: `Patient referred to ${targetFacility}. Reason: ${referralReason}`,
      changedFields: { targetFacility, referralReason, status: "SENT" },
      timestamp: new Date().toISOString()
    };
    memoryStore.auditLogs.unshift(auditEntry);
    db.saveAuditLogToCloud(auditEntry).catch(() => {});

    return referral;
  },

  async getAllReferrals(facility = null) {
    if (!Array.isArray(memoryStore.referrals)) {
      memoryStore.referrals = [];
    }
    if (!facility) return memoryStore.referrals;
    return memoryStore.referrals.filter(r => (r.facility || "").toLowerCase() === facility.toLowerCase());
  },

  async getReferralById(id) {
    if (!Array.isArray(memoryStore.referrals)) {
      memoryStore.referrals = [];
    }
    return memoryStore.referrals.find(r => r.id === id) || null;
  },

  getTriageNoteById(id) {
    return this.getNoteById(id);
  },

  async updateNoteReferral(noteId, referral, targetFacility) {
    const note = memoryStore.triageNotes.find((n) => n.id === noteId);
    if (note) {
      note.referral = referral;
      note.status = "REFERRED";
      note.disposition = `Referred to ${targetFacility}`;
      persistStore();
      db.saveTriageNoteToCloud(note).catch(() => {});
      return note;
    }
    return null;
  },

  // --- EMERGENCY CASUALTY CASES ---
  async createEmergencyCase(data) {
    if (!Array.isArray(memoryStore.emergencyCases)) {
      memoryStore.emergencyCases = [...initialEmergencyCases];
    }
    // Generate clean 6-char readable uppercase code
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    let randomPart = "";
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const caseId = `EM-${randomPart}`;
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const nowIso = new Date().toISOString();

    const newCase = {
      id: `emc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      caseId,
      type: (data.type && data.type.trim()) || "Emergency Incident",
      description: (data.description && data.description.trim()) || "",
      patientName: (data.patientName && data.patientName.trim()) || "Unknown Patient",
      reporterPhone: (data.reporterPhone && data.reporterPhone.trim()) || null,
      location: (data.location && data.location.trim()) || "Location not specified",
      status: "en_route", // 'en_route' | 'received' | 'closed'
      claimedByHospital: null,
      pin,
      updates: [],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    memoryStore.emergencyCases.unshift(newCase);
    persistStore();
    db.saveEmergencyCaseToCloud(newCase).catch(() => {});
    return newCase;
  },

  async getEmergencyCase(caseId, pin) {
    if (!caseId) return null;
    const cleanId = String(caseId).trim().toUpperCase();
    let emCase = (memoryStore.emergencyCases || []).find(
      (c) => c.caseId.toUpperCase() === cleanId || c.id === caseId
    );

    if (!emCase) {
      // Cloud database lookup fallback
      const p = db.getPool();
      if (p) {
        try {
          const res = await p.query(
            "SELECT * FROM triaq_emergency_cases WHERE UPPER(case_id) = $1 OR id = $2 LIMIT 1",
            [cleanId, caseId]
          );
          if (res.rows.length > 0) {
            const r = res.rows[0];
            emCase = {
              id: r.id,
              caseId: r.case_id,
              type: r.type,
              description: r.description,
              patientName: r.patient_name,
              reporterPhone: r.reporter_phone,
              location: r.location,
              status: r.status,
              claimedByHospital: r.claimed_by_hospital,
              pin: r.pin,
              updates: Array.isArray(r.updates) ? r.updates : (typeof r.updates === "string" ? JSON.parse(r.updates) : []),
              createdAt: r.created_at,
              updatedAt: r.updated_at
            };
            memoryStore.emergencyCases.unshift(emCase);
          }
        } catch (e) {
          console.error("Cloud emergency lookup error:", e.message);
        }
      }
    }

    if (!emCase) return null;

    // Verify PIN for protected full details
    if (!pin || String(emCase.pin).trim() !== String(pin).trim()) {
      return { error: "INVALID_PIN", message: "Incorrect Emergency Access PIN. Case details are protected." };
    }

    // Return with newest updates first
    const sortedUpdates = [...(emCase.updates || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return { ...emCase, updates: sortedUpdates };
  },

  async addEmergencyCaseUpdate(caseId, pin, updateText) {
    if (!caseId || !updateText) return { error: "MISSING_DATA", message: "Case ID and update text are required." };
    const caseResult = await this.getEmergencyCase(caseId, pin);
    if (!caseResult || caseResult.error) return caseResult;

    const emCase = (memoryStore.emergencyCases || []).find(
      (c) => c.caseId.toUpperCase() === String(caseId).trim().toUpperCase() || c.id === caseId
    );
    if (!emCase) return { error: "NOT_FOUND", message: "Case not found." };

    const newUpdate = {
      id: `upd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      text: updateText.trim(),
      createdAt: new Date().toISOString()
    };

    if (!Array.isArray(emCase.updates)) emCase.updates = [];
    emCase.updates.unshift(newUpdate);
    emCase.updatedAt = new Date().toISOString();

    persistStore();
    db.saveEmergencyCaseToCloud(emCase).catch(() => {});

    const sortedUpdates = [...emCase.updates].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    return { ...emCase, updates: sortedUpdates };
  },

  async claimEmergencyCase(caseId, pin, hospitalName) {
    if (!caseId) return { error: "MISSING_DATA", message: "Case ID is required." };
    const caseResult = await this.getEmergencyCase(caseId, pin);
    if (!caseResult || caseResult.error) return caseResult;

    const emCase = (memoryStore.emergencyCases || []).find(
      (c) => c.caseId.toUpperCase() === String(caseId).trim().toUpperCase() || c.id === caseId
    );
    if (!emCase) return { error: "NOT_FOUND", message: "Case not found." };

    const targetHosp = hospitalName || "Receiving Hospital Casualty Department";
    emCase.status = "received";
    emCase.claimedByHospital = targetHosp;
    emCase.updatedAt = new Date().toISOString();

    const autoReceiptUpdate = {
      id: `upd-${Date.now().toString(36)}`,
      text: `Patient received at ${targetHosp}`,
      createdAt: new Date().toISOString()
    };
    emCase.updates.unshift(autoReceiptUpdate);

    persistStore();
    db.saveEmergencyCaseToCloud(emCase).catch(() => {});

    const sortedUpdates = [...emCase.updates].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    return { ...emCase, updates: sortedUpdates };
  },

  async getAllEmergencyCases() {
    if (!Array.isArray(memoryStore.emergencyCases)) {
      memoryStore.emergencyCases = [...initialEmergencyCases];
    }
    // Return newest first summary list for hospital emergency board
    return memoryStore.emergencyCases
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((c) => {
        const sorted = (c.updates || []).slice().sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));
        return {
          id: c.id,
          caseId: c.caseId,
          type: c.type,
          description: c.description,
          patientName: c.patientName,
          location: c.location,
          status: c.status,
          claimedByHospital: c.claimedByHospital,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          updateCount: (c.updates || []).length,
          latestUpdate: sorted[0] ? sorted[0].text : null,
          latestUpdateAt: sorted[0] ? sorted[0].createdAt : c.createdAt
        };
      });
  },

  async clearAllData() {
    memoryStore.patients = [];
    memoryStore.triageNotes = [];
    memoryStore.auditLogs = [];
    memoryStore.referrals = [];
    memoryStore.staff = [...initialStaff];
    persistStore();

    const pool = db.getPool();
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("TRUNCATE TABLE triaq_patients CASCADE");
        await client.query("TRUNCATE TABLE triaq_triage_notes CASCADE");
        await client.query("TRUNCATE TABLE triaq_audit_logs CASCADE");
        await client.query("TRUNCATE TABLE triaq_referrals CASCADE");
        await client.query("TRUNCATE TABLE triaq_facility_token_counters CASCADE");
        await client.query("TRUNCATE TABLE triaq_staff CASCADE");
        await client.query("COMMIT");

        for (const s of initialStaff) {
          await db.saveStaffToCloud(s);
        }
        console.log("[Supabase Database] Successfully wiped all patients, triage notes, referrals, token counters, and audit logs!");
      } catch (e) {
        await client.query("ROLLBACK");
        console.error("Clear data error:", e.message);
      } finally {
        client.release();
      }
    }
    return { success: true };
  }
};

module.exports = storage;
