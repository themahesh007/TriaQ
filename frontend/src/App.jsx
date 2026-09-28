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
        <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
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
      <Banner />

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
            <HospitalPortal onNavigateHome={() => setActivePortal("home")} />
          )}
          {activePortal === "staff-portal" && (
            <StaffPortal onNavigateHome={() => setActivePortal("home")} />
          )}
          {activePortal === "master-portal" && (
            <MasterPortal onNavigateHome={() => setActivePortal("home")} />
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

      {/* 4. Clinical Governance Footer */}
      <footer className="border-t border-slate-200/90 py-6 bg-white text-center text-[12px] text-slate-500 shadow-2xs">
        <div className="max-w-[1200px] mx-auto px-4 space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <p className="font-bold text-slate-800">
              TriaQ • 3-Tier Clinical Triage & Patient Token Platform
            </p>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => setActivePortal("master-portal")}
              className="text-[11.5px] font-bold text-slate-500 hover:text-rose-700 transition cursor-pointer"
            >
              🔐 System Admin (2FA)
            </button>
          </div>
          <p className="text-[11.5px] text-slate-400 max-w-xl mx-auto">
            Hospital Outpatient Information System • Clinical Triage & Queue Management • Built for Hospitals, Clinics & Primary Healthcare Centers
          </p>
        </div>
      </footer>
    </div>
  );
}
