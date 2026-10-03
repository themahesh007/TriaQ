// Comprehensive Multilingual Translation Dictionary for TriaQ Patient Portal
// Supports: English (en), Hindi (hi), Odia (or)

export const LANGUAGES = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "or", label: "Odia", nativeName: "ଓଡ଼ିଆ (Odia)" },
  { code: "hi", label: "Hindi", nativeName: "हिन्दी (Hindi)" }
];

export const ODIA_DIGITS = {
  "0": "୦", "1": "୧", "2": "୨", "3": "୩", "4": "୪",
  "5": "୫", "6": "୬", "7": "୭", "8": "୮", "9": "୯"
};

export const HINDI_DIGITS = {
  "0": "०", "1": "१", "2": "२", "3": "३", "4": "४",
  "5": "५", "6": "६", "7": "७", "8": "८", "9": "९"
};

export function toOdiaDigits(str) {
  if (!str) return "";
  return String(str).replace(/[0-9]/g, (d) => ODIA_DIGITS[d] || d);
}

export function toHindiDigits(str) {
  if (!str) return "";
  return String(str).replace(/[0-9]/g, (d) => HINDI_DIGITS[d] || d);
}

export function getLocalizedToken(tokenStr, lang) {
  if (!tokenStr) return "TOKEN NUMBER 01";
  
  // Extract number if present
  const match = tokenStr.match(/\d+/);
  const num = match ? match[0] : "";

  if (lang === "or") {
    const odiaNum = toOdiaDigits(num);
    return `ଟୋକନ୍ ନମ୍ବର ${odiaNum} (${tokenStr})`;
  } else if (lang === "hi") {
    const hindiNum = toHindiDigits(num);
    return `टोकन संख्या ${hindiNum} (${tokenStr})`;
  }
  return tokenStr;
}

