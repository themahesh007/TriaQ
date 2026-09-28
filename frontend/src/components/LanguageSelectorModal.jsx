import React from "react";
import { LANGUAGES } from "../utils/translations";

export default function LanguageSelectorModal({ isOpen, onClose, currentLanguage, onSelectLanguage }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Odisha Government Portal style */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌐</span>
            <div>
              <h3 className="font-bold text-[14.5px] leading-tight tracking-tight">
                Select Language
              </h3>
              <p className="text-[11px] text-slate-300">
                ଭାଷା ଚୟନ କରନ୍ତୁ • भाषा चुनें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Radio options list matching the user's uploaded screenshot */}
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
                className={`w-full py-3.5 px-4 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                  isSelected 
                    ? "bg-emerald-50/80 text-emerald-950 font-bold" 
                    : "hover:bg-slate-50 text-slate-800 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {lang.code === "en" ? "🇬🇧" : lang.code === "or" ? "🇮🇳" : "🇮🇳"}
                  </span>
                  <div>
                    <span className="text-[14.5px] block">
                      {lang.nativeName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {lang.label}
                    </span>
                  </div>
                </div>

                {/* Circular radio button indicator exactly like screenshot */}
                <div 
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? "border-emerald-600" : "border-slate-300"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-in zoom-in-50 duration-100" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 text-center font-medium">
          Entire patient intake, token pass & receipts will update instantly
        </div>
      </div>
    </div>
  );
}
