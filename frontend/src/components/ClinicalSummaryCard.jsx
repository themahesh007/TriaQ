import React from "react";

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
 * Modern, human-friendly summary viewer (no bill/receipt font, separate colors for question & answer)
 */
export default function ClinicalSummaryCard({ summary = "", language = "en", className = "" }) {
  const { symptoms, qaList, isFreeform } = parseClinicalSummary(summary);

  const t = {
    symptomsLabel: language === "hi" ? "रोगी द्वारा बताए गए लक्षण" : language === "or" ? "ରୋଗୀଙ୍କ ଲକ୍ଷଣ" : "Patient Reported Symptoms",
    qaLabel: language === "hi" ? "अतिरिक्त प्रश्नों के उत्तर" : language === "or" ? "ଅତିରିକ୍ତ ପ୍ରଶ୍ନୋତ୍ତର" : "Additional Questions Answered",
    questionPrefix: language === "hi" ? "प्रश्न:" : language === "or" ? "ପ୍ରଶ୍ନ:" : "Question:",
    answerPrefix: language === "hi" ? "उत्तर:" : language === "or" ? "ଉତ୍ତର:" : "Answer:"
  };

  if (isFreeform || (!symptoms && qaList.length === 0)) {
    return (
      <div className={`p-4 rounded-xl border bg-white text-[#16302B] text-[14px] leading-relaxed shadow-xs ${className}`} style={{ borderColor: "#DAD6CC" }}>
        <p className="whitespace-pre-wrap font-sans font-medium text-[#16302B]">
          {summary || "No summary recorded."}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3.5 font-sans ${className}`}>
      {/* 1. Primary Symptoms Display */}
      {symptoms && (
        <div className="bg-[#FAF9F5] p-4 rounded-xl border space-y-1.5 shadow-2xs" style={{ borderColor: "#DAD6CC" }}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#54655F]">
            <span>🩺</span>
            <span>{t.symptomsLabel}</span>
          </div>
          <p className="text-[15px] font-bold text-[#16302B] leading-relaxed bg-white p-3 rounded-lg border border-[#E5E2D9]">
            {symptoms}
          </p>
        </div>
      )}

      {/* 2. Structured Questions & Answers in Black and Green */}
      {qaList.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#374151] px-1">
            <span>📋</span>
            <span>{t.qaLabel}</span>
          </div>

          <div className="space-y-3">
            {qaList.map((item, idx) => (
              <div 
                key={idx}
                className="bg-white p-4 rounded-xl border border-[#E5E7EB] border-l-4 border-l-[#111827] shadow-xs space-y-2.5 transition-all hover:shadow-sm"
              >
                {/* QUESTION IN COLOR 1: Crisp Solid Black */}
                <div className="flex items-start gap-2.5">
                  <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded bg-[#111827] text-white shadow-2xs shrink-0 mt-0.5">
                    Q
                  </span>
                  <p className="text-[14.5px] font-black text-[#111827] leading-snug">
                    {item.question}
                  </p>
                </div>

                {/* ANSWER IN COLOR 2: Vibrant Medical Green */}
                {item.answer && (
                  <div className="pl-7">
                    <div className="inline-flex items-center gap-2 text-[13.5px] font-extrabold text-[#065F46] bg-[#ECFDF5] border border-[#10B981] px-3.5 py-1.5 rounded-lg shadow-2xs">
                      <span className="text-[#059669] font-black text-sm">✓</span>
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
