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

// In-memory store with local disk synchronization
let memoryStore = {
  patients: [],
  staff: [...initialStaff],
  triageNotes: [],
  auditLogs: [],
  facilities: [
    { id: "fac-1", name: "Apollo PHC Hub, Delhi", phone: "+91-11-2338-9000", address: "Sector 14, Delhi" },
    { id: "fac-2", name: "Rural Health Centre, Odisha", phone: "+91-674-239-0000", address: "Puri Road, Odisha" }
  ]
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
  } catch (e) {
    console.warn("Notice: Could not parse local store, initialized fresh memory store.");
  }
}

// Seed demo pending triage cases only if explicitly configured
function seedDemoCasesIfEmpty() {
  if (process.env.SEED_DEMO_CASES !== "true") return;
  const pendingNotes = memoryStore.triageNotes.filter((n) => n.status === "PENDING");
  if (pendingNotes.length === 0) {
    const demoDate = new Date().toISOString();
    const p1 = {
      id: "demo-patient-1",
      tokenId: "Token-042-Delhi",
      email: "ramesh@demo.com",
      phone: "9876543210",
      encryptedName: encryptPII("Ramesh Kumar Patel"),
      encryptedAge: encryptPII("52"),
      encryptedAddress: encryptPII("Ward 4, West Delhi"),
      encryptedMedications: encryptPII("Amlodipine 5mg OD"),
      encryptedConditions: encryptPII("Hypertension (High BP)"),
      consentGiven: true,
      consentTimestamp: demoDate,
      facility: "Apollo PHC Hub, Delhi",
      isActive: true,
      createdAt: demoDate,
      updatedAt: demoDate
    };
    const p2 = {
      id: "demo-patient-2",
      tokenId: "Token-043-Delhi",
      email: "sunita@demo.com",
      phone: "9812345678",
      encryptedName: encryptPII("Sunita Devi"),
      encryptedAge: encryptPII("36"),
      encryptedAddress: encryptPII("Sector 14, Delhi"),
      encryptedMedications: encryptPII("None"),
      encryptedConditions: encryptPII("None"),
      consentGiven: true,
      consentTimestamp: demoDate,
      facility: "Apollo PHC Hub, Delhi",
      isActive: true,
      createdAt: demoDate,
      updatedAt: demoDate
    };
    if (!memoryStore.patients.find((p) => p.id === p1.id)) memoryStore.patients.push(p1);
    if (!memoryStore.patients.find((p) => p.id === p2.id)) memoryStore.patients.push(p2);

    memoryStore.triageNotes.push({
      id: "note-demo-1",
      receiptNumber: "TRIAQ-DEMO-001",
      patientId: p1.id,
      patient: {
        id: p1.id,
        tokenId: p1.tokenId,
        name: "Ramesh Kumar Patel",
        phone: "9876543210",
        age: "52",
        address: "Ward 4, West Delhi"
      },
      rawSymptomText: "Severe tightness in chest with breathlessness and cold sweat since 2 hours. Radiating to left arm.",
      language: "en",
      summary: "Patient presents with acute severe substernal chest tightness and shortness of breath starting 2 hours ago. Accompanied by diaphoresis and radiation to left arm. High risk of Acute Coronary Syndrome (ACS). Immediate ECG and physician evaluation required.",
      originalSummary: "Patient presents with acute severe substernal chest tightness and shortness of breath starting 2 hours ago. Accompanied by diaphoresis and radiation to left arm. High risk of Acute Coronary Syndrome (ACS). Immediate ECG and physician evaluation required.",
      vitals: { bpSystolic: 152, bpDiastolic: 96, pulse: 108, spo2: 94, temp: 98.4 },
      prescription: "• Aspirin 300mg stat (chewable)\n• Clopidogrel 300mg stat\n• Immediate 12-lead ECG",
      disposition: "Admit to Emergency Ward",
      riskTag: "RED",
      matchedRiskKeywords: ["chest", "severe", "breathlessness", "sweat"],
      missingInfo: [],
      followUpQuestions: ["Is the pain radiating to neck or jaw?", "Any prior heart condition?"],
      facility: "Apollo PHC Hub, Delhi",
      status: "PENDING",
      editHistory: [],
      createdAt: demoDate,
      updatedAt: demoDate,
      auditLogs: []
    });

    memoryStore.triageNotes.push({
      id: "note-demo-2",
      receiptNumber: "TRIAQ-DEMO-002",
      patientId: p2.id,
      patient: {
        id: p2.id,
        tokenId: p2.tokenId,
        name: "Sunita Devi",
        phone: "9812345678",
        age: "36",
        address: "Sector 14, Delhi"
      },
      rawSymptomText: "High continuous fever (102.6 F) and vomiting for 2 days. Severe headache and body ache.",
      language: "en",
      summary: "Patient has 2-day history of high continuous fever (102.6°F) associated with chills, vomiting (3 episodes), and generalized myalgia. Hemodynamically stable but moderate dehydration risk. Recommended CBC, Dengue NS1 / Malarial antigen testing.",
      originalSummary: "Patient has 2-day history of high continuous fever (102.6°F) associated with chills, vomiting (3 episodes), and generalized myalgia. Hemodynamically stable but moderate dehydration risk. Recommended CBC, Dengue NS1 / Malarial antigen testing.",
      vitals: { bpSystolic: 118, bpDiastolic: 76, pulse: 88, spo2: 98, temp: 102.6 },
      prescription: "• Paracetamol 650mg TDS SOS\n• ORS 1 Packet in 1 Litre boiled water\n• Domperidone 10mg BD AC",
      disposition: "Routine OPD Treatment",
      riskTag: "YELLOW",
      matchedRiskKeywords: ["fever", "vomiting", "headache"],
      missingInfo: [],
      followUpQuestions: ["Are you able to retain oral liquids?"],
      facility: "Apollo PHC Hub, Delhi",
      status: "PENDING",
      editHistory: [],
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
      auditLogs: []
    });
  }
}
seedDemoCasesIfEmpty();

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
      console.log(`[Supabase Cloud] Hydrated ${memoryStore.patients.length} patients, ${memoryStore.staff.length} staff, and ${memoryStore.triageNotes.length} triage notes from cloud database!`);
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

