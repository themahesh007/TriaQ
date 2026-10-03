import React from "react";
import { TRANSLATIONS, LANGUAGES } from "../utils/translations";
import {
  IconHospital,
  IconDoctor,
  IconPatient,
  IconShield,
  IconCheckCircle,
  IconGovtEmblem,
  IconIndianFlag,
  IconClipboard,
  IconCalendar
} from "../components/Icons";

export default function HomePage({ onNavigate, language = "en", onSelectLanguage, onOpenLanguageModal }) {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <div className="max-w-[1240px] mx-auto px-4 py-6 md:py-10 space-y-8">
      {/* 1. Official Public Health Announcement Ticker / Bulletin */}
      <div className="bg-[#FFF8E7] border-l-4 border-[#D97706] border-y border-r border-[#FDE68A] p-3 rounded-r-md shadow-2xs flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
        <div className="flex items-center gap-2 text-slate-900 font-medium">
          <span className="bg-[#D97706] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider shrink-0">
            {language === "hi" ? "विज्ञप्ति" : language === "or" ? "ବିଜ୍ଞପ୍ତି" : "NOTICE"}
          </span>
          <span className="font-semibold text-slate-800">
            {language === "or"
              ? "ଜାତୀୟ ସ୍ୱାସ୍ଥ୍ୟ ମିଶନ ଅଧୀନରେ ବାହ୍ୟରୋଗୀ ବିଭାଗ (OPD) ଡିଜିଟାଲ ଟୋକନ୍ ଓ ଟ୍ରାଏଜ୍ ସେବା ସମସ୍ତ ପଞ୍ଜୀକୃତ ହସ୍ପିଟାଲ ଏବଂ କ୍ଲିନିକ୍ ରେ ସକ୍ରିୟ ଅଛି।"
              : language === "hi"
              ? "राष्ट्रीय स्वास्थ्य मिशन के अंतर्गत बाह्यरोगी (OPD) डिजिटल टोकन एवं ट्राइएज सेवा सभी पंजीकृत स्वास्थ्य केंद्रों पर सक्रिय है।"
              : "Digital OPD Token Generation & Clinical Triage Service is active across all registered health centers and empanelled clinics."}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold ml-auto shrink-0">
          <span><IconCalendar className="w-3.5 h-3.5 inline mr-1 text-slate-500" /> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <span>•</span>
          <span className="text-[#003366]">
            {language === "hi" ? "पोर्टल संस्करण 2.4.0" : language === "or" ? "ପୋର୍ଟାଲ ସଂସ୍କରଣ ୨.୪.୦" : "Portal Version 2.4.0"}
          </span>
        </div>
      </div>

      {/* 2. Official Portal Hero Section */}
      <div className="govt-panel p-6 sm:p-8 bg-white border border-slate-300 rounded-md relative overflow-hidden">
        {/* Subtle Ashoka Emblem Watermark in top right */}
        <div className="absolute right-4 top-4 opacity-5 pointer-events-none hidden sm:block">
          <IconGovtEmblem className="w-48 h-48 text-[#003366]" />
        </div>

        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="flex items-center gap-2">
            <IconIndianFlag className="w-5 h-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#003366]">
              {language === "hi" 
                ? "स्वास्थ्य एवं परिवार कल्याण विभाग • ओडिशा सरकार" 
                : language === "or"
                ? "ସ୍ୱାସ୍ଥ୍ୟ ଏବଂ ପରିବାର କଲ୍ୟାଣ ବିଭାଗ • ଓଡ଼ିଶା ସରକାର"
                : "Department of Health & Family Welfare • Public Health &amp; Clinical Network"}
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-[15px] sm:text-[17px] font-bold text-slate-700">
              {language === "hi"
                ? "राष्ट्रीय बाह्यरोगी विभाग (OPD) डिजिटल टोकन एवं ट्राइएज प्रणाली"
                : language === "or"
                ? "ଜାତୀୟ ବାହ୍ୟରୋଗୀ ବିଭାଗ (OPD) ଡିଜିଟାଲ ଟୋକନ୍ ଓ ଟ୍ରାଏଜ୍ ବ୍ୟବସ୍ଥା"
                : "National Outpatient Department (OPD) Digital Token & Triage System"}
            </h2>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#003366] tracking-tight">
              TriaQ National Health Portal
            </h1>
          </div>

          <p className="text-[13.5px] text-slate-600 leading-relaxed font-normal text-justify sm:text-left">
            {t.homeHeroSubtitle ||
              "An institutional e-Governance platform for standardized outpatient intake, non-diagnostic algorithmic clinical triage, and sequential OPD token generation for Primary Health Centers (PHCs), Community Health Centers (CHCs), and empanelled medical clinics."}
          </p>

          {/* Multilingual Selector Ribbon */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-bold text-slate-700">
              {language === "hi" ? "भाषा का चयन करें:" : language === "or" ? "ଭାଷା ଚୟନ କରନ୍ତୁ:" : "Select Language:"}
            </span>
            <div className="inline-flex rounded-md border border-slate-300 bg-slate-50 p-0.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onSelectLanguage && onSelectLanguage(lang.code)}
                  className={`px-3 py-1 text-[12px] font-bold rounded transition cursor-pointer ${
                    language === lang.code
                      ? "bg-[#003366] text-white shadow-xs"
                      : "text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {lang.nativeName}
                </button>
              ))}
            </div>
            {onOpenLanguageModal && (
              <button
                type="button"
                onClick={onOpenLanguageModal}
                className="text-[11.5px] font-bold text-[#003366] underline hover:text-[#0B2545] cursor-pointer ml-1"
              >
                {language === "hi" ? "(अन्य विकल्प)" : language === "or" ? "(ଅନ୍ୟାନ୍ୟ ବିକଳ୍ପ)" : "(More Options)"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Official Public & Clinical Services Grid */}
      <div>
        <div className="border-b-2 border-[#003366] pb-2 mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-black uppercase text-[#003366] tracking-wide flex items-center gap-2">
            <span>️</span>
            <span>
              {language === "hi" 
                ? "पोर्टल सेवाएं एवं नागरिक डेस्क" 
                : language === "or" 
                ? "ପୋର୍ଟାଲ ସେବା ଓ ନାଗରିକ ଡେସ୍କ" 
                : "Digital Services & Public Portals"}
            </span>
          </h2>
          <span className="text-[11px] font-semibold text-slate-500">Official Access Desks</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Service 1: Citizen / Patient OPD Token */}
          <div className="govt-panel border border-slate-300 rounded-md flex flex-col justify-between hover:border-[#003366] transition-colors">
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  CODE: SRV-CITIZEN-01
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {language === "hi" ? "नागरिक सेवा" : language === "or" ? "ନାଗରିକ ସେବା" : "Citizen Desk"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#003366] text-white flex items-center justify-center shrink-0">
                  <IconPatient className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[16px] font-black text-slate-900 leading-tight">
                    {t.patientCardTitle || "Citizen OPD Token Booking"}
                  </h3>
                  <span className="text-[11.5px] font-medium text-slate-500">
                    {language === "hi" 
                      ? "रोगी पंजीकरण एवं डिजिटल टोकन" 
                      : language === "or" 
                      ? "ରୋଗୀ ପଞ୍ଜୀକରଣ ଓ ଡିଜିଟାଲ ଟୋକନ୍" 
                      : "Patient Registration & Digital Token"}
                  </span>
                </div>
              </div>

              <p className="text-[12.5px] text-slate-600 leading-relaxed">
                {t.patientCardDesc ||
                  "Check in with Indian mobile number or email, describe current symptoms in your native language, select your registered clinic, and receive your sequential OPD Token receipt."}
              </p>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11.5px] text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <IconCheckCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Sequential token format (TOKEN NUMBER 01, 02)</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <IconCheckCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Instant PDF receipt with QR validation</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <IconCheckCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Available in Odia, Hindi, and English</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => onNavigate("patient-portal")}
                className="btn-tactile w-full py-2.5 px-4 rounded font-bold text-[13px] text-white bg-[#003366] hover:bg-[#0B2545] border border-[#002244] text-center shadow-xs flex items-center justify-center gap-2"
              >
                <span>
                  {t.bookOpdTokenBtn || 
                    (language === "hi" 
                      ? "नागरिक पोर्टल में प्रवेश करें →" 
                      : language === "or" 
                      ? "ନାଗରିକ ପୋର୍ଟାଲରେ ପ୍ରବେଶ କରନ୍ତୁ →" 
                      : "Access Citizen Portal →")}
                </span>
              </button>
            </div>
          </div>

          {/* Service 2: Medical Officer / Staff Desk */}
          <div className="govt-panel border border-slate-300 rounded-md flex flex-col justify-between hover:border-[#003366] transition-colors">
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  CODE: SRV-CLINICAL-02
                </span>
                <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {language === "hi" ? "चिकित्सा डेस्क" : language === "or" ? "ଚିକିତ୍ସା ଡେସ୍କ" : "Clinical Workstation"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#133B5C] text-white flex items-center justify-center shrink-0">
                  <IconDoctor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[16px] font-black text-slate-900 leading-tight">
                    Medical Officer Workstation
                  </h3>
                  <span className="text-[11.5px] font-medium text-slate-500">
                    {language === "hi" 
                      ? "डॉक्टर एवं नर्सिंग स्टाफ कंसोल" 
                      : language === "or" 
                      ? "ଡାକ୍ତର ଓ ନର୍ସିଂ ଷ୍ଟାଫ୍ କନସୋଲ୍" 
                      : "Doctor & Nursing Staff Console"}
                  </span>
                </div>
              </div>

              <p className="text-[12.5px] text-slate-600 leading-relaxed">
                Authorized clinical console for duty physicians and nursing officers. Manage prioritized patient triage queues, inspect vitals, and issue clinical disposition.
              </p>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11.5px] text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <IconCheckCircle className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>Real-time hospital workstation selector</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <IconCheckCircle className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>Official Inter-Hospital Referral Pass generation</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <IconCheckCircle className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>Audited electronic clinical review log</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => onNavigate("staff-portal")}
                className="btn-tactile w-full py-2.5 px-4 rounded font-bold text-[13px] text-white bg-[#133B5C] hover:bg-[#0B2545] border border-blue-900 text-center shadow-xs flex items-center justify-center gap-2"
              >
                <span>
                  {language === "hi" 
                    ? "स्टाफ डेस्क लॉगिन →" 
                    : language === "or" 
                    ? "ଷ୍ଟାଫ୍ ଡେସ୍କ ଲଗଇନ୍ →" 
                    : "Staff Desk Login →"}
                </span>
              </button>
            </div>
          </div>

          {/* Service 3: Hospital & Clinic Administration */}
          <div className="govt-panel border border-slate-300 rounded-md flex flex-col justify-between hover:border-[#003366] transition-colors">
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  CODE: SRV-FACILITY-03
                </span>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {language === "hi" ? "संस्थान प्रशासन" : language === "or" ? "ଅନୁଷ୍ଠାନ ପ୍ରଶାସନ" : "Facility Administration"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-[#D97706] text-white flex items-center justify-center shrink-0">
                  <IconHospital className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[16px] font-black text-slate-900 leading-tight">
                    Health Facility Registry
                  </h3>
                  <span className="text-[11.5px] font-medium text-slate-500">
                    {language === "hi" 
                      ? "अस्पताल एवं क्लिनिक प्रशासन" 
                      : language === "or" 
                      ? "ଡାକ୍ତରଖାନା ଓ କ୍ଲିନିକ୍ ପ୍ରଶାସନ" 
                      : "Hospital & Clinic Administration"}
                  </span>
                </div>
              </div>

              <p className="text-[12.5px] text-slate-600 leading-relaxed">
                Health facility administrative desk for verified clinics and hospitals. Generate standardized printable reception QR standees and manage medical officer accounts.
              </p>

              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11.5px] text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <IconCheckCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Download official Reception QR Standee PDF</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <IconCheckCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Hospital Doctor &amp; Nurse staff roster</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <IconCheckCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Standardized HFR health facility verification</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => onNavigate("hospital-portal")}
                className="btn-tactile w-full py-2.5 px-4 rounded font-bold text-[13px] text-white bg-[#D97706] hover:bg-[#B45309] border border-amber-700 text-center shadow-xs flex items-center justify-center gap-2"
              >
                <span>
                  {language === "hi" 
                    ? "अस्पताल पोर्टल लॉगिन →" 
                    : language === "or" 
                    ? "ହସ୍ପିଟାଲ୍ ଆଡମିନ୍ ଲଗଇନ୍ →" 
                    : "Hospital Admin Login →"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. National Health Statistics & Infrastructure Indicators */}
      <div className="govt-panel p-5 bg-white border border-slate-300 rounded-md space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="text-[13px] font-black uppercase tracking-wider text-slate-800">
             {language === "hi" 
              ? "प्रमुख राष्ट्रीय स्वास्थ्य संकेतक" 
              : language === "or" 
              ? "ପ୍ରମୁଖ ଜାତୀୟ ସ୍ୱାସ୍ଥ୍ୟ ସୂଚକାଙ୍କ" 
              : "Key Operational Infrastructure"}
          </h3>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Live Central Telemetry
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="block text-[11px] font-bold text-slate-500 uppercase">Registered Facilities</span>
            <span className="text-xl sm:text-2xl font-black text-[#003366]">Verified Network</span>
            <span className="block text-[10.5px] text-slate-500 mt-0.5">District Hospitals, CHCs &amp; PHCs</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="block text-[11px] font-bold text-slate-500 uppercase">Token Architecture</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700">Sequential</span>
            <span className="block text-[10.5px] text-slate-500 mt-0.5">Zero Duplicate Counter</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="block text-[11px] font-bold text-slate-500 uppercase">Standards Compliance</span>
            <span className="text-xl sm:text-2xl font-black text-blue-900">Clinical &amp; Health Protocols</span>
            <span className="block text-[10.5px] text-slate-500 mt-0.5">National Health Guidelines</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="block text-[11px] font-bold text-slate-500 uppercase">Emergency Protocol</span>
            <span className="text-xl sm:text-2xl font-black text-rose-700">Priority Triage</span>
            <span className="block text-[10.5px] text-slate-500 mt-0.5">Immediate Red/Amber Tagging</span>
          </div>
        </div>
      </div>

      {/* 5. Official Circulars & Public Guidance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12.5px]">
        <div className="govt-panel p-4 border border-slate-300 rounded-md space-y-2">
          <h4 className="font-bold text-[#003366] uppercase text-[12px] border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
            <IconClipboard className="w-4 h-4 inline text-[#003366]" />
            <span>
              {language === "hi" 
                ? "नागरिक मार्गदर्शन" 
                : language === "or" 
                ? "ନାଗରିକ ମାର୍ଗଦର୍ଶିକା" 
                : "Citizen Guidelines"}
            </span>
          </h4>
          <ul className="space-y-1.5 text-slate-600">
            <li className="flex items-start gap-1.5">
              <span className="text-[#003366] font-bold">1.</span>
              <span>Keep your registered Indian 10-digit mobile number ready for instant OTP authentication.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-[#003366] font-bold">2.</span>
              <span>If you are at the clinic premises, you can scan the reception QR standee to automatically lock into the clinic desk.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-[#003366] font-bold">3.</span>
              <span>Your OPD token number is sequential and verified. Present the digital or printed slip when your token is called.</span>
            </li>
          </ul>
        </div>

        <div className="govt-panel p-4 border border-slate-300 rounded-md space-y-2">
          <h4 className="font-bold text-[#003366] uppercase text-[12px] border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
            <IconShield className="w-4 h-4 inline text-[#003366]" />
            <span>
              {language === "hi" 
                ? "सुरक्षा एवं डेटा नीतियां" 
                : language === "or" 
                ? "ସୁରକ୍ଷା ଓ ତଥ୍ୟ ନୀତି" 
                : "Data Privacy & Clinical Security Standards"}
            </span>
          </h4>
          <ul className="space-y-1.5 text-slate-600">
            <li className="flex items-start gap-1.5">
              <span className="text-[#003366] font-bold">1.</span>
              <span>All patient Personally Identifiable Information (PII) is encrypted at rest using AES-256 protocols.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-[#003366] font-bold">2.</span>
              <span>Clinical review actions are permanently logged in the departmental audit registry for medico-legal governance.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-[#003366] font-bold">3.</span>
              <span>Inter-hospital referrals generate cryptographically signed transfer slips for tertiary care center handover.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 6. Nodal Master Governance Quick Access */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={() => onNavigate("master-portal")}
          className="text-[12px] font-bold text-slate-600 hover:text-[#003366] hover:underline transition cursor-pointer inline-flex items-center gap-1.5"
        >
          <IconShield className="w-3.5 h-3.5 text-rose-800" />
          <span>
            {language === "hi" 
              ? "केंद्रीय नोडल व्यवस्थापक पोर्टल (2FA आवश्यक)" 
              : language === "or" 
              ? "କେନ୍ଦ୍ରୀୟ ନୋଡାଲ୍ ମାଷ୍ଟର ପୋର୍ଟାଲ୍ (2FA ଆବଶ୍ୟକ)" 
              : "Nodal Master Governance Control Desk (2FA Required)"}
          </span>
        </button>
      </div>
    </div>
  );
}
