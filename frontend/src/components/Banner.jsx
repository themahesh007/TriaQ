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
          {/* Left: Official Government of India / State attribution in chosen language */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <IconIndianFlag className="w-4 h-3 shrink-0 shadow-2xs" />
            <span className="font-bold text-amber-300">
              {language === "hi" ? "भारत सरकार" : language === "or" ? "ଭାରତ ସରକାର" : "Government of India"}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-200">
              {language === "hi" 
                ? "स्वास्थ्य एवं परिवार कल्याण विभाग, ओडिशा"
                : language === "or"
                ? "ସ୍ୱାସ୍ଥ୍ୟ ଏବଂ ପରିବାର କଲ୍ୟାଣ ବିଭାଗ, ଓଡ଼ିଶା"
                : "Department of Health & Family Welfare, Govt. of Odisha"}
            </span>
          </div>

          {/* Right: Helpline & Accessibility standard controls */}
          <div className="flex items-center gap-3 ml-auto text-[11px]">
            <div className="flex items-center gap-1.5 bg-[#133B5C] px-2.5 py-0.5 rounded text-amber-200 font-bold border border-blue-900/50">
              <span>📞</span>
              <span>
                {language === "hi" ? "हेल्पलाइन: " : language === "or" ? "ହେଲ୍ପଲାଇନ୍: " : "Helpline: "}
                <span className="text-white underline">104</span> / <span className="text-white underline">1075</span> (Toll Free)
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1 border-l border-slate-700 pl-2.5 text-slate-300">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Text:</span>
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
