const assert = require("assert");
const { analyzeSymptomFlags, detectGreenFlags, detectRedFlag } = require("../src/rules/riskEngine");

async function runSymptomFlagTests() {
  console.log("=== Running Symptom Flag Analysis Tests ===");

  // 1. Red Flag Detection: Chest Pain
  console.log("-> Test 1: Red Flag Detection (Chest pain)");
  const chestResult = analyzeSymptomFlags("I have severe chest pain and radiating ache to left arm");
  assert.strictEqual(chestResult.flag, "RED", "Chest pain must trigger RED flag");
  assert.ok(chestResult.redFlags.length > 0, "Must have red flags list");
  assert.ok(chestResult.redFlags.some(f => f.toLowerCase().includes("chest")), "Must contain chest pain indicator");
  console.log("   Passed! Flag:", chestResult.flag, "| Red flags:", chestResult.redFlags);

  // 2. Red Flag Detection: Critical SpO2 < 90%
  console.log("-> Test 2: Red Flag Detection (Critical SpO2 vitals)");
  const spo2Result = analyzeSymptomFlags("feeling dizzy and weak", { spo2: 87 });
  assert.strictEqual(spo2Result.flag, "RED", "SpO2 < 90 must trigger RED flag");
  assert.ok(spo2Result.redFlags.some(f => f.includes("87%")), "Must list SpO2 critical indicator");
  console.log("   Passed! Flag:", spo2Result.flag, "| Red flags:", spo2Result.redFlags);

  // 3. Green Flag Detection: Mild Common Cold
  console.log("-> Test 3: Green Flag Detection (Mild cold & runny nose)");
  const coldResult = analyzeSymptomFlags("Mild cold, runny nose, slight sneezing since morning. No chest pain.");
  assert.strictEqual(coldResult.flag, "GREEN", "Mild cold must trigger GREEN flag");
  assert.strictEqual(coldResult.redFlags.length, 0, "Green flag must have 0 red flags");
  assert.ok(coldResult.greenFlags.length > 0, "Green flag must include reassuring signs");
  console.log("   Passed! Flag:", coldResult.flag, "| Green flags:", coldResult.greenFlags);

  // 4. Green Flag Detection: Routine Checkup with Normal Vitals
  console.log("-> Test 4: Green Flag Detection (Normal vitals + mild headache)");
  const normalVitalsResult = analyzeSymptomFlags("Mild headache after long screen work", {
    spo2: 98,
    bpSystolic: 120,
    bpDiastolic: 80,
    pulse: 72,
    temp: 98.4
  });
  assert.strictEqual(normalVitalsResult.flag, "GREEN", "Normal vitals and mild headache must trigger GREEN flag");
  assert.ok(normalVitalsResult.greenFlags.some(g => g.includes("98%")), "Should reflect normal oxygen");
  assert.ok(normalVitalsResult.greenFlags.some(g => g.includes("120/80")), "Should reflect normal BP");
  console.log("   Passed! Flag:", normalVitalsResult.flag, "| Green flags:", normalVitalsResult.greenFlags);

  // 5. Multilingual Red Flag Detection: Hindi & Odia
  console.log("-> Test 5: Multilingual Red Flag Detection (Hindi & Odia)");
  const hindiRed = analyzeSymptomFlags("सीने में तेज दर्द हो रहा है सांस नहीं आ रही");
  assert.strictEqual(hindiRed.flag, "RED", "Hindi chest pain must trigger RED flag");
  const odiaRed = analyzeSymptomFlags("ଛାତିରେ ଯନ୍ତ୍ରଣା ଏବଂ ଶ୍ୱାସ ନେବାରେ କଷ୍ଟ");
  assert.strictEqual(odiaRed.flag, "RED", "Odia chest pain must trigger RED flag");
  console.log("   Passed! Hindi and Odia red flags verified.");

  // 6. User Bug Fix: "I have severe headache" -> MUST BE RED FLAG
  console.log("-> Test 6: Severe Headache Detection ('I have severe headache')");
  const severeHeadache = analyzeSymptomFlags("I have severe headache");
  assert.strictEqual(severeHeadache.flag, "RED", "Severe headache must trigger RED flag");
  assert.ok(severeHeadache.redFlags.length > 0, "Must have red flags list");
  assert.ok(severeHeadache.redFlags.some(f => f.toLowerCase().includes("headache")), "Red flags must cite severe headache");
  console.log("   Passed! Flag:", severeHeadache.flag, "| Red flags:", severeHeadache.redFlags);

  // 7. User Bug Fix: "I have headache from last 21 days" -> MUST BE AMBER (NEVER GREEN)
  console.log("-> Test 7: Chronic / Prolonged Duration Detection ('I have headache from last 21 days')");
  const chronicHeadache = analyzeSymptomFlags("I have headache from last 21 days");
  assert.strictEqual(chronicHeadache.flag, "AMBER", "21-day headache must trigger AMBER flag, never GREEN");
  assert.strictEqual(chronicHeadache.redFlags.length, 0, "Must not be acute emergency red flag");
  assert.ok(chronicHeadache.amberFlags.length > 0, "Must include amber flags for prolonged duration");
  assert.ok(chronicHeadache.amberFlags.some(f => f.includes("21 days") || f.toLowerCase().includes("prolonged")), "Must mention 21 days or prolonged duration");
  console.log("   Passed! Flag:", chronicHeadache.flag, "| Amber flags:", chronicHeadache.amberFlags);

  console.log("\nALL SYMPTOM RED/GREEN FLAG TESTS PASSED! 🚩🟢\n");
}

runSymptomFlagTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
