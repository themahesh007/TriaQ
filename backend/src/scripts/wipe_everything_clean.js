const { Pool } = require("pg");
require("dotenv").config({ path: __dirname + "/../../.env" });

async function wipeAll() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    console.log("Connecting to Supabase PostgreSQL database...");
    
    // 1. Delete all triage notes
    const r1 = await client.query("DELETE FROM triaq_triage_notes");
    console.log("Deleted triaq_triage_notes:", r1.rowCount);

    // 2. Delete all patients
    const r2 = await client.query("DELETE FROM triaq_patients");
    console.log("Deleted triaq_patients:", r2.rowCount);

    // 3. Delete all facilities (Ramesh Clinic, Aditya Clinic, etc.)
    const r3 = await client.query("DELETE FROM triaq_facilities");
    console.log("Deleted triaq_facilities (cleared Ramesh Clinic and Aditya Clinic):", r3.rowCount);

    // 4. Delete all referrals
    const r4 = await client.query("DELETE FROM triaq_referrals");
    console.log("Deleted triaq_referrals:", r4.rowCount);

    // 5. Delete all audit logs
    const r5 = await client.query("DELETE FROM triaq_audit_logs");
    console.log("Deleted triaq_audit_logs:", r5.rowCount);

    // 6. Delete token counters if table exists
    try {
      await client.query("DELETE FROM triaq_facility_token_counters");
      console.log("Cleared triaq_facility_token_counters");
    } catch (e) {
      // table might not exist
    }

    // 7. Ensure only master staff account remains
    const r6 = await client.query("DELETE FROM triaq_staff WHERE email != 'triaqproject@gmail.com'");
    console.log("Cleared non-master staff accounts:", r6.rowCount);

    // Verify counts
    console.log("\n--- VERIFICATION OF CLOUD DATABASE ---");
    for (const t of ['triaq_triage_notes', 'triaq_patients', 'triaq_facilities', 'triaq_referrals', 'triaq_audit_logs']) {
      const countRes = await client.query(`SELECT count(*) FROM ${t}`);
      console.log(`${t}: ${countRes.rows[0].count}`);
    }
    const staffRes = await client.query("SELECT email, role, name FROM triaq_staff");
    console.log("Remaining staff accounts:", staffRes.rows);

    console.log("\n✓ Database completely wiped clean! 0 notes, 0 patients, 0 facilities (Ramesh & Aditya cleared)!");
  } catch (err) {
    console.error("Cleanup error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

wipeAll();
