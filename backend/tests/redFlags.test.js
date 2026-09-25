const { assignRiskTag, detectRedFlag, evaluateRisk } = require('../src/rules/riskEngine');

console.log("=== RUNNING DETERMINISTIC RED-FLAG SAFETY TESTS ===\n");

const testCases = [
  {
    symptom: 'chest pain and difficulty breathing',
    language: 'en',
    expectedTag: 'RED',
    description: 'English: chest pain & breathlessness'
  },
  {
    symptom: 'सीने में दर्द और सांस नहीं आ रहा',
    language: 'hi',
    expectedTag: 'RED',
    description: 'Hindi: chest pain'
  },
  {
    symptom: 'fever and cough for 3 days',
    language: 'en',
    expectedTag: 'AMBER',
    description: 'English: fever and cough'
  },
  {
    symptom: 'headache and mild body ache',
    language: 'en',
    expectedTag: 'GREEN',
    description: 'English: routine symptoms'
  },
  {
    symptom: 'ChEsT pAiN',
    language: 'en',
    expectedTag: 'RED',
    description: 'Case-insensitive detection: ChEsT pAiN'
  },
  {
    symptom: 'I have acute seizure and blacked out',
    language: 'en',
    expectedTag: 'RED',
    description: 'English: seizure & blacked out'
  },
  {
    symptom: 'ଶ୍ୱାସ ନେବାରେ ଅସୁବିଧା',
    language: 'or',
    expectedTag: 'RED',
    description: 'Odia: breathlessness'
  }
];

let allPassed = true;

testCases.forEach((test, idx) => {
  const result = assignRiskTag(test.symptom, test.language);
  const passed = result.riskTag === test.expectedTag;
  if (!passed) allPassed = false;
  
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: [Test ${idx + 1}] ${test.description}`);
  console.log(`  Expected: ${test.expectedTag} | Got: ${result.riskTag} | Method: ${result.method}`);
  if (result.triggeredKeywords.length > 0) {
    console.log(`  Triggered Keywords: ${result.triggeredKeywords.join(', ')}`);
  }
  console.log('');
});

// Also test vital signs emergency detection in evaluateRisk
const vitalsTest = evaluateRisk('patient feels weak', { spo2: 86, bpSystolic: 195, bpDiastolic: 115 });
const vitalsPassed = vitalsTest.riskTag === 'RED';
console.log(`${vitalsPassed ? '✓ PASS' : '✗ FAIL'}: Critical Vitals Emergency Check (SpO2=86%, BP=195/115)`);
console.log(`  Result: ${vitalsTest.riskTag} | Matched: ${vitalsTest.matchedRiskKeywords.join(', ')}\n`);

if (allPassed && vitalsPassed) {
  console.log("🎉 ALL RED-FLAG SAFETY TESTS PASSED 100%!");
  process.exit(0);
} else {
  console.error("❌ SOME TESTS FAILED");
  process.exit(1);
}
