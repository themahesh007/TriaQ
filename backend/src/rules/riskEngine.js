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
 * Deterministic detection of Red Flag keywords
 */
function detectRedFlag(symptomText = "", language = "en") {
  const lowerText = (symptomText || "").toLowerCase();
  const langKey = language?.toLowerCase().slice(0, 2);
  const keywords = RED_FLAG_KEYWORDS[langKey] || RED_KEYWORDS;
  
  const matchedKeywords = keywords.filter(keyword => {
    return lowerText.includes(keyword.toLowerCase());
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
  const lowerText = (symptomText || "").toLowerCase();
  const langKey = language?.toLowerCase().slice(0, 2);
  const keywords = AMBER_FLAG_KEYWORDS[langKey] || AMBER_KEYWORDS;
  
  const matchedKeywords = keywords.filter(keyword => {
    return lowerText.includes(keyword.toLowerCase());
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
  const normalized = (rawText || "").toLowerCase();
  const matchedRed = RED_KEYWORDS.filter(kw => normalized.includes(kw.toLowerCase()));
  const matchedAmber = AMBER_KEYWORDS.filter(kw => normalized.includes(kw.toLowerCase()));

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
      matchedRiskKeywords: Array.from(new Set(matchedRed))
    };
  }

  if (matchedAmber.length > 0) {
    return {
      riskTag: "YELLOW",
      matchedRiskKeywords: Array.from(new Set(matchedAmber))
    };
  }

  return {
    riskTag: "GREEN",
    matchedRiskKeywords: []
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
  evaluateRisk,
  assignRiskTag
};
