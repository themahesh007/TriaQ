/**
 * Generate intelligent, clinically-grounded follow-up questions
 * Analyzes patient symptom text and assigns prioritized questions:
 * 1. Missing baseline gaps (duration, medications, chronic history)
 * 2. Symptom-specific clinical clarification (fever, chest pain, cough, vomiting, etc.)
 * 3. Priority emergency indicators (RED / YELLOW / GREEN)
 *
 * @param {"RED" | "AMBER" | "YELLOW" | "GREEN"} riskTag 
 * @param {string} language 
 * @param {string} rawText 
 * @returns {string[]}
 */
function getFollowUpQuestions(riskTag = "GREEN", language = "en", rawText = "") {
  const norm = (rawText || "").toLowerCase();
  const questions = [];

  const hasDuration = ["day", "week", "hour", "since", "दिन", "घंटे", "हफ्ते", "समय", "से", "din", "ghante", "ଦିନ", "ଘଣ୍ଟା", "ସପ୍ତାହ"].some(t => norm.includes(t));
  const hasMeds = ["medic", "tablet", "medicine", "drug", "दवा", "दवाई", "गोली", "dawa", "ଔଷଧ", "ଟାବଲେଟ୍"].some(t => norm.includes(t));
  const hasHistory = ["diabetes", "bp", "blood pressure", "asthma", "history", "शुगर", "बीपी", "मधुमेह", "दमा", "पुरानी बीमारी", "ମଧୁମେହ", "ବିପି"].some(t => norm.includes(t));

  const hasChest = norm.includes("chest") || norm.includes("छाती") || norm.includes("सीने") || norm.includes("chhati") || norm.includes("breath") || norm.includes("सांस") || norm.includes("ଶ୍ୱାସ");
  const hasFever = norm.includes("fever") || norm.includes("बुखार") || norm.includes("bukhar") || norm.includes("ଜ୍ୱର");
  const hasCough = norm.includes("cough") || norm.includes("खांसी") || norm.includes("khansi") || norm.includes("କାଶ");
  const hasVomit = norm.includes("vomit") || norm.includes("उल्टी") || norm.includes("ulti") || norm.includes("ବାନ୍ତି") || norm.includes("nausea");
  const hasDizzy = norm.includes("dizzy") || norm.includes("चक्कर") || norm.includes("chakkar") || norm.includes("headache") || norm.includes("सिरदर्द") || norm.includes("ମୁଣ୍ଡ");

  if (language === "hi") {
    // 1. Duration gap question
    if (!hasDuration) {
      questions.push("आप कितने दिनों या घंटों से इस समस्या/लक्षणों से पीड़ित हैं?");
    }

    // 2. Clinical symptom questions
    if (hasChest || riskTag === "RED") {
      questions.push("क्या छाती का दर्द आपकी बाईं बांह, गर्दन या जबड़े की तरफ फैल रहा है?");
      questions.push("क्या सांस लेने में तकलीफ लेटने पर और अधिक बढ़ जाती है?");
    }
    if (hasFever) {
      questions.push("क्या बुखार लगातार बना हुआ है या ठंड और कंपकंपी के साथ आ-जा रहा है?");
    }
    if (hasCough) {
      questions.push("क्या यह सूखी खांसी है या बलगम/कफ आ रहा है?");
    }
    if (hasVomit) {
      questions.push("आज कितनी बार उल्टी हुई है, और क्या आप पानी/ओआरएस पी पा रहे हैं?");
    }
    if (hasDizzy && !hasChest) {
      questions.push("क्या अचानक खड़े होने पर चक्कर आते हैं या आंखों के आगे अंधेरा छाता है?");
    }

    // 3. Medication gap
    if (!hasMeds && questions.length < 4) {
      questions.push("क्या आप वर्तमान में इसके लिए कोई दवा, गोली या घरेलू उपचार ले रहे हैं?");
    }

    // 4. Medical history gap
    if (!hasHistory && questions.length < 4) {
      questions.push("क्या आपको पहले से कोई पुरानी बीमारी जैसे डायबिटीज/शुगर, बीपी या दमा है?");
    }

    // Fallback if needed
    if (questions.length === 0) {
      questions.push("क्या कोई अन्य लक्षण हैं जो आपने अभी तक नहीं बताए?");
      questions.push("क्या यह समस्या पहले कभी हुई है?");
    }

    return questions.slice(0, 4);
  }

  if (language === "or") {
    if (!hasDuration) {
      questions.push("ଆପଣ କେତେ ଦିନ ବା ଘଣ୍ଟା ଧରି ଏହି ଲକ୍ଷଣରେ କଷ୍ଟ ପାଉଛନ୍ତି?");
    }

    if (hasChest || riskTag === "RED") {
      questions.push("ଛାତି ଯନ୍ତ୍ରଣା ବାମ ହାତ କିମ୍ବା ମୁହଁକୁ ବ୍ୟାପୁଛି କି?");
      questions.push("ଶୋଇବା ସମୟରେ ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ ବଢ଼ୁଛି କି?");
    }
    if (hasFever) {
      questions.push("ଜ୍ୱର କ୍ରମାଗତ ରହୁଛି ନା କମ୍ପ ସହ ଆସୁଛି-ଯାଉଛି?");
    }
    if (hasCough) {
      questions.push("ଏହା ଶୁଖିଲା କାଶ ନା କଫ ବାହାରୁଛି?");
    }
    if (hasVomit) {
      questions.push("ଆଜି କେତେ ଥର ବାନ୍ତି ହୋଇଛି, ଏବଂ ପାଣି ପିଇପାରୁଛନ୍ତି କି?");
    }

    if (!hasMeds && questions.length < 4) {
      questions.push("ଆପଣ ଏଥିପାଇଁ ବର୍ତ୍ତମାନ କୌଣସି ଔଷଧ ବା ଟାବଲେଟ୍ ଖାଉଛନ୍ତି କି?");
    }
    if (!hasHistory && questions.length < 4) {
      questions.push("ଆପଣଙ୍କର ପୂର୍ବରୁ ମଧୁମେହ, ବିପି କିମ୍ବା ଶ୍ୱାସରୋଗ ଭଳି କୌଣସି ରୋଗ ଅଛି କି?");
    }

    if (questions.length === 0) {
      questions.push("ଆପଣ କହିନଥିବା ଅନ୍ୟ କୌଣସି ଲକ୍ଷଣ ଅଛି କି?");
    }

    return questions.slice(0, 4);
  }

  // English (Default)
  // 1. Duration gap question
  if (!hasDuration) {
    questions.push("From how many days or hours have you been suffering from these symptoms?");
  }

  // 2. Specific clinical symptom questions
  if (hasChest || riskTag === "RED") {
    questions.push("Is the breathing difficulty or chest pain getting worse right now?");
    questions.push("Is any pain radiating to your left arm, neck, or jaw?");
  }
  if (hasFever) {
    questions.push("Is the fever continuous or coming and going with chills/shivering?");
  }
  if (hasCough) {
    questions.push("Is it a dry cough or producing phlegm/mucus?");
  }
  if (hasVomit) {
    questions.push("How many times have you vomited today, and are you able to keep fluids down?");
  }
  if (hasDizzy && !hasChest) {
    questions.push("Do you feel lightheaded when standing up, or experiencing blurred vision?");
  }

  // 3. Medication gap
  if (!hasMeds && questions.length < 4) {
    questions.push("Are you currently taking any medicines, home remedies, or tablets for this?");
  }

  // 4. Medical history gap
  if (!hasHistory && questions.length < 4) {
    questions.push("Do you have any existing medical conditions like diabetes, high BP, or asthma?");
  }

  // Fallback if needed
  if (questions.length === 0) {
    questions.push("Any other symptoms you haven't mentioned?");
    questions.push("Has this condition happened before?");
  }

  return questions.slice(0, 4);
}

module.exports = {
  getFollowUpQuestions
};
