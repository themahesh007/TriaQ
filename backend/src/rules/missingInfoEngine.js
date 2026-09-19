/**
 * Detect missing patient info flags from symptom text
 * @param {string} rawText 
 * @returns {string[]}
 */
function detectMissingInfo(rawText = "", language = "en") {
  const normalized = (rawText || "").toLowerCase();
  const missing = [];

  // Duration check: English, Hindi, Odia, Romanized
  const durationTerms = [
    "day", "week", "hour", "since",
    "दिन", "घंटे", "हफ्ते", "हफ्ता", "समय", "से", "din", "ghante", "hafte", "kab se",
    "ଦିନ", "ଘଣ୍ଟା", "ସପ୍ତାହ", "ଠାରୁ"
  ];
  const hasDuration = durationTerms.some(term => normalized.includes(term));
  if (!hasDuration) {
    if (language === "hi") {
      missing.push("लक्षण कितने समय से हैं (अवधि / Duration)");
    } else if (language === "or") {
      missing.push("ଲକ୍ଷଣ କେତେ ସମୟ ଧରି ରହିଛି (Duration)");
    } else {
      missing.push("How long symptoms lasted");
    }
  }

  // Medications check: English, Hindi, Odia, Romanized
  const medicationTerms = [
    "medic", "tablet", "medicine", "drug",
    "दवा", "दवाई", "गोली", "कैप्सूल", "dawa", "dawai", "goli", "tablet",
    "ଔଷଧ", "ଟାବଲେଟ୍"
  ];
  const hasMedications = medicationTerms.some(term => normalized.includes(term));
  if (!hasMedications) {
    if (language === "hi") {
      missing.push("वर्तमान दवाइयाँ (Current medications)");
    } else if (language === "or") {
      missing.push("ବର୍ତ୍ତମାନର ଔଷଧ (Current medications)");
    } else {
      missing.push("Current medications");
    }
  }

  // Existing conditions check: English, Hindi, Odia, Romanized
  const conditionTerms = [
    "diabetes", "bp", "blood pressure", "asthma", "history",
    "शुगर", "बीपी", "मधुमेह", "दमा", "पुरानी बीमारी", "इतिहास", "sugar", "bimari", "itihaas",
    "ମଧୁମେହ", "ବିପି", "ପୂର୍ବ ରୋଗ"
  ];
  const hasConditions = conditionTerms.some(term => normalized.includes(term));
  if (!hasConditions) {
    if (language === "hi") {
      missing.push("पुरानी बीमारियाँ या इतिहास (Existing conditions)");
    } else if (language === "or") {
      missing.push("ପୂର୍ବର ରୋଗ ବା ଇତିହାସ (Existing conditions)");
    } else {
      missing.push("Existing conditions");
    }
  }

  return missing;
}

module.exports = {
  detectMissingInfo
};
