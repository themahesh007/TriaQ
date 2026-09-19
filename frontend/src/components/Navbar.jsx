import React from "react";

export default function Navbar({ activeTab, setActiveTab, pendingCount = 0 }) {
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs transition-all">
      <div className="max-w-[1240px] mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 flex items-center justify-center font-black text-white text-[15px] shadow-sm ring-2 ring-emerald-500/20 tracking-tight">
            TQ
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[22px] font-black tracking-tight text-slate-900">
                TriaQ
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 tracking-wider">
                PUBLIC HEALTH
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                AI Triage Online
              </span>
            </div>
            <p className="text-[12px] font-medium text-slate-500">
              Human-in-the-Loop Clinical Triage Assistant
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("intake")}
            className={`px-4 py-2 rounded-lg font-bold text-[13.5px] transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "intake"
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <span>📋</span>
            <span>Patient Intake</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-lg font-bold text-[13.5px] flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <span>🩺</span>
            <span>Reviewer Dashboard</span>
            {pendingCount > 0 && (
              <span className="text-[11px] px-2 py-0.2 rounded-full font-black text-white bg-rose-600 shadow-xs animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
