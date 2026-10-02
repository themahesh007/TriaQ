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

// In-memory store with local disk synchronization
let memoryStore = {
  patients: [],
  staff: [...initialStaff],
  triageNotes: [],
  auditLogs: [],
  facilities: [],
  referrals: []
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
    const staff = memoryStore.staff.find((s) => s.id === id);
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
    if (!patient) {
      patient = await this.createPatient({ id: data.patientId, facility: data.facility });
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

    const note = {
      id: generateCuid(),
      receiptNumber,
      patientId: patient.id,
      tokenId: assignedToken,
      patient: {
        id: patient.id,
        tokenId: assignedToken,
        name: decryptPatientProfile(patient).name,
        phone: decryptPatientProfile(patient).phone,
        age: decryptPatientProfile(patient).age,
        address: decryptPatientProfile(patient).address,
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
    if (facility && facility !== "ALL") {
      notes = notes.filter((n) => (n.facility || "").toLowerCase() === facility.toLowerCase());
    }

    const formattedNotes = notes.map((note) => {
      const patient = memoryStore.patients.find((p) => p.id === note.patientId);
      const patientData = role === "DOCTOR" || role === "MASTER" || role === "ADMIN" 
        ? decryptPatientProfile(patient) 
        : maskPatientProfile(patient);
      return {
        ...note,
        patient: patientData || note.patient
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
    const fac = (memoryStore.facilities || []).find((f) => f.id === id);
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
