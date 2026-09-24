import React from "react";
import { IconStethoscope, IconClipboard, IconCheckCircle } from "./Icons";

/**
 * Parses clinical summary text cleanly into two distinct sections:
 * 1. Primary Symptoms (Chief Complaints & duration/severity)
 * 2. Additional Questions & Intake Screening answers
 */
export function parseClinicalSummary(summaryText = "") {
  if (!summaryText || typeof summaryText !== "string") {
    return { symptoms: "No symptoms recorded.", qaList: [], notes: "" };
  }

  const clean = summaryText.trim();
  const splitRegex = /(?:Additional Questions Answered:|अतिरिक्त प्रश्नों के उत्तर:|ଅତିରିକ୍ତ ପ୍ରଶ୍ନୋତ୍ତର:|Additional Details:|Questions Answered:|Clinical Questionnaire:)/i;

  if (splitRegex.test(clean)) {
    const [symptomSection, qaSection] = clean.split(splitRegex);
    const headerRegex = /^(?:Patient Reported Symptoms:|रोगी द्वारा बताए गए लक्षण:|ରୋଗୀଙ୍କ ଲକ୍ଷଣ:|Chief Complaints:|Symptoms:)s*/i;
    const symptoms = (symptomSection || "").replace(headerRegex, "").trim();

    const qaList = [];
    if (qaSection) {
      const lines = qaSection.split("\n").map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const trimmedLine = line.replace(/^[•\-\*d\.]+\s*/, "");
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
    return { symptoms: symptoms || clean, qaList, notes: "" };
  }

  // If there is no explicit section split, intelligently extract structured questions (lines with ?, Q:, or bullets)
  const lines = clean.split("\n").map(l => l.trim()).filter(Boolean);
  const symptomsLines = [];
  const qaList = [];

  for (const line of lines) {
    if (line.includes("?") || line.startsWith("Q:") || line.toLowerCase().includes("question:")) {
      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1) {
        qaList.push({
          question: line.slice(0, colonIndex).replace(/^[•\-\*d\.]+\s*/, "").trim(),
          answer: line.slice(colonIndex + 1).trim()
        });
      } else {
        qaList.push({
          question: line.replace(/^[•\-\*d\.]+\s*/, "").trim(),
          answer: "Confirmed by patient"
        });
      }
    } else {
      symptomsLines.push(line);
    }
  }

  const symptoms = symptomsLines.join(" ").replace(/^(?:Patient Reported Symptoms:|Chief Complaints:|Symptoms:)\s*/i, "").trim();
  return {
    symptoms: symptoms || clean,
    qaList,
    notes: ""
  };
}

export default function ClinicalSummaryCard({ summary = "", language = "en", className = "" }) {
  const { symptoms, qaList } = parseClinicalSummary(summary);

  const t = {
    symptomsTitle: language === "hi" ? "लक्षण (मुख्य शिकायतें)" : language === "or" ? "ରୋଗୀଙ୍କ ମୁଖ୍ୟ ଲକ୍ଷଣ" : "Primary Symptoms",
    symptomsSub: language === "hi" ? "रोगी द्वारा बताए गए प्रारंभिक लक्षण" : language === "or" ? "ପ୍ରାଥମିକ ଲକ୍ଷଣ ବିବରଣୀ" : "Patient's Presenting Chief Complaints & Duration",
    qaTitle: language === "hi" ? "अतिरिक्त प्रश्न एवं उत्तर" : language === "or" ? "ଅତିରିକ୍ତ ପ୍ରଶ୍ନୋତ୍ତର" : "Additional Questions & Details",
    qaSub: language === "hi" ? "प्रश्नावली एवं विस्तृत जांच" : language === "or" ? "ସ୍କ୍ରିନିଂ ପ୍ରଶ୍ନାବଳୀ" : "Clinical Screening Questionnaire & Review",
    noQa: language === "hi" ? "कोई अतिरिक्त प्रश्न दर्ज नहीं — एकल मुख्य लक्षण।" : language === "or" ? "କୌଣସି ଅତିରିକ୍ତ ପ୍ରଶ୍ନ ନାହିଁ।" : "Standard intake: Single chief complaint recorded. No secondary red-flag questionnaire required."
  };

  return (
    <div className={`space-y-4 font-sans ${className}`}>
      {/* BOX 1: THE ACTUAL SYMPTOMS (CHIEF COMPLAINTS) */}
      <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border-2 border-emerald-500/30 shadow-xs space-y-2.5 transition-all hover:border-emerald-500/50">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm shadow-2xs font-bold">
              🩺
            </span>
            <div>
              <h4 className="text-[13px] font-black uppercase tracking-wider text-slate-900">
                {t.symptomsTitle}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                {t.symptomsSub}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
            Chief Complaint
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-900 text-[14.5px] font-bold leading-relaxed shadow-2xs">
          {symptoms || "No specific symptoms reported."}
        </div>
      </div>

      {/* BOX 2: ADDITIONAL QUESTIONS & INTAKE QUESTIONNAIRE */}
      <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border-2 border-indigo-500/25 shadow-xs space-y-2.5 transition-all hover:border-indigo-500/40">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm shadow-2xs font-bold">
              📋
            </span>
            <div>
              <h4 className="text-[13px] font-black uppercase tracking-wider text-slate-900">
                {t.qaTitle}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                {t.qaSub}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200">
            {qaList.length > 0 ? `${qaList.length} Items Answered` : "Direct Intake"}
          </span>
        </div>

        {qaList.length > 0 ? (
          <div className="space-y-2 pt-1">
            {qaList.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-3.5 rounded-xl border border-slate-200 border-l-4 border-l-indigo-600 shadow-2xs space-y-1.5"
              >
                <div className="flex items-start gap-2">
                  <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded bg-slate-900 text-white shrink-0 mt-0.5">
                    Q{idx + 1}
                  </span>
                  <p className="text-[13.5px] font-bold text-slate-900 leading-snug">
                    {item.question}
                  </p>
                </div>
                {item.answer && (
                  <div className="pl-6">
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                      <span>✓</span>
                      <span>{item.answer}</span>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-slate-500 text-[12.5px] font-medium flex items-center gap-2">
            <IconCheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t.noQa}</span>
          </div>
        )}
      </div>
    </div>
  );
}
