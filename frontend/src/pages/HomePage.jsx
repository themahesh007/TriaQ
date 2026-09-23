import React from "react";
import {
  IconHospital,
  IconClinic,
  IconDoctor,
  IconNurse,
  IconPatient,
  IconQRCode,
  IconShield,
  IconClipboard,
  IconCheckCircle,
  IconArrowRight
} from "../components/Icons";

export default function HomePage({ onNavigate }) {
  return (
    <div className="max-w-[1180px] mx-auto px-4 py-8 md:py-14 space-y-12">
      {/* Top Clinical Header */}
      <div className="text-center space-y-3.5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11.5px] font-black tracking-wider uppercase shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Clinical Triage Platform • AI & Human In The Loop
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
          Welcome to <span className="text-emerald-700">TriaQ</span>
        </h1>
        <p className="text-sm md:text-base text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
          Intelligent non-diagnostic symptom intake, sequential OPD tokens, and clinical prioritization for Primary Health Centers (PHCs), multi-specialty hospitals & rural clinics.
        </p>
      </div>

      {/* 3-Tier Portal Entry Cards with Tactile Physics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Patient Portal Card */}
        <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500/80 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
          
          <div className="space-y-3 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <IconPatient className="w-6 h-6" />
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
              Check in with Phone OTP or Email, describe your symptoms, select your clinic or scan reception QR, and receive your <strong>sequential OPD Token</strong> instantly.
            </p>
            <ul className="text-[12px] text-slate-500 space-y-1.5 font-medium pt-1">
              <li className="flex items-center gap-2">
                <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Sequential token (TOKEN NUMBER 01, 02)</span>
              </li>
              <li className="flex items-center gap-2">
                <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Facility QR code direct check-in</span>
              </li>
              <li className="flex items-center gap-2">
                <IconCheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Multilingual & voice intake (3G optimized)</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 relative z-10 space-y-2">
            <button
              type="button"
              onClick={() => onNavigate("patient-portal")}
              className="btn-tactile w-full py-3.5 px-4 rounded-xl font-black text-[14px] text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Book OPD Token →</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 font-medium">
              Check in online or scan at reception
            </p>
          </div>
        </div>

        {/* 2. Staff Portal Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group hover:-translate-y-1">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <IconDoctor className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Doctor & Nurse Desk
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                Staff Station
              </h2>
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
              Clinical triage review station for <strong>certified Doctors and Staff Nurses</strong>. View priority queue, approve/reject tokens with tactile physics, and manual advance.
            </p>
            <ul className="text-[12px] text-slate-500 space-y-1.5 font-medium pt-1">
              <li className="flex items-center gap-2">
                <IconCheckCircle className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span>Tactile Approve / Reject controls</span>
              </li>
              <li className="flex items-center gap-2">
                <IconCheckCircle className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span>Card pop-out & glide-in next token advance</span>
              </li>
              <li className="flex items-center gap-2">
                <IconCheckCircle className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span>Synthesized chime & token voice caller</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => onNavigate("staff-portal")}
              className="btn-tactile w-full py-3.5 px-4 rounded-xl font-black text-[14px] text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Staff Login Desk →</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 font-medium">
              Medical credentials required
            </p>
          </div>
        </div>

        {/* 3. Hospital & Clinic Admin Portal Card */}
        <div className="bg-white rounded-2xl p-6 border-2 border-teal-500/70 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-5 relative overflow-hidden group hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
          
          <div className="space-y-3 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
              <IconHospital className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-teal-700">
                Facility Governance
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                Hospital Portal
              </h2>
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
              Dedicated admin station for <strong>Hospitals & Clinics</strong>. Generate reception QR standees, add Doctors & Nurses to your roster, and monitor live tokens.
            </p>
            <ul className="text-[12px] text-slate-500 space-y-1.5 font-medium pt-1">
              <li className="flex items-center gap-2">
                <IconCheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Printable reception QR code standees</span>
              </li>
              <li className="flex items-center gap-2">
                <IconCheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Onboard and manage Doctors & Nurses</span>
              </li>
              <li className="flex items-center gap-2">
                <IconCheckCircle className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Live facility queue tracking</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 relative z-10 space-y-2">
            <button
              type="button"
              onClick={() => onNavigate("hospital-portal")}
              className="btn-tactile w-full py-3.5 px-4 rounded-xl font-black text-[14px] text-white bg-teal-700 hover:bg-teal-800 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Hospital Admin Login →</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 font-medium">
              Manage facility QR & medical roster
            </p>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white/70 shadow-2xs text-center space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <IconCheckCircle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-[13.5px] text-slate-900">Slow 3G/4G Optimized</h3>
          <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed">
            Ultra-lightweight bundle with zero lag on low bandwidth. Works seamlessly across rural clinics and PHCs.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/80 bg-white/70 shadow-2xs text-center space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-800 flex items-center justify-center mx-auto">
            <IconShield className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-[13.5px] text-slate-900">Encrypted PII at Rest</h3>
          <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed">
            AES-256 protected patient demographics and clinical records. Decrypted only for authorized physicians.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/80 bg-white/70 shadow-2xs text-center space-y-1.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
            <IconClipboard className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-[13.5px] text-slate-900">Live Sequential Tokens</h3>
          <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed">
            Shared counter ensuring walk-ins scanning the QR standee and remote online bookings never duplicate token numbers.
          </p>
        </div>
      </div>

      {/* Footer System Admin Link */}
      <div className="text-center pt-6 border-t border-slate-200/80">
        <button
          type="button"
          onClick={() => onNavigate("master-portal")}
          className="btn-tactile text-[12px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer inline-flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-2xs"
        >
          <IconShield className="w-3.5 h-3.5 text-rose-700" />
          <span>System Admin & Governance Center (2FA Required)</span>
        </button>
      </div>
    </div>
  );
}
