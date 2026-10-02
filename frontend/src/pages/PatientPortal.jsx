import React, { useState, useEffect, useMemo, useRef } from "react";
import TriageSlipModal from "../components/TriageSlipModal";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import LanguageSelectorModal from "../components/LanguageSelectorModal";
import { TRANSLATIONS, LANGUAGES, getLocalizedToken, toOdiaDigits, toHindiDigits } from "../utils/translations";
import {
  saveDraft,
  loadDraft,
  deleteDraft,
  queueOfflineSubmission,
  getQueuedSubmissions,
  syncAllQueuedSubmissions
} from "../utils/offlineStorage";
import {
  IconHospital,
  IconClinic,
  IconDoctor,
  IconNurse,
  IconPatient,
  IconHome,
  IconQRCode,
  IconEye,
  IconEyeOff,
  IconClipboard,
  IconShield,
  IconArrowRight,
  IconCheckCircle,
  IconXCircle
} from "../components/Icons";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");


export default function PatientPortal({
  onNavigateHome,
  onNavigateToIntake,
  language: propLanguage,
  onSelectLanguage: propSelectLanguage,
  onOpenLanguageModal: propOpenModal
}) {
  // Session & navigation states
  const [patientSession, setPatientSession] = useState(() => {
    try {
      const saved = localStorage.getItem("triaq_patient_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentStep, setCurrentStep] = useState("auth"); // auth | intake | symptoms | confirmation | status
  const [authTab, setAuthTab] = useState("password"); // password | otp
  const [isSignup, setIsSignup] = useState(false);

  // Auth Inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtpCode, setDemoOtpCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Facility & QR Check-In States
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState("");
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [isQrCheckIn, setIsQrCheckIn] = useState(false);

  // Intake Profile Inputs (persisted to localStorage draft)
  const [fullName, setFullName] = useState(() => localStorage.getItem("triaq_draft_name") || "");
  const [age, setAge] = useState(() => localStorage.getItem("triaq_draft_age") || "");
  const [contactPhone, setContactPhone] = useState(() => localStorage.getItem("triaq_draft_phone") || "");
  const [address, setAddress] = useState(() => localStorage.getItem("triaq_draft_address") || "");
  const [conditions, setConditions] = useState(() => localStorage.getItem("triaq_draft_conditions") || "");
  const [medications, setMedications] = useState(() => localStorage.getItem("triaq_draft_meds") || "");
  const [intakeSavedNotice, setIntakeSavedNotice] = useState("");

  // Detect QR check-in parameters & fetch facilities list
  useEffect(() => {
    try {
      const fullUrl = window.location.href;
      const hashPart = window.location.hash.includes("?") ? window.location.hash.split("?")[1] : "";
      const searchParams = new URLSearchParams(window.location.search || hashPart);
      const facilityParam = searchParams.get("facility");
      const nameParam = searchParams.get("name");

      if (nameParam) {
        const decoded = decodeURIComponent(nameParam);
        setSelectedFacility(decoded);
        if (facilityParam) setSelectedFacilityId(facilityParam);
        setIsQrCheckIn(true);
      }
    } catch (e) {
      console.error("QR Param parsing error:", e);
    }

    fetch(`${API_BASE}/api/facilities`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFacilities(data);
          if (!isQrCheckIn && data.length > 0) {
            setSelectedFacility(data[0].name);
            setSelectedFacilityId(data[0].id);
          }
        }
      })
      .catch((err) => console.error("Error loading facilities:", err));
  }, []);

  // Symptoms & Vitals Inputs
  const [symptomText, setSymptomText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const baseTextRef = useRef("");
  const [micError, setMicError] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [reportImageBase64, setReportImageBase64] = useState(null);
  const [reportFileName, setReportFileName] = useState("");

  // Vitals
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temp, setTemp] = useState("");

  // Submission / Receipt Data
  const [receiptData, setReceiptData] = useState(null);
  const [statusData, setStatusData] = useState(null);

  // Multilingual, Dynamic Questions & Consent States
  const [internalLanguage, setInternalLanguage] = useState(() => {
    try {
      return localStorage.getItem("triaq_patient_lang") || "en";
    } catch {
      return "en";
    }
  });

  const language = propLanguage || internalLanguage;
  const setLanguage = (code) => {
    setInternalLanguage(code);
    if (propSelectLanguage) propSelectLanguage(code);
    try {
      localStorage.setItem("triaq_patient_lang", code);
    } catch {}
  };

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const handleOpenLanguageModal = () => {
    if (propOpenModal) {
      propOpenModal();
    } else {
      setShowLanguageModal(true);
    }
  };

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const [consentChecked, setConsentChecked] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [offlineSyncNotice, setOfflineSyncNotice] = useState("");
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [answeredMap, setAnsweredMap] = useState({});
  const [inputDrafts, setInputDrafts] = useState({});
  const [showPrintSlipModal, setShowPrintSlipModal] = useState(false);

  // Dynamic questions generation (reactive to symptoms, language, and answeredMap)
  const dynamicQuestions = useMemo(() => {
    const list = [];
    const text = (symptomText || "").toLowerCase();

    // 1. DURATION QUESTION (MANDATORY)
    if (!answeredMap["duration"]) {
      list.push({
        id: "duration",
        category: "General",
        question: language === "hi" 
          ? "यह समस्या कितने समय (घंटे या दिन) से हो रही है?"
          : language === "or"
          ? "ଏହି ସମସ୍ୟା କେତେ ସମୟ (ଘଣ୍ଟା ବା ଦିନ) ଧରି ହେଉଛି?"
          : "How long (in hours or days) have you had these symptoms?",
        quickChoices: language === "hi" ? ["आज से ही", "1-2 दिनों से", "3-5 दिनों से", "1 सप्ताह से अधिक"] : language === "or" ? ["ଆଜିଠାରୁ", "୧-୨ ଦିନ ହେବ", "୩-୫ ଦିନ", "୧ ସପ୍ତାହରୁ ଅଧିକ"] : ["Started today", "1-2 days", "3-5 days", "More than a week"]
      });
    }

    // 2. SEVERITY QUESTION (MANDATORY)
    if (!answeredMap["severity"]) {
      list.push({
        id: "severity",
        category: "General",
        question: language === "hi"
          ? "तकलीफ की गंभीरता (तीव्रता) कैसी है?"
          : language === "or"
          ? "କଷ୍ଟ ବା ଯନ୍ତ୍ରଣାର ତୀବ୍ରତା କିପରି ଅଛି?"
          : "How severe or intense is your discomfort right now?",
        quickChoices: language === "hi" ? ["हल्की (Mild)", "मध्यम (Moderate)", "गंभीर (Severe)", "अत्यधिक असहनीय (Critical)"] : language === "or" ? ["ସାମାନ୍ୟ (Mild)", "ମଧ୍ୟମ (Moderate)", "ଗମ୍ଭୀର (Severe)", "ଅତ୍ୟଧିକ (Critical)"] : ["Mild (Manageable)", "Moderate (Uncomfortable)", "Severe (Cannot function)", "Critical / Extreme"]
      });
    }

    // 3. CURRENT / PRE-EXISTING MEDICATIONS (MANDATORY)
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

    // 4. PRE-EXISTING MEDICAL HISTORY (MANDATORY)
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

    // 5. PROGRESSION
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

    // 6. DAILY FUNCTION & FLUIDS
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

    // SYMPTOM-SPECIFIC QUESTIONS
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

    setAnsweredMap((prev) => ({
      ...prev,
      [qId]: { question: questionText, answer: cleanAnswer }
    }));

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

  // Auto-save demographic drafts
  useEffect(() => {
    localStorage.setItem("triaq_draft_name", fullName);
    localStorage.setItem("triaq_draft_age", age);
    localStorage.setItem("triaq_draft_phone", contactPhone);
    localStorage.setItem("triaq_draft_address", address);
    localStorage.setItem("triaq_draft_conditions", conditions);
    localStorage.setItem("triaq_draft_meds", medications);
  }, [fullName, age, contactPhone, address, conditions, medications]);

  // Real-time offline / online listeners & background auto-sync
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      try {
        const { synced } = await syncAllQueuedSubmissions(API_BASE);
        if (synced > 0) {
          setOfflineSyncNotice(`✓ Reconnected! Automatically synced ${synced} offline case(s) to the hospital server.`);
          setOfflineQueueCount(0);
          setTimeout(() => setOfflineSyncNotice(""), 8000);
        }
      } catch (err) {
        console.error("Offline sync error:", err);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check for offline queued items
    getQueuedSubmissions().then((q) => {
      if (q && q.length > 0) setOfflineQueueCount(q.length);
    });

    // Restore symptom draft from offline storage if present
    loadDraft("patient_symptom_draft").then((draft) => {
      if (draft && draft.symptomText) {
        setSymptomText(draft.symptomText);
        if (draft.bpSystolic) setBpSystolic(draft.bpSystolic);
        if (draft.bpDiastolic) setBpDiastolic(draft.bpDiastolic);
        if (draft.pulse) setPulse(draft.pulse);
        if (draft.spo2) setSpo2(draft.spo2);
        if (draft.temp) setTemp(draft.temp);
        setHasDraftRestored(true);
        setTimeout(() => setHasDraftRestored(false), 6000);
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Save symptom draft periodically to IndexedDB / localStorage
  useEffect(() => {
    if (symptomText.trim()) {
      saveDraft("patient_symptom_draft", {
        symptomText,
        bpSystolic,
        bpDiastolic,
        pulse,
        spo2,
        temp,
        updatedAt: new Date().toISOString()
      });
    }
  }, [symptomText, bpSystolic, bpDiastolic, pulse, spo2, temp]);

  // Initial step determination if logged in
  useEffect(() => {
    if (patientSession) {
      if (receiptData) {
        deleteDraft("patient_symptom_draft");
        setCurrentStep("confirmation");
      } else {
        setCurrentStep("intake");
      }
    } else {
      setCurrentStep("auth");
    }
  }, [patientSession]);

  // Helpers for Indian 10-digit Contact Number validation
  const cleanIndianPhone = (raw) => {
    let digits = String(raw || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    return digits;
  };

  const isValidIndianPhone = (raw) => {
    const digits = cleanIndianPhone(raw);
    return /^[6-9]\d{9}$/.test(digits);
  };

  // --- AUTH HANDLERS ---
  const handleSendOTP = async () => {
    setAuthError("");
    if (!isValidIndianPhone(phone)) {
      setAuthError("Please enter a valid 10-digit Indian Contact Number (starting with 6, 7, 8, or 9).");
      return;
    }
    const cleanNumber = cleanIndianPhone(phone);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/patients/login/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanNumber })
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setDemoOtpCode(data.demoOtp || "123456");
        setOtp(data.demoOtp || "123456"); // Auto-fill demo OTP for convenience
      } else {
        setAuthError(data.error || "Failed to send OTP.");
      }
    } catch {
      // Offline fallback demo OTP
      setOtpSent(true);
      setDemoOtpCode("123456");
      setOtp("123456");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginOTP = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (!isValidIndianPhone(phone)) {
      setAuthError("Please enter a valid 10-digit Indian Contact Number (starting with 6, 7, 8, or 9).");
      return;
    }
    const cleanNumber = cleanIndianPhone(phone);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/patients/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanNumber, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("triaq_patient_session", JSON.stringify(data));
      setPatientSession(data);
      if (!contactPhone) setContactPhone(cleanNumber);
      setCurrentStep("intake");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError("");

    let cleanPhone = null;
    if (isSignup && phone) {
      if (!isValidIndianPhone(phone)) {
        setAuthError("Please enter a valid 10-digit Indian Contact Number (starting with 6, 7, 8, or 9).");
        return;
      }
      cleanPhone = cleanIndianPhone(phone);
    }

    setLoading(true);
    const endpoint = isSignup ? "/api/patients/register" : "/api/patients/login";
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, phone: cleanPhone, name: fullName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      localStorage.setItem("triaq_patient_session", JSON.stringify(data));
      setPatientSession(data);
      if (data.patient?.phone) {
        setContactPhone(data.patient.phone);
      } else if (cleanPhone) {
        setContactPhone(cleanPhone);
      }
      setCurrentStep("intake");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("triaq_patient_session");
    setPatientSession(null);
    setReceiptData(null);
    setStatusData(null);
    setCurrentStep("auth");
  };

  // --- INTAKE & PROFILE ---
  const handleSaveProfileAndProceed = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !age.trim()) {
      setIntakeSavedNotice("Please enter your name and age to proceed.");
      return;
    }

    const cleanContact = cleanIndianPhone(contactPhone);
    if (!cleanContact || !isValidIndianPhone(cleanContact)) {
      setIntakeSavedNotice("Please enter a valid 10-digit Indian Contact Number (starting with 6, 7, 8, or 9).");
      return;
    }

    setLoading(true);
    setIntakeSavedNotice("");
    setReceiptData(null);
    setStatusData(null);

    try {
      if (patientSession?.token) {
        await fetch(`${API_BASE}/api/patients/profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${patientSession.token}`
          },
          body: JSON.stringify({
            name: fullName.trim(),
            age: age.trim(),
            phone: cleanContact,
            address: address.trim(),
            conditions: conditions.trim(),
            medications: medications.trim(),
            facility: selectedFacility
          })
        });
      }
    } catch (err) {
      console.warn("Offline profile draft saved locally:", err);
    } finally {
      setLoading(false);
      setCurrentStep("symptoms");
    }
  };

  // --- VOICE INPUT (Web Speech API with Multilingual Support) ---
  const BCP47_LANG_MAP = {
    en: "en-IN",
    hi: "hi-IN",
    or: "or-IN"
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const toggleSpeechRecognition = () => {
    setMicError("");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicError("Speech recognition is not natively supported in your current browser (e.g. Firefox). Please use Google Chrome, Microsoft Edge, or Mobile Safari, or type your symptoms directly.");
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      setInterimTranscript("");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = BCP47_LANG_MAP[language] || "en-IN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Lock current base text so we never duplicate or repeat words
      baseTextRef.current = symptomText;

      recognition.onstart = () => {
        setIsRecording(true);
        setMicError("");
        setInterimTranscript("");
      };

      recognition.onresult = (event) => {
        let sessionFinal = "";
        let sessionInterim = "";

        // Calculate session total from 0 to avoid partial chunk repetition
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            sessionFinal += transcript + " ";
          } else {
            sessionInterim += transcript;
          }
        }

        const base = (baseTextRef.current || "").trim();
        const finalClean = sessionFinal.trim();
        const combined = base ? (finalClean ? `${base} ${finalClean}` : base) : finalClean;

        setSymptomText(combined);
        setInterimTranscript(sessionInterim.trim());
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setMicError("Microphone access was denied. Please click the camera/mic icon in your browser URL bar and allow microphone permissions.");
        } else if (event.error === "network") {
          setMicError("Speech recognition network service error. Please check your connection or type symptoms directly.");
        } else if (event.error !== "no-speech") {
          setMicError(`Voice recognition notification: ${event.error}. You can also type your symptoms directly.`);
        }
        setIsRecording(false);
        setInterimTranscript("");
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimTranscript("");
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setMicError("Could not initialize microphone: " + (err.message || "Please check browser mic permissions."));
      setIsRecording(false);
    }
  };

  // --- REPORT ATTACHMENT ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setReportFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReportImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // --- SYMPTOMS SUBMIT ---
  const handleSubmitTriage = async (e) => {
    e.preventDefault();
    if (dynamicQuestions.length > 0) {
      alert(`Please answer all ${dynamicQuestions.length} required additional question(s) in the "Some Additional Questions" section above before submitting.`);
      return;
    }
    if (!consentChecked) {
      alert("Please review and check the declaration consent box before submitting your request.");
      return;
    }
    if (symptomText.trim().length < 15) {
      alert("Please describe your symptoms with at least 15 characters so doctors can properly evaluate your case.");
      return;
    }

    setLoading(true);
    try {
      const pId = patientSession?.patient?.id || patientSession?.id || "temp-patient";

      const vitalsObj = {
        bpSystolic: bpSystolic ? Number(bpSystolic) : null,
        bpDiastolic: bpDiastolic ? Number(bpDiastolic) : null,
        pulse: pulse ? Number(pulse) : null,
        spo2: spo2 ? Number(spo2) : null,
        temp: temp ? Number(temp) : null
      };

      // Combine base symptom text with answered dynamic questions
      let combinedSymptomText = symptomText.trim();
      const answeredList = Object.values(answeredMap);
      if (answeredList.length > 0) {
        const answersBlock = answeredList
          .map((a) => `[Question: ${a.question} -> Answer: ${a.answer}]`)
          .join(" | ");
        combinedSymptomText = `${combinedSymptomText}\n\nAdditional Clinical Information Provided by Patient:\n${answersBlock}`;
      }

      // Check if offline before attempting network fetch
      if (!navigator.onLine) {
        const queuedItem = await queueOfflineSubmission({
          patientId: pId,
          symptomText: combinedSymptomText,
          vitals: vitalsObj,
          facility: selectedFacility,
          facilityId: selectedFacilityId || undefined,
          reportImageBase64: reportImageBase64 || undefined
        });

        await deleteDraft("patient_symptom_draft");
        const allQueued = await getQueuedSubmissions();
        const queueIdx = allQueued.length || 1;
        const offlineToken = `OFFLINE-TK-${String(queueIdx).padStart(2, "0")}`;
        const offlineReceiptNo = `OFFLINE-REC-${String(Math.floor(1000 + Math.random() * 9000))}`;

        const redKeywords = ["chest pain", "breathless", "unconscious", "haemorrhage", "bleeding", "stroke", "heart attack"];
        const isCritical = redKeywords.some((kw) => combinedSymptomText.toLowerCase().includes(kw));

        setReceiptData({
          id: queuedItem.id,
          receiptNumber: offlineReceiptNo,
          tokenId: offlineToken,
          patient: {
            id: pId,
            tokenId: offlineToken,
            name: fullName || "Patient",
            phone: contactPhone,
            age: age || "N/A"
          },
          riskTag: isCritical ? "RED" : "YELLOW",
          status: "OFFLINE_QUEUED",
          isOfflineQueued: true,
          summary: combinedSymptomText,
          facility: selectedFacility,
          fullName: fullName || "Patient",
          age,
          phone: contactPhone,
          address,
          createdAt: new Date().toISOString()
        });
        setOfflineQueueCount(allQueued.length);
        setCurrentStep("confirmation");
        return;
      }

      const res = await fetch(`${API_BASE}/api/triage-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: pId,
          symptomText: combinedSymptomText,
          vitals: vitalsObj,
          language,
          facility: selectedFacility,
          facilityId: selectedFacilityId || undefined,
          reportImageBase64: reportImageBase64 || undefined
        })
      });

      const note = await res.json();
      if (!res.ok) throw new Error(note.error || "Failed to submit triage case");

      await deleteDraft("patient_symptom_draft");
      setReceiptData({
        ...note,
        facility: selectedFacility,
        fullName: fullName || "Patient",
        age,
        phone: contactPhone,
        address
      });
      setCurrentStep("confirmation");
    } catch (err) {
      // If network fails (e.g. server down or connection dropped during submit)
      const pId = patientSession?.patient?.id || patientSession?.id || "temp-patient";
      let combinedSymptomText = symptomText.trim();
      const vitalsObj = {
        bpSystolic: bpSystolic ? Number(bpSystolic) : null,
        bpDiastolic: bpDiastolic ? Number(bpDiastolic) : null,
        pulse: pulse ? Number(pulse) : null,
        spo2: spo2 ? Number(spo2) : null,
        temp: temp ? Number(temp) : null
      };

      try {
        const queuedItem = await queueOfflineSubmission({
          patientId: pId,
          symptomText: combinedSymptomText,
          vitals: vitalsObj,
          facility: selectedFacility,
          facilityId: selectedFacilityId || undefined,
          reportImageBase64: reportImageBase64 || undefined
        });

        await deleteDraft("patient_symptom_draft");
        const allQueued = await getQueuedSubmissions();
        const queueIdx = allQueued.length || 1;
        const offlineToken = `OFFLINE-TK-${String(queueIdx).padStart(2, "0")}`;
        const offlineReceiptNo = `OFFLINE-REC-${String(Math.floor(1000 + Math.random() * 9000))}`;

        setReceiptData({
          id: queuedItem.id,
          receiptNumber: offlineReceiptNo,
          tokenId: offlineToken,
          patient: {
            id: pId,
            tokenId: offlineToken,
            name: fullName || "Patient",
            phone: contactPhone,
            age: age || "N/A"
          },
          riskTag: "YELLOW",
          status: "OFFLINE_QUEUED",
          isOfflineQueued: true,
          summary: combinedSymptomText,
          facility: selectedFacility,
          fullName: fullName || "Patient",
          age,
          phone: contactPhone,
          address,
          createdAt: new Date().toISOString()
        });
        setOfflineQueueCount(allQueued.length);
        setCurrentStep("confirmation");
      } catch (queueErr) {
        alert("Submission Error: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- CHECK STATUS ---
  const handleCheckStatus = async () => {
    setLoading(true);
    try {
      const pId = patientSession?.patient?.id || patientSession?.id;
      const res = await fetch(`${API_BASE}/api/patients/status?patientId=${pId}`);
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
        setCurrentStep("status");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[760px] mx-auto px-4 py-6 md:py-10 space-y-6">
      {/* Top Header & Breadcrumbs & Multilingual Selector */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateHome}
            className="text-[12px] font-bold text-slate-500 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer"
          >
            ← {t.home}
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-[12.5px] font-black text-emerald-800 uppercase tracking-wider">
            {t.patientPortal}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Odisha Govt Style Floating Language Modal Trigger */}
          <button
            type="button"
            onClick={handleOpenLanguageModal}
            className="btn-tactile text-[12px] font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 hover:border-emerald-500 px-3 py-1.5 rounded-xl shadow-2xs transition flex items-center gap-2 cursor-pointer"
            title={language === "hi" ? "भाषा बदलें" : language === "or" ? "ଭାଷା ବଦଳାନ୍ତୁ" : "Change Language"}
          >
            <span className="text-sm">🌐</span>
            <span className="font-bold text-emerald-950">
              {language === "or" ? "ଓଡ଼ିଆ" : language === "hi" ? "हिन्दी" : "English"}
            </span>
            <span className="text-[10px] text-slate-500">▼</span>
          </button>

          {patientSession && (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-2.5">
              {(currentStep === "confirmation" || currentStep === "status") && (receiptData?.tokenId || statusData?.tokenId) ? (
                <span className="text-[11.5px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  {getLocalizedToken(receiptData?.tokenId || statusData?.tokenId, language)}
                </span>
              ) : (
                <span className="text-[12px] font-bold text-slate-600 hidden sm:inline">
                  {t.patient}: {fullName || patientSession.patient?.name || "Active Session"}
                </span>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer ml-1"
              >
                {t.logout}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Offline Resilience Banners */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 p-4 rounded-md font-bold text-xs flex items-center justify-between shadow-md border border-amber-600 animate-pulse">
          <div className="flex items-center gap-2.5 text-left">
            <span className="text-xl">⚡</span>
            <div>
              <span className="font-black uppercase tracking-wider text-[10.5px] block text-amber-950">Offline Resilience Active</span>
              <span>No internet connection. Your symptom drafts and intake submissions are safely saved in local offline storage and will auto-sync when online.</span>
            </div>
          </div>
          <span className="bg-amber-950 text-amber-200 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap ml-2">
            Offline
          </span>
        </div>
      )}

      {offlineSyncNotice && (
        <div className="bg-emerald-600 text-white p-4 rounded-md font-bold text-xs flex items-center justify-between shadow-md border border-emerald-700">
          <div className="flex items-center gap-2.5 text-left">
            <span className="text-xl">✓</span>
            <div>
              <span className="font-black uppercase tracking-wider text-[10.5px] block text-emerald-200">Network Restored</span>
              <span>{offlineSyncNotice}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOfflineSyncNotice("")}
            className="text-emerald-200 hover:text-white font-black text-sm px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {hasDraftRestored && (
        <div className="bg-teal-50 border border-teal-300 text-teal-900 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs">
          <span className="flex items-center gap-2">
            <span>📝</span>
            <span>Restored your unsaved symptom draft from local offline storage.</span>
          </span>
          <button
            type="button"
            onClick={() => setHasDraftRestored(false)}
            className="text-teal-700 hover:text-teal-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {offlineQueueCount > 0 && isOnline && (
        <div className="bg-blue-50 border border-blue-200 text-blue-950 p-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-2xs">
          <span className="flex items-center gap-2">
            <span>🔄</span>
            <span>You have {offlineQueueCount} queued offline case(s) waiting to sync.</span>
          </span>
          <button
            type="button"
            disabled={isSyncingOffline}
            onClick={async () => {
              setIsSyncingOffline(true);
              try {
                const { synced } = await syncAllQueuedSubmissions(API_BASE);
                if (synced > 0) {
                  setOfflineSyncNotice(`✓ Successfully synced ${synced} offline case(s) to cloud database!`);
                  setOfflineQueueCount(0);
                }
              } finally {
                setIsSyncingOffline(false);
              }
            }}
            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] cursor-pointer"
          >
            {isSyncingOffline ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: AUTHENTICATION (PHONE/OTP or EMAIL/PASSWORD)                      */}
      {/* ========================================================================= */}
      {currentStep === "auth" && (
        <div className="max-w-md mx-auto govt-panel border border-slate-300 rounded-md overflow-hidden shadow-xs">
          <div className="bg-[#003366] text-white px-4 py-3 flex items-center justify-between border-b border-[#0B2545]">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏛️</span>
              <div>
                <h3 className="font-bold text-[13.5px] leading-tight text-white tracking-wide">
                  {t.authTitle || "Citizen OPD Token Booking Desk"}
                </h3>
                <p className="text-[10.5px] text-amber-300">
                  Department of Health &amp; Family Welfare • Government of Odisha
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-800 text-white border border-emerald-600">
              ABDM Verified
            </span>
          </div>

          <div className="p-5 sm:p-7 space-y-5 bg-white">
            <p className="text-[12.5px] text-slate-600 text-center font-medium">
              {t.authSubtitle || "Institutional digital token booking for outpatient care and non-diagnostic clinical triage."}
            </p>

            {/* Auth Tab Switcher */}
            <div className="flex bg-slate-100 p-0.5 rounded border border-slate-300">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("otp");
                  setAuthError("");
                }}
                className={`flex-1 py-1.5 rounded text-[12px] font-bold transition cursor-pointer ${
                  authTab === "otp" ? "bg-[#003366] text-white shadow-xs" : "text-slate-700 hover:text-slate-900"
                }`}
              >
                📱 {t.phoneOtpTab || "Mobile & OTP"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("password");
                  setAuthError("");
                }}
                className={`flex-1 py-1.5 rounded text-[12px] font-bold transition cursor-pointer ${
                  authTab === "password" ? "bg-[#003366] text-white shadow-xs" : "text-slate-700 hover:text-slate-900"
                }`}
              >
                ✉️ {t.passwordTab || "Email & Password"}
              </button>
            </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] font-bold text-center">
              {authError}
            </div>
          )}

          {/* Tab 1: Phone + OTP */}
          {authTab === "otp" && (
            <div className="space-y-4 max-w-sm mx-auto">
              <form onSubmit={handleLoginOTP} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>{t.enterPhoneLabel || "Contact Number (India)"}</span>
                    <span className="text-[11px] font-bold text-emerald-700">
                      {phone.length}/10 digits
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <span className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-black text-slate-700 flex items-center gap-1">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder={t.phonePlaceholder || "9876543210"}
                      className="flex-1 p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={loading}
                      className="px-3.5 py-2.5 rounded-xl text-[12px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-600 hover:text-white transition cursor-pointer shrink-0"
                    >
                      {otpSent ? (language === "or" ? "ପୁଣି OTP ପଠାନ୍ତୁ" : language === "hi" ? "पुनः OTP भेजें" : "Resend OTP") : (t.sendOtpBtn || "Send OTP")}
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-400 mt-1 font-medium">
                    {language === "or" ? "ଏକ ବୈଧ ୧୦-ଅଙ୍କ ବିଶିଷ୍ଟ ଭାରତୀୟ ମୋବାଇଲ୍ ନମ୍ବର ଦିଅନ୍ତୁ (୬, ୭, ୮ କିମ୍ବା ୯ ରୁ ଆରମ୍ଭ)" : language === "hi" ? "मान्य 10-अंकीय भारतीय मोबाइल नंबर दर्ज करें (6, 7, 8 या 9 से शुरू)" : "Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)"}
                  </p>
                </div>

                {otpSent && (
                  <div className="space-y-2.5 pt-1 animate-fadeIn">
                    {/* Simulated SMS Dispatch Card */}
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between font-black text-emerald-900 text-[12px]">
                        <span className="flex items-center gap-1.5">
                          <span>📩</span> {language === "or" ? "ମୋବାଇଲ୍ ନମ୍ବରକୁ SMS ପଠାଗଲା" : language === "hi" ? "मोबाइल नंबर पर SMS भेजा गया" : "SMS Delivered to Contact Number"}
                        </span>
                        <span className="text-[10.5px] bg-white font-mono px-2 py-0.5 rounded border border-emerald-200">
                          +91-{phone}
                        </span>
                      </div>
                      <p className="text-[12.5px] font-bold text-emerald-800">
                        {language === "or" ? "ଆପଣଙ୍କ TriaQ OTP କୋଡ୍ ହେଉଛି: " : language === "hi" ? "आपका TriaQ OTP कोड है: " : "Your TriaQ OTP Code is: "}
                        <span className="font-mono text-base font-black text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-300 inline-block shadow-2xs">
                          {demoOtpCode}
                        </span>
                      </p>
                      <p className="text-[10.5px] text-emerald-700 font-medium">
                        {language === "or" ? "୫ ମିନିଟ୍ ପାଇଁ ବୈଧ। ତଳେ କୋଡ୍ ଦିଅନ୍ତୁ କିମ୍ବା ଯାଞ୍ଚ କରି ଆଗକୁ ବଢ଼ନ୍ତୁ।" : language === "hi" ? "5 मिनट के लिए मान्य। नीचे कोड दर्ज करें या जारी रखें।" : "Valid for 5 minutes. Enter code below or click verify to proceed."}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[12px] font-bold text-slate-700 block">
                        {t.verifyOtpLabel || "Enter 6-Digit OTP Code"}
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="w-full p-3 rounded-xl border border-slate-200 text-center font-mono text-xl tracking-widest text-slate-900 font-black outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50/50"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !otpSent}
                  className="btn-tactile w-full py-2.5 px-4 rounded font-bold text-[13.5px] text-white bg-[#003366] hover:bg-[#0B2545] border border-[#002244] shadow-xs text-center transition cursor-pointer disabled:opacity-40"
                >
                  {loading ? (language === "or" ? "ଯାଞ୍ଚ କରାଯାଉଛି..." : language === "hi" ? "सत्यापित किया जा रहा है..." : "Verifying...") : (t.verifyOtpBtn || "Verify & Continue →")}
                </button>
              </form>

              {/* REGISTER NOW PLACED DIRECTLY UNDER LOGIN */}
              <div className="text-center pt-3 border-t border-slate-100 space-y-1">
                <p className="text-[12.5px] text-slate-600 font-medium">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("password");
                      setIsSignup(true);
                      setAuthError("");
                    }}
                    className="font-black text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                  >
                    Register Now →
                  </button>
                </p>
                <p className="text-[11px] text-slate-400">
                  (Or simply verify OTP above for instant mobile sign-in)
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Email + Password */}
          {authTab === "password" && (
            <div className="space-y-4 max-w-sm mx-auto">
              {isSignup && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[12px] font-bold text-center">
                  ✨ Register New Patient Account
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignup && (
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1">
                      Full Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full legal name"
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                )}

                {isSignup && (
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Contact Number (India) <span className="text-rose-600">*</span></span>
                      <span className="text-[11px] font-bold text-emerald-700">{phone.length}/10</span>
                    </label>
                    <div className="flex gap-2">
                      <span className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-black text-slate-700 flex items-center gap-1">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="9876543210"
                        className="flex-1 p-2.5 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">
                    Email Address <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@example.com"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[12px] font-bold text-slate-700">
                      Password (min 8 characters) <span className="text-rose-600">*</span>
                    </label>
                    {!isSignup && (
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-[11.5px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-tactile w-full py-2.5 px-4 rounded font-bold text-[13.5px] text-white bg-[#003366] hover:bg-[#0B2545] border border-[#002244] shadow-xs text-center transition cursor-pointer disabled:opacity-40"
                >
                  {loading ? "Please wait..." : isSignup ? "Register & Check In →" : "Sign In & Continue →"}
                </button>
              </form>

              {/* REGISTER NOW / SIGN IN PLACED DIRECTLY UNDER BUTTON */}
              <div className="text-center pt-3 border-t border-slate-100 space-y-1">
                {isSignup ? (
                  <p className="text-[12.5px] text-slate-600 font-medium">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignup(false);
                        setAuthError("");
                      }}
                      className="font-black text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      Sign In here →
                    </button>
                  </p>
                ) : (
                  <p className="text-[12.5px] text-slate-600 font-medium">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignup(true);
                        setAuthError("");
                      }}
                      className="font-black text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    >
                      Register Now →
                    </button>
                  </p>
                )}
                <p className="text-[11.5px] text-slate-400">
                  Or switch to{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("otp");
                      setIsSignup(false);
                      setAuthError("");
                    }}
                    className="font-bold text-slate-700 hover:underline cursor-pointer"
                  >
                    Mobile OTP Login
                  </button>
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: INTAKE DEMOGRAPHICS (OFFLINE-SAFE DRAFT)                         */}
      {/* ========================================================================= */}
      {currentStep === "intake" && (
        <div className="govt-panel border border-slate-300 rounded-md overflow-hidden shadow-xs">
          <div className="bg-[#003366] text-white px-4 py-2.5 rounded-t-[5px] flex flex-wrap items-center justify-between gap-3 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-300 uppercase tracking-wide">
                📋 {t.demographicsStep || "Step 1 of 2 • Patient Demographics & Registration"}
              </span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-slate-200 hidden sm:inline">Official OPD Desk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded border border-blue-900/50 bg-[#133B5C] p-0.5">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                      language === lang.code
                        ? "bg-[#003366] text-amber-300 shadow-xs"
                        : "text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    {lang.nativeName}
                  </button>
                ))}
              </div>
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-emerald-800 text-white border border-emerald-600 hidden sm:inline-block">
                ✓ {t.draftSavedLocally || "Draft Saved"}
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-7 space-y-6 bg-white">

          {intakeSavedNotice && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[12.5px] font-bold">
              {intakeSavedNotice}
            </div>
          )}

          {/* Facility Selection / QR Standee Locked Badge */}
          {isQrCheckIn ? (
            <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <IconQRCode className="w-5 h-5" />
                </span>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 block">
                    {t.facilityQrVerified || "Facility QR Check-In Verified"}
                  </span>
                  <span className="text-[15px] font-black text-slate-900">
                    {selectedFacility}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-black uppercase px-3 py-1 rounded-full bg-emerald-200 text-emerald-900 border border-emerald-300">
                {t.qrLocked || "🔒 QR Locked"}
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="block text-[12px] font-bold text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <IconHospital className="w-4 h-4 text-emerald-600" />
                  {t.selectFacilityLabel || "Select Healthcare Facility / Clinic"} <span className="text-rose-600">*</span>
                </span>
                <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {t.selectFacilityStep || "Step 1 • Demographics"}
                </span>
              </label>
              <select
                value={selectedFacility}
                onChange={(e) => {
                  setSelectedFacility(e.target.value);
                  const matched = facilities.find((f) => f.name === e.target.value);
                  if (matched) setSelectedFacilityId(matched.id);
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
              >
                {facilities.length > 0 ? (
                  facilities.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name} ({f.type === "CLINIC" ? (language === "or" ? "କ୍ଲିନିକ୍" : language === "hi" ? "क्लिनिक" : "Clinic") : (language === "or" ? "ଡାକ୍ତରଖାନା" : language === "hi" ? "अस्पताल" : "Hospital")}{f.city ? ` - ${f.city}` : ""})
                    </option>
                  ))
                ) : (
                  <option value="">{t.noFacilitiesAvailable || "-- No registered facilities available --"}</option>
                )}
              </select>
              <p className="text-[11px] text-slate-500 font-medium">
                {t.demographicsSubtitle || "Your sequential token number will be generated only after you fill and submit your clinical symptoms in the next step."}
              </p>
            </div>
          )}

          <form onSubmit={handleSaveProfileAndProceed} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  {t.fullNameLabel || "Full Name"} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.fullNamePlaceholder || "Enter full legal name"}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  {t.ageLabel || "Age (in years)"} <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={125}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder={t.agePlaceholder || "e.g. 42"}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{t.contactPhoneLabel || "Contact Number"}</span>
                  <span className="text-[11px] font-bold text-emerald-700">{t.tenDigitIndia || "10-digit India"}</span>
                </label>
                <div className="flex gap-2">
                  <span className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-black text-slate-700 flex items-center gap-1">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder={t.phonePlaceholder || "e.g. 9876543210"}
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 tracking-wider"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1">
                  {t.addressLabel || "Ward / Village / Address (Optional)"}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t.addressPlaceholder || "e.g. Ward 4, Sector 12"}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                {t.existingConditionsLabel || "Existing Conditions (Optional)"}
              </label>
              <input
                type="text"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder={t.existingConditionsPlaceholder || "e.g. Diabetes, Asthma, High Blood Pressure, None"}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1">
                {t.currentMedsLabel || "Current Medications (Optional)"}
              </label>
              <input
                type="text"
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                placeholder={t.currentMedsPlaceholder || "e.g. Metformin 500mg, Inhaler, None"}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-[13.5px] font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCheckStatus}
                className="text-[12px] font-bold text-slate-500 hover:text-slate-800"
              >
                {t.checkPastStatus || "Check past status →"}
              </button>

              <button
                type="submit"
                disabled={loading}
                className="btn-tactile px-6 py-2.5 rounded font-bold text-[13.5px] text-white bg-[#003366] hover:bg-[#0B2545] border border-[#002244] shadow-xs cursor-pointer text-center"
              >
                {t.proceedToSymptomsBtn || "Next: Describe Symptoms →"}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: SYMPTOMS & VITALS COLLECTION                                      */}
      {/* ========================================================================= */}
      {currentStep === "symptoms" && (
        <div className="govt-panel border border-slate-300 rounded-md overflow-hidden shadow-xs">
          <div className="bg-[#003366] text-white px-4 py-2.5 rounded-t-[5px] flex flex-wrap items-center justify-between gap-3 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-300 uppercase tracking-wide">
                🩺 {t.symptomsStep || "Step 2 of 2 • Clinical Symptoms & Triage Intake"}
              </span>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <span className="text-slate-200 hidden sm:inline">Algorithmic Risk Prioritization</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded border border-blue-900/50 bg-[#133B5C] p-0.5">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                      language === lang.code
                        ? "bg-[#003366] text-amber-300 shadow-xs"
                        : "text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    {lang.nativeName}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep("intake")}
                className="text-[11.5px] font-bold text-slate-200 hover:text-white underline cursor-pointer ml-1"
              >
                ← {language === "or" ? "ବିବରଣୀ ସଂଶୋଧନ" : language === "hi" ? "विवरण बदलें" : "Edit details"}
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-7 space-y-6 bg-white">
          <form onSubmit={handleSubmitTriage} className="space-y-5">
            {/* Symptoms Input Area + Voice Mic */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[12.5px] font-bold text-slate-800">
                  {language === "or" ? "ଆପଣଙ୍କର କ’ଣ ସମସ୍ୟା ବା କଷ୍ଟ ହେଉଛି? କେବେଠାରୁ ଆରମ୍ଭ ହେଲା?" : language === "hi" ? "आपको क्या परेशानी या लक्षण हैं? यह कब शुरू हुआ?" : "What is bothering you? When did it start?"} <span className="text-rose-600">*</span>
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {language === "or" ? `${toOdiaDigits(symptomText.length)} ଅକ୍ଷର (ଅତିକମରେ ୧୫)` : language === "hi" ? `${toHindiDigits(symptomText.length)} अक्षर (न्यूनतम 15)` : `${symptomText.length} chars (min 15)`}
                </span>
              </div>

              <div className="relative">
                <textarea
                  rows={4}
                  required
                  value={symptomText}
                  onChange={(e) => setSymptomText(e.target.value)}
                  placeholder={t.symptomsPlaceholder || "e.g. Mild fever, dry cough and body ache for the past 2 days. No breathing difficulty..."}
                  className="w-full p-3.5 pr-20 rounded-xl border border-slate-200 text-[13.5px] text-slate-900 font-medium leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50/40 focus:bg-white transition"
                />

                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`btn-tactile absolute right-3 bottom-3 py-2 px-3 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 ${
                    isRecording
                      ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-4 ring-rose-200"
                      : "bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300"
                  }`}
                  title={isRecording ? (language === "or" ? "ଭଏସ୍ ରେକର୍ଡିଂ ବନ୍ଦ କରିବାକୁ କ୍ଲିକ୍ କରନ୍ତୁ" : language === "hi" ? "आवाज रिकॉर्डिंग बंद करने के लिए क्लिक करें" : "Click to finish voice recording") : (t.voiceRecordBtn || "Speak symptoms via microphone")}
                >
                  <span className="text-base">🎙️</span>
                  <span>{isRecording ? (language === "or" ? "ବନ୍ଦ" : language === "hi" ? "रोकें" : "Stop") : (language === "or" ? "କହନ୍ତୁ (Mic)" : language === "hi" ? "बोलें (Mic)" : "Mic")}</span>
                </button>
              </div>

              {/* Interim Real-time Transcript Preview */}
              {interimTranscript && (
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[12px] text-slate-700 italic flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                  <span>{language === "or" ? "ଅନୁବାଦ ହେଉଛି:" : language === "hi" ? "अनुलेखन हो रहा है:" : "Transcribing:"} "{interimTranscript}..."</span>
                </div>
              )}

              {/* Live Listening Banner */}
              {isRecording && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12px] font-bold flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                    </span>
                    <span>{language === "hi" ? "हिन्दी में सुना जा रहा है... अपने लक्षण स्पष्ट रूप से बोलें।" : language === "or" ? "ଓଡ଼ିଆରେ ଶୁଣାଯାଉଛି... ଆପଣଙ୍କ ଲକ୍ଷଣ ସ୍ପଷ୍ଟ ଭାବେ କୁହନ୍ତୁ।" : "Listening in Indian English... Speak your symptoms clearly."}</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-black hover:bg-rose-700 cursor-pointer shrink-0 shadow-2xs"
                  >
                    {language === "or" ? "କୁହା ସରିଲା ✓" : language === "hi" ? "बोलना समाप्त ✓" : "Done Speaking ✓"}
                  </button>
                </div>
              )}

              {/* Microphone Permission / Service Error Banner */}
              {micError && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-[12px] font-medium flex items-start justify-between gap-2 shadow-2xs">
                  <div className="flex items-start gap-2">
                    <span className="text-base">⚠️</span>
                    <p>{micError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMicError("")}
                    className="text-amber-800 hover:text-amber-950 font-black text-sm cursor-pointer shrink-0 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

            </div>

            {/* Patient Vitals Tracker Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>🩺</span> {t.vitalsTitle || (language === "or" ? "ଶାରୀରିକ ମାପଦଣ୍ଡ (ଇଚ୍ଛାଧୀନ ଟ୍ରାକର୍)" : language === "hi" ? "शारीरिक माप (वैकल्पिक)" : "Patient Vital Signs (Optional Triage Tracker)")}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {language === "or" ? "ସ୍ୱୟଂଚାଳିତ ଜରୁରୀକାଳୀନ ସତର୍କତା" : language === "hi" ? "स्वचालित आपातकालीन चेतावनी" : "Auto-emergency alerts"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">
                    {language === "or" ? "ରକ୍ତଚାପ (Blood Pressure)" : language === "hi" ? "रक्तचाप (Blood Pressure)" : "Blood Pressure"}
                  </span>
                  <div className="flex gap-1 items-center">
                    <input
                      type="number"
                      value={bpSystolic}
                      onChange={(e) => setBpSystolic(e.target.value)}
                      placeholder={language === "or" ? "ସିସ୍ଟୋଲିକ୍ (୧୨୦)" : language === "hi" ? "सिस्टोलिक (120)" : "Sys (120)"}
                      className="w-full p-2 text-[12.5px] rounded-lg border border-slate-200 bg-white text-center font-bold"
                    />
                    <span className="text-slate-400">/</span>
                    <input
                      type="number"
                      value={bpDiastolic}
                      onChange={(e) => setBpDiastolic(e.target.value)}
                      placeholder={language === "or" ? "ଡାଇସ୍ଟୋଲିକ୍ (୮୦)" : language === "hi" ? "डायस्टोलिक (80)" : "Dia (80)"}
                      className="w-full p-2 text-[12.5px] rounded-lg border border-slate-200 bg-white text-center font-bold"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">
                    {language === "or" ? "ନାଡ଼ିର ଗତି (Pulse bpm)" : language === "hi" ? "नाड़ी गति (Pulse bpm)" : "Pulse (bpm)"}
                  </span>
                  <input
                    type="number"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    placeholder={language === "or" ? "ଯଥା: ୭୬" : language === "hi" ? "उदा. 76" : "e.g. 76"}
                    className="w-full p-2 text-[12.5px] rounded-lg border border-slate-200 bg-white text-center font-bold"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">
                    {language === "or" ? "ଅକ୍ସିଜେନ୍ (SpO2 %)" : language === "hi" ? "ऑक्सीजन (SpO2 %)" : "SpO2 Oxygen (%)"}
                  </span>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    placeholder={language === "or" ? "ଯଥା: ୯୮" : language === "hi" ? "उदा. 98" : "e.g. 98"}
                    className="w-full p-2 text-[12.5px] rounded-lg border border-slate-200 bg-white text-center font-bold"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-600 block mb-1">
                    {language === "or" ? "ତାପମାତ୍ରା (°F)" : language === "hi" ? "तापमान (°F)" : "Temperature (°F)"}
                  </span>
                  <input
                    type="number"
                    step="0.1"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    placeholder={language === "or" ? "ଯଥା: ୯୮.୬" : language === "hi" ? "उदा. 98.6" : "e.g. 98.6"}
                    className="w-full p-2 text-[12.5px] rounded-lg border border-slate-200 bg-white text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* SOME ADDITIONAL QUESTIONS AREA */}
            <div className="rounded-md p-5 border border-slate-200/90 bg-white shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-[16px] font-semibold text-slate-800 flex items-center gap-2">
                    <span className="text-lg">📋</span> {t.additionalBoxTitle}
                  </h3>
                  <p className="text-[12.5px] text-slate-500 mt-0.5 font-normal">
                    {t.additionalBoxHelp}
                  </p>
                </div>
                {dynamicQuestions.length > 0 && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                    {dynamicQuestions.length} {t.remainingBadge || "remaining"}
                  </span>
                )}
              </div>

              {/* Recorded Details (Pop-out answers summary cards) */}
              {Object.keys(answeredMap).length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-medium text-[#166534] uppercase tracking-wider flex items-center gap-1.5">
                      <span>✓</span> {t.answeredBadge}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white text-[#15803D] border border-[#86EFAC]">
                      {Object.keys(answeredMap).length} {t.recordedBadge || "recorded"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(answeredMap).map(([key, item]) => (
                      <div 
                        key={key}
                        className="bg-white p-3 rounded-xl border border-slate-200 border-l-4 border-l-emerald-600 flex items-start justify-between gap-3 shadow-2xs"
                      >
                        <div className="space-y-1">
                          {/* Question in normal font weight */}
                          <div className="flex items-start gap-2">
                            <span className="text-[10.5px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-800 text-white shrink-0 mt-0.5">
                              Q
                            </span>
                            <p className="text-[13.5px] font-normal text-slate-800 leading-snug">
                              {item.question}
                            </p>
                          </div>

                          {/* Answer in vibrant medical green badge */}
                          <div className="pl-6">
                            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-normal text-[#065F46] bg-[#ECFDF5] border border-[#10B981] px-3 py-0.5 rounded-lg">
                              <span className="text-[#059669] font-medium">✓</span>
                              <span>{item.answer}</span>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAnswered(key)}
                          title="Click to edit or change answer"
                          className="text-[11px] font-medium px-2 py-1 rounded-md bg-[#FEE2E2] text-[#B91C1C] hover:bg-[#FCA5A5] cursor-pointer transition shrink-0"
                        >
                          {t.changeBtn || "✕ Change"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Questions List - Each Question Pops Out / Disappears When Answered */}
              {dynamicQuestions.length === 0 ? (
                <div className="p-3.5 text-center rounded-xl bg-[#ECFDF5] border border-[#10B981] text-[#065F46] text-[13px] font-medium flex items-center justify-center gap-2">
                  <span>✓</span>
                  <span>{t.noQuestionsNeeded}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {dynamicQuestions.map((item) => {
                    const currentDraft = inputDrafts[item.id] || "";

                    return (
                      <div 
                        key={item.id}
                        className="p-3.5 rounded-xl border border-slate-200 border-l-4 border-l-emerald-600 bg-white space-y-2.5 shadow-2xs hover:border-emerald-500 transition"
                      >
                        {/* Question in normal font weight - clean and readable */}
                        <div className="flex items-start gap-2">
                          <span className="text-[10.5px] font-semibold uppercase px-1.5 py-0.2 rounded bg-slate-800 text-white shrink-0 mt-0.5">
                            Q
                          </span>
                          <p className="text-[13.5px] font-normal text-slate-800 leading-snug">
                            {item.question}
                          </p>
                        </div>

                        {/* Quick Choice Pills in vibrant green style */}
                        {item.quickChoices && item.quickChoices.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pl-6">
                            {item.quickChoices.map((choice, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSaveAnswer(item.id, item.question, choice)}
                                className="text-[12px] font-normal px-3 py-1 rounded-lg border transition-all cursor-pointer shadow-2xs active:scale-95 bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0] hover:bg-[#D1FAE5] hover:border-[#059669]"
                              >
                                {choice}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Custom Answer Input Bar */}
                        <div className="flex items-center gap-2 pt-1 pl-6">
                          <input
                            type="text"
                            value={currentDraft}
                            onChange={(e) =>
                              setInputDrafts({ ...inputDrafts, [item.id]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveAnswer(item.id, item.question, currentDraft);
                              }
                            }}
                            placeholder={t.typeAnswerPlaceholder}
                            className="flex-1 p-2 text-[13px] font-normal text-slate-800 rounded-lg border border-[#D1D5DB] bg-[#F9FAFB] focus:bg-white outline-none focus:border-[#059669] focus:ring-1 focus:ring-[#059669]"
                          />
                          <button
                            type="button"
                            disabled={!currentDraft.trim()}
                            onClick={() => handleSaveAnswer(item.id, item.question, currentDraft)}
                            className="px-3.5 py-2 rounded-lg font-medium text-[12.5px] text-white transition cursor-pointer disabled:opacity-40 shadow-xs bg-[#059669] hover:bg-[#047857]"
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

            {/* Optional Lab Report Photo */}
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-slate-700 block">
                {t.uploadReportLabel || (language === "or" ? "ପରୀକ୍ଷା ରିପୋର୍ଟ କିମ୍ବା ପ୍ରେସକ୍ରିପସନ୍ ଫଟୋ ଅଛି କି? (ଇଚ୍ଛାଧୀନ)" : language === "hi" ? "क्या आपके पास जांच रिपोर्ट या पर्चे की फोटो है? (वैकल्पिक)" : "Do you have a lab report or prescription photo? (Optional)")}
              </label>
              <div className="flex items-center gap-3">
                <label className="px-4 py-2 rounded-xl border border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 transition cursor-pointer text-[12.5px] font-bold text-slate-700 flex items-center gap-2">
                  <span>📄</span>
                  <span>{reportFileName ? reportFileName : (t.uploadReportBtn || (language === "or" ? "ଫଟୋ ବାଛନ୍ତୁ..." : language === "hi" ? "फोटो चुनें..." : "Choose photo..."))}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                {reportImageBase64 && (
                  <div className="relative">
                    <img
                      src={reportImageBase64}
                      alt="Report preview"
                      className="h-12 w-12 object-cover rounded-lg border border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setReportImageBase64(null);
                        setReportFileName("");
                      }}
                      className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* MANDATORY WARNING IF ADDITIONAL QUESTIONS REMAIN */}
            {dynamicQuestions.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[12.5px] font-bold flex items-start gap-2 shadow-2xs">
                <span className="text-base mt-0.5">⚠️</span>
                <div className="space-y-0.5">
                  <p className="font-black text-[13px] text-amber-950">
                    {language === "or"
                      ? `ବାଧ୍ୟତାମୂଳକ ପଦକ୍ଷେପ: ${toOdiaDigits(dynamicQuestions.length)} ଟି ଅତିରିକ୍ତ ପ୍ରଶ୍ନର ଉତ୍ତର ଆବଶ୍ୟକ`
                      : language === "hi"
                      ? `अनिवार्य कदम: ${toHindiDigits(dynamicQuestions.length)} अतिरिक्त प्रश्न आवश्यक हैं`
                      : `Mandatory Step: ${dynamicQuestions.length} Additional Question${dynamicQuestions.length > 1 ? "s" : ""} Required`}
                  </p>
                  <p className="font-medium text-amber-900">
                    {language === "or"
                      ? "ସବମିଟ୍ କରିବା ପାଇଁ ଦୟାକରି ଉପରେ ଥିବା 'କିଛି ଅତିରିକ୍ତ ପ୍ରଶ୍ନ' ବିଭାଗରେ ପ୍ରତ୍ୟେକ ପ୍ରଶ୍ନର ଉତ୍ତର ଦିଅନ୍ତୁ (ଶୀଘ୍ର ବିକଳ୍ପ ବାଛନ୍ତୁ କିମ୍ବା ଉତ୍ତର ଲେଖି ସାଇତନ୍ତୁ)।"
                      : language === "hi"
                      ? "सबमिट करने के लिए कृपया ऊपर 'कुछ अतिरिक्त प्रश्न' अनुभाग में प्रत्येक प्रश्न का उत्तर दें (विकल्प चुनें या लिखकर सहेजें)।"
                      : "Please answer each question in the 'Some Additional Questions' section above (choose a quick choice or type an answer and click Save) to unlock submission."}
                  </p>
                </div>
              </div>
            )}

            {/* MANDATORY DECLARATION FORM & CONSENT CHECKBOX */}
            <div className={`p-4 rounded-xl border transition-all ${
              consentChecked 
                ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200" 
                : "bg-slate-50 border-slate-200"
            }`}>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded accent-emerald-600 cursor-pointer"
                />
                <div className="space-y-1">
                  <span className="text-[13px] leading-relaxed text-slate-800 font-medium block">
                    {t.consentText}
                  </span>
                  {!consentChecked && (
                    <span className="text-[11.5px] font-bold text-amber-700 block">
                      ⚠️ {language === "or" ? "ଦାଖଲ କରିବା ପୂର୍ବରୁ ଦୟାକରି ଏହି ସମ୍ମତି ବକ୍ସ ଚେକ୍ କରନ୍ତୁ।" : language === "hi" ? "सबमिट करने से पहले कृपया इस सहमति बॉक्स को टिक करें।" : "Please check this box to confirm consent before submitting."}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500 block pt-0.5">
                    {language === "or" ? "ଭାରତର DPDP ଆଇନ ୨୦୨୩ ଅଧୀନରେ ସୁରକ୍ଷିତ • " : language === "hi" ? "भारत के DPDP अधिनियम 2023 के तहत सुरक्षित • " : "Protected under India's DPDP Act, 2023 • "}
                    <a href="/PRIVACY.md" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-bold hover:text-emerald-800">
                      {language === "or" ? "ଡାଟା ଗଭର୍ଣ୍ଣାନ୍ସ ଓ ଗୋପନୀୟତା ନୀତି ପଢ଼ନ୍ତୁ" : language === "hi" ? "डेटा गवर्नेंस एवं गोपनीयता नीति पढ़ें" : "Read Data Governance & Privacy Policy"}
                    </a>
                  </span>
                </div>
              </label>
            </div>

            {/* Submit Button (Strictly disabled until all questions answered and declaration checked) */}
            <button
              type="submit"
              disabled={!consentChecked || symptomText.trim().length < 15 || dynamicQuestions.length > 0 || loading}
              className="btn-tactile w-full py-3 px-4 rounded font-bold text-[14px] text-white bg-[#003366] hover:bg-[#0B2545] border border-[#002244] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {loading
                ? (t.submittingBtn || (language === "or" ? "ମୂଲ୍ୟାଙ୍କନ ଓ ଟୋକନ୍ ତିଆରି ଚାଲିଛି..." : language === "hi" ? "मूल्यांकन एवं टोकन तैयार हो रहा है..." : "Evaluating & Generating Token..."))
                : dynamicQuestions.length > 0
                ? (language === "or"
                  ? `ସବମିଟ୍ କରିବାକୁ ଉପରେ ଥିବା ${toOdiaDigits(dynamicQuestions.length)} ଟି ପ୍ରଶ୍ନର ଉତ୍ତର ଦିଅନ୍ତୁ`
                  : language === "hi"
                  ? `सबमिट करने के लिए ऊपर दिए ${toHindiDigits(dynamicQuestions.length)} प्रश्नों के उत्तर दें`
                  : `Answer ${dynamicQuestions.length} Question${dynamicQuestions.length > 1 ? "s" : ""} Above to Submit`)
                : !consentChecked
                ? (language === "or" ? "ସବମିଟ୍ କରିବାକୁ ସମ୍ମତି ବକ୍ସ ଚେକ୍ କରନ୍ତୁ" : language === "hi" ? "सबमिट करने के लिए सहमति बॉक्स पर टिक करें" : "Check Declaration Consent to Submit")
                : (t.submitBtn || (language === "or" ? "କେସ୍ ଦାଖଲ କରନ୍ତୁ ଏବଂ PDF ରସିଦ ପାଆନ୍ତୁ →" : language === "hi" ? "केस सबमिट करें और PDF रसीद प्राप्त करें →" : "Submit Case & Generate PDF Receipt →"))}
            </button>
          </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: CONFIRMATION & PDF TOKEN RECEIPT                                  */}
      {/* ========================================================================= */}
      {currentStep === "confirmation" && receiptData && (
        <div className="govt-panel border border-slate-300 rounded-md overflow-hidden shadow-xs text-center">
          <div className="bg-[#003366] text-white px-4 py-2.5 rounded-t-[5px] flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-300 uppercase tracking-wide">
                🎫 Official OPD Token Pass &amp; Clinical Triage Receipt
              </span>
            </div>
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-emerald-800 text-white border border-emerald-600">
              Issued
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-6 bg-white">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center text-2xl mx-auto shadow-2xs">
              ✓
            </div>

          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
              {t.triageCompleteBadge || "Triage Intake Complete"}
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              {t.caseSubmittedTitle || "Your Case Has Been Submitted"}
            </h2>
            <p className="text-[13px] text-slate-500 font-medium max-w-sm mx-auto">
              {t.caseSubmittedSubtitle || "Your clinical triage receipt has been generated. Doctors are reviewing cases in clinical priority order."}
            </p>
          </div>

          {/* Receipt Monospace Card */}
          <div className="p-5 rounded-md border-2 border-emerald-500 bg-emerald-50/40 space-y-3 max-w-md mx-auto">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              {t.officialTokenLabel || "Official OPD Consultation Token"}
            </span>
            <div className="font-mono text-2xl sm:text-3xl font-black text-slate-900 tracking-wider select-all py-1.5 px-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
              {getLocalizedToken(receiptData.patient?.tokenId || receiptData.tokenId || "TOKEN NUMBER 01", language)}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[12px] text-slate-700 font-bold">
              <span>{language === "or" ? "ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର:" : language === "hi" ? "स्वास्थ्य केंद्र:" : "Facility:"} <strong className="text-emerald-900 font-black">{receiptData.facility || selectedFacility}</strong></span>
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-500">{receiptData.receiptNumber || "OPD Pass"}</span>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <span
                className={`px-3 py-1 rounded-full text-[12px] font-black ${
                  receiptData.riskTag === "RED"
                    ? "bg-rose-100 text-rose-800 border border-rose-300"
                    : receiptData.riskTag === "YELLOW" || receiptData.riskTag === "AMBER"
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                }`}
              >
                {receiptData.riskTag === "RED"
                  ? (t.urgentRed || "Urgent (RED)")
                  : receiptData.riskTag === "YELLOW" || receiptData.riskTag === "AMBER"
                  ? (t.moderateYellow || "Moderate (YELLOW)")
                  : (t.normalGreen || "Normal Priority (GREEN)")}
              </span>

              <span className="px-3 py-1 rounded-full text-[11.5px] font-bold bg-white text-slate-600 border border-slate-200">
                {t.awaitingReview || "Awaiting Review"}
              </span>
            </div>
          </div>

          {/* Offline Queue Information Card */}
          {receiptData.isOfflineQueued && (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-md text-xs text-amber-950 text-left space-y-2 shadow-2xs max-w-md mx-auto">
              <div className="font-black flex items-center justify-between text-amber-950 text-sm">
                <span className="flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>{language === "or" ? "ସ୍ଥାନୀୟ ଅଫଲାଇନ୍ ଡାଟାରେ ସାଇତା ହୋଇଛି" : language === "hi" ? "ऑफ़लाइन सुरक्षित रखा गया" : "Saved Locally (Offline Queue)"}</span>
                </span>
                <span className="bg-amber-200 text-amber-900 px-2 py-0.5 rounded text-[10.5px] uppercase font-black">
                  {language === "or" ? "ସୁରକ୍ଷିତ ଡ୍ରାଫ୍ଟ" : language === "hi" ? "सुरक्षित ड्राफ्ट" : "Safe Draft"}
                </span>
              </div>
              <p className="leading-relaxed text-amber-900">
                {language === "or"
                  ? "ଆପଣଙ୍କ କେସ୍ ଏହି ଡିଭାଇସରେ ସୁରକ୍ଷିତ ରହିଛି। ଇଣ୍ଟରନେଟ୍ ସଂଯୋଗ ହେବା ମାତ୍ରେ ଏହା ଆପେ ଆପେ ଡାକ୍ତରଖାନାକୁ ପଠାଯିବ।"
                  : language === "hi"
                  ? "आपका केस इस डिवाइस में सुरक्षित है। इंटरनेट कनेक्ट होते ही यह अपने आप अस्पताल को भेज दिया जाएगा।"
                  : "Your case has been securely recorded on this device with a local pass. As soon as your internet reconnects, TriaQ will automatically dispatch it to the clinical queue."}
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  disabled={isSyncingOffline}
                  onClick={async () => {
                    setIsSyncingOffline(true);
                    try {
                      const { synced } = await syncAllQueuedSubmissions(API_BASE);
                      if (synced > 0) {
                        alert(language === "or" ? `✓ ସଫଳତାର ସହ ${synced} ଟି ଅଫଲାଇନ୍ କେସ୍ ଡାକ୍ତରଖାନା ସର୍ଭରରେ ସିଙ୍କ୍ ହେଲା!` : language === "hi" ? `✓ सफलतापूर्वक ${synced} ऑफ़लाइन केस अस्पताल सर्वर में सिंक हो गए!` : `✓ Successfully synced ${synced} offline case(s) to the hospital server!`);
                        setReceiptData((prev) => ({ ...prev, isOfflineQueued: false }));
                        setOfflineQueueCount(0);
                      } else {
                        alert(language === "or" ? "ଇଣ୍ଟରନେଟ୍ ସଂଯୋଗ ମିଳିଲା ନାହିଁ। ଇଣ୍ଟରନେଟ୍ ଆସିବା ମାତ୍ରେ ଏହା ଆପେ ସିଙ୍କ୍ ହୋଇଯିବ।" : language === "hi" ? "इंटरनेट कनेक्ट नहीं हुआ। इंटरनेट आते ही यह अपने आप सिंक हो जाएगा।" : "Device is still offline or could not reach server. It will automatically sync as soon as you reconnect.");
                      }
                    } finally {
                      setIsSyncingOffline(false);
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-black text-white bg-amber-800 hover:bg-amber-900 transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>🔄</span>
                  <span>{isSyncingOffline ? (language === "or" ? "ସିଙ୍କ୍ ଯାଞ୍ଚ ହେଉଛି..." : language === "hi" ? "कनेक्शन जांच रहे हैं..." : "Checking Connection...") : (t.syncNow || "Sync to Hospital Cloud (If Online)")}</span>
                </button>
              </div>
            </div>
          )}

          {/* PDF Download Button & Action Buttons */}
          <div className="space-y-3 max-w-md mx-auto pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={`${API_BASE}/api/patients/receipt/${receiptData.receiptNumber}/pdf`}
                download={`${receiptData.receiptNumber}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tactile w-full py-2.5 px-3 rounded font-bold text-[13px] text-white bg-[#003366] hover:bg-[#0B2545] border border-[#002244] shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-center"
              >
                <span>📄</span>
                <span>{t.downloadPdfPass || "Download PDF Pass"}</span>
              </a>

              <button
                type="button"
                onClick={() => setShowPrintSlipModal(true)}
                className="w-full py-3 px-3 rounded-xl font-black text-[13px] border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-98"
              >
                <span>🖨️</span>
                <span>{t.printOpdSlip || "Print OPD Slip"}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCheckStatus}
                className="flex-1 py-2.5 rounded-xl font-bold text-[12.5px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer shadow-2xs"
              >
                {t.checkLiveStatus || "Check Live Status →"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSymptomText("");
                  setAnsweredMap({});
                  setConsentChecked(false);
                  setCurrentStep("symptoms");
                }}
                className="flex-1 py-2.5 rounded-xl font-bold text-[12.5px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer shadow-2xs"
              >
                {t.startNewIntake || "Submit Another Case"}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: PATIENT LIVE STATUS TRACKER                                       */}
      {/* ========================================================================= */}
      {currentStep === "status" && (
        <div className="bg-white rounded-md p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10.5px] font-black uppercase text-emerald-700 tracking-wider">
                {language === "or" ? "ଲାଇଭ୍ କେସ୍ ସ୍ଥିତି" : language === "hi" ? "लाइव केस स्थिति" : "Live Case Status"}
              </span>
              <h2 className="text-xl font-black text-slate-900">
                {t.liveQueueStatusTitle || "Patient OPD Status"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep("intake")}
              className="text-[12px] font-bold text-slate-500 hover:underline cursor-pointer"
            >
              ← {language === "or" ? "ପଛକୁ ଯାଆନ୍ତୁ" : language === "hi" ? "वापस जाएं" : "Back"}
            </button>
          </div>

          {statusData && statusData.hasNote ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">
                    {language === "or" ? "ଟୋକନ୍ ରସିଦ ନମ୍ବର" : language === "hi" ? "टोकन रसीद संख्या" : "Token Receipt"}
                  </span>
                  <span className="font-mono text-base font-black text-slate-900">{statusData.receiptNumber}</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[12px] font-black ${
                    statusData.status === "APPROVED" || statusData.status === "EDITED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : statusData.status === "REJECTED"
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
                  }`}
                >
                  {statusData.status === "APPROVED"
                    ? (language === "or" ? "✓ ଡାକ୍ତରଙ୍କ ଦ୍ୱାରା ଅନୁମୋଦିତ (Approved)" : language === "hi" ? "✓ डॉक्टर द्वारा स्वीकृत" : "✓ Approved by Doctor")
                    : statusData.status === "EDITED"
                    ? (language === "or" ? "✓ ଡାକ୍ତରଙ୍କ ଦ୍ୱାରା ସମୀକ୍ଷା ଓ ସଂଶୋଧିତ" : language === "hi" ? "✓ डॉक्टर द्वारा समीक्षा एवं संपादित" : "✓ Reviewed & Edited by Doctor")
                    : statusData.status === "REJECTED"
                    ? (language === "or" ? "✕ ପ୍ରତ୍ୟାଖ୍ୟାତ (ଦୟାକରି ଜରୁରୀକାଳୀନ ଡେସ୍କକୁ ଯାଆନ୍ତୁ)" : language === "hi" ? "✕ अस्वीकृत (कृपया आपातकालीन डेस्क से संपर्क करें)" : "✕ Rejected (Please see Emergency Desk)")
                    : (t.awaitingReview || "⏳ Awaiting Doctor Review")}
                </span>
              </div>

              {statusData.disposition && (
                <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 space-y-1">
                  <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider block">
                    {language === "or" ? "ଡାକ୍ତରଙ୍କ କ୍ଲିନିକାଲ୍ ମତାମତ" : language === "hi" ? "डॉक्टर का क्लीनिकल परामर्श" : "Doctor Clinical Disposition"}
                  </span>
                  <p className="text-[13.5px] font-bold text-slate-900">{statusData.disposition}</p>
                </div>
              )}

              {statusData.prescription && (
                <div className="p-4 rounded-xl border border-emerald-300 bg-white space-y-1 shadow-2xs">
                  <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider block">
                    {t.doctorPrescriptionTitle || "Doctor Prescription & Instructions (Rx)"}
                  </span>
                  <p className="text-[13px] font-medium text-slate-800 whitespace-pre-line leading-relaxed">
                    {statusData.prescription}
                  </p>
                </div>
              )}

              {statusData.referral && (
                <div className="p-4 rounded-xl border-2 border-teal-600 bg-teal-50/90 space-y-2 shadow-sm text-left">
                  <div className="flex items-center justify-between border-b border-teal-200 pb-2">
                    <span className="text-[12px] font-black uppercase text-teal-950 tracking-wider flex items-center gap-1.5">
                      <span>🚨</span> {t.hospitalTransferAlert || "Hospital Transfer & Referral Issued"}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-teal-200 text-teal-950 uppercase">
                      {t.actionRequired || "Action Required"}
                    </span>
                  </div>
                  <div className="text-[13px] text-slate-800 space-y-1">
                    <p>
                      {t.referredToPrefix || "Your attending physician has officially referred your case to:"}
                      <strong className="block text-base font-black text-slate-950 mt-0.5">
                        🏥 {statusData.referral.targetFacility}
                      </strong>
                    </p>
                    <p className="text-[12px] text-slate-700">
                      <strong>{t.reasonForEscalation || "Reason for Escalation:"}</strong> {statusData.referral.referralReason}
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href={`${API_BASE}/api/referrals/${statusData.referral.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 px-4 rounded-xl font-black text-[13.5px] text-white bg-teal-900 hover:bg-teal-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>{t.downloadReferralPdf || "📥 Download Official Referral Letter (PDF)"}</span>
                    </a>
                    <p className="text-[11px] text-teal-800 mt-1 text-center font-medium">
                      {t.presentReferralNotice || "Please present this official referral pass directly upon arrival at the receiving facility emergency or intake counter."}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <a
                  href={`${API_BASE}/api/patients/receipt/${statusData.receiptNumber}/pdf`}
                  download={`${statusData.receiptNumber}.pdf`}
                  className="w-full py-3 px-4 rounded-xl font-black text-[13.5px] text-white bg-slate-900 hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>📄</span>
                  <span>{t.downloadReceiptAgain || "Download Receipt Again (PDF)"}</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <span className="text-3xl block">📋</span>
              <p className="text-[14.5px] font-bold text-slate-800">No active triage submission found.</p>
              <p className="text-[12.5px] text-slate-500 max-w-xs mx-auto">
                Submit your symptoms through the intake desk to generate a triage pass.
              </p>
              <button
                type="button"
                onClick={() => setCurrentStep("symptoms")}
                className="mt-2 px-5 py-2 rounded-xl text-[12.5px] font-black text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
              >
                Submit Symptoms Now →
              </button>
            </div>
          )}

          {/* Hospital Helpline Banner */}
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-[12px] text-rose-900 flex items-center justify-between">
            <div>
              <strong>Emergency Helpline:</strong> If your condition worsens, call <strong>+91-11-2338-9000</strong> or alert hospital triage immediately.
            </div>
          </div>
        </div>
      )}

      {/* Printable OPD Slip Modal */}
      {showPrintSlipModal && receiptData && (
        <TriageSlipModal
          note={receiptData}
          onClose={() => setShowPrintSlipModal(false)}
        />
      )}

      {/* Account Recovery / Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        initialEmail={email}
        portalName="Patient Portal"
        onSuccess={({ identifier, newPassword }) => {
          if (identifier.includes("@")) {
            setEmail(identifier);
          }
          setPassword(newPassword);
        }}
      />

      {/* Floating Odisha Govt Style Language Selector Modal */}
      <LanguageSelectorModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        currentLanguage={language}
        onSelectLanguage={setLanguage}
      />
    </div>
  );
}
