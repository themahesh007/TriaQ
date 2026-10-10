// ========================================
// RED-FLAG KEYWORD ENGINE (Deterministic Safety Layer)
// Supports English, Hindi, Romanized Hindi, and Odia
// ========================================

const RED_FLAG_KEYWORDS = {
  en: [
    'chest pain', 'chest ache', 'chest tight', 'chest tightness',
    'difficulty breathing', 'breathlessness', 'breathless', 'shortness of breath', 'can\'t breathe',
    'unconscious', 'unconsciousness', 'passed out', 'blacked out',
    'fainting', 'faint', 'fainted',
    'severe bleeding', 'bleeding heavily', 'blood loss',
    'stroke', 'facial drooping', 'face drooping', 'one-sided weakness', 'arm weakness', 'speech slurred', 'slurred speech',
    'suicidal', 'suicide', 'killing myself', 'harm myself', 'want to die',
    'choking', 'can\'t swallow',
    'sudden severe headache', 'worst headache of life',
    'allergic reaction', 'anaphylaxis',
    'seizure', 'convulsion', 'fitting',
    'critical / extreme', 'cannot function', 'acute abdomen', 'severe acute'
  ],
  hi: [
    'सीने में दर्द', 'सीने का दर्द', 'छाती में दर्द',
    'सांस नहीं', 'सांस लेने में दिक्कत', 'श्वास लेने में कठिनाई', 'सांस फूलना', 'सांस नहीं आ रही',
    'बेहोश', 'चेतना खो', 'होश खो',
    'बेहोशी', 'कमजोरी',
    'गंभीर रक्तस्राव', 'खून बह रहा', 'खून बहना',
    'स्ट्रोक', 'आधी कमजोरी', 'चेहरे में लकवा', 'लकवा',
    'आत्महत्या', 'मरना चाहता हूं', 'अपने को नुकसान',
    'दम घुटना', 'निगलने में दिक्कत',
    'अचानक तेज सिरदर्द', 'सबसे बुरा सिरदर्द', 'असहनीय दर्द', 'पेट में असहनीय दर्द',
    // Romanized Hindi
    'chhati me dard', 'seene me dard', 'saas phoolna', 'sans lene me dikkat', 'behosh'
  ],
  or: [
    'ସିନାରେ ଯନ୍ତ୍ରଣା', 'ଛାତିରେ ଯନ୍ତ୍ରଣା', 'ଛାତି ଯନ୍ତ୍ରଣା',
    'ଶ୍ୱାସ ନେବାରେ ଅସୁବିଧା', 'ଶ୍ୱାସ ଧରା', 'ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ', 'ଶ୍ୱାସକ୍ରିୟାରେ ସମସ୍ୟା',
    'ବେଚେତନ', 'ଚେତନା ହରାଇବା', 'ଅଚେତ',
    'ମୂର୍ଛା', 'ଅଜ୍ଞାନ',
    'ଗୁରୁତର ରକ୍ତସ୍ରାବ', 'ରକ୍ତସ୍ରାବ',
    'ଷ୍ଟ୍ରୋକ', 'ଅଧିକାଂଶ ଦୁର୍ବଳତା',
    'ଆତ୍ମଘାତ', 'ମରିବାକୁ ଚାହୁଁ',
    'ଦାଁତ ଘୁଞ୍ଚା', 'ଗିଳିବାରେ ସମସ୍ୟା',
    'ହଠାତ୍ ତୀବ୍ର ମୁଣ୍ଡନାଲି', 'ଅସହ୍ୟ ଯନ୍ତ୍ରଣା'
  ]
};

