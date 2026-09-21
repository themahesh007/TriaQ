import React from "react";

export default function Navbar({ activePortal, setActivePortal, pendingCount = 0 }) {
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-30 shadow-xs transition-all">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div
          onClick={() => setActivePortal("home")}
          className="flex items-center gap-3 cursor-pointer group"
          title="Back to TriaQ Home"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 flex items-center justify-center font-black text-white text-[14px] shadow-sm ring-2 ring-emerald-500/20 group-hover:scale-105 transition-transform">
            TQ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[20px] font-black tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                TriaQ
              </span>
              <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 tracking-wider">
                3-TIER CLINICAL
              </span>
            </div>
            <p className="text-[11.5px] font-medium text-slate-500">
              Healthcare Triage & Patient Token Platform
            </p>
          </div>
        </div>

        {/* 3-Tier Navigation Pills */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setActivePortal("home")}
            className={`px-3 py-1.5 rounded-lg font-bold text-[12.5px] transition-all cursor-pointer flex items-center gap-1.5 ${
              activePortal === "home"
                ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🏠</span>
            <span className="hidden sm:inline">Home</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortal("intake")}
            className={`px-3 py-1.5 rounded-lg font-bold text-[12.5px] transition-all cursor-pointer flex items-center gap-1.5 ${
              activePortal === "intake"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-emerald-800 hover:bg-emerald-50"
            }`}
            title="Full Patient Intake with Additional Questions & Declaration Form"
          >
            <span>📋</span>
            <span>Patient Intake</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortal("patient-portal")}
            className={`px-3 py-1.5 rounded-lg font-bold text-[12.5px] transition-all cursor-pointer flex items-center gap-1.5 ${
              activePortal === "patient-portal"
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📱</span>
            <span className="hidden md:inline">Patient</span> Portal
          </button>

          <button
            type="button"
            onClick={() => setActivePortal("staff-portal")}
            className={`px-3 py-1.5 rounded-lg font-bold text-[12.5px] transition-all cursor-pointer flex items-center gap-1.5 ${
              activePortal === "staff-portal"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>👨‍⚕️</span>
            <span>Staff Desk</span>
            {pendingCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black text-white bg-rose-600 animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActivePortal("master-portal")}
            className={`px-3 py-1.5 rounded-lg font-bold text-[12.5px] transition-all cursor-pointer flex items-center gap-1.5 ${
              activePortal === "master-portal"
                ? "bg-rose-800 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="System Admin & Governance"
          >
            <span>🔐</span>
            <span className="hidden md:inline">Master</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
