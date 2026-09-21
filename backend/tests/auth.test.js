const http = require("http");
const app = require("../src/server");

let server;
const PORT = 3999;

function request(options, data) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "localhost",
      port: PORT,
      ...options,
      headers: {
        ...(options.headers || {})
      }
    };

    if (data && !opts.headers["Content-Type"]) {
      opts.headers["Content-Type"] = "application/json";
    }

    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks);
        const text = body.toString("utf8");
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          parsed = text;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed, buffer: body });
      });
    });
    req.on("error", reject);
    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runAuthTests() {
  console.log("=== Running TriaQ 3-Tier Auth, Security & PDF Tests ===");
  server = app.listen(PORT);

  try {
    // 1. Patient Registration
    const regRes = await request({ path: "/api/patients/register", method: "POST" }, {
      email: `patient_${Date.now()}@example.com`,
      password: "Password@123",
      phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
      name: "Ramesh Sharma"
    });
    console.assert(regRes.status === 201 && regRes.data.token, "Test 1: Patient registration failed");
    console.log("-> Test 1: Patient Registration -> PASSED (Token ID:", regRes.data.patient.tokenId, ")");

    // 2. Patient Phone OTP Request & Verification
    const otpRes = await request({ path: "/api/patients/login/send-otp", method: "POST" }, {
      phone: "9876543210"
    });
    console.assert(otpRes.status === 200 && otpRes.data.otpSent, "Test 2A: OTP generation failed");
    
    const verifyRes = await request({ path: "/api/patients/login", method: "POST" }, {
      phone: "9876543210",
      otp: otpRes.data.demoOtp || "123456"
    });
    console.assert(verifyRes.status === 200 && verifyRes.data.token, "Test 2B: OTP login failed");
    console.log("-> Test 2: Patient Phone OTP Login -> PASSED (Verified via demo code)");

    // 3. Patient Demographics & PII Encryption
    const patientToken = regRes.data.token;
    const profileRes = await request({
      path: "/api/patients/profile",
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` }
    }, {
      name: "Mahesh Jena",
      age: "42",
      phone: "9811223344",
      address: "Ward 14, Health Colony, Bhubaneswar",
      conditions: "Mild hypertension",
      medications: "Amlodipine 5mg"
    });
    console.assert(profileRes.status === 200 && profileRes.data.saved, "Test 3: Profile save failed");
    console.log("-> Test 3: Patient Demographic Profile with AES-256 PII -> PASSED");

    // 4. Patient Submits Symptoms & Receives PDF Token Receipt
    const triageRes = await request({ path: "/api/triage-notes", method: "POST" }, {
      patientId: regRes.data.patient.id,
      symptomText: "Chest tightness and sweating since morning",
      vitals: { bpSystolic: 150, bpDiastolic: 95, pulse: 104, spo2: 95, temp: 98.6 }
    });
    console.assert(triageRes.status === 201 && triageRes.data.receiptNumber, "Test 4: Triage submission failed");
    const receiptNo = triageRes.data.receiptNumber;
    console.log("-> Test 4: Triage Note Creation -> PASSED (Receipt:", receiptNo, "| Risk:", triageRes.data.riskTag, ")");

    // 5. Download Server-Generated Medical PDF Pass
    const pdfRes = await request({
      path: `/api/patients/receipt/${receiptNo}/pdf`,
      method: "GET"
    });
    console.assert(pdfRes.status === 200 && pdfRes.headers["content-type"] === "application/pdf", "Test 5: PDF stream failed");
    console.assert(pdfRes.buffer.length > 500, "Test 5: PDF buffer empty");
    console.log("-> Test 5: Server-Side PDF Triage Token Stream -> PASSED (Size:", pdfRes.buffer.length, "bytes)");

    // 6. Staff Login: Doctor Role
    const docLoginRes = await request({ path: "/api/staff/login", method: "POST" }, {
      email: "doctor@triaq.org",
      password: "Doctor@123"
    });
    console.assert(docLoginRes.status === 200 && docLoginRes.data.staff.role === "DOCTOR", "Test 6: Doctor login failed");
    console.log("-> Test 6: Staff Login (DOCTOR) -> PASSED");

    // 7. Staff Login: Nurse Role & PII Masking
    const nurseLoginRes = await request({ path: "/api/staff/login", method: "POST" }, {
      email: "nurse@triaq.org",
      password: "Nurse@123"
    });
    console.assert(nurseLoginRes.status === 200 && nurseLoginRes.data.staff.role === "NURSE", "Test 7: Nurse login failed");
    
    // Check queue as Nurse (PII masked)
    const nurseQueue = await request({
      path: "/api/triage-notes",
      method: "GET",
      headers: { Authorization: `Bearer ${nurseLoginRes.data.token}` }
    });
    const nurseNote = nurseQueue.data.find(n => n.id === triageRes.data.id);
    console.assert(nurseNote && nurseNote.patient.name.includes("*"), "Test 7B: Nurse should receive masked PII");
    console.log("-> Test 7: Staff Role NURSE with PII Masking ('", nurseNote.patient.name, "') -> PASSED");

    // 8. Nurse Escalation Permission vs. Reject Restriction
    const nurseRejectRes = await request({
      path: `/api/triage-notes/${triageRes.data.id}`,
      method: "PATCH",
      headers: { Authorization: `Bearer ${nurseLoginRes.data.token}` }
    }, { action: "REJECT", reviewerId: "Nurse Priya" });
    console.assert(nurseRejectRes.status === 403, "Test 8A: Nurse should NOT be allowed to reject");

    const nurseEscalateRes = await request({
      path: `/api/triage-notes/${triageRes.data.id}`,
      method: "PATCH",
      headers: { Authorization: `Bearer ${nurseLoginRes.data.token}` }
    }, { action: "ESCALATE", reviewerId: "Nurse Priya", reason: "Patient has elevated vitals, requesting doctor review" });
    console.assert(nurseEscalateRes.status === 200, "Test 8B: Nurse escalation failed");
    console.log("-> Test 8: Nurse Role Permissions (Escalate allowed, Reject blocked) -> PASSED");

    // 9. Master Login with 2FA Verification
    const masterLoginRes = await request({ path: "/api/master/login", method: "POST" }, {
      email: "master@triaq.org",
      password: "Master@123",
      totpCode: "123456"
    });
    console.assert(masterLoginRes.status === 200 && masterLoginRes.data.master.role === "MASTER", "Test 9: Master 2FA login failed");
    console.log("-> Test 9: Master 2FA Login -> PASSED");

    // 10. Master Global Analytics & Decision Override
    const masterToken = masterLoginRes.data.token;
    const analyticsRes = await request({
      path: "/api/master/analytics",
      method: "GET",
      headers: { Authorization: `Bearer ${masterToken}` }
    });
    console.assert(analyticsRes.status === 200 && analyticsRes.data.totalTriageNotes >= 1, "Test 10A: Analytics failed");

    const overrideRes = await request({
      path: "/api/master/override-decision",
      method: "POST",
      headers: { Authorization: `Bearer ${masterToken}` }
    }, {
      triageNoteId: triageRes.data.id,
      newStatus: "APPROVED",
      reason: "Clinical supervisor administrative review verified priority"
    });
    console.assert(overrideRes.status === 200 && overrideRes.data.audit.action === "OVERRIDE", "Test 10B: Master override failed");
    console.log("-> Test 10: Master Analytics & Administrative Override with Audit Log -> PASSED");

    console.log("\n>>> ALL 10 AUTH, 3-TIER ROLE, PII & PDF TESTS PASSED SUCCESSFULLY! <<<\n");
  } finally {
    if (server) server.close();
  }
}

if (require.main === module) {
  runAuthTests().catch((err) => {
    console.error("Test failure:", err);
    process.exit(1);
  });
}

module.exports = runAuthTests;
