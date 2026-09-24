const { Pool } = require("pg");

let pool = null;

function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    pool.on("error", (err) => {
      console.error("[PostgreSQL Database] Unexpected error on idle client:", err);
    });
  }
  return pool;
}

/**
 * Initialize PostgreSQL Schema in Supabase
 */
async function initDatabaseSchema() {
  const p = getPool();
  if (!p) {
    console.log("[Database] DATABASE_URL not set, using local disk/in-memory storage.");
    return false;
  }

  try {
    const client = await p.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS triaq_patients (
          id TEXT PRIMARY KEY,
          token_id TEXT UNIQUE NOT NULL,
          email TEXT,
          password_hash TEXT,
          phone TEXT,
          encrypted_name TEXT,
          encrypted_age TEXT,
          encrypted_address TEXT,
          encrypted_medications TEXT,
          encrypted_conditions TEXT,
          consent_given BOOLEAN DEFAULT true,
          consent_timestamp TEXT,
          facility TEXT,
          is_active BOOLEAN DEFAULT true,
          raw_data JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS triaq_staff (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          facility TEXT,
          phone TEXT,
          is_active BOOLEAN DEFAULT true,
          requires_password_change BOOLEAN DEFAULT false,
          two_factor_secret TEXT,
          backup_codes TEXT[],
          raw_data JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS triaq_triage_notes (
          id TEXT PRIMARY KEY,
          receipt_number TEXT UNIQUE,
          patient_id TEXT,
          patient_data JSONB,
          raw_symptom_text TEXT,
          language TEXT,
          summary TEXT,
          original_summary TEXT,
          vitals JSONB,
          prescription TEXT,
          disposition TEXT,
          risk_tag TEXT,
          matched_risk_keywords TEXT[],
          missing_info TEXT[],
          follow_up_questions TEXT[],
          extracted_report_data JSONB,
          facility TEXT,
          status TEXT DEFAULT 'PENDING',
          edit_history JSONB,
          audit_logs JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS triaq_audit_logs (
          id TEXT PRIMARY KEY,
          triage_note_id TEXT,
          triage_note JSONB,
          action TEXT,
          reviewer_id TEXT,
          note TEXT,
          changed_fields JSONB,
          ip_address TEXT,
          user_agent TEXT,
          timestamp TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS triaq_facilities (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          address TEXT,
          type TEXT DEFAULT 'HOSPITAL',
          code TEXT,
          admin_email TEXT,
          admin_password_hash TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE triaq_facilities ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'HOSPITAL';
        ALTER TABLE triaq_facilities ADD COLUMN IF NOT EXISTS code TEXT;
        ALTER TABLE triaq_facilities ADD COLUMN IF NOT EXISTS admin_email TEXT;
        ALTER TABLE triaq_facilities ADD COLUMN IF NOT EXISTS admin_password_hash TEXT;
        ALTER TABLE triaq_facilities ADD COLUMN IF NOT EXISTS state TEXT;
        ALTER TABLE triaq_facilities ADD COLUMN IF NOT EXISTS district TEXT;
        ALTER TABLE triaq_facilities ADD COLUMN IF NOT EXISTS city TEXT;
        ALTER TABLE triaq_facilities ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'APPROVED';
        ALTER TABLE triaq_facilities ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE triaq_facilities ADD COLUMN IF NOT EXISTS license_number TEXT;
        ALTER TABLE triaq_facilities ADD COLUMN IF NOT EXISTS rooms JSONB;

        ALTER TABLE triaq_staff ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'APPROVED';

        CREATE TABLE IF NOT EXISTS triaq_facility_token_counters (
          facility_id TEXT PRIMARY KEY,
          date_str TEXT NOT NULL,
          last_token_number INTEGER DEFAULT 0
        );
      `);
      console.log("[Supabase Database] Connected & cloud tables verified! 🚀");
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[Supabase Database] Initialization error:", err.message);
    return false;
  }
}

/**
 * Load all records from Supabase into memory store
 */
async function loadAllFromCloud() {
  const p = getPool();
  if (!p) return null;

  try {
    const client = await p.connect();
    try {
      const patientsRes = await client.query("SELECT * FROM triaq_patients ORDER BY created_at ASC");
      const staffRes = await client.query("SELECT * FROM triaq_staff ORDER BY created_at ASC");
      const notesRes = await client.query("SELECT * FROM triaq_triage_notes ORDER BY created_at DESC");
      const logsRes = await client.query("SELECT * FROM triaq_audit_logs ORDER BY timestamp DESC LIMIT 200");
      const facilitiesRes = await client.query("SELECT * FROM triaq_facilities");

      const mapPatient = (r) => ({
        id: r.id,
        tokenId: r.token_id,
        email: r.email,
        passwordHash: r.password_hash,
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
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
        ...(r.raw_data || {})
      });

      const mapStaff = (r) => ({
        id: r.id,
        email: r.email,
        passwordHash: r.password_hash,
        name: r.name,
        role: r.role,
        facility: r.facility,
        phone: r.phone,
        isActive: r.is_active,
        status: r.status || "APPROVED",
        requiresPasswordChange: r.requires_password_change,
        twoFactorSecret: r.two_factor_secret,
        backupCodes: r.backup_codes,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        ...(r.raw_data || {})
      });

      const mapNote = (r) => ({
        id: r.id,
        receiptNumber: r.receipt_number,
        patientId: r.patient_id,
        patient: r.patient_data,
        rawSymptomText: r.raw_symptom_text,
        language: r.language,
        summary: r.summary,
        originalSummary: r.original_summary,
        vitals: r.vitals,
        prescription: r.prescription,
        disposition: r.disposition,
        riskTag: r.risk_tag,
        matchedRiskKeywords: r.matched_risk_keywords || [],
        missingInfo: r.missing_info || [],
        followUpQuestions: r.follow_up_questions || [],
        extractedReportData: r.extracted_report_data,
        facility: r.facility,
        status: r.status,
        editHistory: r.edit_history || [],
        auditLogs: r.audit_logs || [],
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
      });

      const mapLog = (r) => ({
        id: r.id,
        triageNoteId: r.triage_note_id,
        triageNote: r.triage_note,
        action: r.action,
        reviewerId: r.reviewer_id,
        note: r.note,
        changedFields: r.changed_fields,
        ipAddress: r.ip_address,
        userAgent: r.user_agent,
        timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString()
      });

      const mapFacility = (r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        address: r.address,
        state: r.state || "",
        district: r.district || "",
        city: r.city || "",
        type: r.type || "HOSPITAL",
        code: r.code || r.id,
        adminEmail: r.admin_email,
        status: r.status || "APPROVED",
        licenseNumber: r.license_number || "",
        rooms: r.rooms || null,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      });

      return {
        patients: patientsRes.rows.map(mapPatient),
        staff: staffRes.rows.map(mapStaff),
        triageNotes: notesRes.rows.map(mapNote),
        auditLogs: logsRes.rows.map(mapLog),
        facilities: facilitiesRes.rows.length > 0 ? facilitiesRes.rows.map(mapFacility) : null
      };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[Supabase Database] Error loading records:", err.message);
    return null;
  }
}

/**
 * Upsert a single patient in Supabase in real-time
 */
async function savePatientToCloud(patient) {
  const p = getPool();
  if (!p || !patient) return;
  try {
    await p.query(`
      INSERT INTO triaq_patients (
        id, token_id, email, password_hash, phone, encrypted_name, encrypted_age,
        encrypted_address, encrypted_medications, encrypted_conditions, consent_given,
        consent_timestamp, facility, is_active, raw_data, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (id) DO UPDATE SET
        token_id = EXCLUDED.token_id,
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        phone = EXCLUDED.phone,
        encrypted_name = EXCLUDED.encrypted_name,
        encrypted_age = EXCLUDED.encrypted_age,
        encrypted_address = EXCLUDED.encrypted_address,
        encrypted_medications = EXCLUDED.encrypted_medications,
        encrypted_conditions = EXCLUDED.encrypted_conditions,
        consent_given = EXCLUDED.consent_given,
        consent_timestamp = EXCLUDED.consent_timestamp,
        facility = EXCLUDED.facility,
        is_active = EXCLUDED.is_active,
        raw_data = EXCLUDED.raw_data,
        updated_at = EXCLUDED.updated_at
    `, [
      patient.id,
      patient.tokenId,
      patient.email || null,
      patient.passwordHash || null,
      patient.phone || null,
      patient.encryptedName || null,
      patient.encryptedAge || null,
      patient.encryptedAddress || null,
      patient.encryptedMedications || null,
      patient.encryptedConditions || null,
      patient.consentGiven !== false,
      patient.consentTimestamp || null,
      patient.facility || "Apollo PHC Hub, Delhi",
      patient.isActive !== false,
      JSON.stringify(patient),
      patient.createdAt || new Date().toISOString(),
      patient.updatedAt || new Date().toISOString()
    ]);
  } catch (err) {
    console.error("[Supabase Database] Save patient error:", err.message);
  }
}

/**
 * Upsert a staff member in Supabase in real-time
 */
async function saveStaffToCloud(staff) {
  const p = getPool();
  if (!p || !staff) return;
  try {
    await p.query(`
      INSERT INTO triaq_staff (
        id, email, password_hash, name, role, facility, phone,
        is_active, status, requires_password_change, two_factor_secret, backup_codes, raw_data, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        facility = EXCLUDED.facility,
        phone = EXCLUDED.phone,
        is_active = EXCLUDED.is_active,
        status = EXCLUDED.status,
        requires_password_change = EXCLUDED.requires_password_change,
        two_factor_secret = EXCLUDED.two_factor_secret,
        backup_codes = EXCLUDED.backup_codes,
        raw_data = EXCLUDED.raw_data
    `, [
      staff.id,
      staff.email,
      staff.passwordHash,
      staff.name,
      staff.role,
      staff.facility || "Apollo PHC Hub, Delhi",
      staff.phone || null,
      staff.isActive !== false,
      staff.status || "APPROVED",
      staff.requiresPasswordChange || false,
      staff.twoFactorSecret || null,
      staff.backupCodes || [],
      JSON.stringify(staff),
      staff.createdAt || new Date().toISOString()
    ]);
  } catch (err) {
    console.error("[Supabase Database] Save staff error:", err.message);
  }
}

/**
 * Upsert a triage note in Supabase in real-time
 */
async function saveTriageNoteToCloud(note) {
  const p = getPool();
  if (!p || !note) return;
  try {
    await p.query(`
      INSERT INTO triaq_triage_notes (
        id, receipt_number, patient_id, patient_data, raw_symptom_text, language, summary,
        original_summary, vitals, prescription, disposition, risk_tag, matched_risk_keywords,
        missing_info, follow_up_questions, extracted_report_data, facility, status, edit_history,
        audit_logs, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (id) DO UPDATE SET
        receipt_number = EXCLUDED.receipt_number,
        patient_data = EXCLUDED.patient_data,
        raw_symptom_text = EXCLUDED.raw_symptom_text,
        summary = EXCLUDED.summary,
        original_summary = EXCLUDED.original_summary,
        vitals = EXCLUDED.vitals,
        prescription = EXCLUDED.prescription,
        disposition = EXCLUDED.disposition,
        risk_tag = EXCLUDED.risk_tag,
        matched_risk_keywords = EXCLUDED.matched_risk_keywords,
        status = EXCLUDED.status,
        edit_history = EXCLUDED.edit_history,
        audit_logs = EXCLUDED.audit_logs,
        updated_at = EXCLUDED.updated_at
    `, [
      note.id,
      note.receiptNumber || null,
      note.patientId,
      JSON.stringify(note.patient || {}),
      note.rawSymptomText || "",
      note.language || "en",
      note.summary || "",
      note.originalSummary || "",
      JSON.stringify(note.vitals || null),
      note.prescription || null,
      note.disposition || null,
      note.riskTag || "GREEN",
      note.matchedRiskKeywords || [],
      note.missingInfo || [],
      note.followUpQuestions || [],
      JSON.stringify(note.extractedReportData || null),
      note.facility || "Apollo PHC Hub, Delhi",
      note.status || "PENDING",
      JSON.stringify(note.editHistory || []),
      JSON.stringify(note.auditLogs || []),
      note.createdAt || new Date().toISOString(),
      note.updatedAt || new Date().toISOString()
    ]);
  } catch (err) {
    console.error("[Supabase Database] Save triage note error:", err.message);
  }
}

/**
 * Save an audit log to Supabase in real-time
 */
async function saveAuditLogToCloud(log) {
  const p = getPool();
  if (!p || !log) return;
  try {
    await p.query(`
      INSERT INTO triaq_audit_logs (
        id, triage_note_id, triage_note, action, reviewer_id, note, changed_fields, ip_address, user_agent, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `, [
      log.id,
      log.triageNoteId || null,
      JSON.stringify(log.triageNote || {}),
      log.action,
      log.reviewerId,
      log.note || null,
      JSON.stringify(log.changedFields || null),
      log.ipAddress || null,
      log.userAgent || null,
      log.timestamp || new Date().toISOString()
    ]);
  } catch (err) {
    console.error("[Supabase Database] Save audit log error:", err.message);
  }
}

/**
 * Save or update a facility in Supabase in real-time
 */
async function saveFacilityToCloud(facility) {
  const p = getPool();
  if (!p || !facility) return;
  try {
    await p.query(`
      INSERT INTO triaq_facilities (
        id, name, phone, address, state, district, city, type, code, admin_email, admin_password_hash, status, license_number, rooms, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        address = EXCLUDED.address,
        state = EXCLUDED.state,
        district = EXCLUDED.district,
        city = EXCLUDED.city,
        type = EXCLUDED.type,
        code = EXCLUDED.code,
        admin_email = EXCLUDED.admin_email,
        admin_password_hash = EXCLUDED.admin_password_hash,
        status = EXCLUDED.status,
        license_number = EXCLUDED.license_number,
        rooms = EXCLUDED.rooms;
    `, [
      facility.id,
      facility.name,
      facility.phone || null,
      facility.address || null,
      facility.state || null,
      facility.district || null,
      facility.city || null,
      facility.type || "HOSPITAL",
      facility.code || null,
      facility.adminEmail || null,
      facility.adminPasswordHash || null,
      facility.status || "APPROVED",
      facility.licenseNumber || null,
      facility.rooms ? JSON.stringify(facility.rooms) : null,
      facility.createdAt || new Date().toISOString()
    ]);
  } catch (err) {
    console.error("[Supabase Database] Save facility error:", err.message);
  }
}

/**
 * Delete a staff member from Supabase
 */
async function deleteStaffFromCloud(id) {
  const p = getPool();
  if (!p || !id) return;
  try {
    await p.query("DELETE FROM triaq_staff WHERE id = $1", [id]);
  } catch (err) {
    console.error("[Supabase Database] Delete staff error:", err.message);
  }
}

/**
 * Delete a facility from Supabase
 */
async function deleteFacilityFromCloud(id) {
  const p = getPool();
  if (!p || !id) return;
  try {
    await p.query("DELETE FROM triaq_facilities WHERE id = $1", [id]);
  } catch (err) {
    console.error("[Supabase Database] Delete facility error:", err.message);
  }
}

/**
 * Compute the Indian Standard Time (IST, UTC+5:30) operational OPD day.
 * Hospital OPD shifts start at 4:00 AM IST and end around 8:00 PM IST.
 * Patients arriving between 4:00 AM today and 3:59 AM tomorrow share the same operational day.
 */
function getIstOpdDateStr(now = new Date()) {
  // IST is UTC+5.5 hours. Shift by -4.0 hours for the 4:00 AM day boundary: (+5.5 - 4.0) = +1.5 hours.
  const shifted = new Date(now.getTime() + (1.5 * 60 * 60 * 1000));
  return shifted.toISOString().slice(0, 10); // 'YYYY-MM-DD' in IST OPD cycle
}

/**
 * Atomic live sequential token generator with daily 4:00 AM IST reset per facility.
 */
async function getNextSequentialTokenNumber(facilityId = "GLOBAL") {
  const p = getPool();
  const cleanFacility = String(facilityId || "GLOBAL").trim().toLowerCase().replace(/[^a-z0-9]/g, "-");
  const today = getIstOpdDateStr();
  const compositeKey = `${cleanFacility}_${today}`;

  if (!p) {
    return null;
  }

  try {
    const res = await p.query(`
      INSERT INTO triaq_facility_token_counters (facility_id, date_str, last_token_number)
      VALUES ($1, $2, 1)
      ON CONFLICT (facility_id) DO UPDATE SET
        last_token_number = CASE 
          WHEN triaq_facility_token_counters.date_str = EXCLUDED.date_str THEN triaq_facility_token_counters.last_token_number + 1
          ELSE 1
        END,
        date_str = EXCLUDED.date_str
      RETURNING last_token_number;
    `, [compositeKey, today]);

    const num = res.rows[0]?.last_token_number || 1;
    return `TOKEN NUMBER ${String(num).padStart(2, "0")}`;
  } catch (err) {
    console.error("[Token Counter] DB error:", err.message);
    return null;
  }
}

module.exports = {
  getPool,
  initDatabaseSchema,
  loadAllFromCloud,
  savePatientToCloud,
  saveStaffToCloud,
  saveTriageNoteToCloud,
  saveAuditLogToCloud,
  saveFacilityToCloud,
  deleteFacilityFromCloud,
  deleteStaffFromCloud,
  getNextSequentialTokenNumber,
  getIstOpdDateStr
};
