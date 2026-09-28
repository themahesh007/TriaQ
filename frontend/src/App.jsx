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
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mx-auto">
            ⚠️
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
    if (["intake", "patient-intake", "patient", "patient-portal"].includes(hash)) return "patient-portal";
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

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/triage-notes?status=PENDING`);
      if (res.ok) {
        const data = await res.json();
        setPendingCount(Array.isArray(data) ? data.length : 0);
      }
    } catch {
      // quiet polling catch
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 10000);
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
                  TriaQ • National OPD Portal
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                  e-Gov Certified
                </span>
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed">
                Integrated Outpatient Department (OPD) queue management, algorithmic clinical risk triage, and referral infrastructure for Primary Healthcare Centers (PHCs), District Hospitals &amp; Registered Clinics.
              </p>
            </div>

            <div className="space-y-1.5 text-[12px]">
              <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                {language === "hi" ? "आपातकालीन दूरभाष" : language === "or" ? "ଜରୁରୀକାଳୀନ ହେଲ୍ପଲାଇନ୍" : "Emergency & Helplines"}
              </h4>
              <p className="text-slate-300">National Health Helpline: <strong className="text-white">1075</strong> (Toll Free)</p>
              <p className="text-slate-300">Odisha Swasthya Seva: <strong className="text-white">104</strong> (Medical Advice)</p>
              <p className="text-slate-300">Ambulance Emergency Dispatch: <strong className="text-white">108 / 102</strong></p>
              <p className="text-slate-300">ABDM Helpdesk: <strong className="text-white">1800-11-4477</strong></p>
            </div>

            <div className="space-y-2 text-[12px]">
              <h4 className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                {language === "hi" ? "प्रशासनिक लिंक" : language === "or" ? "ପ୍ରଶାସନିକ ଲିଙ୍କ" : "Governance & Portals"}
              </h4>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setActivePortal("patient-portal")}
                  className="text-left text-slate-300 hover:text-white hover:underline transition cursor-pointer"
                >
                  › Citizen Portal: Book OPD Token &amp; Check Status
                </button>
                <button
                  type="button"
                  onClick={() => setActivePortal("staff-portal")}
                  className="text-left text-slate-300 hover:text-white hover:underline transition cursor-pointer"
                >
                  › Medical Officer Clinical Workstation
                </button>
                <button
                  type="button"
                  onClick={() => setActivePortal("hospital-portal")}
                  className="text-left text-slate-300 hover:text-white hover:underline transition cursor-pointer"
                >
                  › Hospital Administration &amp; QR Standees
                </button>
                <button
                  type="button"
                  onClick={() => setActivePortal("master-portal")}
                  className="text-left text-amber-400 hover:text-amber-300 hover:underline font-bold transition cursor-pointer"
                >
                  🔐 Nodal Master Governance Desk (2FA)
                </button>
              </div>
            </div>
          </div>

          {/* Lower Footer: Mandatory Government Disclaimers & Copyright */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 pt-1">
            <div className="space-y-1">
              <p>
                Website Content Owned &amp; Managed by <strong>Department of Health &amp; Family Welfare, Government of Odisha &amp; National Health Mission</strong>.
              </p>
              <p>
                Guidelines for Indian Government Websites (GIGW) Compliant • Best viewed in Chrome, Edge, Firefox at 1024x768 resolution and above.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span>Last Updated: <strong>28-09-2026</strong></span>
              <span>•</span>
              <span>Version: <strong>2.4.0 (Govt. Release)</strong></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