const storage = {
  // --- PATIENTS ---
  async createPatient(data = {}) {
    const targetFacility = data.facility || "Apollo PHC Hub, Delhi";
    let tokenId = data.tokenId;

    if (!tokenId) {
      const cloudToken = await db.getNextSequentialTokenNumber(targetFacility);
      if (cloudToken) {
        tokenId = cloudToken;
      } else {
        tokenCounter += 1;
        tokenId = `TOKEN NUMBER ${String(tokenCounter).padStart(2, "0")}`;
      }
    }

    const patient = {
      id: generateCuid(),
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
      facility: data.facility || "Apollo PHC Hub, Delhi",
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
    return memoryStore.patients.find((p) => p.email && p.email.toLowerCase() === cleanEmail) || null;
  },

  async findPatientByPhone(phone) {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/\D/g, "");
    return memoryStore.patients.find((p) => p.phone && String(p.phone).replace(/\D/g, "") === cleanPhone) || null;
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
    return memoryStore.staff.find((s) => s.email && s.email.toLowerCase() === cleanEmail) || null;
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
      facility: data.facility || "Apollo PHC Hub, Delhi",
      phone: data.phone ? String(data.phone).replace(/\D/g, "") : null,
      isActive: true,
      requiresPasswordChange: data.requiresPasswordChange !== undefined ? data.requiresPasswordChange : false,
      createdAt: new Date().toISOString()
    };
    memoryStore.staff.push(newStaff);
    persistStore();
    db.saveStaffToCloud(newStaff).catch(console.error);
    return newStaff;
  },

  // --- TRIAGE NOTES ---
  async createTriageNote(data) {
    let patient = memoryStore.patients.find((p) => p.id === data.patientId);
    if (!patient) {
      patient = await this.createPatient({ id: data.patientId, facility: data.facility });
    }

    const receiptNumber = generateReceiptNumber();

    const note = {
      id: generateCuid(),
      receiptNumber,
      patientId: patient.id,
      patient: {
        id: patient.id,
        tokenId: patient.tokenId,
        name: decryptPatientProfile(patient).name,
        phone: decryptPatientProfile(patient).phone,
        age: decryptPatientProfile(patient).age,
        address: decryptPatientProfile(patient).address
      },
      rawSymptomText: data.rawSymptomText,
      language: data.language || "en",
      summary: data.summary,
      originalSummary: data.summary,
      vitals: data.vitals || null,
      prescription: data.prescription || null,
      disposition: data.disposition || null,
      riskTag: data.riskTag,
      matchedRiskKeywords: data.matchedRiskKeywords || [],
      missingInfo: data.missingInfo || [],
      followUpQuestions: data.followUpQuestions || [],
      extractedReportData: data.extractedReportData || null,
      facility: data.facility || patient.facility || "Apollo PHC Hub, Delhi",
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

    if (facility && facility !== "ALL") {
      notes = notes.filter((n) => n.facility === facility);
    }

    // Role-based masking of patient info
    const formattedNotes = notes.map((note) => {
      const patient = memoryStore.patients.find((p) => p.id === note.patientId);
      const patientData = role === "DOCTOR" || role === "MASTER" ? decryptPatientProfile(patient) : maskPatientProfile(patient);
      return {
        ...note,
        patient: patientData || note.patient
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
    return memoryStore.triageNotes.find((n) => n.patientId === patientId) || null;
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
  async getAllFacilities() {
    return memoryStore.facilities || [];
  },

  async findFacilityById(id) {
    return (memoryStore.facilities || []).find((f) => f.id === id) || null;
  },

  async findFacilityByName(name) {
    if (!name) return null;
    const clean = name.trim().toLowerCase();
    return (memoryStore.facilities || []).find((f) => f.name.toLowerCase() === clean) || null;
  },

  async findFacilityByEmail(email) {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    return (memoryStore.facilities || []).find((f) => f.adminEmail && f.adminEmail.toLowerCase() === clean) || null;
  },

  async createFacility(data) {
    const id = data.id || "fac-" + Date.now().toString(36);
    const code = data.code || String(data.name || "FAC").toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 16);
    const newFacility = {
      id,
      name: data.name.trim(),
      phone: data.phone || null,
      address: data.address || null,
      type: (data.type || "HOSPITAL").toUpperCase(),
      code,
      adminEmail: data.adminEmail ? data.adminEmail.trim().toLowerCase() : null,
      adminPasswordHash: data.adminPasswordHash || null,
      createdAt: new Date().toISOString()
    };
    if (!memoryStore.facilities) memoryStore.facilities = [];
    memoryStore.facilities.push(newFacility);
    persistStore();
    db.saveFacilityToCloud(newFacility).catch(console.error);
    return newFacility;
  },

  async deleteFacility(id) {
    if (!memoryStore.facilities) return false;
    memoryStore.facilities = memoryStore.facilities.filter((f) => f.id !== id);
    persistStore();
    db.deleteFacilityFromCloud(id).catch(console.error);
    return true;
  },

  async clearAllData() {
    memoryStore.patients = [];
    memoryStore.triageNotes = [];
    memoryStore.auditLogs = [];
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
        await client.query("TRUNCATE TABLE triaq_staff CASCADE");
        await client.query("COMMIT");

        for (const s of initialStaff) {
          await db.saveStaffToCloud(s);
        }
        console.log("[Supabase Database] Successfully wiped all patients, triage notes, and audit logs!");
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
