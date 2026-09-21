import React, { useState, useRef, useMemo } from "react";
import ClinicalSummaryCard from "../components/ClinicalSummaryCard";
import TriageSlipModal from "../components/TriageSlipModal";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "or", label: "ଓଡ଼ିଆ (Odia)" }
];

const UI_TEXT = {
  en: {
    pageTitle: "Patient Intake & Symptom Gathering",
    pageSubtitle: "Intake portal for health workers, nurses, and camp volunteers.",
    sectionSymptom: "Tell us what's going on",
    placeholder: "e.g. I have a high fever and persistent cough...",
    micDefault: "Tap to speak your symptoms",
    micListening: "Listening... (speak now)",
    micCaptured: "Speech captured! Tap again if needed.",
    quickLabel: "Quick templates:",
    templates: [
      { label: "🔴 Urgent: Chest Pain", text: "Sudden severe chest pain and breathlessness since morning, no medicine taken." },
      { label: "🟡 Moderate: Fever (Yellow)", text: "High fever and vomiting for 2 days, taking paracetamol tablet." },
      { label: "🟢 Normal: Headache (Green)", text: "Mild headache and slight tiredness today, no previous medical history." }
    ],
    additionalBoxTitle: "Some Additional Questions",
    additionalBoxHelp: "Answer the relevant questions below. Answered questions will disappear and save into the summary.",
    noQuestionsNeeded: "✓ All additional questions answered!",
    answeredBadge: "Recorded Details:",
    saveBtn: "✓ Save",
    typeAnswerPlaceholder: "Type your answer here...",
    uploadLabel: "Upload a report (optional)",
    uploadPlaceholder: "Click to upload a lab report photo",
    uploadHelp: "Supports PNG, JPG, JPEG for automatic OCR scan",
    consentText: "I agree that this information can be used to prepare a triage summary for facility staff. My data will be stored with minimal identifying details and can be deleted on request.",
    clearBtn: "Clear Form",
    submitBtn: "Submit for Human Review",
    submittingBtn: "Processing Triage Flag...",
    resultAwaiting: "Awaiting Intake Submission",
    resultAwaitingSub: "Enter patient symptoms and answer the questions on the left. Your suggested flag will be calculated automatically upon submit.",
    suggestedFlagTitle: "Your Suggested Triage Flag",
    summaryTitle: "Clinical Triage Summary",
    missingTitle: "Missing Information Flags",
    missingNone: "All baseline clinical fields complete!",
    newIntakeBtn: "+ New Patient Intake",
    modalTitle: "Start New Patient Intake?",
    modalDesc: "Are you sure you want to clear this session and start fresh for a new patient? All current symptoms, questions, and suggested flags on this screen will be reset.",
    modalCancel: "CANCEL",
    modalYes: "YES"
  },
  hi: {
    pageTitle: "रोगी पंजीकरण एवं लक्षण संकलन",
    pageSubtitle: "स्वास्थ्य कार्यकर्ताओं, नर्सों और स्वास्थ्य शिविर सहायकों के लिए पोर्टल।",
    sectionSymptom: "रोगी की समस्या का विवरण बताएं",
    placeholder: "उदा. मुझे तेज बुखार और उल्टी हो रही है...",
    micDefault: "लक्षण बोलने के लिए माइक दबाएं",
    micListening: "सुन रहे हैं... (अब बोलें)",
    micCaptured: "आवाज दर्ज हो गई! और बोलने के लिए फिर दबाएं।",
    quickLabel: "त्वरित उदाहरण (Quick templates):",
    templates: [
      { label: "🔴 गंभीर: छाती में दर्द (Urgent)", text: "सुबह से अचानक छाती में तेज दर्द और सांस फूलने की समस्या है, कोई दवा नहीं ली।" },
      { label: "🟡 मध्यम: बुखार (Yellow)", text: "2 दिनों से तेज बुखार और उल्टी हो रही है, पैरासिटामोल गोली ली है।" },
      { label: "🟢 सामान्य: सिरदर्द (Green)", text: "आज से हल्का सिरदर्द और हल्की थकान है, कोई पुरानी बीमारी नहीं है।" }
    ],
    additionalBoxTitle: "कुछ अतिरिक्त प्रश्न (Some Additional Questions)",
    additionalBoxHelp: "नीचे दिए गए प्रश्नों के उत्तर दें। उत्तर देने पर प्रश्न हट जाएगा और सारांश में जुड़ जाएगा।",
    noQuestionsNeeded: "✓ सभी अतिरिक्त प्रश्नों के उत्तर दर्ज हो चुके हैं!",
    answeredBadge: "दर्ज की गई जानकारी:",
    saveBtn: "✓ सहेजें",
    typeAnswerPlaceholder: "यहाँ अपना उत्तर लिखें...",
    uploadLabel: "जांच रिपोर्ट अपलोड करें (वैकल्पिक)",
    uploadPlaceholder: "लैब रिपोर्ट फोटो अपलोड करने के लिए क्लिक करें",
    uploadHelp: "स्वचालित OCR स्कैन के लिए PNG, JPG, JPEG समर्थित हैं",
    consentText: "मैं सहमत हूँ कि इस जानकारी का उपयोग स्वास्थ्य कर्मचारियों के लिए ट्राइएज सारांश तैयार करने में किया जा सकता है। मेरा डेटा न्यूनतम पहचान के साथ सुरक्षित रहेगा।",
    clearBtn: "फॉर्म साफ करें",
    submitBtn: "समीक्षा के लिए सबमिट करें",
    submittingBtn: "फ्लैग तैयार हो रहा है...",
    resultAwaiting: "लक्षण दर्ज करने की प्रतीक्षा है",
    resultAwaitingSub: "बाईं ओर लक्षण लिखें और प्रश्नों के उत्तर दें। सबमिट करने पर आपका सुझावित ट्राइएज फ्लैग तुरंत प्रदर्शित होगा।",
    suggestedFlagTitle: "आपका सुझावित ट्राइएज फ्लैग (Suggested Flag)",
    summaryTitle: "क्लीनिकल ट्राइएज सारांश",
    missingTitle: "छूटी हुई आवश्यक जानकारी",
    missingNone: "सभी बुनियादी विवरण शामिल हैं!",
    newIntakeBtn: "+ नए रोगी का पंजीकरण",
    modalTitle: "क्या नया रोगी पंजीकरण शुरू करना चाहते हैं?",
    modalDesc: "क्या आप इस सत्र को साफ करके नए रोगी का पंजीकरण शुरू करना चाहते हैं? स्क्रीन का सारा डेटा और परिणाम रीसेट हो जाएगा।",
    modalCancel: "CANCEL",
    modalYes: "YES"
  },
  or: {
    pageTitle: "ରୋଗୀ ପଞ୍ଜୀକରଣ ଏବଂ ଲକ୍ଷଣ ସଂଗ୍ରହ",
    pageSubtitle: "ସ୍ୱାସ୍ଥ୍ୟ କର୍ମୀ, ନର୍ସ ଏବଂ ସ୍ୱାସ୍ଥ୍ୟ ଶିବିର ସ୍ୱେଚ୍ଛାସେବକଙ୍କ ପାଇଁ ପୋର୍ଟାଲ।",
    sectionSymptom: "ରୋଗୀର କଣ ସମସ୍ୟା ହେଉଛି କୁହନ୍ତୁ",
    placeholder: "ଉଦା. ମୋତେ ପ୍ରବଳ ଜ୍ୱର ଏବଂ ବାନ୍ତି ହେଉଛି...",
    micDefault: "ଲକ୍ଷଣ କହିବାକୁ ମାଇକ୍ ଦବାନ୍ତୁ",
    micListening: "ଶୁଣୁଛୁ... (ଏବେ କୁହନ୍ତୁ)",
    micCaptured: "ସ୍ୱର ରେକର୍ଡ ହେଲା! ଆହୁରି କହିବା ପାଇଁ ପୁଣି ଦବାନ୍ତୁ।",
    quickLabel: "ଉଦାହରଣ ଟେମ୍ପଲେଟ୍ (Quick templates):",
    templates: [
      { label: "🔴 ଜରୁରୀ: ଛାତି ଯନ୍ତ୍ରଣା (Urgent)", text: "ସକାଳୁ ହଠାତ୍ ପ୍ରବଳ ଛାତି ଯନ୍ତ୍ରଣା ଏବଂ ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ, କୌଣସି ଔଷଧ ଖାଇନାହାଁନ୍ତି।" },
      { label: "🟡 ମଧ୍ୟମ: ଜ୍ୱର (Yellow)", text: "୨ ଦିନ ଧରି ପ୍ରବଳ ଜ୍ୱର ଏବଂ ବାନ୍ତି ହେଉଛି, ପାରାସିଟାମୋଲ୍ ଔଷଧ ଖାଉଛନ୍ତି।" },
      { label: "🟢 ସାଧାରଣ: ମୁଣ୍ଡବିନ୍ଧା (Green)", text: "ଆଜି ସାମାନ୍ୟ ମୁଣ୍ଡବିନ୍ଧା ଏବଂ କ୍ଳାନ୍ତ ଲାଗୁଛି, ପୂର୍ବର କୌଣସି ରୋଗ ନାହିଁ।" }
    ],
    additionalBoxTitle: "କିଛି ଅତିରିକ୍ତ ପ୍ରଶ୍ନ (Some Additional Questions)",
    additionalBoxHelp: "ତଳେ ଥିବା ପ୍ରଶ୍ନଗୁଡ଼ିକର ଉତ୍ତର ଦିଅନ୍ତୁ। ଉତ୍ତର ଦେବା ପରେ ପ୍ରଶ୍ନଟି ହଟିଯିବ ଏବଂ ନୋଟରେ ସାଇତା ହେବ।",
    noQuestionsNeeded: "✓ ସମସ୍ତ ଅତିରିକ୍ତ ପ୍ରଶ୍ନର ଉତ୍ତର ମିଳିଗଲା!",
    answeredBadge: "ଦାଖଲ ତଥ୍ୟ:",
    saveBtn: "✓ ସାଇତନ୍ତୁ",
    typeAnswerPlaceholder: "ଏଠାରେ ଆପଣଙ୍କ ଉତ୍ତର ଲେଖନ୍ତୁ...",
    uploadLabel: "ରିପୋର୍ଟ ଅପଲୋଡ୍ କରନ୍ତୁ (ଇଚ୍ଛାଧୀନ)",
    uploadPlaceholder: "ଲ୍ୟାବ୍ ରିପୋର୍ଟ ଫଟୋ ଅପଲୋଡ୍ କରିବାକୁ କ୍ଲିକ୍ କରନ୍ତୁ",
    uploadHelp: "ସ୍ୱୟଂକ୍ରିୟ OCR ସ୍କାନ୍ ପାଇଁ PNG, JPG, JPEG ସମର୍ଥିତ",
    consentText: "ମୁଁ ସହମତ ଯେ ଏହି ତଥ୍ୟକୁ ସ୍ୱାସ୍ଥ୍ୟ କର୍ମଚାରୀଙ୍କ ଟ୍ରାଇଏଜ୍ ପ୍ରସ୍ତୁତି ପାଇଁ ବ୍ୟବହାର କରାଯାଇପାରିବ। ମୋର ତଥ୍ୟ ସୁରକ୍ଷିତ ରହିବ।",
    clearBtn: "ଫର୍ମ ଖାଲି କରନ୍ତୁ",
    submitBtn: "ସମୀକ୍ଷା ପାଇଁ ଦାଖଲ କରନ୍ତୁ",
    submittingBtn: "ଫ୍ଲାଗ୍ ପ୍ରସ୍ତୁତ ଚାଲିଛି...",
    resultAwaiting: "ଲକ୍ଷଣ ଦାଖଲର ଅପେକ୍ଷା ଅଛି",
    resultAwaitingSub: "ବାମ ପାଖରେ ଲକ୍ଷଣ ଲେଖନ୍ତୁ ଓ ପ୍ରଶ୍ନର ଉତ୍ତର ଦିଅନ୍ତୁ। ଦାଖଲ କଲେ ଆପଣଙ୍କ ଟ୍ରାଇଏଜ୍ ଫ୍ଲାଗ୍ ଦେଖାଯିବ।",
    suggestedFlagTitle: "ଆପଣଙ୍କ ସୁପାରିଶକୃତ ଟ୍ରାଇଏଜ୍ ଫ୍ଲାଗ୍ (Suggested Flag)",
    summaryTitle: "କ୍ଲିନିକାଲ୍ ଟ୍ରାଇଏଜ୍ ସାରାଂଶ",
    missingTitle: "ଅନୁପସ୍ଥିତ ସୂଚନା ଫ୍ଲାଗ୍",
    missingNone: "ସମସ୍ତ ପ୍ରାଥମିକ ତଥ୍ୟ ସଂପୂର୍ଣ୍ଣ!",
    newIntakeBtn: "+ ନୂତନ ରୋଗୀ ପଞ୍ଜୀକରଣ",
    modalTitle: "ନୂତନ ରୋଗୀ ପଞ୍ଜୀକରଣ ଆରମ୍ଭ କରିବାକୁ ଚାହାଁନ୍ତି କି?",
    modalDesc: "ଆପଣ ଏହି ତଥ୍ୟ ସଫା କରି ନୂଆ ରୋଗୀ ଫର୍ମ ଖୋଲିବାକୁ ଚାହାଁନ୍ତି କି? ସ୍କ୍ରିନର ସମସ୍ତ ତଥ୍ୟ ପୁନଃସ୍ଥାପିତ ହୋଇଯିବ।",
    modalCancel: "CANCEL",
    modalYes: "YES"
  }
};

