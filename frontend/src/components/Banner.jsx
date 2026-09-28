import React, { useState } from "react";
import { IconIndianFlag } from "./Icons";

export default function Banner() {
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
          {/* Left: Official Government of India / State attribution */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <IconIndianFlag className="w-4 h-3 shrink-0 shadow-2xs" />
            <span className="font-bold text-amber-300">भारत सरकार</span>
            <span className="text-slate-400">|</span>
            <span className="font-semibold text-slate-100">Government of India</span>
            <span className="text-slate-400 hidden md:inline">•</span>
            <span className="text-slate-300 hidden md:inline">Department of Health &amp; Family Welfare, Govt. of Odisha</span>
          </div>

          {/* Right: Helpline & Accessibility standard controls */}
          <div className="flex items-center gap-3 ml-auto text-[11px]">
            <div className="flex items-center gap-1.5 bg-[#133B5C] px-2.5 py-0.5 rounded text-amber-200 font-bold border border-blue-900/50">
              <span>📞</span>
              <span>हेल्पलाइन / Helpline: <span className="text-white underline">104</span> / <span className="text-white underline">1075</span></span>
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
          आपातकालीन सूचना / Care Advisory
        </span>
        <span className="text-slate-800">
          Triage priorities are assigned based on reported vital signs and clinical urgency. For acute trauma, chest pain, or poisoning, report immediately to the nearest <strong>Emergency Casualty Ward</strong>.
        </span>
      </div>
    </div>
  );
}
