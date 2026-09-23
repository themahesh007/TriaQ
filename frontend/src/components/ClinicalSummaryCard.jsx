import React from "react";
import { IconStethoscope, IconClipboard } from "./Icons";

/**
 * Parses clinical summary text into primary symptoms and structured Q&A pairs
 */
export function parseClinicalSummary(summaryText = "") {
  if (!summaryText || typeof summaryText !== "string") {
    return { symptoms: "", qaList: [], isFreeform: false };
  }

  const clean = summaryText.trim();
  const splitRegex = /(?:Additional Questions Answered:|अतिरिक्त प्रश्नों के उत्तर:|ଅତିରିକ୍ତ ପ୍ରଶ୍ନୋତ୍ତର:)/i;

  if (!splitRegex.test(clean)) {
    const headerRegex = /^(?:Patient Reported Symptoms:|रोगी द्वारा बताए गए लक्षण:|ରୋଗୀଙ୍କ ଲକ୍ଷଣ:)\s*/i;
    const stripped = clean.replace(headerRegex, "").trim();
    return { symptoms: stripped, qaList: [], isFreeform: !headerRegex.test(clean) };
  }

  const [symptomSection, qaSection] = clean.split(splitRegex);
  const headerRegex = /^(?:Patient Reported Symptoms:|रोगी द्वारा बताए गए लक्षण:|ରୋଗୀଙ୍କ ଲକ୍ଷଣ:)\s*/i;
  const symptoms = (symptomSection || "").replace(headerRegex, "").trim();

  const qaList = [];
  if (qaSection) {
    const lines = qaSection.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const trimmedLine = line.replace(/^[•\-\*\d\.]+\s*/, "");
      const colonIndex = trimmedLine.indexOf(":");
      if (colonIndex !== -1) {
        const question = trimmedLine.slice(0, colonIndex).trim();
        const answer = trimmedLine.slice(colonIndex + 1).trim();
        if (question && answer) {
          qaList.push({ question, answer });
        }
      } else if (trimmedLine) {
        qaList.push({ question: trimmedLine, answer: "" });
      }
    }
  }

  return { symptoms, qaList, isFreeform: false };
}

/**
 * Modern, human-friendly summary viewer (clean numbered order, vector SVG icons)
 */
export default function ClinicalSummaryCard({ summary = "", language = "en", className = "" }) {
  const { symptoms, qaList, isFreeform } = parseClinicalSummary(summary);

  const t = {
    symptomsLabel: language === "hi" ? "रोगी द्वारा बताए गए मुख्य लक्षण" : language === "or" ? "ରୋଗୀଙ୍କ ମୁଖ୍ୟ ଲକ୍ଷଣ" : "Primary Chief Complaints & Symptoms",
    qaLabel: language === "hi" ? "विस्तृत एवं अतिरिक्त लक्षण (क्रमबद्ध)" : language === "or" ? "ବିସ୍ତୃତ ଲକ୍ଷଣ" : "Ordered Additional Details & Questionnaire",
    questionPrefix: language === "hi" ? "प्रश्न:" : language === "or" ? "ପ୍ରଶ୍ନ:" : "Question:",
    answerPrefix: language === "hi" ? "उत्तर:" : language === "or" ? "ଉତ୍ତର:" : "Answer:"
  };

  if (isFreeform || (!symptoms && qaList.length === 0)) {
    return (
      <div className={`p-4 rounded-xl border bg-white text-slate-800 text-[14px] leading-relaxed shadow-xs border-slate-200 ${className}`}>
        <p className="whitespace-pre-wrap font-sans font-medium text-slate-800">
          {summary || "No summary recorded."}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 font-sans ${className}`}>
      {/* 1. Primary Symptoms Display */}
      {symptoms && (
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-emerald-800">
            <IconStethoscope className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{t.symptomsLabel}</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs text-[15px] font-bold text-slate-900 leading-relaxed">
            {symptoms}
          </div>
        </div>
      )}

      {/* 2. Structured Questions & Answers in clean numbered order */}
      {qaList.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700 px-1">
            <div className="flex items-center gap-1.5">
              <IconClipboard className="w-4 h-4 text-slate-600 shrink-0" />
              <span>{t.qaLabel}</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {qaList.length} Questions Answered
            </span>
          </div>

          <div className="space-y-2.5">
            {qaList.map((item, idx) => (
              <div 
                key={idx}
                className="bg-white p-3.5 rounded-xl border border-slate-200 border-l-4 border-l-emerald-600 shadow-2xs space-y-2 transition-all hover:shadow-xs"
              >
                {/* QUESTION WITH ORDERED NUMBER [1], [2], etc. */}
                <div className="flex items-start gap-2.5">
                  <span className="text-[11px] font-black font-mono px-2 py-0.5 rounded-md bg-slate-900 text-white shadow-2xs shrink-0 mt-0.5">
                    [{idx + 1}]
                  </span>
                  <p className="text-[14px] font-bold text-slate-900 leading-snug">
                    {item.question}
                  </p>
                </div>

                {/* PATIENT'S ANSWER IN HIGH CONTRAST BADGE */}
                {item.answer && (
                  <div className="pl-8">
                    <div className="inline-flex items-center gap-2 text-[13px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-lg shadow-2xs">
                      <span className="text-emerald-700 font-black text-xs">↳ Answer:</span>
                      <span>{item.answer}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
