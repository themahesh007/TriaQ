import React, { useState, useEffect, useCallback } from "react";
import Banner from "./components/Banner";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import IntakePage from "./pages/IntakePage";
import PatientPortal from "./pages/PatientPortal";
import StaffPortal from "./pages/StaffPortal";
import HospitalPortal from "./pages/HospitalPortal";
import MasterPortal from "./pages/MasterPortal";
import LanguageSelectorModal from "./components/LanguageSelectorModal";
import { IconAlertCircle } from "./components/Icons";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("TriaQ UI Error Caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-md border border-rose-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <IconAlertCircle className="w-7 h-7 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Application Notice</h2>
          <p className="text-xs text-slate-600">
            A temporary display error occurred. Please click below to restore the dashboard.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.hash = "";
              window.location.reload();
            }}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer shadow-xs"
          >
            Reload Home Dashboard →
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Sync portal with URL hash for browser history / direct links
  const getInitialPortal = () => {
    const rawHash = window.location.hash.replace("#", "").toLowerCase();
    const hash = rawHash.split("?")[0];
    if (["intake", "patient-intake", "patient", "patient-portal", "emergency", "emergency-case", "casualty"].includes(hash)) return "patient-portal";
    if (["hospital", "hospital-portal", "clinic"].includes(hash)) return "hospital-portal";
    if (["staff", "staff-portal", "dashboard"].includes(hash)) return "staff-portal";
    if (["master", "master-portal", "admin"].includes(hash)) return "master-portal";
    return "home";
  };

  const [activePortal, setActivePortalState] = useState(getInitialPortal);
  const [pendingCount, setPendingCount] = useState(0);

  // Global Language state (supports English, Odia, Hindi across patient portal and first dashboard)
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem("triaq_patient_lang") || "en";
    } catch {
      return "en";
    }
  });
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleSelectLanguage = (code) => {
    setLanguage(code);
    try {
      localStorage.setItem("triaq_patient_lang", code);
    } catch {}
  };

  const setActivePortal = (portal) => {
    setActivePortalState(portal);
    window.location.hash = portal === "home" ? "" : portal.replace("-portal", "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Listen to hash changes (back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      setActivePortalState(getInitialPortal());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const [pendingHospitalCount, setPendingHospitalCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    try {
      const [triageRes, facRes] = await Promise.all([
        fetch(`${API_BASE}/api/triage-notes?status=PENDING`),
        fetch(`${API_BASE}/api/facilities/pending-count`)
      ]);
      if (triageRes.ok) {
        const data = await triageRes.json();
        setPendingCount(Array.isArray(data) ? data.length : 0);
      }
      if (facRes.ok) {
        const facData = await facRes.json();
        setPendingHospitalCount(facData.count || 0);
      }
    } catch {
      // quiet polling catch
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 5000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] selection:bg-emerald-100 selection:text-emerald-900">
      {/* 1. Persistent Top Safety Banner */}
      <Banner language={language} />

      {/* 2. Upgraded Multi-Tier Navbar with Language Selector for First Dashboard */}
      <Navbar
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        pendingCount={pendingCount}
        pendingHospitalCount={pendingHospitalCount}
        language={language}
        onOpenLanguageModal={() => setShowLanguageModal(true)}
      />

      {/* 3. Main Multi-Portal Content with Error Boundary */}
      <ErrorBoundary>
        <main className="flex-1 w-full pb-14">
          {activePortal === "home" && (
            <HomePage 
              onNavigate={setActivePortal} 
              language={language}
              onSelectLanguage={handleSelectLanguage}
              onOpenLanguageModal={() => setShowLanguageModal(true)}
            />
          )}
          {activePortal === "intake" && (
            <IntakePage onNavigateHome={() => setActivePortal("home")} />
          )}
          {activePortal === "patient-portal" && (
            <PatientPortal
              onNavigateHome={() => setActivePortal("home")}
              onNavigateToIntake={() => setActivePortal("intake")}
              language={language}
              onSelectLanguage={handleSelectLanguage}
              onOpenLanguageModal={() => setShowLanguageModal(true)}
            />
          )}
          {activePortal === "hospital-portal" && (
            <HospitalPortal 
              onNavigateHome={() => setActivePortal("home")} 
              language={language} 
            />
          )}
          {activePortal === "staff-portal" && (
            <StaffPortal 
              onNavigateHome={() => setActivePortal("home")} 
              language={language} 
            />
          )}
          {activePortal === "master-portal" && (
            <MasterPortal 
              onNavigateHome={() => setActivePortal("home")} 
              language={language} 
            />
          )}
        </main>
      </ErrorBoundary>

      {/* Floating Odisha Govt Style Language Selector Modal (Available globally across First Dashboard & Patient Portal) */}
      <LanguageSelectorModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        currentLanguage={language}
        onSelectLanguage={handleSelectLanguage}
      />

      {/* 4. Official Indian Government Health Portal Footer */}
      <footer className="border-t border-[#003366] bg-[#0B2545] text-slate-300 py-8 text-[12px] no-print">
        <div className="max-w-[1240px] mx-auto px-4 space-y-6">
          {/* Upper Footer: Official Portal Network Info & Helplines */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-700/80">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-[14px] uppercase tracking-wide">
                  TriaQ • Clinical OPD Portal
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                  {language === "hi" ? "चिकित्सकीय प्रमाणित" : language === "or" ? "କ୍ଲିନିକାଲ୍ ପ୍ରମାଣିତ" : "Clinical Certified"}
                </span>
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed">
                {language === "hi"
                  ? "प्राथमिक स्वास्थ्य केंद्रों (PHCs), जिला अस्पतालों एवं पंजीकृत क्लीनिकों हेतु एकीकृत बाह्यरोगी विभाग (OPD) कतार प्रबंधन, क्लिनिकल जोखिम मूल्यांकन एवं रेफरल अवसंरचना।"
                  : language === "or"
                  ? "ପ୍ରାଥମିକ ସ୍ୱାସ୍ଥ୍ୟ କେନ୍ଦ୍ର (PHC), ଜିଲ୍ଲା ଡାକ୍ତରଖାନା ଏବଂ ପଞ୍ଜୀକୃତ କ୍ଲିନିକ୍ ପାଇଁ ଏକୀକୃତ ବାହ୍ୟରୋଗୀ ବିଭାଗ (OPD) ଧାଡ଼ି ପରିଚାଳନା, କ୍ଲିନିକାଲ୍ ଟ୍ରାଇଏଜ୍ ଓ ରେଫରାଲ୍ ବ୍ୟବସ୍ଥା।"
                  : "Integrated Outpatient Department (OPD) queue management, algorithmic clinical risk triage, and referral infrastructure for Primary Healthcare Centers (PHCs), District Hospitals & Registered Clinics."}
              </p>
            </div>

            <div className="space-y-1.5 text-[12px]">
              <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                {language === "hi" ? "आपातकालीन दूरभाष" : language === "or" ? "ଜରୁରୀକାଳୀନ ହେଲ୍ପଲାଇନ୍" : "Emergency & Helplines"}
              </h4>
              <p className="text-slate-300">
                {language === "hi" ? "राष्ट्रीय स्वास्थ्य हेल्पलाइन:" : language === "or" ? "ଜାତୀୟ ସ୍ୱାସ୍ଥ୍ୟ ହେଲ୍ପଲାଇନ୍:" : "National Health Helpline:"} <strong className="text-white">1075</strong> {language === "hi" ? "(टोल फ्री)" : language === "or" ? "(ଟୋଲ୍ ଫ୍ରି)" : "(Toll Free)"}
              </p>
              <p className="text-slate-300">
                {language === "hi" ? "चिकित्सा परामर्श डेस्क:" : language === "or" ? "ଡାକ୍ତରୀ ପରାମର୍ଶ ଡେସ୍କ:" : "Medical Advice Desk:"} <strong className="text-white">104</strong>
              </p>
              <p className="text-slate-300">
                {language === "hi" ? "एम्बुलेंस आपातकालीन सेवा:" : language === "or" ? "ଆମ୍ବୁଲାନ୍ସ ଜରୁରୀକାଳୀନ ସେବା:" : "Ambulance Emergency Dispatch:"} <strong className="text-white">108 / 102</strong>
              </p>
            </div>

            <div className="space-y-2 text-[12px]">
              <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                {language === "hi" ? "प्रशासनिक लिंक" : language === "or" ? "ପ୍ରଶାସନିକ ଲିଙ୍କ" : "Portals & Navigation"}
              </h4>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setActivePortal("patient-portal")}
                  className="text-left text-slate-300 hover:text-white hover:underline transition cursor-pointer"
                >
                  {language === "hi" 
                    ? "› नागरिक सेवा: ओपीडी टोकन बुक करें और स्थिति जांचें" 
                    : language === "or" 
                    ? "› ନାଗରିକ ସେବା: OPD ଟୋକନ୍ ବୁକ୍ କରନ୍ତୁ ଓ ସ୍ଥିତି ଦେଖନ୍ତୁ" 
                    : "› Citizen Portal: Book OPD Token & Check Status"}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePortal("staff-portal")}
                  className="text-left text-slate-300 hover:text-white hover:underline transition cursor-pointer"
                >
                  {language === "hi" 
                    ? "› चिकित्सा अधिकारी क्लिनिकल वर्कस्टेशन" 
                    : language === "or" 
                    ? "› ଚିକିତ୍ସା ଅଧିକାରୀ କ୍ଲିନିକାଲ୍ ୱାର୍କଷ୍ଟେସନ୍" 
                    : "› Medical Officer Clinical Workstation"}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePortal("hospital-portal")}
                  className="text-left text-slate-300 hover:text-white hover:underline transition cursor-pointer"
                >
                  {language === "hi" 
                    ? "› अस्पताल प्रशासन एवं क्यूआर स्टैंडी" 
                    : language === "or" 
                    ? "› ହସ୍ପିଟାଲ୍ ପ୍ରଶାସନ ଓ QR ଷ୍ଟାଣ୍ଡି" 
                    : "› Hospital Administration & QR Standees"}
                </button>
                <button
                  type="button"
                  onClick={() => setActivePortal("master-portal")}
                  className="text-left text-amber-400 hover:text-amber-300 hover:underline font-bold transition cursor-pointer"
                >
                  {language === "hi" 
                    ? "› सुपर एडमिन कंट्रोल डेस्क (2FA आवश्यक)" 
                    : language === "or" 
                    ? "› ସୁପର ଆଡମିନ୍ କଣ୍ଟ୍ରୋଲ୍ ଡେସ୍କ (2FA ଆବଶ୍ୟକ)" 
                    : "› Super Admin Control Desk (2FA Required)"}
                </button>
              </div>
            </div>
          </div>

          {/* Lower Footer: Disclaimers & Copyright */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 pt-1">
            <div className="space-y-1">
              <p>
                {language === "hi" 
                  ? "ट्रायैक क्लिनिकल प्लेटफॉर्म • बाह्यरोगी ट्राइएज एवं कतार प्रबंधन नेटवर्क।" 
                  : language === "or" 
                  ? "ଟ୍ରାୟାକ୍ କ୍ଲିନିକାଲ୍ ପ୍ଲାଟଫର୍ମ • ବାହ୍ୟରୋଗୀ ଟ୍ରାଇଏଜ୍ ଓ ଧାଡ଼ି ପରିଚାଳନା ନେଟୱର୍କ।" 
                  : "TriaQ Clinical Platform • Outpatient Triage & Queue Management Network."}
              </p>
              <p>
                {language === "hi" 
                  ? "मानकीकृत क्लिनिकल प्रोटोकॉल • क्रोम, एज, फायरफॉक्स 1024x768 रेजोल्यूशन एवं उससे ऊपर सर्वश्रेष्ठ।" 
                  : language === "or" 
                  ? "ମାନକୀକୃତ କ୍ଲିନିକାଲ୍ ପ୍ରୋଟୋକଲ୍ • Chrome, Edge, Firefox ରେ 1024x768 ରେଜୋଲ୍ୟୁସନ ବା ତା'ଠାରୁ ଅଧିକରେ ସର୍ବୋତ୍ତମ।" 
                  : "Clinical Protocol Standardized • Best viewed in Chrome, Edge, Firefox at 1024x768 resolution and above."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span>
                {language === "hi" ? "अंतिम अद्यतन: " : language === "or" ? "ଶେଷ ଅଦ୍ୟତନ: " : "Last Updated: "}
                <strong>2026</strong>
              </span>
              <span>•</span>
              <span>
                {language === "hi" ? "संस्करण: " : language === "or" ? "ସଂସ୍କରଣ: " : "Version: "}
                <strong>2.4.0</strong>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
