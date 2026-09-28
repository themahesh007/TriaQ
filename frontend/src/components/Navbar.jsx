import React from "react";
import {
  IconHome,
  IconPatient,
  IconDoctor,
  IconHospital,
  IconShield,
  IconGovtEmblem
} from "./Icons";

export default function Navbar({ activePortal, setActivePortal, pendingCount = 0, language = "en", onOpenLanguageModal }) {
  return (
    <header className="w-full bg-white border-b border-slate-300 shadow-xs sticky top-0 z-30 no-print">
      {/* 1. Official Government Header Tier */}
      <div className="max-w-[1240px] mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        {/* Emblem & Official Portal Identity */}
        <div
          onClick={() => setActivePortal("home")}
          className="flex items-center gap-3 cursor-pointer select-none group"
          title="TriaQ Portal - Home"
        >
          <div className="text-slate-800 shrink-0">
            <IconGovtEmblem className="w-10 h-10 text-[#003366] hover:text-[#0B2545] transition-colors" />
          </div>
          <div className="border-l border-slate-300 pl-3">
            <div className="flex items-center gap-2">
              <span className="text-[17px] sm:text-[19px] font-black tracking-tight text-[#003366] uppercase">
                TriaQ • National Health Portal
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-wider">
                ABDM Compliant
              </span>
            </div>
            <p className="text-[11.5px] font-semibold text-slate-600">
              {language === "hi" 
                ? "एकीकृत बाह्यरोगी (OPD) ट्राइएज एवं टोकन प्रणाली • स्वास्थ्य एवं परिवार कल्याण विभाग"
                : language === "or"
                ? "ଏକୀକୃତ ବାହ୍ୟରୋଗୀ (OPD) ଟ୍ରାଇଏଜ୍ ଓ ଟୋକନ୍ ବ୍ୟବସ୍ଥା • ସ୍ୱାସ୍ଥ୍ୟ ଏବଂ ପରିବାର କଲ୍ୟାଣ ବିଭାଗ"
                : "Integrated Outpatient (OPD) Triage & Token Platform • Department of Health & Family Welfare"}
            </p>
          </div>
        </div>

        {/* Right Badges & Multilingual Switcher */}
        <div className="flex items-center gap-3 ml-auto">
          <div className="hidden lg:flex flex-col text-right text-[11px] font-medium text-slate-500 border-r border-slate-200 pr-3">
            <span className="font-bold text-slate-800">Government Health Facility Network</span>
            <span>Odisha State &amp; National Public Health</span>
          </div>

          {/* Multilingual Selector */}
          {onOpenLanguageModal && (
            <button
              type="button"
              onClick={onOpenLanguageModal}
              className="text-[12px] font-bold text-[#003366] bg-slate-50 hover:bg-[#EBF3FA] border border-[#003366]/30 px-3 py-1.5 rounded transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Change Portal Language"
            >
              <span className="text-sm">🌐</span>
              <span className="font-extrabold text-slate-900">
                {language === "or" ? "ଓଡ଼ିଆ" : language === "hi" ? "हिन्दी" : "English"}
              </span>
              <span className="text-[9px] text-slate-500">▼</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Official NIC Deep Navy Navigation Ribbon */}
      <div className="bg-[#003366] border-t border-b border-[#0B2545] text-white">
        <div className="max-w-[1240px] mx-auto px-2 sm:px-4 flex items-center justify-between overflow-x-auto">
          <nav className="flex items-center space-x-1 sm:space-x-2 py-1 flex-nowrap shrink-0">
            <button
              type="button"
              onClick={() => setActivePortal("home")}
              className={`px-3 py-2 text-[12.5px] font-bold transition-all flex items-center gap-1.5 rounded-t-md whitespace-nowrap cursor-pointer ${
                activePortal === "home"
                  ? "bg-white text-[#003366] border-b-2 border-amber-500 shadow-sm"
                  : "text-slate-100 hover:bg-[#0B2545] hover:text-white"
              }`}
            >
              <IconHome className="w-3.5 h-3.5" />
              <span>{language === "hi" ? "मुख्य पृष्ठ" : language === "or" ? "ମୁଖ୍ୟ ପୃଷ୍ଠା" : "Home"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePortal("patient-portal")}
              className={`px-3 py-2 text-[12.5px] font-bold transition-all flex items-center gap-1.5 rounded-t-md whitespace-nowrap cursor-pointer ${
                activePortal === "patient-portal"
                  ? "bg-white text-[#003366] border-b-2 border-amber-500 shadow-sm"
                  : "text-slate-100 hover:bg-[#0B2545] hover:text-white"
              }`}
              title="Citizen / Patient OPD Token Booking Desk"
            >
              <IconPatient className="w-3.5 h-3.5" />
              <span>{language === "hi" ? "नागरिक सेवा" : language === "or" ? "ନାଗରିକ ସେବା" : "Patient Portal"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePortal("staff-portal")}
              className={`px-3 py-2 text-[12.5px] font-bold transition-all flex items-center gap-1.5 rounded-t-md whitespace-nowrap cursor-pointer ${
                activePortal === "staff-portal"
                  ? "bg-white text-[#003366] border-b-2 border-amber-500 shadow-sm"
                  : "text-slate-100 hover:bg-[#0B2545] hover:text-white"
              }`}
              title="Medical Officer & Clinical Queue Workstation"
            >
              <IconDoctor className="w-3.5 h-3.5" />
              <span>{language === "hi" ? "चिकित्सा अधिकारी" : language === "or" ? "ଚିକିତ୍ସା ଅଧିକାରୀ" : "Staff Desk"}</span>
              {pendingCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black text-white bg-red-600 animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActivePortal("hospital-portal")}
              className={`px-3 py-2 text-[12.5px] font-bold transition-all flex items-center gap-1.5 rounded-t-md whitespace-nowrap cursor-pointer ${
                activePortal === "hospital-portal"
                  ? "bg-white text-[#003366] border-b-2 border-amber-500 shadow-sm"
                  : "text-slate-100 hover:bg-[#0B2545] hover:text-white"
              }`}
              title="Hospital Administration & Registry Desk"
            >
              <IconHospital className="w-3.5 h-3.5" />
              <span>{language === "hi" ? "अस्पताल प्रशासन" : language === "or" ? "ହସ୍ପିଟାଲ ପ୍ରଶାସନ" : "Hospital Portal"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePortal("master-portal")}
              className={`px-3 py-2 text-[12.5px] font-bold transition-all flex items-center gap-1.5 rounded-t-md whitespace-nowrap cursor-pointer ${
                activePortal === "master-portal"
                  ? "bg-white text-[#003366] border-b-2 border-amber-500 shadow-sm"
                  : "text-slate-100 hover:bg-[#0B2545] hover:text-white"
              }`}
              title="State / Nodal Central Governance"
            >
              <IconShield className="w-3.5 h-3.5" />
              <span>{language === "hi" ? "मुख्य नियंत्रक" : language === "or" ? "ମୁଖ୍ୟ ନିୟନ୍ତ୍ରକ" : "Master"}</span>
            </button>
          </nav>

          <div className="hidden md:flex items-center text-[11px] font-bold text-amber-300 pr-2">
            <span>● {language === "hi" ? "प्रणाली सक्रिय" : language === "or" ? "ପ୍ରଣାଳୀ ସକ୍ରିୟ" : "System Active"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