const AMBER_FLAG_KEYWORDS = {
  en: [
    'fever', 'high fever', 'temperature', 'burning sensation',
    'vomiting', 'throwing up', 'nausea',
    'persistent cough', 'cough for days', 'non-stop cough',
    'dizziness', 'dizzy', 'vertigo', 'spinning sensation',
    'severe pain', 'intense pain', 'unbearable pain',
    'blood in urine', 'blood in stool', 'bloody stools',
    'severe abdominal pain', 'stomach pain', 'stomach ache', 'belly pain',
    'difficulty urinating', 'can\'t urinate', 'painful urination',
    'severe allergic reaction',
    'high blood pressure symptoms',
    'diabetic emergency', 'blood sugar very high',
    'severe (cannot function)', 'getting worse', 'unable to do daily tasks', 'difficulty eating or drinking'
  ],
  hi: [
    'बुखार', 'तेज बुखार', 'ताप', 'गर्म अनुभव',
    'उल्टी', 'उल्टी आ रही', 'मतली',
    'लगातार खांसी', 'कई दिन खांसी', 'खांसी नहीं रुक', 'खांसी',
    'चक्कर', 'चक्कर आना', 'सिर घूमना',
    'गंभीर दर्द', 'तीव्र दर्द', 'असहनीय दर्द',
    'पेशाब में खून', 'मल में खून',
    'गंभीर पेट दर्द', 'पेट में दर्द', 'पेट दर्द', 'सिर दर्द', 'माथा दर्द',
    'पेशाब में दिक्कत', 'पेशाब नहीं', 'दर्दनाक पेशाब',
    // Romanized Hindi
    'bukhar', 'ulti', 'khansi', 'chakkar', 'pet dard', 'pet me dard', 'sir dard'
  ],
  or: [
    'ଜ୍ୱର', 'ତୀବ୍ର ଜ୍ୱର', 'ପ୍ରବଳ ଜ୍ୱର', 'ଉଷ୍ମତା',
    'ବାନ୍ତୁ', 'ବାନ୍ତି ଆସୁଛି', 'ବାନ୍ତି',
    'ନିରନ୍ତର କାଶ', 'ଦିନ ପର ଦିନ କାଶ', 'କାଶ',
    'ମୁଣ୍ଡ ବୁଲାଣା', 'ମୁଣ୍ଡ ଘୁରୁଛି', 'ମୁଣ୍ଡ ବୁଲାଇବା', 'ମୁଣ୍ଡ ବିନ୍ଧା',
    'ଗୁରୁତର ଯନ୍ତ୍ରଣା', 'ସହନ ଅସମ୍ଭବ',
    'ପରିସ୍ରାବରେ ରକ୍ତ', 'ଶଖ ରେ ରକ୍ତ',
    'ଗୁରୁତର ପେଟ ଯନ୍ତ୍ରଣା', 'ପେଟ ଯନ୍ତ୍ରଣା', 'ପେଟ ଦରଜ'
  ]
};

// Flattened keyword lists for universal backward compatibility
const RED_KEYWORDS = [
  ...RED_FLAG_KEYWORDS.en,
  ...RED_FLAG_KEYWORDS.hi,
  ...RED_FLAG_KEYWORDS.or
];

const AMBER_KEYWORDS = [
  ...AMBER_FLAG_KEYWORDS.en,
  ...AMBER_FLAG_KEYWORDS.hi,
  ...AMBER_FLAG_KEYWORDS.or
];

/**
 * Checks if a keyword match is affirmative (not preceded by negation such as 'no', 'without', 'denies')
 */
function isAffirmativeMatch(text = "", keyword = "") {
  const kw = keyword.toLowerCase();
  const lower = (text || "").toLowerCase();
  let pos = lower.indexOf(kw);
  if (pos === -1) return false;

  while (pos !== -1) {
    const prefix = lower.slice(Math.max(0, pos - 20), pos).trim();
    const isNeg = /\b(no|without|denies|denied|free of|never had)\b\s*(any\s+)?$/i.test(prefix);
    if (!isNeg) return true;
    pos = lower.indexOf(kw, pos + 1);
  }
  return false;
}

/**
 * Deterministic detection of Red Flag keywords
 */
function detectRedFlag(symptomText = "", language = "en") {
  const langKey = language?.toLowerCase().slice(0, 2);
  const keywords = RED_FLAG_KEYWORDS[langKey] || RED_KEYWORDS;
  
  const matchedKeywords = keywords.filter(keyword => {
    return isAffirmativeMatch(symptomText, keyword);
  });

  return {
    isRedFlag: matchedKeywords.length > 0,
    matchedKeywords: Array.from(new Set(matchedKeywords)),
    detectionMethod: "HARDCODED_KEYWORD_ENGINE"
  };
}

/**
 * Deterministic detection of Amber / Yellow Flag keywords
 */