export const TRANSLATIONS = {
  en: {
    // Header & Navigation
    home: "Home",
    patientPortal: "Patient Portal",
    logout: "Logout",
    patient: "Patient",
    setLanguage: "Set Language",
    selectLanguageModalTitle: "Select Language",

    // Offline Banners
    offlineTitle: "Offline Resilience Active",
    offlineNotice: "No internet connection. Your symptom drafts and intake submissions are safely saved in local offline storage and will auto-sync when online.",
    networkRestored: "Network Restored",
    draftRestored: "Restored your unsaved symptom draft from local offline storage.",
    offlineQueuedWaiting: "You have queued offline case(s) waiting to sync.",
    syncNow: "Sync Now",

    // Step 1: Auth
    authTitle: "Patient Portal Login",
    authSubtitle: "Book your OPD queue token or check your clinical status",
    phoneOtpTab: "Mobile OTP Login",
    passwordTab: "Email & Password",
    enterPhoneLabel: "10-Digit Mobile Number",
    phonePlaceholder: "e.g. 9876543210",
    sendOtpBtn: "Send Login OTP",
    sendingOtpBtn: "Sending OTP...",
    verifyOtpLabel: "Enter 6-Digit OTP",
    verifyOtpBtn: "Verify OTP & Proceed →",
    emailLabel: "Email Address",
    passwordLabel: "Password",
    loginBtn: "Sign In →",
    signupBtn: "Create Patient Account →",
    noAccount: "Don't have an account?",
    hasAccount: "Already registered?",
    forgotPassword: "Forgot password?",

    // First Dashboard (Home Page)
    homeSystemBadge: "Hospital Clinical Triage & OPD Queue Management System",
    homeWelcome: "Welcome to TriaQ",
    homeHeroSubtitle: "Intelligent non-diagnostic symptom intake, sequential OPD tokens, and clinical prioritization for Primary Health Centers (PHCs), multi-specialty hospitals & rural clinics.",
    selectLanguagePrompt: "Select Language:",
    patientCardTitle: "I'm a Patient",
    patientCardSub: "Public & OPD Intake",
    patientCardDesc: "Check in with Phone OTP or Email, describe your symptoms, select your clinic or scan reception QR, and receive your sequential OPD Token instantly.",
    bookOpdTokenBtn: "Book OPD Token →",
    staffCardTitle: "Staff Station",
    staffCardSub: "Doctor & Nurse Desk",
    staffCardDesc: "Clinical triage review station for certified Doctors and Staff Nurses. View priority queue, approve/reject tokens with tactile physics, and manual advance.",
    openStaffDeskBtn: "Open Staff Desk →",
    hospitalCardTitle: "Hospital Admin",
    hospitalCardSub: "Hospital & PHC Network",
    hospitalCardDesc: "Manage facilities, view OPD analytics, download QR standees for kiosk check-in, and manage staff credentials.",
    openHospitalPortalBtn: "Open Hospital Portal →",

    // Step 2: Demographics
    offlineSafeBadge: "Step 1 of 2 • Offline-Safe",
    demographicsStep: "Step 1 of 2 • Patient Demographics",
    demographicsTitle: "Tell us about yourself",
    draftSavedLocally: "Draft saved locally",
    demographicsSubtitle: "Your sequential token number will be generated only after you fill and submit your clinical symptoms in the next step.",
    selectFacilityLabel: "Select Healthcare Facility / Clinic",
    selectFacilityStep: "Step 1 • Demographics",
    quickHospitalSuggestions: "Quick Suggestions (Top 10 Odisha Apex & Govt Hospitals):",
    quickSelectHint: "1-Click Quick Select",
    fullNameLabel: "Full Name",
    fullNamePlaceholder: "Enter full legal name",
    ageLabel: "Age (in years)",
    agePlaceholder: "e.g. 42",
    contactPhoneLabel: "Contact Number",
    tenDigitIndia: "10-digit India",
    addressLabel: "Ward / Village / Address (Optional)",
    addressPlaceholder: "e.g. Ward 4, Sector 12",
    existingConditionsLabel: "Existing Conditions (Optional)",
    existingConditionsPlaceholder: "e.g. Diabetes, Asthma, High Blood Pressure, None",
    currentMedsLabel: "Current Medications (Optional)",
    currentMedsPlaceholder: "e.g. Metformin 500mg, Inhaler, None",
    checkPastStatus: "Check past status →",
    proceedToSymptomsBtn: "Next: Describe Symptoms →",
    facilityQrVerified: "Facility QR Check-In Verified",
    qrLocked: "🔒 QR Locked",
    noFacilitiesAvailable: "-- No registered facilities available --",

    // Step 3: Symptoms Intake
    symptomsStep: "Step 2 of 2 • Clinical Symptoms",
    symptomsTitle: "What health problems are you experiencing?",
    symptomsSubtitle: "Describe your symptoms in your own words. AI and emergency safety rules will evaluate clinical priority.",
    symptomsPlaceholder: "e.g. I have had a high fever and headache since yesterday with severe body aches...",
    voiceRecordBtn: "Speak Symptoms (Voice Input)",
    voiceRecording: "Listening... Please speak now",
    quickTemplatesLabel: "Quick illness templates:",
    templateChestPain: "🔴 Urgent: Chest Pain",
    templateChestPainText: "Sudden severe chest pain and breathlessness since morning, no medicine taken.",
    templateFever: "🟡 Moderate: Fever (Yellow)",
    templateFeverText: "High fever and vomiting for 2 days, taking paracetamol tablet.",
    templateHeadache: "🟢 Normal: Headache (Green)",
    templateHeadacheText: "Mild headache and slight tiredness today, no previous medical history.",
    vitalsTitle: "Vital Signs (Optional - If Measured at Clinic Desk)",
    bpLabel: "BP (Systolic / Diastolic)",
    pulseLabel: "Pulse (bpm)",
    spo2Label: "SpO2 Oxygen (%)",
    tempLabel: "Temperature (°F)",
    uploadReportLabel: "Upload Lab / Blood Report Image (Optional OCR Analysis)",
    uploadReportBtn: "Choose photo...",
    
    // Additional Questions Section
    additionalBoxTitle: "Some Additional Questions",
    additionalBoxHelp: "Answer the relevant questions below. Answered questions will save into your clinical summary.",
    noQuestionsNeeded: "✓ All additional questions answered!",
    answeredBadge: "Recorded Details:",
    saveBtn: "✓ Save",
    changeBtn: "✕ Change",
    typeAnswerPlaceholder: "Type your answer here...",
    remainingBadge: "remaining",
    recordedBadge: "recorded",

    // Consent & Submit
    consentText: "I consent to the collection and clinical processing of my health information in accordance with the Digital Personal Data Protection (DPDP) Act 2023. My data is encrypted and strictly used for medical triage and hospital queue allocation.",
    dpdpConsentLabel: "Digital Personal Data Protection (DPDP) Consent *",
    dpdpConsentText: "I consent to the collection and clinical processing of my health information in accordance with the Digital Personal Data Protection (DPDP) Act 2023. My data is encrypted and strictly used for medical triage and hospital queue allocation.",
    quickLabel: "",
    templates: [],
    submitBtn: "Submit Case & Generate PDF Receipt →",
    submittingBtn: "Evaluating & Generating Token...",
    mandatoryQuestionsNotice: "Additional Question(s) Required before submitting.",

    // Step 4: Confirmation / Token Pass
    triageCompleteBadge: "Triage Intake Complete",
    caseSubmittedTitle: "Your Case Has Been Submitted",
    caseSubmittedSubtitle: "Your clinical triage receipt has been generated. Doctors are reviewing cases in clinical priority order.",
    officialTokenLabel: "Official OPD Consultation Token",
    urgentRed: "Urgent (RED)",
    moderateYellow: "Moderate (YELLOW)",
    normalGreen: "Normal Priority (GREEN)",
    awaitingReview: "Awaiting Doctor Review",
    downloadPdfPass: "Download PDF Pass",
    printOpdSlip: "Print OPD Slip",
    checkLiveStatus: "Check Live Status →",
    startNewIntake: "Start New Intake",

    // Step 5: Live Status & Referral Pass
    liveQueueStatusTitle: "Live OPD Consultation Status",
    hospitalTransferAlert: "Hospital Transfer & Referral Issued",
    actionRequired: "Action Required",
    referredToPrefix: "Your attending physician has officially referred your case to:",
    reasonForEscalation: "Reason for Escalation:",
    downloadReferralPdf: "📥 Download Official Referral Letter (PDF)",
    presentReferralNotice: "Please present this official referral pass directly upon arrival at the receiving facility emergency or intake counter.",
    doctorPrescriptionTitle: "Doctor Prescription & Instructions (Rx)",
    triageSummaryTitle: "Clinical Triage Summary",
    statusApproved: "APPROVED - Ready for OPD Consultation",
    statusPending: "PENDING - In Clinical Priority Queue",
    statusReferred: "REFERRED - Transferred to Higher Facility",
    statusRejected: "REJECTED - Case closed or duplicate",
    downloadReceiptAgain: "Download Receipt Again (PDF)",

    // Status Lookup
    bookTokenTab: "Book OPD Token",
    showStatusTab: "SHOW STATUS",
    lookupTitle: "National OPD Patient Status & Queue Tracker",
    lookupSubtitle: "Enter your 10-Digit Registered Mobile Number or Token ID to view real-time doctor review status, OPD room number, prescriptions, and digital slip.",
    lookupInputPlaceholder: "Enter 10-digit mobile number, token ID (e.g. 01), or receipt number",
    lookupBtn: "Check Live OPD Status →",
    queueAhead: "Patients Ahead in OPD Queue:",
    assignedRoomLabel: "Assigned OPD Room / Counter:",
    doctorReviewStatus: "Clinical Review Status:",
    prescriptionTitle: "Doctor's Prescription & Clinical Advice:",
    downloadSlipBtn: "Download Official OPD Slip (PDF)"
  },

  or: {
    // Header & Navigation
    home: "ମୁଖ୍ୟ ପୃଷ୍ଠା",
    patientPortal: "ରୋଗୀ ପୋର୍ଟାଲ",
    logout: "ଲଗ୍ଆଉଟ୍",
    patient: "ରୋଗୀ",
    setLanguage: "ଭାଷା ଚୟନ କରନ୍ତୁ",
    selectLanguageModalTitle: "ଭାଷା ଚୟନ କରନ୍ତୁ (Select Language)",

    // Offline Banners
    offlineTitle: "ଅଫଲାଇନ୍ ସୁରକ୍ଷା ସକ୍ରିୟ ଅଛି",
    offlineNotice: "ଇଣ୍ଟରନେଟ୍ ସଂଯୋଗ ନାହିଁ। ଆପଣଙ୍କ ଲକ୍ଷଣ ଡ୍ରାଫ୍ଟ ଏବଂ ଆବେଦନ ଆପଣଙ୍କ ଡିଭାଇସରେ ସୁରକ୍ଷିତ ଭାବେ ରହିଛି ଏବଂ ଇଣ୍ଟରନେଟ୍ ଆସିବା ମାତ୍ରେ ଆପେ ଆପେ ସିଙ୍କ୍ ହୋଇଯିବ।",
    networkRestored: "ଇଣ୍ଟରନେଟ୍ ସଂଯୋଗ ପୁନଃସ୍ଥାପିତ ହେଲା",
    draftRestored: "ସ୍ଥାନୀୟ ଅଫଲାଇନ୍ ଡାଟାରୁ ଅସମ୍ପୂର୍ଣ୍ଣ ଡ୍ରାଫ୍ଟ ପୁନରୁଦ୍ଧାର କରାଗଲା।",
    offlineQueuedWaiting: "ଆପଣଙ୍କର ଅଫଲାଇନ୍ କେସ୍ ସିଙ୍କ୍ ହେବାକୁ ଅପେକ୍ଷା କରିଛି।",
    syncNow: "ଏବେ ସିଙ୍କ୍ କରନ୍ତୁ",

    // Step 1: Auth
    authTitle: "ରୋଗୀ ପୋର୍ଟାଲ୍ ଲଗଇନ୍",
    authSubtitle: "ଆପଣଙ୍କ ଓପିଡି ଟୋକନ୍ ବୁକ୍ କରନ୍ତୁ କିମ୍ବା କେସ୍ ସ୍ଥିତି ଯାଞ୍ଚ କରନ୍ତୁ",
    phoneOtpTab: "ମୋବାଇଲ୍ OTP ଲଗଇନ୍",
    passwordTab: "ଇମେଲ୍ ଏବଂ ପାସୱାର୍ଡ",
    enterPhoneLabel: "୧୦-ଅଙ୍କ ବିଶିଷ୍ଟ ମୋବାଇଲ୍ ନମ୍ବର",
    phonePlaceholder: "ଉଦାହରଣ: 9876543210",
    sendOtpBtn: "ଲଗଇନ୍ OTP ପଠାନ୍ତୁ",
    sendingOtpBtn: "OTP ପଠାଯାଉଛି...",
    verifyOtpLabel: "୬-ଅଙ୍କ ବିଶିଷ୍ଟ OTP ଦିଅନ୍ତୁ",
    verifyOtpBtn: "OTP ଯାଞ୍ଚ କରନ୍ତୁ ଏବଂ ଆଗକୁ ବଢ଼ନ୍ତୁ →",
    emailLabel: "ଇମେଲ୍ ଠିକଣା",
    passwordLabel: "ପାସୱାର୍ଡ",
    loginBtn: "ପ୍ରବେଶ କରନ୍ତୁ (Sign In) →",
    signupBtn: "ନୂତନ ରୋଗୀ ଆକାଉଣ୍ଟ ଖୋଲନ୍ତୁ →",
    noAccount: "ଆକାଉଣ୍ଟ ନାହିଁ କି?",
    hasAccount: "ପୂର୍ବରୁ ପଞ୍ଜୀକୃତ କି?",
    forgotPassword: "ପାସୱାର୍ଡ ଭୁଲିଗଲେ କି?",

    // First Dashboard (Home Page)
    homeSystemBadge: "ଡାକ୍ତରଖାନା କ୍ଲିନିକାଲ୍ ଟ୍ରାଇଏଜ୍ ଏବଂ OPD କ୍ରମିକ ଟୋକନ୍ ବ୍ୟବସ୍ଥା",
    homeWelcome: "TriaQ ରେ ଆପଣଙ୍କୁ ସ୍ୱାଗତମ୍",
    homeHeroSubtitle: "ପ୍ରାଥମିକ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (PHC), ଗୋଷ୍ଠୀ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (CHC) ଏବଂ ଡାକ୍ତରଖାନା ପାଇଁ କ୍ଲିନିକାଲ୍ ଟ୍ରାଇଏଜ୍ ଓ ସରକାରୀ OPD ଟୋକନ୍ ବ୍ୟବସ୍ଥା।",
    selectLanguagePrompt: "ଭାଷା ଚୟନ କରନ୍ତୁ (Select Language)",
    patientCardTitle: "ମୁଁ ଜଣେ ରୋଗୀ (Patient)",
    patientCardSub: "ଜନସାଧାରଣ ଓ OPD ପଞ୍ଜୀକରଣ",
    patientCardDesc: "ମୋବାଇଲ୍ OTP ଦ୍ୱାରା ଲଗଇନ୍ କରନ୍ତୁ, ଆପଣଙ୍କ ଲକ୍ଷଣ ବର୍ଣ୍ଣନା କରନ୍ତୁ, ଡାକ୍ତରଖାନା ଚୟନ କରନ୍ତୁ ଏବଂ ତୁରନ୍ତ ଆପଣଙ୍କ କ୍ରମିକ OPD ଟୋକନ୍ ନମ୍ବର ପାଆନ୍ତୁ।",
    bookOpdTokenBtn: "OPD ଟୋକନ୍ ନିଅନ୍ତୁ →",
    staffCardTitle: "ଡାକ୍ତର ଓ ନର୍ସ ଡେସ୍କ",
    staffCardSub: "କ୍ଲିନିକାଲ୍ ସମୀକ୍ଷା ଷ୍ଟେସନ୍",
    staffCardDesc: "ପ୍ରମାଣିତ ଡାକ୍ତର ଏବଂ ନର୍ସମାନଙ୍କ ପାଇଁ କ୍ଲିନିକାଲ୍ ଟ୍ରାଇଏଜ୍ ସମୀକ୍ଷା ଷ୍ଟେସନ୍। ପ୍ରାଥମିକତା କ୍ରମରେ ରୋଗୀଙ୍କୁ ଦେଖନ୍ତୁ ଏବଂ ଟୋକନ୍ ପାସ୍ ଅନୁମୋଦନ କରନ୍ତୁ।",
    openStaffDeskBtn: "ଷ୍ଟାଫ୍ ଡେସ୍କ ଖୋଲନ୍ତୁ →",
    hospitalCardTitle: "ଡାକ୍ତରଖାନା ପ୍ରଶାସନ",
    hospitalCardSub: "ହସ୍ପିଟାଲ୍ ଓ PHC ନେଟୱର୍କ",
    hospitalCardDesc: "ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର ପରିଚାଳନା, OPD ଆନାଲିଟିକ୍ସ ଦେଖନ୍ତୁ ଏବଂ କାଉଣ୍ଟର ପାଇଁ QR ଷ୍ଟାଣ୍ଡି ଡାଉନଲୋଡ୍ କରନ୍ତୁ।",
    openHospitalPortalBtn: "ହସ୍ପିଟାଲ୍ ପୋର୍ଟାଲ୍ ଖୋଲନ୍ତୁ →",

    // Step 2: Demographics
    offlineSafeBadge: "ପଦକ୍ଷେପ ୧ / ୨ • ଅଫଲାଇନ୍ ସୁରକ୍ଷିତ",
    demographicsStep: "ପଦକ୍ଷେପ ୧ / ୨ • ରୋଗୀଙ୍କ ବ୍ୟକ୍ତିଗତ ବିବରଣୀ",
    demographicsTitle: "ଆପଣଙ୍କ ବିଷୟରେ ଜଣାନ୍ତୁ",
    draftSavedLocally: "ଡ୍ରାଫ୍ଟ ଫୋନରେ ସାଇତା ହୋଇଛି",
    demographicsSubtitle: "ପରବର୍ତ୍ତୀ ପଦକ୍ଷେପରେ ରୋଗର ଲକ୍ଷଣ ଦାଖଲ କରିବା ପରେ ହିଁ ଆପଣଙ୍କୁ ସରକାରୀ କ୍ରମିକ ଟୋକନ୍ ନମ୍ବର ପ୍ରଦାନ କରାଯିବ।",
    selectFacilityLabel: "ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର / କ୍ଲିନିକ୍ ଚୟନ କରନ୍ତୁ",
    selectFacilityStep: "ପଦକ୍ଷେପ ୧ • ରୋଗୀ ବିବରଣୀ",
    quickHospitalSuggestions: "ଓଡ଼ିଶାର ପ୍ରମୁଖ ୧୦ ଡାକ୍ତରଖାନା (ତ୍ୱରିତ ପରାମର୍ଶ):",
    quickSelectHint: "କ୍ଲିକ୍ କରି ସିଧାସଳଖ ଚୟନ କରନ୍ତୁ",
    fullNameLabel: "ସମ୍ପୂର୍ଣ୍ଣ ନାମ",
    fullNamePlaceholder: "ସମ୍ପୂର୍ଣ୍ଣ ସରକାରୀ ନାମ ପ୍ରବେଶ କରନ୍ତୁ",
    ageLabel: "ବୟସ (ବର୍ଷରେ)",
    agePlaceholder: "ଯଥା: ୨୫",
    contactPhoneLabel: "ଯୋଗାଯୋଗ ନମ୍ବର",
    tenDigitIndia: "୧୦ ଅଙ୍କ ଭାରତ",
    addressLabel: "ୱାର୍ଡ / ଗ୍ରାମ / ଠିକଣା (ଇଚ୍ଛାଧୀନ)",
    addressPlaceholder: "ଯଥା: ୱାର୍ଡ ୪, ବ୍ରହ୍ମପୁର",
    existingConditionsLabel: "ପୂର୍ବରୁ ଥିବା ରୋଗ (ଇଚ୍ଛାଧୀନ)",
    existingConditionsPlaceholder: "ଯଥା: ମଧୁମେହ, ଦମା, ହାଇ ବିପି, କିଛି ନାହିଁ",
    currentMedsLabel: "ବର୍ତ୍ତମାନ ଖାଉଥିବା ଔଷଧ (ଇଚ୍ଛାଧୀନ)",
    currentMedsPlaceholder: "ଯଥା: ମେଟଫର୍ମିନ୍, ଇନହେଲର, କିଛି ନାହିଁ",
    checkPastStatus: "ପୂର୍ବ ସ୍ଥିତି ଯାଞ୍ଚ କରନ୍ତୁ →",
    proceedToSymptomsBtn: "ପରବର୍ତ୍ତୀ: ଲକ୍ଷଣ ବର୍ଣ୍ଣନା କରନ୍ତୁ →",
    facilityQrVerified: "ସୁବିଧା QR ଚେକ୍-ଇନ୍ ଯାଞ୍ଚ ହୋଇଛି",
    qrLocked: "🔒 QR ଲକ୍ ହୋଇଛି",
    noFacilitiesAvailable: "-- କୌଣସି ପଞ୍ଜୀକୃତ ସୁବିଧା ଉପଲବ୍ଧ ନାହିଁ --",

    // Step 3: Symptoms Intake
    symptomsStep: "ପଦକ୍ଷେପ ୨ / ୨ • ରୋଗର ଲକ୍ଷଣ",
    symptomsTitle: "ଆପଣଙ୍କର କ’ଣ ସମସ୍ୟା ବା ଯନ୍ତ୍ରଣା ହେଉଛି?",
    symptomsSubtitle: "ଆପଣଙ୍କ ନିଜ ଭାଷାରେ ଲକ୍ଷଣ ବର୍ଣ୍ଣନା କରନ୍ତୁ। AI ଏବଂ ଜରୁରୀକାଳୀନ ସୁରକ୍ଷା ନିୟମ ଆଧାରରେ ପ୍ରାଥମିକତା ନିର୍ଣ୍ଣୟ କରାଯିବ।",
    symptomsPlaceholder: "ଉଦାହରଣ: ଗତକାଲି ଠାରୁ ପ୍ରବଳ ଜ୍ୱର ଏବଂ ମୁଣ୍ଡବିନ୍ଧା ସହିତ ଦେହହାତ ଘୋଳାବିନ୍ଧା ହେଉଛି...",
    voiceRecordBtn: "କହିକି ଲକ୍ଷଣ ଜଣାନ୍ତୁ (ଭଏସ୍ ଇନପୁଟ୍)",
    voiceRecording: "ଶୁଣୁଛି... ଦୟାକରି ଏବେ କୁହନ୍ତୁ",
    quickTemplatesLabel: "ଉଦାହରଣ ଟେମ୍ପଲେଟ୍ (ସହଜ ଚୟନ):",
    templateChestPain: "🔴 ଜରୁରୀ: ଛାତି ଯନ୍ତ୍ରଣା (Urgent)",
    templateChestPainText: "ସକାଳୁ ହଠାତ୍ ପ୍ରବଳ ଛାତି ଯନ୍ତ୍ରଣା ଏବଂ ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ, କୌଣସି ଔଷଧ ଖାଇନାହାଁନ୍ତି।",
    templateFever: "🟡 ମଧ୍ୟମ: ଜ୍ୱର (Yellow)",
    templateFeverText: "୨ ଦିନ ଧରି ପ୍ରବଳ ଜ୍ୱର ଏବଂ ବାନ୍ତି ହେଉଛି, ପାରାସିଟାମୋଲ୍ ଔଷଧ ଖାଉଛନ୍ତି।",
    templateHeadache: "🟢 ସାଧାରଣ: ମୁଣ୍ଡବିନ୍ଧା (Green)",
    templateHeadacheText: "ଆଜି ସାମାନ୍ୟ ମୁଣ୍ଡବିନ୍ଧା ଏବଂ କ୍ଳାନ୍ତ ଲାଗୁଛି, ପୂର୍ବର କୌଣସି ରୋଗ ନାହିଁ।",
    vitalsTitle: "ଶାରୀରିକ ମାପଦଣ୍ଡ (ଇଚ୍ଛାଧୀନ - ଯଦି ମପା ଯାଇଛି)",
    bpLabel: "ରକ୍ତଚାପ / BP",
    pulseLabel: "ନାଡ଼ିର ଗତି (Pulse bpm)",
    spo2Label: "ଅକ୍ସିଜେନ୍ ସ୍ତର / SpO2 (%)",
    tempLabel: "ତାପମାତ୍ରା (°F)",
    uploadReportLabel: "ପରୀକ୍ଷା ରିପୋର୍ଟ ଫଟୋ ଅପଲୋଡ୍ କରନ୍ତୁ (ଇଚ୍ଛାଧୀନ OCR)",
    uploadReportBtn: "ଫଟୋ ବାଛନ୍ତୁ...",
    
    // Additional Questions Section
    additionalBoxTitle: "କିଛି ଅତିରିକ୍ତ ପ୍ରଶ୍ନ",
    additionalBoxHelp: "ତଳେ ଥିବା ପ୍ରଶ୍ନଗୁଡ଼ିକର ଉତ୍ତର ଦିଅନ୍ତୁ। ଉତ୍ତର ଦେବା ପରେ ପ୍ରଶ୍ନଟି ଆପଣଙ୍କ ରିପୋର୍ଟରେ ଯୋଡ଼ି ହୋଇଯିବ।",
    noQuestionsNeeded: "✓ ସମସ୍ତ ଅତିରିକ୍ତ ପ୍ରଶ୍ନର ଉତ୍ତର ମିଳିଗଲା!",
    answeredBadge: "ଦାଖଲ ତଥ୍ୟ:",
    saveBtn: "✓ ସାଇତନ୍ତୁ",
    changeBtn: "✕ ବଦଳାନ୍ତୁ",
    typeAnswerPlaceholder: "ଏଠାରେ ଆପଣଙ୍କ ଉତ୍ତର ଲେଖନ୍ତୁ...",
    remainingBadge: "ବାକି ଅଛି",
    recordedBadge: "ଲିପିବଦ୍ଧ",

    // Consent & Submit
    consentText: "ମୁଁ ମୋର ସ୍ୱାସ୍ଥ୍ୟ ସମ୍ବନ୍ଧୀୟ ତଥ୍ୟକୁ DPDP ଆଇନ ୨୦୨୩ ଅନୁଯାୟୀ କ୍ଲିନିକାଲ୍ ଟ୍ରାଇଏଜ୍ ଏବଂ ଡାକ୍ତରଖାନା ଟୋକନ୍ ବ୍ୟବସ୍ଥା ପାଇଁ ବ୍ୟବହାର କରିବାକୁ ସହମତି ପ୍ରଦାନ କରୁଛି। ମୋର ତଥ୍ୟ ସମ୍ପୂର୍ଣ୍ଣ ଏନକ୍ରିପ୍ଟ ହୋଇ ସୁରକ୍ଷିତ ରହିବ।",
    dpdpConsentLabel: "ଡିଜିଟାଲ୍ ବ୍ୟକ୍ତିଗତ ତଥ୍ୟ ସୁରକ୍ଷା (DPDP) ସମ୍ମତି *",
    dpdpConsentText: "ମୁଁ ମୋର ସ୍ୱାସ୍ଥ୍ୟ ସମ୍ବନ୍ଧୀୟ ତଥ୍ୟକୁ DPDP ଆଇନ ୨୦୨୩ ଅନୁଯାୟୀ କ୍ଲିନିକାଲ୍ ଟ୍ରାଇଏଜ୍ ଏବଂ ଡାକ୍ତରଖାନା ଟୋକନ୍ ବ୍ୟବସ୍ଥା ପାଇଁ ବ୍ୟବହାର କରିବାକୁ ସହମତି ପ୍ରଦାନ କରୁଛି। ମୋର ତଥ୍ୟ ସମ୍ପୂର୍ଣ୍ଣ ଏନକ୍ରିପ୍ଟ ହୋଇ ସୁରକ୍ଷିତ ରହିବ।",
    quickLabel: "",
    templates: [],
    submitBtn: "କେସ୍ ଦାଖଲ କରନ୍ତୁ ଏବଂ PDF ରସିଦ ପାଆନ୍ତୁ →",
    submittingBtn: "ମୂଲ୍ୟାଙ୍କନ ଓ ଟୋକନ୍ ତିଆରି ଚାଲିଛି...",
    mandatoryQuestionsNotice: "ଦାଖଲ କରିବା ପୂର୍ବରୁ ଅତିରିକ୍ତ ପ୍ରଶ୍ନର ଉତ୍ତର ଦେବା ଆବଶ୍ୟକ।",

    // Step 4: Confirmation / Token Pass
    triageCompleteBadge: "ଟ୍ରାଇଏଜ୍ ପଞ୍ଜୀକରଣ ସମ୍ପୂର୍ଣ୍ଣ ହେଲା",
    caseSubmittedTitle: "ଆପଣଙ୍କ କେସ୍ ସଫଳତାର ସହ ଦାଖଲ ହୋଇଛି",
    caseSubmittedSubtitle: "ଆପଣଙ୍କ କ୍ଲିନିକାଲ୍ ଟ୍ରାଇଏଜ୍ ରସିଦ ପ୍ରସ୍ତୁତ ହୋଇଛି। ଡାକ୍ତରମାନେ ଗୁରୁତର ଅନୁଯାୟୀ କ୍ରମରେ ରୋଗୀଙ୍କୁ ଦେଖୁଛନ୍ତି।",
    officialTokenLabel: "ସରକାରୀ OPD ପରାମର୍ଶ ଟୋକନ୍",
    urgentRed: "ଜରୁରୀ / ଗୁରୁତର (RED)",
    moderateYellow: "ମଧ୍ୟମ ପ୍ରାଥମିକତା (YELLOW)",
    normalGreen: "ସାଧାରଣ ପ୍ରାଥମିକତା (GREEN)",
    awaitingReview: "ଡାକ୍ତରଙ୍କ ସମୀକ୍ଷାକୁ ଅପେକ୍ଷା",
    downloadPdfPass: "PDF ପାସ୍ ଡାଉନଲୋଡ୍ କରନ୍ତୁ",
    printOpdSlip: "OPD ରସିଦ ପ୍ରିଣ୍ଟ କରନ୍ତୁ",
    checkLiveStatus: "ଲାଇଭ୍ ସ୍ଥିତି ଯାଞ୍ଚ କରନ୍ତୁ →",
    startNewIntake: "ନୂତନ କେସ୍ ଆରମ୍ଭ କରନ୍ତୁ",

    // Step 5: Live Status & Referral Pass
    liveQueueStatusTitle: "ଲାଇଭ୍ OPD ଧାଡ଼ି ଓ କେସ୍ ସ୍ଥିତି",
    hospitalTransferAlert: "ଡାକ୍ତରଖାନା ସ୍ଥାନାନ୍ତର ଓ ରେଫରାଲ୍ ଜାରି ହୋଇଛି",
    actionRequired: "ତୁରନ୍ତ ପଦକ୍ଷେପ ଆବଶ୍ୟକ",
    referredToPrefix: "ଆପଣଙ୍କ ଡାକ୍ତର ଆପଣଙ୍କ କେସ୍ କୁ ସ୍ଥାନାନ୍ତର କରିଛନ୍ତି:",
    reasonForEscalation: "ସ୍ଥାନାନ୍ତରର କାରଣ:",
    downloadReferralPdf: "📥 ସରକାରୀ ରେଫରାଲ୍ ଚିଠି (PDF) ଡାଉନଲୋଡ୍ କରନ୍ତୁ",
    presentReferralNotice: "ଉଚ୍ଚତର ଡାକ୍ତରଖାନାରେ ପହଞ୍ଚିବା ମାତ୍ରେ ଏହି ଅଫିସିଆଲ୍ ରେଫରାଲ୍ ପାସ୍ କୁ ଜରୁରୀକାଳୀନ କାଉଣ୍ଟରରେ ଦେଖାନ୍ତୁ।",
    doctorPrescriptionTitle: "ଡାକ୍ତରଙ୍କ ଔଷଧ ପରାମର୍ଶ ଏବଂ ନିର୍ଦ୍ଦେଶ (Rx)",
    triageSummaryTitle: "କ୍ଲିନିକାଲ୍ ଟ୍ରାଇଏଜ୍ ସାରାଂଶ",
    statusApproved: "ଅନୁମୋଦିତ - OPD ପରାମର୍ଶ ପାଇଁ ପ୍ରସ୍ତୁତ",
    statusPending: "ବିଚାରାଧୀନ - ପ୍ରାଥମିକତା ଧାଡ଼ିରେ ଅଛି",
    statusReferred: "ରେଫର୍ ହୋଇଛି - ଉଚ୍ଚ ଚିକିତ୍ସାଳୟକୁ ସ୍ଥାନାନ୍ତରିତ",
    statusRejected: "ଖାରଜ ହୋଇଛି - ଅବୈଧ କିମ୍ବା ଡୁପ୍ଲିକେଟ୍",
    downloadReceiptAgain: "ପୁନର୍ବାର ରସିଦ (PDF) ଡାଉନଲୋଡ୍ କରନ୍ତୁ",

    // Status Lookup
    bookTokenTab: "OPD ଟୋକନ୍ ବୁକ୍ କରନ୍ତୁ",
    showStatusTab: "କେସ୍ ସ୍ଥିତି ଯାଞ୍ଚ (SHOW STATUS)",
    lookupTitle: "ଜାତୀୟ ଓପିଡି ରୋଗୀ ସ୍ଥିତି ଓ ଧାଡ଼ି ଟ୍ରାକର୍",
    lookupSubtitle: "ଆପଣଙ୍କର ୧୦ ଅଙ୍କ ବିଶିଷ୍ଟ ମୋବାଇଲ୍ ନମ୍ବର କିମ୍ବା ଟୋକନ୍ ନମ୍ବର ପ୍ରବେଶ କରି ଡାକ୍ତରୀ ସ୍ଥିତି, ଓପିଡି ରୁମ୍ ଏବଂ ପ୍ରେସକ୍ରିପସନ୍ ଦେଖନ୍ତୁ।",
    lookupInputPlaceholder: "୧୦ ଅଙ୍କ ବିଶିଷ୍ଟ ମୋବାଇଲ୍ ନମ୍ବର କିମ୍ବା ଟୋକନ୍ ନମ୍ବର ଲେଖନ୍ତୁ",
    lookupBtn: "ଲାଇଭ୍ ସ୍ଥିତି ଯାଞ୍ଚ କରନ୍ତୁ →",
    queueAhead: "ଧାଡ଼ିରେ ଆପଣଙ୍କ ଆଗରେ ଥିବା ରୋଗୀ:",
    assignedRoomLabel: "ନିର୍ଦ୍ଧାରିତ ଓପିଡି କୋଠରୀ / କାଉଣ୍ଟର:",
    doctorReviewStatus: "ଡାକ୍ତରୀ ମୂଲ୍ୟାଙ୍କନ ସ୍ଥିତି:",
    prescriptionTitle: "ଡାକ୍ତରଙ୍କ ପ୍ରେସକ୍ରିପସନ୍ ଓ ପରାମର୍ଶ:",
    downloadSlipBtn: "ସରକାରୀ OPD ରସିଦ ଡାଉନଲୋଡ୍ କରନ୍ତୁ (PDF)"
  },

  hi: {
    // Header & Navigation
    home: "मुख्य पृष्ठ",
    patientPortal: "रोगी पोर्टल",
    logout: "लॉग आउट",
    patient: "मरीज़",
    setLanguage: "भाषा चुनें",
    selectLanguageModalTitle: "भाषा का चयन करें (Select Language)",

    // Offline Banners
    offlineTitle: "ऑफ़लाइन मोड सक्रिय है",
    offlineNotice: "इंटरनेट कनेक्शन उपलब्ध नहीं है। आपका विवरण आपके उपकरण पर सुरक्षित रूप से सहेजा गया है और इंटरनेट आते ही स्वतः सिंक हो जाएगा।",
    networkRestored: "इंटरनेट कनेक्शन बहाल हुआ",
    draftRestored: "स्थानीय ऑफ़लाइन संग्रहण से आपका अधूरा ड्राफ्ट पुनर्प्राप्त किया गया।",
    offlineQueuedWaiting: "आपके ऑफ़लाइन केस सिंक होने की प्रतीक्षा में हैं।",
    syncNow: "अभी सिंक करें",

    // Step 1: Auth
    authTitle: "रोगी पोर्टल लॉगिन",
    authSubtitle: "अपना ओपीडी टोकन बुक करें अथवा अपने केस की स्थिति जांचें",
    phoneOtpTab: "मोबाइल OTP लॉगिन",
    passwordTab: "ईमेल और पासवर्ड",
    enterPhoneLabel: "10-अंकों का मोबाइल नंबर",
    phonePlaceholder: "उदाहरण: 9876543210",
    sendOtpBtn: "लॉगिन OTP भेजें",
    sendingOtpBtn: "OTP भेजा जा रहा है...",
    verifyOtpLabel: "6-अंकों का OTP दर्ज करें",
    verifyOtpBtn: "OTP सत्यापित करें और आगे बढ़ें →",
    emailLabel: "ईमेल पता",
    passwordLabel: "पासवर्ड",
    loginBtn: "साइन इन करें →",
    signupBtn: "नया रोगी खाता बनाएं →",
    noAccount: "खाता नहीं है?",
    hasAccount: "पहले से पंजीकृत हैं?",
    forgotPassword: "पासवर्ड भूल गए?",

    // First Dashboard (Home Page)
    homeSystemBadge: "अस्पताल मेडिकल ट्रायज एवं ओपीडी कतार प्रबंधन प्रणाली",
    homeWelcome: "TriaQ में आपका स्वागत है",
    homeHeroSubtitle: "प्राथमिक स्वास्थ्य केंद्रों (PHCs), अस्पतालों एवं ग्रामीण क्लीनिकों हेतु क्लिनिकल ट्रायज एवं क्रमिक ओपीडी टोकन आवंटन प्रणाली।",
    selectLanguagePrompt: "भाषा चुनें (Select Language)",
    patientCardTitle: "मैं एक मरीज हूँ (Patient)",
    patientCardSub: "सार्वजनिक एवं ओपीडी पंजीकरण",
    patientCardDesc: "मोबाइल ओटीपी से लॉगिन करें, अपने लक्षण बताएं, अस्पताल चुनें और तुरंत अपना आधिकारिक क्रमिक ओपीडी टोकन नंबर प्राप्त करें।",
    bookOpdTokenBtn: "ओपीडी टोकन लें →",
    staffCardTitle: "स्टाफ स्टेशन (डॉक्टर एवं नर्स)",
    staffCardSub: "क्लिनिकल ट्रायज डेस्क",
    staffCardDesc: "डॉक्टरों एवं नर्सिंग स्टाफ के लिए क्लिनिकल समीक्षा स्टेशन। प्राथमिकता अनुसार मरीजों की जांच करें और टोकन स्वीकृत करें।",
    openStaffDeskBtn: "स्टाफ स्टेशन खोलें →",
    hospitalCardTitle: "अस्पताल प्रबंधन",
    hospitalCardSub: "हॉस्पिटल एवं पीएचसी नेटवर्क",
    hospitalCardDesc: "अस्पताल की जानकारी प्रबंधित करें, ओपीडी विश्लेषण देखें एवं काउंटर हेतु क्यूआर स्टैंडी डाउनलोड करें।",
    openHospitalPortalBtn: "हॉस्पिटल पोर्टल खोलें →",

    // Step 2: Demographics
    offlineSafeBadge: "चरण 1 / 2 • ऑफलाइन सुरक्षित",
    demographicsStep: "चरण 1 / 2 • मरीज की जानकारी",
    demographicsTitle: "अपने बारे में बताएं",
    draftSavedLocally: "ड्राफ्ट सुरक्षित सहेजा गया",
    demographicsSubtitle: "अगले चरण में अपने लक्षण दर्ज और सबमिट करने के बाद ही आपका टोकन नंबर आवंटित होगा।",
    selectFacilityLabel: "अस्पताल या क्लिनिक चुनें",
    selectFacilityStep: "चरण 1 • मरीज विवरण",
    quickHospitalSuggestions: "ओडिशा के प्रमुख 10 अस्पताल (त्वरित सुझाव):",
    quickSelectHint: "क्लिक करके तुरंत चुनें",
    fullNameLabel: "पूरा नाम",
    fullNamePlaceholder: "पूरा कानूनी नाम दर्ज करें",
    ageLabel: "आयु (वर्ष में)",
    agePlaceholder: "उदा: 25",
    contactPhoneLabel: "मोबाइल नंबर",
    tenDigitIndia: "10-अंक भारत",
    addressLabel: "वार्ड / गाँव / पता (वैकल्पिक)",
    addressPlaceholder: "उदा: वार्ड 4, सेक्टर 12",
    existingConditionsLabel: "पहले से मौजूद बीमारियाँ (वैकल्पिक)",
    existingConditionsPlaceholder: "उदा: शुगर, दमा, हाई बीपी, कोई नहीं",
    currentMedsLabel: "वर्तमान दवाइयाँ (वैकल्पिक)",
    currentMedsPlaceholder: "उदा: मेटफॉर्मिन, इनहेलर, कोई नहीं",
    checkPastStatus: "पिछली स्थिति जांचें →",
    proceedToSymptomsBtn: "आगे बढ़ें: लक्षण बताएं →",
    facilityQrVerified: "सुविधा क्यूआर चेक-इन सत्यापित",
    qrLocked: "🔒 क्यूआर लॉक है",
    noFacilitiesAvailable: "-- कोई पंजीकृत सुविधा उपलब्ध नहीं --",

    // Step 3: Symptoms Intake
    symptomsStep: "चरण 2 / 2 • बीमारी के लक्षण",
    symptomsTitle: "आपको क्या स्वास्थ्य समस्या या तकलीफ है?",
    symptomsSubtitle: "अपनी सरल भाषा में लक्षणों का वर्णन करें। एआई और आपातकालीन सुरक्षा नियमों द्वारा प्राथमिकता तय की जाएगी।",
    symptomsPlaceholder: "उदाहरण: मुझे कल से तेज बुखार और सिरदर्द के साथ बदन दर्द हो रहा है...",
    voiceRecordBtn: "बोलकर लक्षण बताएं (आवाज इनपुट)",
    voiceRecording: "सुन रहे हैं... कृपया अब बोलें",
    quickTemplatesLabel: "त्वरित उदाहरण (सुविधाजनक चयन):",
    templateChestPain: "🔴 गंभीर: छाती में दर्द (Urgent)",
    templateChestPainText: "सुबह से अचानक छाती में तेज दर्द और सांस फूलने की समस्या है, कोई दवा नहीं ली।",
    templateFever: "🟡 मध्यम: बुखार (Yellow)",
    templateFeverText: "2 दिनों से तेज बुखार और उल्टी हो रही है, पैरासिटामोल गोली ली है।",
    templateHeadache: "🟢 सामान्य: सिरदर्द (Green)",
    templateHeadacheText: "आज से हल्का सिरदर्द और हल्की थकान है, कोई पुरानी बीमारी नहीं है।",
    vitalsTitle: "शारीरिक माप (वैकल्पिक - यदि क्लिनिक में मापा गया हो)",
    bpLabel: "रक्तचाप / BP",
    pulseLabel: "नाड़ी की गति (Pulse bpm)",
    spo2Label: "ऑक्सीजन स्तर / SpO2 (%)",
    tempLabel: "तापमान (°F)",
    uploadReportLabel: "लैब रिपोर्ट / रक्त जांच पर्ची की फोटो अपलोड करें (वैकल्पिक OCR)",
    uploadReportBtn: "फोटो चुनें...",
    
    // Additional Questions Section
    additionalBoxTitle: "कुछ अतिरिक्त प्रश्न",
    additionalBoxHelp: "नीचे दिए गए प्रश्नों के उत्तर दें। उत्तर देने पर प्रश्न आपके रिपोर्ट में जुड़ जाएगा।",
    noQuestionsNeeded: "✓ सभी अतिरिक्त प्रश्नों के उत्तर दर्ज हो चुके हैं!",
    answeredBadge: "दर्ज की गई जानकारी:",
    saveBtn: "✓ सहेजें",
    changeBtn: "✕ बदलें",
    typeAnswerPlaceholder: "यहाँ अपना उत्तर लिखें...",
    remainingBadge: "शेष हैं",
    recordedBadge: "दर्ज हैं",

    // Consent & Submit
    consentText: "मैं डीपीडीपी अधिनियम 2023 के तहत अपने स्वास्थ्य डेटा को मेडिकल ट्रायज और अस्पताल टोकन आवंटन हेतु उपयोग करने की सहमति देता/देती हूँ। मेरा डेटा पूरी तरह से एन्क्रिप्टेड और सुरक्षित रहेगा।",
    dpdpConsentLabel: "डिजिटल व्यक्तिगत डेटा संरक्षण (DPDP) सहमति *",
    dpdpConsentText: "मैं डीपीडीपी अधिनियम 2023 के तहत अपने स्वास्थ्य डेटा को मेडिकल ट्रायज और अस्पताल टोकन आवंटन हेतु उपयोग करने की सहमति देता/देती हूँ। मेरा डेटा पूरी तरह से एन्क्रिप्टेड और सुरक्षित रहेगा।",
    quickLabel: "",
    templates: [],
    submitBtn: "केस सबमिट करें और PDF रसीद प्राप्त करें →",
    submittingBtn: "मूल्यांकन एवं टोकन तैयार हो रहा है...",
    mandatoryQuestionsNotice: "सबमिट करने से पहले अतिरिक्त प्रश्नों का उत्तर देना अनिवार्य है।",

    // Step 4: Confirmation / Token Pass
    triageCompleteBadge: "ट्रायज पंजीकरण पूर्ण हुआ",
    caseSubmittedTitle: "आपका केस सफलतापूर्वक सबमिट हो गया है",
    caseSubmittedSubtitle: "आपकी मेडिकल ट्रायज रसीद तैयार कर दी गई है। डॉक्टर प्राथमिकता के अनुसार मरीजों को देख रहे हैं।",
    officialTokenLabel: "आधिकारिक ओपीडी परामर्श टोकन",
    urgentRed: "गंभीर / आपातकालीन (RED)",
    moderateYellow: "मध्यम प्राथमिकता (YELLOW)",
    normalGreen: "सामान्य प्राथमिकता (GREEN)",
    awaitingReview: "डॉक्टर की समीक्षा की प्रतीक्षा में",
    downloadPdfPass: "PDF पास डाउनलोड करें",
    printOpdSlip: "ओपीडी पर्ची प्रिंट करें",
    checkLiveStatus: "लाइव स्थिति जांचें →",
    startNewIntake: "नया केस शुरू करें",

    // Step 5: Live Status & Referral Pass
    liveQueueStatusTitle: "लाइव ओपीडी कतार व स्थिति",
    hospitalTransferAlert: "अस्पताल ट्रांसफर और रेफरल जारी किया गया",
    actionRequired: "तत्काल कार्रवाई आवश्यक",
    referredToPrefix: "आपके डॉक्टर ने आपका केस इस उच्च अस्पताल में ट्रांसफर किया है:",
    reasonForEscalation: "ट्रांसफर का कारण:",
    downloadReferralPdf: "📥 आधिकारिक रेफरल पत्र (PDF) डाउनलोड करें",
    presentReferralNotice: "उच्च अस्पताल पहुँचते ही इस आधिकारिक रेफरल पास को आपातकालीन या प्रवेश काउंटर पर दिखाएं।",
    doctorPrescriptionTitle: "डॉक्टर की दवा और परामर्श निर्देश (Rx)",
    triageSummaryTitle: "मेडिकल ट्रायज सारांश",
    statusApproved: "स्वीकृत - ओपीडी परामर्श के लिए तैयार",
    statusPending: "लंबित - प्राथमिकता कतार में है",
    statusReferred: "रेफर किया गया - उच्च अस्पताल में स्थानांतरित",
    statusRejected: "अस्वीकृत - केस बंद या डुप्लिकेट",
    downloadReceiptAgain: "रसीद (PDF) दोबारा डाउनलोड करें",

    // Status Lookup
    bookTokenTab: "नया OPD टोकन बुक करें",
    showStatusTab: "केस स्थिति देखें (SHOW STATUS)",
    lookupTitle: "राष्ट्रीय ओपीडी मरीज स्थिति एवं कतार ट्रैकर",
    lookupSubtitle: "अपना 10-अंकीय मोबाइल नंबर या टोकन संख्या दर्ज करके लाइव डॉक्टर समीक्षा, ओपीडी कक्ष संख्या और पर्चा देखें।",
    lookupInputPlaceholder: "10-अंकों का मोबाइल नंबर या टोकन संख्या दर्ज करें",
    lookupBtn: "लाइव ओपीडी स्थिति देखें →",
    queueAhead: "कतार में आपसे आगे मरीज:",
    assignedRoomLabel: "आवंटित ओपीडी कक्ष / काउंटर:",
    doctorReviewStatus: "डॉक्टर समीक्षा स्थिति:",
    prescriptionTitle: "डॉक्टर का पर्चा एवं चिकित्सकीय परामर्श:",
    downloadSlipBtn: "आधिकारिक ओपीडी पर्ची डाउनलोड करें (PDF)"
  }
};
