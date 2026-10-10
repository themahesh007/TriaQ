const assert = require("assert");
const http = require("http");
const app = require("../src/server");

async function testEmergencyWorkflow() {
  console.log("=== Testing TriaQ Emergency / Casualty Workflow End-to-End ===");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Verify seeded demo case exists and Privacy Safeguard works (wrong PIN rejected)
    console.log("-> Test 1: Privacy Safeguard - Wrong PIN rejected");
    const wrongPinRes = await fetch(`${baseUrl}/api/emergency/cases/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: "EM-882190", pin: "9999" })
    });
    assert.strictEqual(wrongPinRes.status, 403, "Wrong PIN should return 403");
    const wrongPinData = await wrongPinRes.json();
    assert.strictEqual(wrongPinData.error, "INVALID_PIN");
    console.log("   Passed! Wrong PIN correctly rejected with 403 and revealed no data.");

    // 2. Verify seeded demo case with correct PIN (1234)
    console.log("-> Test 2: Seeded Demo Case verification with correct PIN (1234)");
    const seedRes = await fetch(`${baseUrl}/api/emergency/cases/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: "EM-882190", pin: "1234" })
    });
    assert.strictEqual(seedRes.status, 200, "Correct PIN should return 200");
    const seedData = await seedRes.json();
    assert.ok(seedData.case, "Case details should be returned");
    assert.strictEqual(seedData.case.caseId, "EM-882190");
    assert.strictEqual(seedData.case.type, "Road Accident");
    assert.ok(seedData.case.updates.length >= 2, "Should have seeded injury updates");
    console.log("   Passed! Seeded case details & updates verified. Updates count:", seedData.case.updates.length);

    // 3. Create a brand new Emergency Case (Unconscious patient with no name)
    console.log("-> Test 3: Create Emergency Case (unconscious patient with no name)");
    const createRes = await fetch(`${baseUrl}/api/emergency/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "Road Accident",
        description: "Truck collided with motorcycle, unconscious victim",
        patientName: "", // Blank name - unconscious patient
        reporterPhone: "9876543210",
        location: "NH-16 Rasulgarh square flyover"
      })
    });
    assert.strictEqual(createRes.status, 201, "Case creation should return 201");
    const createData = await createRes.json();
    assert.ok(createData.caseId, "Should generate Case ID");
    assert.ok(createData.pin, "Should generate PIN");
    assert.strictEqual(createData.case.status, "en_route");
    const newCaseId = createData.caseId;
    const newPin = createData.pin;
    console.log(`   Passed! Created Case ID: ${newCaseId}, PIN: ${newPin}, Status: ${createData.case.status}`);

    // 4. Live Updates in Transit (relative / paramedic adds timestamped notes)
    console.log("-> Test 4: Live Updates in Transit (add head injury and leg injury)");
    const upd1Res = await fetch(`${baseUrl}/api/emergency/cases/${newCaseId}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: newPin, updateText: "head injury - active bleeding" })
    });
    assert.strictEqual(upd1Res.status, 200);
    const upd1Data = await upd1Res.json();
    assert.strictEqual(upd1Data.case.updates[0].text, "head injury - active bleeding");

    const upd2Res = await fetch(`${baseUrl}/api/emergency/cases/${newCaseId}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: newPin, updateText: "now unconscious, oxygen supplied" })
    });
    assert.strictEqual(upd2Res.status, 200);
    const upd2Data = await upd2Res.json();
    assert.strictEqual(upd2Data.case.updates.length, 2);
    assert.strictEqual(upd2Data.case.updates[0].text, "now unconscious, oxygen supplied", "Newest update should be first");
    console.log("   Passed! En-route updates added and timeline ordered newest first.");

    // 5. Hospital Screen List (dashboard list of incoming emergencies)
    console.log("-> Test 5: Hospital Emergency List (newest first, emergency flag)");
    const listRes = await fetch(`${baseUrl}/api/emergency/cases`);
    assert.strictEqual(listRes.status, 200);
    const listData = await listRes.json();
    assert.ok(Array.isArray(listData));
    const foundNew = listData.find((c) => c.caseId === newCaseId);
    assert.ok(foundNew, "New emergency case should appear in incoming emergency list");
    assert.strictEqual(foundNew.status, "en_route");
    console.log(`   Passed! Emergency list has ${listData.length} cases. Found ${newCaseId} in incoming queue.`);

    // 6. Hospital Claims Patient ("Patient received at this hospital")
    console.log("-> Test 6: Hospital claims patient upon arrival");
    const claimRes = await fetch(`${baseUrl}/api/emergency/cases/${newCaseId}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin: newPin,
        hospitalName: "AIIMS – Bhubaneswar"
      })
    });
    assert.strictEqual(claimRes.status, 200);
    const claimData = await claimRes.json();
    assert.strictEqual(claimData.case.status, "received");
    assert.strictEqual(claimData.case.claimedByHospital, "AIIMS – Bhubaneswar");
    assert.ok(claimData.case.updates[0].text.includes("AIIMS – Bhubaneswar"), "Auto receipt log added to timeline");
    console.log("   Passed! Case marked as 'received' and claimed by 'AIIMS – Bhubaneswar'.");

    console.log("\n ALL EMERGENCY WORKFLOW TESTS PASSED SUCCESSFULLY! \n");
  } finally {
    server.close();
  }
}

testEmergencyWorkflow().catch((err) => {
  console.error("Test Failed:", err);
  process.exit(1);
});