export default function IntakePage({ onTriageCreated }) {
  const [language, setLanguage] = useState("en");
  const [symptomText, setSymptomText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [micStatus, setMicStatus] = useState("");
  const [reportImageBase64, setReportImageBase64] = useState(null);
  const [reportImageName, setReportImageName] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [resultNote, setResultNote] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Patient Vital Signs state (BP, Pulse, SpO2, Temp)
  const [vitals, setVitals] = useState({
    bpSystolic: "",
    bpDiastolic: "",
    pulse: "",
    spo2: "",
    temp: ""
  });

  // Printable Triage Slip Modal state
  const [showPrintSlipModal, setShowPrintSlipModal] = useState(false);

  // Confirmation Modal popup state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Answered additional questions map: { [questionId]: { question, answer } }
  const [answeredMap, setAnsweredMap] = useState({});
  // Current typing drafts for questions: { [questionId]: string }
  const [inputDrafts, setInputDrafts] = useState({});

  const fileInputRef = useRef(null);

  const t = UI_TEXT[language] || UI_TEXT.en;

  // Additional Clinical Questions + Symptom-Specific Questions
  const dynamicQuestions = useMemo(() => {
    const text = (symptomText || "").toLowerCase();
    const list = [];

    // --- 1. DURATION (MANDATORY) ---
    if (!answeredMap["duration"]) {
      list.push({
        id: "duration",
        category: "General",
        question: language === "hi" 
          ? "आप कितने दिनों या घंटों से इन लक्षणों/समस्या से पीड़ित हैं?"
          : language === "or"
          ? "ଆପଣ କେତେ ଦିନ ବା ଘଣ୍ଟା ଧରି ଏହି ସମସ୍ୟାରେ କଷ୍ଟ ପାଉଛନ୍ତି?"
          : "From how many days or hours have you been suffering from these symptoms?",
        quickChoices: language === "hi" ? ["आज से (Today)", "2-3 दिन", "1 हफ्ता या अधिक"] : language === "or" ? ["ଆଜିଠାରୁ", "୨-୩ ଦିନ", "୧ ସପ୍ତାହ ବା ଅଧିକ"] : ["Since today", "2-3 days", "1 week or more"]
      });
    }

    // --- 2. SEVERITY / PAIN SCALE (MANDATORY) ---
    if (!answeredMap["severity"]) {
      list.push({
        id: "severity",
        category: "General",
        question: language === "hi"
          ? "तकलीफ या दर्द की तीव्रता कैसी है? (हल्का, मध्यम, या अत्यधिक असहनीय?)"
          : language === "or"
          ? "ଯନ୍ତ୍ରଣା ବା କଷ୍ଟର ମାତ୍ରା କିପରି ଅଛି? (ସାମାନ୍ୟ, ମଧ୍ୟମ, ବା ଅତ୍ୟଧିକ?)"
          : "How severe is your pain or discomfort right now?",
        quickChoices: language === "hi" ? ["हल्की (Mild)", "मध्यम (Moderate)", "गंभीर (Severe)", "अत्यधिक असहनीय (Critical)"] : language === "or" ? ["ସାମାନ୍ୟ (Mild)", "ମଧ୍ୟମ (Moderate)", "ଗମ୍ଭୀର (Severe)", "ଅତ୍ୟଧିକ (Critical)"] : ["Mild (Manageable)", "Moderate (Uncomfortable)", "Severe (Cannot function)", "Critical / Extreme"]
      });
    }

    // --- 3. CURRENT / PRE-EXISTING MEDICATIONS (MANDATORY) ---
    if (!answeredMap["medications"]) {
      list.push({
        id: "medications",
        category: "General",
        question: language === "hi"
          ? "क्या आप वर्तमान में कोई नियमित या पहले से चलने वाली दवा (जैसे बीपी, शुगर, दमा) ले रहे हैं?"
          : language === "or"
          ? "ଆପଣ ବର୍ତ୍ତମାନ କୌଣସି ନିୟମିତ ବା ପୂର୍ବରୁ ଚାଲୁଥିବା ଔଷଧ (ଯେପରିକି ବିପି, ମଧୁମେହ, ଶ୍ୱାସରୋଗ) ଖାଉଛନ୍ତି କି?"
          : "Are you currently taking any regular or pre-existing medications (e.g. for BP, Diabetes, Asthma)?",
        quickChoices: language === "hi" 
          ? ["कोई नियमित दवा नहीं", "बीपी / हृदय रोग की दवा", "शुगर / डायबिटीज (इंसुलिन)", "दमा / सांस की दवा", "अन्य नियमित दवा"] 
          : language === "or" 
          ? ["କୌଣସି ନିୟମିତ ଔଷଧ ନାହିଁ", "ବିପି / ହୃଦରୋଗ ଔଷଧ", "ମଧୁମେହ / ଇନସୁଲିନ୍", "ଶ୍ୱାସରୋଗ ଔଷଧ", "ଅନ୍ୟ ନିୟମିତ ଔଷଧ"] 
          : ["No regular medications", "Blood Pressure (BP) medicine", "Diabetes / Sugar medicine", "Asthma Inhaler / Breathing medicine", "Other regular prescription"]
      });
    }

    // --- 4. PRE-EXISTING MEDICAL HISTORY (MANDATORY) ---
    if (!answeredMap["conditions"]) {
      list.push({
        id: "conditions",
        category: "General",
        question: language === "hi"
          ? "क्या आपको पहले से कोई पुरानी बीमारी (डायबिटीज/शुगर, बीपी, हृदय रोग या दमा) है?"
          : language === "or"
          ? "ଆପଣଙ୍କର ପୂର୍ବରୁ କୌଣସି ରୋଗ (ମଧୁମେହ, ବିପି, ହୃଦରୋଗ ବା ଶ୍ୱାସରୋଗ) ଅଛି କି?"
          : "Do you have any existing chronic conditions like Diabetes, BP, Heart issues, or Asthma?",
        quickChoices: language === "hi" ? ["कोई पुरानी बीमारी नहीं", "डायबिटीज (शुगर)", "हाई ब्लड प्रेशर (BP)", "दमा (Asthma)"] : language === "or" ? ["ପୂର୍ବ ରୋଗ ନାହିଁ", "ମଧୁମେହ (Sugar)", "ଉଚ୍ଚ ରକ୍ତଚାପ (BP)", "ଶ୍ୱାସରୋଗ"] : ["No prior conditions", "Diabetes / Sugar", "High Blood Pressure (BP)", "Asthma"]
      });
    }

    // --- 5. PROGRESSION ---
    if (!answeredMap["progression"]) {
      list.push({
        id: "progression",
        category: "General",
        question: language === "hi"
          ? "क्या आपके लक्षण अभी और बिगड़ रहे हैं, वैसे ही हैं, या सुधार हो रहा है?"
          : language === "or"
          ? "ଆପଣଙ୍କ ଲକ୍ଷଣ ଏବେ ଆହୁରି ଖରାପ ହେଉଛି ନା ସମାନ ରହୁଛି?"
          : "Are your symptoms getting worse right now, staying the same, or improving?",
        quickChoices: language === "hi" ? ["लक्षण बिगड़ रहे हैं (Worse)", "स्थिति स्थिर है (Same)", "धीरे-धीरे सुधार है (Improving)"] : language === "or" ? ["ଖରାପ ହେଉଛି (Worse)", "ସ୍ଥିର ଅଛି (Same)", "ସୁଧାର ହେଉଛି (Improving)"] : ["Getting worse right now", "Staying the same", "Gradually improving"]
      });
    }

    // --- 6. DAILY FUNCTION & FLUIDS ---
    if (!answeredMap["daily_function"]) {
      list.push({
        id: "daily_function",
        category: "General",
        question: language === "hi"
          ? "क्या आप पानी, खाना ठीक से ले पा रहे हैं और सामान्य रूप से चल-फिर पा रहे हैं?"
          : language === "or"
          ? "ଆପଣ ଖାଇବା-ପିଇବା ଓ ଦୈନନ୍ଦିନ କାର୍ଯ୍ୟ ସ୍ୱାଭାବିକ ଭାବେ କରିପାରୁଛନ୍ତି କି?"
          : "Are you able to drink water, eat, and perform daily activities normally?",
        quickChoices: language === "hi" ? ["हाँ, सामान्य आहार ले रहे हैं", "पानी/खाना लेने में कठिनाई", "चलने-फिरने में असमर्थ"] : language === "or" ? ["ହଁ, ସ୍ୱାଭାବିକ ଅଛି", "ଖାଇବା-ପିଇବାରେ କଷ୍ଟ", "ଦୈନନ୍ଦିନ କାମ କରିବାରେ ଅସମର୍ଥ"] : ["Yes, normal intake", "Difficulty eating or drinking", "Unable to do daily tasks"]
      });
    }

    // --- SYMPTOM-SPECIFIC QUESTIONS (If specific keywords found) ---
    if ((text.includes("fever") || text.includes("बुखार") || text.includes("bukhar") || text.includes("ଜ୍ୱର")) && !answeredMap["fever_pattern"]) {
      list.push({
        id: "fever_pattern",
        category: "Fever Specific",
        question: language === "hi"
          ? "क्या बुखार लगातार बना हुआ है या ठंड और कंपकंपी के साथ आ-जा रहा है?"
          : language === "or"
          ? "ଜ୍ୱର କ୍ରମାଗତ ରହୁଛି ନା କମ୍ପ ସହ ଆସୁଛି-ଯାଉଛି?"
          : "Is the fever continuous or coming and going with chills/shivering?",
        quickChoices: language === "hi" ? ["लगातार तेज बुखार", "ठंड लगकर आता है", "हल्का बुखार"] : language === "or" ? ["କ୍ରମାଗତ ପ୍ରବଳ ଜ୍ୱର", "କମ୍ପ ସହ", "ସାମାନ୍ୟ ଜ୍ୱର"] : ["Continuous high fever", "Comes with chills", "Mild on/off"]
      });
    }

    if ((text.includes("cough") || text.includes("खांसी") || text.includes("khansi") || text.includes("କାଶ")) && !answeredMap["cough_type"]) {
      list.push({
        id: "cough_type",
        category: "Cough Specific",
        question: language === "hi"
          ? "क्या यह सूखी खांसी है या बलगम/कफ आ रहा है?"
          : language === "or"
          ? "ଏହା ଶୁଖିଲା କାଶ ନା କଫ ବାହାରୁଛି?"
          : "Is it a dry cough or producing phlegm/mucus?",
        quickChoices: language === "hi" ? ["सूखी खांसी", "बलगम / कफ के साथ"] : language === "or" ? ["ଶୁଖିଲା କାଶ", "କଫ ସହ"] : ["Dry cough", "With phlegm/mucus"]
      });
    }

    if ((text.includes("chest") || text.includes("छाती") || text.includes("सीने") || text.includes("chhati") || text.includes("breath") || text.includes("सांस") || text.includes("ଶ୍ୱାସ")) && !answeredMap["chest_radiate"]) {
      list.push({
        id: "chest_radiate",
        category: "Chest/Breathing Specific",
        question: language === "hi"
          ? "क्या छाती का दर्द आपकी बाईं बांह, गर्दन या जबड़े की तरफ फैल रहा है?"
          : language === "or"
          ? "ଛାତି ଯନ୍ତ୍ରଣା ବାମ ହାତ କିମ୍ବା ମୁହଁକୁ ବ୍ୟାପୁଛି କି?"
          : "Is the chest pain radiating to your left arm, neck, or jaw?",
        quickChoices: language === "hi" ? ["हाँ, बांह तक फैल रहा है", "नहीं, केवल छाती में है"] : language === "or" ? ["ହଁ, ବାମ ହାତକୁ ଯାଉଛି", "ନା, କେବଳ ଛାତିରେ"] : ["Yes, radiating to arm/jaw", "No, localized to chest"]
      });
    }

    if ((text.includes("vomit") || text.includes("उल्टी") || text.includes("ulti") || text.includes("ବାନ୍ତି")) && !answeredMap["vomit_count"]) {
      list.push({
        id: "vomit_count",
        category: "Vomiting Specific",
        question: language === "hi"
          ? "आज कितनी बार उल्टी हुई है, और क्या पानी पी पा रहे हैं?"
          : language === "or"
          ? "ଆଜି କେତେ ଥର ବାନ୍ତି ହୋଇଛି, ଏବଂ ପାଣି ପିଇପାରୁଛନ୍ତି କି?"
          : "How many times have you vomited today, and can you keep liquids down?",
        quickChoices: language === "hi" ? ["1-2 बार, पानी पी पा रहे हैं", "3 से अधिक बार, कुछ रुक नहीं रहा"] : language === "or" ? ["୧-୨ ଥର, ପାଣି ପିଇପାରୁଛନ୍ତି", "୩ ରୁ ଅଧିକ ଥର"] : ["1-2 times, keeping fluids down", "3+ times, cannot retain fluids"]
      });
    }

    return list;
  }, [symptomText, language, answeredMap]);

  // Handle answering and popping out a question
  const handleSaveAnswer = (qId, questionText, answerValue) => {
    const cleanAnswer = (answerValue || "").trim();
    if (!cleanAnswer) return;

    // 1. Store in answeredMap (this immediately causes question to pop out / disappear from dynamicQuestions)
    setAnsweredMap((prev) => ({
      ...prev,
      [qId]: { question: questionText, answer: cleanAnswer }
    }));

    // 2. Clear input draft
    setInputDrafts((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
  };

  // Remove an answered item to bring question back
  const handleRemoveAnswered = (qId) => {
    setAnsweredMap((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
  };

  // Language switcher
  const handleLanguageChange = (code) => {
    setLanguage(code);
    setMicStatus("");
  };

  // Voice recording
  const handleMicClick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition && !isRecording) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = language === "hi" ? "hi-IN" : language === "or" ? "or-IN" : "en-IN";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        setIsRecording(true);
        setMicStatus(t.micListening);

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setSymptomText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsRecording(false);
          setMicStatus(t.micCaptured);
        };

        recognition.onerror = () => {
          simulateVoiceFallback();
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        return;
      } catch {
        simulateVoiceFallback();
        return;
      }
    }

    simulateVoiceFallback();
  };

  const simulateVoiceFallback = () => {
    setIsRecording(true);
    setMicStatus(t.micListening);
    setTimeout(() => {
      let samplePhases = [
        "Patient reports high fever and persistent cough for 3 days with dizziness, taking paracetamol.",
        "Experiencing acute chest pain and difficulty breathing since morning, no medicine taken.",
        "Mild headache and slight fatigue today, no previous medical history."
      ];
      if (language === "hi") {
        samplePhases = [
          "मरीज को 3 दिनों से तेज बुखार और उल्टी हो रही है, पैरासिटामोल गोली ली है।",
          "सुबह से सीने में अचानक तेज दर्द और सांस फूलने की समस्या हो रही है।",
          "आज से हल्का सिरदर्द और हल्की थकान है, कोई पुरानी बीमारी नहीं है।"
        ];
      } else if (language === "or") {
        samplePhases = [
          "ରୋଗୀଙ୍କୁ ୨ ଦିନ ଧରି ପ୍ରବଳ ଜ୍ୱର ଏବଂ ବାନ୍ତି ହେଉଛି, ପାରାସିଟାମୋଲ୍ ଔଷଧ ଖାଉଛନ୍ତି।",
          "ସକାଳୁ ଛାତି ଯନ୍ତ୍ରଣା ଏବଂ ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ ହେଉଛି, କୌଣସି ଔଷଧ ଖାଇନାହାଁନ୍ତି।",
          "ଆଜି ସାମାନ୍ୟ ମୁଣ୍ଡବିନ୍ଧା ଏବଂ କ୍ଳାନ୍ତ ଲାଗୁଛି, ପୂର୍ବର କୌଣସି ରୋଗ ନାହିଁ।"
        ];
      }

      const randomPhase = samplePhases[Math.floor(Math.random() * samplePhases.length)];
      setSymptomText((prev) => (prev ? `${prev}\n${randomPhase}` : randomPhase));
      setIsRecording(false);
      setMicStatus(t.micCaptured);
    }, 1200);
  };

  // Report upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReportImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setReportImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setReportImageBase64(null);
    setReportImageName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Direct Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (dynamicQuestions.length > 0) {
      alert(`Please answer all ${dynamicQuestions.length} required additional question(s) in the "Some Additional Questions" section before submitting.`);
      return;
    }
    if (!consentChecked || !symptomText.trim()) return;

    setSubmitting(true);
    setErrorMessage("");
    setResultNote(null);

    try {
      // 1. Create Patient token session
      const patientRes = await fetch(`${API_BASE}/api/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (!patientRes.ok) {
        throw new Error("Failed to initialize patient session token.");
      }
      const patient = await patientRes.json();

      // 2. Submit triage note
      const additionalAnswers = Object.values(answeredMap).map((item) => ({
        question: item.question,
        answer: item.answer
      }));

      const triageRes = await fetch(`${API_BASE}/api/triage-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          symptomText: symptomText.trim(),
          additionalAnswers,
          vitals: (vitals.bpSystolic || vitals.pulse || vitals.spo2 || vitals.temp) ? vitals : undefined,
          language,
          reportImageBase64: reportImageBase64 || undefined
        })
      });

      if (!triageRes.ok) {
        const errorData = await triageRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to process triage submission.");
      }

      const note = await triageRes.json();
      setResultNote({ ...note, patient });
      if (onTriageCreated) {
        try {
          onTriageCreated(note);
        } catch (callErr) {
          console.warn("Notice: onTriageCreated callback handled with warning:", callErr);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred while communicating with the server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger Confirmation Modal before reset
  const handleOpenResetModal = () => {
    // If form is already empty, reset directly
    if (!symptomText.trim() && !resultNote && Object.keys(answeredMap).length === 0 && !vitals.bpSystolic && !vitals.pulse && !vitals.spo2 && !vitals.temp) {
      confirmReset();
      return;
    }
    setShowConfirmModal(true);
  };

  // Perform confirmed reset to fresh state
  const confirmReset = () => {
    setSymptomText("");
    setReportImageBase64(null);
    setReportImageName("");
    setConsentChecked(false);
    setResultNote(null);
    setErrorMessage("");
    setMicStatus("");
    setAnsweredMap({});
    setInputDrafts({});
    setVitals({
      bpSystolic: "",
      bpDiastolic: "",
      pulse: "",
      spo2: "",
      temp: ""
    });
    setShowPrintSlipModal(false);
    setShowConfirmModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getRiskBadge = (tag) => {
    switch (tag) {
      case "RED":
        return {
          bg: "#FBEBE8",
          color: "#B23A2E",
          dot: "#B23A2E",
          label: language === "hi" ? "गंभीर (RED)" : language === "or" ? "ଜରୁରୀ (RED)" : "Urgent (RED)",
          advice: language === "hi" ? "तत्काल आपातकालीन चिकित्सा समीक्षा आवश्यक है।" : language === "or" ? "ତୁରନ୍ତ ଡାକ୍ତରୀ ସମୀକ୍ଷା ଆବଶ୍ୟକ।" : "Immediate clinical attention required."
        };
      case "AMBER":
      case "YELLOW":
        return {
          bg: "#FEF9C3",
          color: "#854D0E",
          dot: "#EAB308",
          label: language === "hi" ? "मध्यम (YELLOW)" : language === "or" ? "ମଧ୍ୟମ (YELLOW)" : "Moderate (YELLOW)",
          advice: language === "hi" ? "प्राथमिकता के आधार पर डॉक्टर द्वारा जांच के लिए कतारबद्ध।" : language === "or" ? "ଡାକ୍ତରୀ ଯାଞ୍ଚ ପାଇଁ କତାରବଦ୍ଧ।" : "Queued for priority clinical evaluation."
        };
      case "GREEN":
      default:
        return {
          bg: "#EAF3EC",
          color: "#3F7D52",
          dot: "#3F7D52",
          label: language === "hi" ? "सामान्य (GREEN)" : language === "or" ? "ସାଧାରଣ (GREEN)" : "Normal (GREEN)",
          advice: language === "hi" ? "नियमित परामर्श कतार में शामिल।" : language === "or" ? "ନିୟମିତ ପରାମର୍ଶ କତାରରେ ଅନ୍ତର୍ଭୁକ୍ତ।" : "Routine consultation queue."
        };
    }
  };

  const answeredEntries = Object.entries(answeredMap);

  return (
    <div className="max-w-[1240px] mx-auto p-6 md:p-8 space-y-6 relative">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-black tracking-tight text-slate-900">
            {t.pageTitle}
          </h1>
          <p className="text-[14.5px] font-medium text-slate-500 mt-0.5">
            {t.pageSubtitle}
          </p>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[12px] font-bold text-slate-500">
            Language:
          </span>
          <div className="flex gap-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageChange(lang.code)}
                className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                  language === lang.code
                    ? "bg-[#111827] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Column */}
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Symptom Input Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-black uppercase tracking-wider text-slate-600">
                  {t.sectionSymptom}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] italic text-slate-500">
                    {micStatus || t.micDefault}
                  </span>
                  <button
                    type="button"
                    onClick={handleMicClick}
                    title="Speak symptoms"
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isRecording ? "animate-pulse ring-2 ring-rose-500 bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span className="text-base">🎙</span>
                  </button>
                </div>
              </div>

              <textarea
                value={symptomText}
                onChange={(e) => setSymptomText(e.target.value)}
                placeholder={t.placeholder}
                rows={4}
                required
                className="w-full p-4 rounded-xl text-[15px] outline-none transition border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 leading-relaxed font-medium text-slate-900 shadow-2xs"
              />

              {/* Quick Template Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11.5px] font-bold text-slate-500">{t.quickLabel}</span>
                {t.templates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSymptomText(tpl.text);
                      setAnsweredMap({});
                    }}
                    className="text-[11.5px] px-3 py-1 rounded-lg bg-slate-100/90 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 cursor-pointer font-bold transition shadow-2xs active:scale-95"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PATIENT VITAL SIGNS (OPTIONAL) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-[17px] font-black text-slate-900 flex items-center gap-2">
                    <span className="text-lg">🩺</span> Patient Vital Signs (Optional)
                  </h3>
                  <p className="text-[12.5px] text-slate-500 mt-0.5">
                    Record baseline vitals if medical instruments (BP monitor, pulse oximeter, thermometer) are available.
                  </p>
                </div>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                  CLINICAL VITALS
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                {/* 1. Blood Pressure */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5 focus-within:border-emerald-500 focus-within:bg-white transition">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      BP (mmHg)
                    </label>
                    {vitals.bpSystolic ? (
                      (Number(vitals.bpSystolic) >= 180 || Number(vitals.bpDiastolic) >= 110) ? (
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">Crisis ⚠️</span>
                      ) : (Number(vitals.bpSystolic) >= 140 || Number(vitals.bpDiastolic) >= 90) ? (
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">High</span>
                      ) : (
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">Normal ✓</span>
                      )
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={vitals.bpSystolic}
                      onChange={(e) => setVitals({ ...vitals, bpSystolic: e.target.value })}
                      placeholder="Sys (120)"
                      className="w-1/2 p-2 text-[13px] font-bold text-slate-900 bg-white rounded-lg border border-slate-200 outline-none focus:border-emerald-600"
                    />
                    <span className="text-slate-400 font-bold">/</span>
                    <input
                      type="number"
                      value={vitals.bpDiastolic}
                      onChange={(e) => setVitals({ ...vitals, bpDiastolic: e.target.value })}
                      placeholder="Dia (80)"
                      className="w-1/2 p-2 text-[13px] font-bold text-slate-900 bg-white rounded-lg border border-slate-200 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* 2. Pulse / Heart Rate */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5 focus-within:border-emerald-500 focus-within:bg-white transition">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      Pulse (bpm)
                    </label>
                    {vitals.pulse ? (
                      (Number(vitals.pulse) > 130 || (Number(vitals.pulse) > 0 && Number(vitals.pulse) < 45)) ? (
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">Abnormal ⚠️</span>
                      ) : Number(vitals.pulse) > 105 ? (
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">High</span>
                      ) : (
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">Normal ✓</span>
                      )
                    ) : null}
                  </div>
                  <input
                    type="number"
                    value={vitals.pulse}
                    onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                    placeholder="e.g. 78"
                    className="w-full p-2 text-[13px] font-bold text-slate-900 bg-white rounded-lg border border-slate-200 outline-none focus:border-emerald-600"
                  />
                </div>

                {/* 3. SpO2 Oxygen */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5 focus-within:border-emerald-500 focus-within:bg-white transition">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      SpO2 Oxygen (%)
                    </label>
                    {vitals.spo2 ? (
                      Number(vitals.spo2) < 90 ? (
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">Critical (&lt;90%) ⚠️</span>
                      ) : Number(vitals.spo2) <= 93 ? (
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">Low (90-93%)</span>
                      ) : (
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">Normal ✓</span>
                      )
                    ) : null}
                  </div>
                  <input
                    type="number"
                    value={vitals.spo2}
                    onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                    placeholder="e.g. 98"
                    className="w-full p-2 text-[13px] font-bold text-slate-900 bg-white rounded-lg border border-slate-200 outline-none focus:border-emerald-600"
                  />
                </div>

                {/* 4. Body Temperature */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5 focus-within:border-emerald-500 focus-within:bg-white transition">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      Temp (°F)
                    </label>
                    {vitals.temp ? (
                      Number(vitals.temp) >= 103 ? (
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">High Fever ⚠️</span>
                      ) : Number(vitals.temp) >= 99.5 ? (
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">Fever</span>
                      ) : (
                        <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">Normal ✓</span>
                      )
                    ) : null}
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.temp}
                    onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                    placeholder="e.g. 98.6"
                    className="w-full p-2 text-[13px] font-bold text-slate-900 bg-white rounded-lg border border-slate-200 outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* SOME ADDITIONAL QUESTIONS AREA */}
            <div 
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3.5">
                <div>
                  <h3 className="text-[18px] font-black text-slate-900 flex items-center gap-2">
                    <span className="text-lg">📋</span> {t.additionalBoxTitle}
                  </h3>
                  <p className="text-[13px] text-slate-500 mt-0.5">
                    {t.additionalBoxHelp}
                  </p>
                </div>
                {dynamicQuestions.length > 0 && (
                  <span className="text-[11.5px] font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 shadow-2xs">
                    {dynamicQuestions.length} remaining
                  </span>
                )}
              </div>

              {/* Recorded Details (Pop-out answers summary cards) */}
              {answeredEntries.length > 0 && (
                <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-black text-[#166534] uppercase tracking-wider flex items-center gap-1.5">
                      <span>✓</span> {t.answeredBadge}
                    </span>
                    <span className="text-[11.5px] font-black px-2.5 py-0.5 rounded-full bg-white text-[#15803D] border border-[#86EFAC] shadow-2xs">
                      {answeredEntries.length} recorded
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {answeredEntries.map(([key, item]) => (
                      <div 
                        key={key}
                        className="bg-white p-3.5 rounded-xl border border-[#D1D5DB] border-l-4 border-l-[#111827] flex items-start justify-between gap-3 shadow-2xs transition-all hover:shadow-xs"
                      >
                        <div className="space-y-1.5">
                          {/* Question in COLOR 1: Crisp Solid Black */}
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded bg-[#111827] text-white shadow-2xs shrink-0 mt-0.5">
                              Q
                            </span>
                            <p className="text-[14px] font-black text-[#111827] leading-snug">
                              {item.question}
                            </p>
                          </div>

                          {/* Answer in COLOR 2: Vibrant Medical Green Badge */}
                          <div className="pl-7">
                            <span className="inline-flex items-center gap-1.5 text-[13.5px] font-extrabold text-[#065F46] bg-[#ECFDF5] border border-[#10B981] px-3.5 py-1 rounded-lg shadow-2xs">
                              <span className="text-[#059669] font-black">✓</span>
                              <span>{item.answer}</span>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAnswered(key)}
                          title="Click to edit or change answer"
                          className="text-[11.5px] font-bold px-2.5 py-1 rounded-md bg-[#FEE2E2] text-[#B91C1C] hover:bg-[#FCA5A5] cursor-pointer transition shrink-0"
                        >
                          ✕ Change
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Questions List - Each Question Pops Out / Disappears When Answered */}
              {dynamicQuestions.length === 0 ? (
                <div className="p-4 text-center rounded-xl bg-[#ECFDF5] border border-[#10B981] text-[#065F46] text-[13.5px] font-bold flex items-center justify-center gap-2">
                  <span>✓</span>
                  <span>{t.noQuestionsNeeded}</span>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {dynamicQuestions.map((item) => {
                    const currentDraft = inputDrafts[item.id] || "";

                    return (
                      <div 
                        key={item.id}
                        className="p-4 rounded-xl border border-[#D1D5DB] border-l-4 border-l-[#111827] bg-white space-y-3 transition-all shadow-xs hover:border-[#111827] hover:shadow-sm"
                      >
                        {/* Question in COLOR 1: Crisp Solid Black with Large Readable Font */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded bg-[#111827] text-white shadow-2xs shrink-0 mt-0.5">
                              Q
                            </span>
                            <p className="text-[15px] font-black text-[#111827] leading-snug">
                              {item.question}
                            </p>
                          </div>
                          <span className="text-[10.5px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] shrink-0">
                            {item.category}
                          </span>
                        </div>

                        {/* Quick Choice Buttons with vibrant Green hover */}
                        {item.quickChoices && item.quickChoices.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-0.5">
                            {item.quickChoices.map((choice, cIdx) => (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() => handleSaveAnswer(item.id, item.question, choice)}
                                className="text-[13px] px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#ECFDF5] hover:text-[#065F46] hover:border-[#10B981] border border-[#D1D5DB] text-[#111827] font-bold transition cursor-pointer shadow-2xs active:scale-98"
                              >
                                {choice}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Custom Text Input & Save */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={currentDraft}
                            onChange={(e) => setInputDrafts({ ...inputDrafts, [item.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveAnswer(item.id, item.question, currentDraft);
                              }
                            }}
                            placeholder={t.typeAnswerPlaceholder}
                            className="flex-1 p-2 text-[13.5px] rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] focus:bg-white outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
                            style={{ color: "#111827" }}
                          />
                          <button
                            type="button"
                            disabled={!currentDraft.trim()}
                            onClick={() => handleSaveAnswer(item.id, item.question, currentDraft)}
                            className="px-4 py-2 rounded-lg font-black text-[13px] text-white transition cursor-pointer disabled:opacity-40 shadow-xs bg-[#059669] hover:bg-[#047857]"
                          >
                            {t.saveBtn}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Optional Report Upload */}
            <div 
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-3.5 hover:shadow-sm transition-all"
            >
              <label className="text-[12px] font-black uppercase tracking-wider block text-slate-600">
                {t.uploadLabel}
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,.pdf"
                className="hidden"
                id="report-file-input"
              />

              {!reportImageBase64 ? (
                <label
                  htmlFor="report-file-input"
                  className="block text-center p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 transition-all cursor-pointer group"
                >
                  <span className="text-2xl block mb-1.5 group-hover:scale-110 transition-transform">📄</span>
                  <p className="text-[13.5px] font-bold text-slate-800">
                    {t.uploadPlaceholder}
                  </p>
                  <p className="text-[11.5px] text-slate-400 mt-0.5">
                    {t.uploadHelp}
                  </p>
                </label>
              ) : (
                <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <img
                      src={reportImageBase64}
                      alt="Report preview"
                      className="max-h-[70px] max-w-[90px] object-cover rounded-lg border border-slate-200"
                    />
                    <div>
                      <p className="text-[13px] font-bold text-slate-900">
                        {reportImageName || "Uploaded Report"}
                      </p>
                      <p className="text-[11.5px] text-emerald-700 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Ready for OCR analysis
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="px-3 py-1.5 text-[12px] font-bold rounded-lg text-rose-700 hover:bg-rose-50 border border-rose-300 cursor-pointer transition shadow-2xs"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* MANDATORY WARNING IF ADDITIONAL QUESTIONS REMAIN */}
            {dynamicQuestions.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[12.5px] font-bold flex items-start gap-2 shadow-2xs">
                <span className="text-base mt-0.5">⚠️</span>
                <div className="space-y-0.5">
                  <p className="font-black text-[13px] text-amber-950">
                    Mandatory Step: {dynamicQuestions.length} Additional Question{dynamicQuestions.length > 1 ? "s" : ""} Required
                  </p>
                  <p className="font-medium text-amber-900">
                    Please answer each question in the <strong>"Some Additional Questions"</strong> section above (choose a quick choice or type an answer and click Save) to unlock submission.
                  </p>
                </div>
              </div>
            )}

            {/* Consent & Direct Submit Bar */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4 hover:shadow-sm transition-all">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                />
                <span className="text-[13.5px] leading-relaxed text-slate-700 font-medium">
                  {t.consentText}
                </span>
              </label>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleOpenResetModal}
                  className="px-5 py-2.5 rounded-xl font-bold text-[13px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                >
                  {t.clearBtn}
                </button>

                {/* Direct clean submit */}
                <button
                  type="submit"
                  disabled={!consentChecked || !symptomText.trim() || dynamicQuestions.length > 0 || submitting}
                  className="px-7 py-3 rounded-xl font-black text-[14px] text-white transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-98"
                >
                  {submitting
                    ? t.submittingBtn
                    : dynamicQuestions.length > 0
                    ? `Answer ${dynamicQuestions.length} Question${dynamicQuestions.length > 1 ? "s" : ""} to Submit`
                    : !consentChecked
                    ? "Check Declaration to Submit"
                    : t.submitBtn}
                </button>
              </div>
            </div>
          </form>

          {errorMessage && (
            <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 font-bold text-[13.5px] shadow-2xs">
              ⚠ Error: {errorMessage}
            </div>
          )}
        </div>

        {/* Right Result Column — Shows the Flag According to Symptoms */}
        <div className="lg:col-span-5">
          {resultNote ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md space-y-5 sticky top-24 transition-all">
              {/* SUGGESTED TRIAGE FLAG HEADER */}
              <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: getRiskBadge(resultNote.riskTag).bg, borderColor: getRiskBadge(resultNote.riskTag).color }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                    {t.suggestedFlagTitle}
                  </span>
                  <span className="text-[12px] font-mono font-black px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 shadow-2xs">
                    Token: {resultNote.patient?.tokenId || "Ward-11"}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full animate-pulse" style={{ backgroundColor: getRiskBadge(resultNote.riskTag).dot }}></span>
                  <span className="text-2xl font-black tracking-tight" style={{ color: getRiskBadge(resultNote.riskTag).color }}>
                    {getRiskBadge(resultNote.riskTag).label}
                  </span>
                </div>

                <p className="text-[12.5px] font-bold text-slate-800">
                  {getRiskBadge(resultNote.riskTag).advice}
                </p>
              </div>

              {/* Action Buttons: Printable Slip & PDF Token Pass */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPrintSlipModal(true)}
                  className="w-full py-2.5 px-3 rounded-xl font-black text-[13px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition shadow-2xs cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>🖨️</span>
                  <span>Print OPD Slip</span>
                </button>

                <a
                  href={`${API_BASE}/api/patients/receipt/${resultNote.receiptNumber}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`TriaQ_Pass_${resultNote.receiptNumber}.pdf`}
                  className="w-full py-2.5 px-3 rounded-xl font-black text-[13px] border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition shadow-2xs cursor-pointer flex items-center justify-center gap-2 active:scale-98 text-center"
                >
                  <span>📄</span>
                  <span>Download PDF Pass</span>
                </a>
              </div>

              {/* Vitals Summary Card if vitals recorded */}
              {resultNote.vitals && (resultNote.vitals.bpSystolic || resultNote.vitals.pulse || resultNote.vitals.spo2 || resultNote.vitals.temp) && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                    Patient Vital Signs Recorded
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                      <span className="text-[9.5px] font-bold text-slate-400 block uppercase">BP</span>
                      <span className="text-[12px] font-black text-slate-900">
                        {resultNote.vitals.bpSystolic ? `${resultNote.vitals.bpSystolic}/${resultNote.vitals.bpDiastolic || '-'}` : "-"}
                      </span>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                      <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Pulse</span>
                      <span className="text-[12px] font-black text-slate-900">
                        {resultNote.vitals.pulse ? `${resultNote.vitals.pulse} bpm` : "-"}
                      </span>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                      <span className="text-[9.5px] font-bold text-slate-400 block uppercase">SpO2</span>
                      <span className={`text-[12px] font-black ${Number(resultNote.vitals.spo2) < 90 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {resultNote.vitals.spo2 ? `${resultNote.vitals.spo2}%` : "-"}
                      </span>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                      <span className="text-[9.5px] font-bold text-slate-400 block uppercase">Temp</span>
                      <span className="text-[12px] font-black text-slate-900">
                        {resultNote.vitals.temp ? `${resultNote.vitals.temp}°F` : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Matched Risk Keyword Triggers */}
              {resultNote.matchedRiskKeywords && resultNote.matchedRiskKeywords.length > 0 && (
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider block mb-1.5 text-slate-500">
                    Trigger Keywords Detected
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {resultNote.matchedRiskKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-black px-2.5 py-0.5 rounded-md border"
                        style={{ backgroundColor: getRiskBadge(resultNote.riskTag).bg, color: getRiskBadge(resultNote.riskTag).color, borderColor: getRiskBadge(resultNote.riskTag).color }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Structured Human-Friendly Summary */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider block mb-2 text-slate-500">
                  {t.summaryTitle}
                </label>
                <ClinicalSummaryCard summary={resultNote.summary} language={language} />
              </div>

              {/* Missing Information Flags */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider block mb-1.5 text-slate-500">
                  {t.missingTitle}
                </label>
                {resultNote.missingInfo && resultNote.missingInfo.length > 0 ? (
                  <ul className="space-y-1">
                    {resultNote.missingInfo.map((info, i) => (
                      <li 
                        key={i}
                        className="text-[12.5px] px-3 py-1 rounded-lg border inline-block mr-1.5 mb-1 font-bold bg-amber-50 border-amber-300 text-amber-900 shadow-2xs"
                      >
                        • {info}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-emerald-700 font-bold italic">✓ {t.missingNone}</p>
                )}
              </div>

              {/* Extracted Lab OCR Insights if any */}
              {resultNote.extractedReportData && (
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider block mb-1.5 text-slate-500">
                    Extracted Lab OCR Insights
                  </label>
                  <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/70 text-[12.5px] text-slate-800">
                    <p className="font-bold text-emerald-900">Text detected from report</p>
                    <p className="text-[11.5px] mt-1 font-mono text-slate-700">{resultNote.extractedReportData.sampleLines?.join(" | ") || "Report parsed."}</p>
                  </div>
                </div>
              )}

              {/* Direct Fresh Patient Intake Button (Triggers Confirmation Popup) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenResetModal}
                  className="w-full py-3 rounded-xl font-black text-[13.5px] text-white transition-all shadow-sm hover:shadow-md cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-98"
                >
                  {t.newIntakeBtn}
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="bg-white rounded-2xl p-8 border border-slate-200/90 text-center space-y-3 shadow-xs"
            >
              <span className="text-4xl block mb-1">📋</span>
              <h2 className="text-[18px] font-black text-slate-900">
                {t.resultAwaiting}
              </h2>
              <p className="text-[13px] max-w-sm mx-auto text-slate-500 leading-relaxed font-medium">
                {t.resultAwaitingSub}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL POPUP (POPS UP ON SCREEN ASKING CANCEL OR YES) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-scaleUp"
          >
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 text-amber-800 text-xl font-bold">
                ⚠️
              </div>
              <div>
                <h3 className="text-[16px] font-black text-slate-900">
                  {t.modalTitle}
                </h3>
                <p className="text-[11.5px] font-bold text-slate-400">
                  TriaQ Session Governance
                </p>
              </div>
            </div>

            <p className="text-[13.5px] text-slate-600 leading-relaxed font-medium">
              {t.modalDesc}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              {/* CANCEL BUTTON */}
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-[12.5px] border border-slate-200 transition bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                {t.modalCancel}
              </button>

              {/* YES BUTTON */}
              <button
                type="button"
                onClick={confirmReset}
                className="px-6 py-2.5 rounded-xl font-black text-[12.5px] text-white transition-all shadow-sm cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-98"
              >
                {t.modalYes}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE MEDICAL TRIAGE SLIP MODAL */}
      {showPrintSlipModal && resultNote && (
        <TriageSlipModal 
          note={resultNote} 
          onClose={() => setShowPrintSlipModal(false)} 
        />
      )}
    </div>
  );
}
