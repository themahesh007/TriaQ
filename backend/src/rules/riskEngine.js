const RED_KEYWORDS = [
  // English
  "chest pain",
  "chest tight",
  "breathless",
  "difficulty breathing",
  "can't breathe",
  "unconscious",
  "fainted",
  "fainting",
  "severe bleeding",
  "stroke",
  "slurred speech",
  "facial drooping",
  "one-sided weakness",
  "suicidal",
  "critical / extreme",
  "cannot function",
  "acute abdomen",
  "severe acute",
  // Hindi & Romanized Hindi
  "छाती में दर्द",
  "सीने में दर्द",
  "सांस फूलना",
  "सांस लेने में दिक्कत",
  "सांस नहीं आ रही",
  "बेहोश",
  "खून बहना",
  "लकवा",
  "असहनीय दर्द",
  "पेट में असहनीय दर्द",
  "chhati me dard",
  "seene me dard",
  "saas phoolna",
  "sans lene me dikkat",
  "behosh",
  // Odia
  "ଛାତି ଯନ୍ତ୍ରଣା",
  "ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ",
  "ଶ୍ୱାସକ୍ରିୟାରେ ସମସ୍ୟା",
  "ଅଚେତ",
  "ରକ୍ତସ୍ରାବ",
  "ଅସହ୍ୟ ଯନ୍ତ୍ରଣା"
];

const AMBER_KEYWORDS = [
  // English
  "fever",
  "high fever",
  "vomiting",
  "persistent cough",
  "dizzy",
  "dizziness",
  "stomach pain",
  "abdominal pain",
  "stomach ache",
  "belly pain",
  "severe (cannot function)",
  "getting worse",
  "unable to do daily tasks",
  "difficulty eating or drinking",
  // Hindi & Romanized Hindi
  "बुखार",
  "तेज बुखार",
  "उल्टी",
  "खांसी",
  "लगातार खांसी",
  "चक्कर",
  "पेट दर्द",
  "पेट में दर्द",
  "सिर दर्द",
  "माथा दर्द",
  "bukhar",
  "ulti",
  "khansi",
  "chakkar",
  "pet dard",
  "pet me dard",
  "sir dard",
  // Odia
  "ଜ୍ୱର",
  "ପ୍ରବଳ ଜ୍ୱର",
  "ବାନ୍ତି",
  "କାଶ",
  "ମୁଣ୍ଡ ବୁଲାଇବା",
  "ପେଟ ଯନ୍ତ୍ରଣା",
  "ପେଟ ଦରଜ",
  "ମୁଣ୍ଡ ବିନ୍ଧା"
];

/**
 * Deterministic, hardcoded risk tagging logic for symptoms and vital signs
 * @param {string} rawText 
 * @param {Object} [vitals] - Optional clinical vitals { bpSystolic, bpDiastolic, pulse, spo2, temp }
 * @returns {{ riskTag: "RED" | "AMBER" | "GREEN", matchedRiskKeywords: string[] }}
 */
function evaluateRisk(rawText = "", vitals = null) {
  const normalized = (rawText || "").toLowerCase();
  const matchedRed = RED_KEYWORDS.filter(kw => normalized.includes(kw));
  const matchedAmber = AMBER_KEYWORDS.filter(kw => normalized.includes(kw));

  // 1. Evaluate vital signs for emergency/critical thresholds
  if (vitals && typeof vitals === "object") {
    const spo2 = Number(vitals.spo2);
    const bpSys = Number(vitals.bpSystolic);
    const bpDia = Number(vitals.bpDiastolic);
    const pulse = Number(vitals.pulse);
    const temp = Number(vitals.temp);

    // Critical SpO2 < 90%
    if (!isNaN(spo2) && spo2 > 0 && spo2 < 90) {
      matchedRed.push(`Critical SpO2: ${spo2}% (<90%)`);
    } else if (!isNaN(spo2) && spo2 >= 90 && spo2 <= 93) {
      matchedAmber.push(`Low SpO2: ${spo2}% (90-93%)`);
    }

    // Critical BP crisis: Systolic >= 180 or Diastolic >= 110
    if ((!isNaN(bpSys) && bpSys >= 180) || (!isNaN(bpDia) && bpDia >= 110)) {
      matchedRed.push(`BP Crisis: ${bpSys || "-"}/${bpDia || "-"} mmHg`);
    } else if (!isNaN(bpSys) && bpSys > 0 && bpSys < 85) {
      matchedRed.push(`Severe Hypotension: ${bpSys} mmHg (<85)`);
    } else if ((!isNaN(bpSys) && bpSys >= 140) || (!isNaN(bpDia) && bpDia >= 90)) {
      matchedAmber.push(`Elevated BP: ${bpSys || "-"}/${bpDia || "-"} mmHg`);
    }

    // Critical Heart Rate: Pulse > 130 or < 45
    if ((!isNaN(pulse) && pulse > 130) || (!isNaN(pulse) && pulse > 0 && pulse < 45)) {
      matchedRed.push(`Critical Pulse: ${pulse} bpm`);
    } else if (!isNaN(pulse) && pulse > 105) {
      matchedAmber.push(`High Pulse: ${pulse} bpm`);
    }

    // High fever: >= 103°F or >= 39.5°C
    if (!isNaN(temp) && temp >= 103) {
      matchedAmber.push(`High Fever: ${temp}°F (≥103°F)`);
    }
  }

  // Determine final risk tag
  if (matchedRed.length > 0) {
    return {
      riskTag: "RED",
      matchedRiskKeywords: matchedRed
    };
  }

  if (matchedAmber.length > 0) {
    return {
      riskTag: "YELLOW",
      matchedRiskKeywords: matchedAmber
    };
  }

  return {
    riskTag: "GREEN",
    matchedRiskKeywords: []
  };
}

module.exports = {
  evaluateRisk,
  RED_KEYWORDS,
  AMBER_KEYWORDS
};
