const assert = require("assert");
const app = require("../src/server");
const http = require("http");

async function runTests() {
  console.log("=== Running TriaQ Backend API Tests ===");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. POST /api/patients
    console.log("-> Test 1: POST /api/patients");
    const pRes = await fetch(`${baseUrl}/api/patients`, { method: "POST" });
    assert.strictEqual(pRes.status, 201);
    const patient1 = await pRes.json();
    assert.ok(patient1.id, "Patient should have id");
    assert.ok(patient1.tokenId, "Patient should have tokenId");
    console.log("   Passed! TokenId:", patient1.tokenId);

    const pRes2 = await fetch(`${baseUrl}/api/patients`, { method: "POST" });
    const patient2 = await pRes2.json();
    const pRes3 = await fetch(`${baseUrl}/api/patients`, { method: "POST" });
    const patient3 = await pRes3.json();

    // 2. POST /api/triage-notes with RED flag
    console.log("-> Test 2: POST /api/triage-notes (RED flag: chest pain)");
    const redRes = await fetch(`${baseUrl}/api/triage-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patient1.id,
        symptomText: "Sudden chest pain and breathlessness since morning, no tablets taken",
        language: "en"
      })
    });
    assert.strictEqual(redRes.status, 201);
    const redNote = await redRes.json();
    assert.strictEqual(redNote.riskTag, "RED");
    assert.ok(redNote.matchedRiskKeywords.includes("chest pain"));
    assert.ok(redNote.followUpQuestions.length > 0);
    assert.strictEqual(redNote.status, "PENDING");
    console.log("   Passed! RiskTag:", redNote.riskTag);

    // 3. POST /api/triage-notes with YELLOW flag
    console.log("-> Test 3: POST /api/triage-notes (YELLOW flag: fever)");
    const amberRes = await fetch(`${baseUrl}/api/triage-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patient2.id,
        symptomText: "High fever and vomiting for 2 days, taking paracetamol medicine",
        language: "en"
      })
    });
    const amberNote = await amberRes.json();
    assert.strictEqual(amberNote.riskTag, "YELLOW");
    console.log("   Passed! RiskTag:", amberNote.riskTag);

    // 4. POST /api/triage-notes with GREEN flag & Missing info
    console.log("-> Test 4: POST /api/triage-notes (GREEN flag: mild headache without duration or meds)");
    const greenRes = await fetch(`${baseUrl}/api/triage-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patient3.id,
        symptomText: "Mild headache",
        language: "en"
      })
    });
    const greenNote = await greenRes.json();
    assert.strictEqual(greenNote.riskTag, "GREEN");
    assert.ok(greenNote.missingInfo.includes("How long symptoms lasted"), "Should flag missing duration");
    assert.ok(greenNote.missingInfo.includes("Current medications"), "Should flag missing medications");
    assert.ok(greenNote.missingInfo.includes("Existing conditions"), "Should flag missing conditions");
    console.log("   Passed! RiskTag:", greenNote.riskTag, "Missing info flags:", greenNote.missingInfo.length);

    // 5. GET /api/triage-notes?status=PENDING (Queue sorting RED -> YELLOW -> GREEN)
    console.log("-> Test 5: GET /api/triage-notes?status=PENDING (Sorting validation)");
    const queueRes = await fetch(`${baseUrl}/api/triage-notes?status=PENDING`);
    assert.strictEqual(queueRes.status, 200);
    const queue = await queueRes.json();
    assert.ok(queue.length >= 3);
    const rank = (tag) => (tag === "RED" ? 1 : (tag === "YELLOW" || tag === "AMBER") ? 2 : 3);
    for (let i = 0; i < queue.length - 1; i++) {
      assert.ok(
        rank(queue[i].riskTag) <= rank(queue[i + 1].riskTag),
        `Queue ordering violated at index ${i}: ${queue[i].riskTag} before ${queue[i + 1].riskTag}`
      );
    }
    console.log("   Passed! Queue priority ordered accurately: RED -> YELLOW -> GREEN");

    // 6. GET /api/triage-notes/:id
    console.log("-> Test 6: GET /api/triage-notes/:id");
    const detailRes = await fetch(`${baseUrl}/api/triage-notes/${redNote.id}`);
    assert.strictEqual(detailRes.status, 200);
    const detailNote = await detailRes.json();
    assert.strictEqual(detailNote.id, redNote.id);
    console.log("   Passed! Retrieved note by ID.");

    // 7. PATCH /api/triage-notes/:id (EDIT_APPROVE)
    console.log("-> Test 7: PATCH /api/triage-notes/:id (EDIT_APPROVE)");
    const patchRes = await fetch(`${baseUrl}/api/triage-notes/${redNote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "EDIT_APPROVE",
        reviewerId: "Dr. Sharma",
        editedSummary: "Reviewed: Urgent cardiac triage required immediately.",
        note: "Transferred to ER"
      })
    });
    assert.strictEqual(patchRes.status, 200);
    const patchedNote = await patchRes.json();
    assert.strictEqual(patchedNote.status, "EDITED");
    assert.strictEqual(patchedNote.summary, "Reviewed: Urgent cardiac triage required immediately.");
    console.log("   Passed! Status updated to EDITED with edited summary.");

    // 8. GET /api/audit-log
    console.log("-> Test 8: GET /api/audit-log");
    const auditRes = await fetch(`${baseUrl}/api/audit-log`);
    assert.strictEqual(auditRes.status, 200);
    const logs = await auditRes.json();
    assert.ok(logs.length > 0, "Audit logs should not be empty");
    assert.strictEqual(logs[0].action, "EDIT_APPROVE");
    assert.strictEqual(logs[0].reviewerId, "Dr. Sharma");
    console.log("   Passed! Audit log captured entry by Dr. Sharma.");

    // 9. POST /api/triage-notes with critical vitals (SpO2 88%)
    console.log("-> Test 9: POST /api/triage-notes (Vitals Critical: SpO2 88%)");
    const p4 = await (await fetch(`${baseUrl}/api/patients`, { method: "POST" })).json();
    const vitalsRes = await fetch(`${baseUrl}/api/triage-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: p4.id,
        symptomText: "Mild cough and feeling slight fatigue",
        vitals: {
          bpSystolic: 120,
          bpDiastolic: 80,
          pulse: 82,
          spo2: 88,
          temp: 98.4
        }
      })
    });
    assert.strictEqual(vitalsRes.status, 201);
    const vitalsNote = await vitalsRes.json();
    assert.strictEqual(vitalsNote.riskTag, "RED", "SpO2 < 90% must trigger RED flag");
    assert.ok(vitalsNote.vitals, "Vitals should be stored in note");
    console.log("   Passed! Critical SpO2 (88%) accurately triggered RED flag.");

    // 10. GET /api/export-csv
    console.log("-> Test 10: GET /api/export-csv");
    const csvRes = await fetch(`${baseUrl}/api/export-csv`);
    assert.strictEqual(csvRes.status, 200);
    const csvText = await csvRes.text();
    assert.ok(csvText.includes("Token ID"), "CSV must have header row");
    assert.ok(csvText.includes("Ward-"), "CSV must include patient tokens");
    console.log("   Passed! Daily CSV registry exported successfully.");

    console.log("\nALL 10 BACKEND API TESTS PASSED SUCCESSFULLY! \n");
  } catch (err) {
    console.error("Test failed:", err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