function detectAmberFlag(symptomText = "", language = "en") {
  const langKey = language?.toLowerCase().slice(0, 2);
  const keywords = AMBER_FLAG_KEYWORDS[langKey] || AMBER_KEYWORDS;
  
  const matchedKeywords = keywords.filter(keyword => {
    return isAffirmativeMatch(symptomText, keyword);
  });

  return {
    isAmberFlag: matchedKeywords.length > 0,
    matchedKeywords: Array.from(new Set(matchedKeywords)),
    detectionMethod: "HARDCODED_KEYWORD_ENGINE"
  };
}

/**
 * Deterministic, hardcoded risk tagging logic for symptoms and vital signs
 * Evaluates symptoms + baseline clinical vitals
 * @param {string} rawText 
 * @param {Object} [vitals] - Clinical vitals { bpSystolic, bpDiastolic, pulse, spo2, temp }
 * @returns {{ riskTag: "RED" | "YELLOW" | "GREEN", matchedRiskKeywords: string[] }}
 */
function evaluateRisk(rawText = "", vitals = null) {
  const matchedRed = RED_KEYWORDS.filter(kw => isAffirmativeMatch(rawText, kw));
  const matchedAmber = AMBER_KEYWORDS.filter(kw => isAffirmativeMatch(rawText, kw));

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
      matchedRiskKeywords: Array.from(new Set(matchedRed)),
      flagType: "RED",
      redFlags: Array.from(new Set(matchedRed)),
      greenFlags: [],
      flagRationale: "Emergency red-flag symptom(s) or critical vitals detected requiring immediate triage."
    };
  }

  if (matchedAmber.length > 0) {
    return {
      riskTag: "YELLOW",
      matchedRiskKeywords: Array.from(new Set(matchedAmber)),
      flagType: "AMBER",
      redFlags: [],
      amberFlags: Array.from(new Set(matchedAmber)),
      greenFlags: ["Stable airway", "No life-threatening red-flag indicators detected"],
      flagRationale: "Moderate symptoms detected requiring priority outpatient consultation."
    };
  }

  const greenIndicators = detectGreenFlags(rawText, vitals, "en");

  return {
    riskTag: "GREEN",
    matchedRiskKeywords: [],
    flagType: "GREEN",
    redFlags: [],
    amberFlags: [],
    greenFlags: greenIndicators.greenFlags,
    flagRationale: "Stable indicators present with no critical red-flag symptoms. Safe for routine OPD consultation."
  };
}

/**
 * Detect Green Flag indicators (stable, routine, non-emergency signs)
 */
function detectGreenFlags(rawText = "", vitals = null, language = "en") {
  const normalized = (rawText || "").toLowerCase();
  const greenFlags = [];

  // Check absence of red flags
  const redCheck = detectRedFlag(rawText, language);
  if (!redCheck.isRedFlag) {
    greenFlags.push("No emergency chest or airway distress reported");
  }

  // Common mild/stable symptom indicators
  const mildKeywords = [
    "mild", "cold", "runny nose", "sneezing", "mild headache", "body ache",
    "slight", "minor", "checkup", "dressing", "refill", "stable",
    "हल्का", "जुकाम", "सर्दी", "ସାମାନ୍ୟ", "ଥଣ୍ଡା"
  ];
  const matchedMild = mildKeywords.filter(k => normalized.includes(k.toLowerCase()));
  if (matchedMild.length > 0) {
    greenFlags.push("Routine outpatient severity pattern detected");
  }

  // Normal vitals verification
  if (vitals && typeof vitals === "object") {
    const spo2 = Number(vitals.spo2);
    const bpSys = Number(vitals.bpSystolic);
    const bpDia = Number(vitals.bpDiastolic);
    const pulse = Number(vitals.pulse);
    const temp = Number(vitals.temp);

    if (!isNaN(spo2) && spo2 >= 95) {
      greenFlags.push(`Normal blood oxygen saturation (${spo2}%)`);
    }
    if (!isNaN(bpSys) && bpSys >= 100 && bpSys <= 135 && !isNaN(bpDia) && bpDia >= 65 && bpDia <= 88) {
      greenFlags.push(`Blood pressure within normal clinical limits (${bpSys}/${bpDia} mmHg)`);
    }
    if (!isNaN(pulse) && pulse >= 60 && pulse <= 100) {
      greenFlags.push(`Normal resting pulse rate (${pulse} bpm)`);
    }
    if (!isNaN(temp) && temp >= 97 && temp <= 99.2) {
      greenFlags.push(`Normal body temperature (${temp}°F)`);
    }
  }

  if (greenFlags.length === 0) {
    greenFlags.push("Stable vitals & no urgent alarm indicators detected");
  }

  return {
    isGreenFlag: true,
    greenFlags: Array.from(new Set(greenFlags))
  };
}

