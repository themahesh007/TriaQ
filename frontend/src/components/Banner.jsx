import React, { useState } from "react";
import { IconIndianFlag } from "./Icons";

export default function Banner({ language = "en" }) {
  const [fontSizeOffset, setFontSizeOffset] = useState(0);

  const handleFontSize = (delta) => {
    const next = Math.max(-2, Math.min(2, fontSizeOffset + delta));
    setFontSizeOffset(next);
    document.documentElement.style.fontSize = next === 0 ? "100%" : next > 0 ? "108%" : "94%";
  };

  return (
    <div className="w-full no-print">
      {/* 1. National Tricolor Slim Line */}
      <div className="govt-tricolor-line"></div>

      {/* 2. Top Government Administration & Accessibility Ribbon */}
      <div className="bg-[#0B2545] text-white border-b border-[#133B5C] text-[11px] sm:text-[11.5px] py-1.5 px-3 sm:px-6">
        <div className="max-w-[1240px] mx-auto flex flex-wrap items-center justify-between gap-2 font-medium">
          {/* Left: Platform attribution in chosen language */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-amber-300">
              {language === "hi" ? "ट्रायैक स्वास्थ्य सेवा" : language === "or" ? "ଟ୍ରାୟାକ୍ ସ୍ୱାସ୍ଥ୍ୟ ସେବା" : "TriaQ Healthcare Platform"}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-200">
              {language === "hi" 
                ? "एकीकृत क्लिनिकल ट्राइएज एवं ओपीडी प्रबंधन"
                : language === "or"
                ? "ଏକୀକୃତ କ୍ଲିନିକାଲ୍ ଟ୍ରାଇଏଜ୍ ଓ ଓପିଡି ପରିଚାଳନା"
                : "Integrated Clinical Triage & Outpatient Management"}
            </span>
          </div>

          {/* Right: Helpline & Accessibility standard controls */}
          <div className="flex items-center gap-3 ml-auto text-[11px]">
            <div className="flex items-center gap-1.5 bg-[#133B5C] px-2.5 py-0.5 rounded text-amber-200 font-bold border border-blue-900/50">
              <svg className="w-3.5 h-3.5 inline text-amber-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>
                {language === "hi" ? "हेल्पलाइन: " : language === "or" ? "ହେଲ୍ପଲାଇନ୍: " : "Helpline: "}
                <span className="text-white underline">104</span> / <span className="text-white underline">1075</span> (Toll Free)
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1 border-l border-slate-700 pl-2.5 text-slate-300">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                {language === "hi" ? "अक्षर आकार:" : language === "or" ? "ଅକ୍ଷର ଆକାର:" : "Text:"}
              </span>
              <button
                type="button"
                onClick={() => handleFontSize(-1)}
                className="px-1.5 py-0.2 rounded hover:bg-slate-800 text-[11px] font-bold cursor-pointer"
                title="Decrease font size"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => handleFontSize(0)}
                className="px-1.5 py-0.2 rounded hover:bg-slate-800 text-[11px] font-bold cursor-pointer"
                title="Normal font size"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => handleFontSize(1)}
                className="px-1.5 py-0.2 rounded hover:bg-slate-800 text-[11px] font-bold cursor-pointer"
                title="Increase font size"
              >
                A+
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Clinical Safety & Emergency Advisory Bar */}
      <div className="bg-[#FFFBEB] border-b border-[#FDE68A] text-[#92400E] text-[11.5px] py-1.5 px-4 text-center font-medium shadow-2xs flex items-center justify-center gap-2">
        <span className="font-bold text-[#B45309] bg-[#FEF3C7] border border-[#FCD34D] px-2 py-0.2 rounded text-[10.5px] uppercase tracking-wider">
          {language === "hi" ? "आपातकालीन सूचना" : language === "or" ? "ଜରୁରୀକାଳୀନ ସୂଚନା" : "Clinical Care Advisory"}
        </span>
        <span className="text-slate-800">
          {language === "hi"
            ? "ट्राइएज प्राथमिकताएं वाइटल साइन्स एवं लक्षणों के आधार पर निर्धारित की जाती हैं। तीव्र छाती दर्द या गंभीर आघात के लिए तुरंत आपातकालीन वार्ड में रिपोर्ट करें।"
            : language === "or"
            ? "ଲକ୍ଷଣ ଓ ଭାଇଟାଲ୍ ସାଇନ୍ ଆଧାରରେ ଟ୍ରାଇଏଜ୍ ପ୍ରାଥମିକତା ନିର୍ଦ୍ଧାରଣ କରାଯାଏ। ତୀବ୍ର ଛାତି ଯନ୍ତ୍ରଣା କିମ୍ବା ଆଘାତ ଥିଲେ ତୁରନ୍ତ ଜରୁରୀକାଳୀନ ୱାର୍ଡ଼କୁ ଯାଆନ୍ତୁ।"
            : "Triage priorities are assigned based on reported vital signs and clinical urgency. For acute trauma, chest pain, or poisoning, report immediately to the nearest Emergency Casualty Ward."}
        </span>
      </div>
    </div>
  );
}
