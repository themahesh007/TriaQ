import React, { useState, useEffect, useCallback } from "react";
import Banner from "./components/Banner";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import IntakePage from "./pages/IntakePage";
import PatientPortal from "./pages/PatientPortal";
import StaffPortal from "./pages/StaffPortal";
import HospitalPortal from "./pages/HospitalPortal";
import MasterPortal from "./pages/MasterPortal";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

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

      {/* 2. Upgraded Multi-Tier Navbar */}
      <Navbar
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        pendingCount={pendingCount}
      />

      {/* 3. Main Multi-Portal Content */}
      <main className="flex-1 w-full pb-14">
        {activePortal === "home" && <HomePage onNavigate={setActivePortal} />}
        {activePortal === "intake" && (
          <IntakePage onNavigateHome={() => setActivePortal("home")} />
        )}
        {activePortal === "patient-portal" && (
          <PatientPortal
            onNavigateHome={() => setActivePortal("home")}
            onNavigateToIntake={() => setActivePortal("intake")}
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