/**
 * Complete symptom analysis returning explicit Red Flag vs Green Flag determination
 * @param {string} symptomText
 * @param {Object} [vitals]
 * @param {string} [language]
 * @returns {Object} Full Flag Analysis
 */
function analyzeSymptomFlags(symptomText = "", vitals = null, language = "en") {
  const riskResult = evaluateRisk(symptomText, vitals);
  const redFlags = riskResult.redFlags || [];
  const amberFlags = riskResult.amberFlags || [];
  const greenFlags = riskResult.greenFlags || [];

  if (riskResult.riskTag === "RED") {
    return {
      flag: "RED",
      riskTag: "RED",
      title: "🚩 RED FLAG: Urgent Warning Signs Detected",
      summary: "Critical warning signs or abnormal vitals identified. Immediate medical evaluation is required.",
      recommendation: "Emergency / Casualty attention recommended without delay. Do not wait in standard OPD queue.",
      redFlags: redFlags.length > 0 ? redFlags : ["Critical red-flag symptom detected"],
      greenFlags: [],
      isUrgent: true,
      action: "PROCEED_TO_EMERGENCY"
    };
  }

  if (riskResult.riskTag === "YELLOW") {
    return {
      flag: "AMBER",
      riskTag: "YELLOW",
      title: "⚠️ AMBER FLAG: Priority Outpatient Care Needed",
      summary: "Moderate clinical symptoms detected. Patient should be prioritized in OPD queue for timely doctor review.",
      recommendation: "Proceed with priority OPD token. Inform clinic nurse if symptoms worsen suddenly.",
      redFlags: [],
      amberFlags,
      greenFlags: ["Airway clear", "No immediate life-threatening distress"],
      isUrgent: false,
      action: "PROCEED_TO_OPD_PRIORITY"
    };
  }

  // GREEN FLAG
  const greenDetection = detectGreenFlags(symptomText, vitals, language);
  return {
    flag: "GREEN",
    riskTag: "GREEN",
    title: "🟢 GREEN FLAG: Stable / Routine Outpatient Symptoms",
    summary: "No urgent alarm symptoms or vital crises detected. Symptoms are stable and safe for standard outpatient queue.",
    recommendation: "Proceed with standard OPD appointment. Rest, maintain hydration, and consult with the OPD doctor.",
    redFlags: [],
    amberFlags: [],
    greenFlags: greenDetection.greenFlags,
    isUrgent: false,
    action: "PROCEED_TO_ROUTINE_OPD"
  };
}

/**
 * Assign Risk Tag with deterministic safety override
 */
function assignRiskTag(symptomText = "", language = "en", aiSuggestion = null) {
  const redCheck = detectRedFlag(symptomText, language);
  if (redCheck.isRedFlag) {
    return {
      riskTag: "RED",
      reason: "Hardcoded red-flag keywords detected",
      triggeredKeywords: redCheck.matchedKeywords,
      method: "KEYWORD_OVERRIDE"
    };
  }

  const amberCheck = detectAmberFlag(symptomText, language);
  if (amberCheck.isAmberFlag) {
    return {
      riskTag: "AMBER",
      reason: "Hardcoded amber-flag keywords detected",
      triggeredKeywords: amberCheck.matchedKeywords,
      method: "KEYWORD_OVERRIDE"
    };
  }

  if (aiSuggestion === "RED" || aiSuggestion === "AMBER" || aiSuggestion === "YELLOW") {
    return {
      riskTag: aiSuggestion === "YELLOW" ? "AMBER" : aiSuggestion,
      reason: "AI suggestion (no hardcoded keywords matched)",
      triggeredKeywords: [],
      method: "AI_SUGGESTION"
    };
  }

  return {
    riskTag: "GREEN",
    reason: "No red or amber flags detected",
    triggeredKeywords: [],
    method: "DEFAULT"
  };
}

module.exports = {
  RED_FLAG_KEYWORDS,
  AMBER_FLAG_KEYWORDS,
  RED_KEYWORDS,
  AMBER_KEYWORDS,
  detectRedFlag,
  detectAmberFlag,
  detectGreenFlags,
  evaluateRisk,
  analyzeSymptomFlags,
  assignRiskTag
};
