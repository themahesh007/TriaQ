import React from "react";
import { LANGUAGES } from "../utils/translations";

export default function LanguageSelectorModal({ isOpen, onClose, currentLanguage, onSelectLanguage }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-sm rounded-md shadow-2xl border border-slate-300 overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-150 govt-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Official Government Portal style */}
        <div className="px-5 py-3.5 bg-[#003366] text-white flex items-center justify-between border-b border-[#002244]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌐</span>
            <div>
              <h3 className="font-bold text-[14px] leading-tight tracking-wide uppercase">
                Select Portal Language
              </h3>
              <p className="text-[11px] text-amber-200">
                {currentLanguage === "hi" ? "अपनी भाषा चुनें" : currentLanguage === "or" ? "ଆପଣଙ୍କ ଭାଷା ଚୟନ କରନ୍ତୁ" : "Choose your preferred language"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded bg-black/20 hover:bg-black/40 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Radio options list */}
        <div className="p-3 divide-y divide-slate-100">
          {LANGUAGES.map((lang) => {
            const isSelected = currentLanguage === lang.code;

            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  onSelectLanguage(lang.code);
                  onClose();
                }}
                className={`w-full py-3 px-4 rounded flex items-center justify-between text-left transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-blue-50 text-[#003366] font-bold border border-blue-200" 
                    : "hover:bg-slate-50 text-slate-800 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {lang.code === "en" ? "🇬🇧" : lang.code === "or" ? "🇮🇳" : "🇮🇳"}
                  </span>
                  <div>
                    <span className="text-[14px] block">
                      {lang.nativeName}
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      {lang.label}
                    </span>
                  </div>
                </div>

                {/* Circular radio button indicator */}
                <div 
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? "border-[#003366]" : "border-slate-300"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#003366] animate-in zoom-in-50 duration-100" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 text-center font-medium">
          Content will update immediately across the portal
        </div>
      </div>
    </div>
  );
}
