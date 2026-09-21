import React from "react";

export default function HomePage({ onNavigate }) {
  return (
    <div className="max-w-[1000px] mx-auto px-4 py-8 md:py-16 space-y-10">
      {/* Top Clinical Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11.5px] font-black tracking-wider uppercase shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Clinical Triage Platform • AI & Human In The Loop
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          Welcome to <span className="text-emerald-700">TriaQ</span>
        </h1>
        <p className="text-sm md:text-base text-slate-600 font-medium max-w-xl mx-auto leading-relaxed">
          Intelligent non-diagnostic symptom intake, clinical prioritization, and doctor review for Primary Health Centers (PHCs) & rural clinics across India.
        </p>
      </div>

      {/* 3-Tier Entry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Patient Portal Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-emerald-500 shadow-md hover:shadow-lg transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-50 rounded-bl-full -z-0 pointer-events-none group-hover:scale-110 transition-transform"></div>
          <div className="space-y-3 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-2xl shadow-sm">
              🩺
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                Public & OPD Intake
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                I'm a Patient
              </h2>
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
              Check in with Phone OTP or Email, record symptoms via text or voice, and receive your official <strong>PDF Token Receipt</strong> instantly.
            </p>
            <ul className="text-[12px] text-slate-500 space-y-1 font-medium pt-1">
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Ultra-lightweight (works on slow 3G)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Multilingual voice symptom intake
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-600 font-bold">✓</span> Downloadable PDF token pass
              </li>
            </ul>
          </div>

          <div className="pt-2 relative z-10">
            <button
              type="button"
              onClick={() => onNavigate("patient-portal")}
              className="w-full py-3.5 px-6 rounded-xl font-black text-[14.5px] text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-sm hover:shadow transition-all cursor-pointer text-center active:scale-98 flex items-center justify-center gap-2"
            >
              <span>🔐</span>
              <span>Login to Patient Portal & Book Token →</span>
            </button>
            <p className="text-[11.5px] text-center text-slate-400 mt-2 font-medium">
              Mandatory Phone OTP or Email login required before clinical intake
            </p>
          </div>
        </div>

        {/* Staff Portal Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6 relative overflow-hidden group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center text-2xl shadow-sm">
              👨‍⚕️
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Hospital Clinical Desk
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                I'm Staff
              </h2>
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
              Authorized clinical workstation for <strong>Doctors, Nurses & Facility Admins</strong>. Priority queue review, voice caller, and audit trails.
            </p>
            <ul className="text-[12px] text-slate-500 space-y-1 font-medium pt-1">
              <li className="flex items-center gap-1.5">
                <span className="text-slate-700 font-bold">✓</span> Role-Based Access (Doctor, Nurse, Admin)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-slate-700 font-bold">✓</span> Encrypted PII protection & review
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-slate-700 font-bold">✓</span> Queue announcer & CSV registry export
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("staff-portal")}
            className="w-full py-3.5 px-6 rounded-xl font-black text-[14.5px] text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer text-center active:scale-98"
          >
            Staff Login Desk →
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-4">
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white/70 shadow-2xs text-center space-y-1">
          <span className="text-2xl block mb-1">⚡</span>
          <h3 className="font-bold text-[13.5px] text-slate-900">Slow 3G/4G Optimized</h3>
          <p className="text-[11.5px] text-slate-500 font-medium">Under 100 kB bundle, zero heavy trackers, loads instantly in rural PHCs.</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white/70 shadow-2xs text-center space-y-1">
          <span className="text-2xl block mb-1">🔒</span>
          <h3 className="font-bold text-[13.5px] text-slate-900">Encrypted PII at Rest</h3>
          <p className="text-[11.5px] text-slate-500 font-medium">AES-256 protected patient demographics. Decrypted only for doctors.</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white/70 shadow-2xs text-center space-y-1">
          <span className="text-2xl block mb-1">📋</span>
          <h3 className="font-bold text-[13.5px] text-slate-900">Tamper-Evident Audit Log</h3>
          <p className="text-[11.5px] text-slate-500 font-medium">Every action logged permanently with timestamp, reviewer ID, and IP address.</p>
        </div>
      </div>

      {/* Footer System Admin Link */}
      <div className="text-center pt-8 border-t border-slate-200/80">
        <button
          type="button"
          onClick={() => onNavigate("master-portal")}
          className="text-[12px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer flex items-center gap-1.5 mx-auto"
        >
          <span>🔐</span>
          <span>System Admin & Governance Center (2FA Required)</span>
        </button>
      </div>
    </div>
  );
}
