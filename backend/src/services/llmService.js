const SYSTEM_PROMPT = `You are a triage information organizer, not a doctor. Given a patient's symptom description, extract and structure their information clearly:
- Chief complaint (one sentence)
- Duration (how long they've had it)
- Associated symptoms (list)
- Timeline (when it started, progression)
Do NOT suggest a diagnosis, medication, dosage, or treatment. Do NOT state or imply any medical conclusion. Only organize and summarize what the patient said in their own words.`;

/**
 * Generate triage summary using LLM if LLM_API_KEY is available, or fallback to mock
 * @param {string} symptomText 
 * @param {string} language 
 * @returns {Promise<string>}
 */
/**
 * Clean clinical information extraction engine
 * Strictly non-diagnostic: formats ONLY what the patient provided (symptoms + additional questions answered)
 * No bulky boilerplate, no fake defaults, and no invented fields.
 */
function extractCleanClinicalSummary(text = "", language = "en", additionalAnswers = []) {
  let primarySymptoms = (text || "").trim();
  let answers = Array.isArray(additionalAnswers) ? [...additionalAnswers] : [];

  // Parse if symptomText contains embedded [Clinical Clarifications] or [Additional Answers]
  if (primarySymptoms.includes("[Clinical Clarifications]:") || primarySymptoms.includes("[Additional Answers]:")) {
    const parts = primarySymptoms.split(/\[(?:Clinical Clarifications|Additional Answers)\]:/);
    primarySymptoms = (parts[0] || "").trim();
    if (answers.length === 0 && parts[1]) {
      const lines = parts[1].split("\n").map(l => l.trim()).filter(l => l.startsWith("•"));
      for (const line of lines) {
        const clean = line.replace(/^•\s*/, "");
        if (clean.includes("->")) {
          const [q, a] = clean.split("->");
          if (q && a) answers.push({ question: q.trim(), answer: a.trim() });
        } else if (clean.includes(":")) {
          const [q, a] = clean.split(":");
          if (q && a) answers.push({ question: q.trim(), answer: a.trim() });
        }
      }
    }
  }

  if (language === "hi") {
    let output = `रोगी द्वारा बताए गए लक्षण:\n${primarySymptoms}`;
    if (answers.length > 0) {
      output += `\n\nअतिरिक्त प्रश्नों के उत्तर:\n` + answers.map(a => `• ${a.question}: ${a.answer}`).join("\n");
    }
    return output;
  }

  if (language === "or") {
    let output = `ରୋଗୀଙ୍କ ଲକ୍ଷଣ:\n${primarySymptoms}`;
    if (answers.length > 0) {
      output += `\n\nଅତିରିକ୍ତ ପ୍ରଶ୍ନୋତ୍ତର:\n` + answers.map(a => `• ${a.question}: ${a.answer}`).join("\n");
    }
    return output;
  }

  // English
  let output = `Patient Reported Symptoms:\n${primarySymptoms}`;
  if (answers.length > 0) {
    output += `\n\nAdditional Questions Answered:\n` + answers.map(a => `• ${a.question}: ${a.answer}`).join("\n");
  }
  return output;
}

/**
 * Generate triage summary using LLM if LLM_API_KEY is available, or fallback to clean direct format
 * @param {string} symptomText 
 * @param {string} language 
 * @param {Array} additionalAnswers
 * @returns {Promise<string>}
 */
async function generateSummary(symptomText = "", language = "en", additionalAnswers = []) {
  const apiKey = process.env.LLM_API_KEY;
  // Only call OpenAI endpoint if an OpenAI key is provided; otherwise use clean structured summarizer
  if (apiKey && apiKey.startsWith("sk-")) {
    try {
      const endpoint = process.env.LLM_ENDPOINT || "https://api.openai.com/v1/chat/completions";
      const model = process.env.LLM_MODEL || "gpt-3.5-turbo";

      const answersText = additionalAnswers && additionalAnswers.length > 0
        ? "\nAdditional Questions Answered:\n" + additionalAnswers.map(a => `• ${a.question}: ${a.answer}`).join("\n")
        : "";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a healthcare triage note organizer. Summarize ONLY the patient's reported symptoms and their answers to additional questions. Do NOT diagnose, do NOT prescribe, do NOT guess, and do NOT add boilerplate placeholders like 'Not specified' or 'None reported'." },
            { role: "user", content: `Language: ${language}\nPatient Symptoms:\n${symptomText}${answersText}` }
          ],
          temperature: 0.1
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return content.trim();
        }
      }
    } catch (err) {
      console.warn("LLM call failed, falling back to clean summarizer:", err.message);
    }
  }

  // Clean, non-bulky, direct information organizer
  return extractCleanClinicalSummary(symptomText, language, additionalAnswers);
}

/**
 * Translation service
 * @param {string} text 
 * @param {string} targetLang 
 * @returns {Promise<{ text: string, translated: boolean }>}
 */
async function translateText(text = "", targetLang = "en") {
  const translateKey = process.env.TRANSLATE_API_KEY;
  if (!translateKey || targetLang === "en") {
    return { text, translated: false };
  }

  try {
    // If translation API is configured
    return { text, translated: false };
  } catch (e) {
    return { text, translated: false };
  }
}

/**
 * Online AI Clinical Risk Evaluation using Google Gemini
 * Analyzes symptoms + additional questions answers and determines the accurate urgency flag
 * Falls back to deterministic rule engine if API is unavailable or offline.
 *
 * @param {string} symptomText
 * @param {string} language
 * @param {Array} additionalAnswers
 * @param {Function} fallbackEvaluator
 * @returns {Promise<{ riskTag: "RED" | "YELLOW" | "GREEN", matchedRiskKeywords: string[], aiRationale?: string }>}
 */
async function evaluateRiskWithAI(symptomText = "", language = "en", additionalAnswers = [], fallbackEvaluator, vitals = null) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;

  // Filter affirmative answers to avoid false positive triggers on negative answers
  const affirmativeAnswers = Array.isArray(additionalAnswers)
    ? additionalAnswers
        .filter(a => a && a.answer && !/^(no|not|none|nahi|nahin|ନାହିଁ|na)\b/i.test(a.answer.trim()))
        .map(a => `${a.question || ""} ${a.answer || ""}`).join(" ")
    : "";
  const combined = `${symptomText} ${affirmativeAnswers}`.trim();
  const deterministic = fallbackEvaluator ? fallbackEvaluator(combined, vitals) : { riskTag: "GREEN", matchedRiskKeywords: [] };

  if (apiKey) {
    const candidateModels = Array.from(new Set([
      process.env.GEMINI_MODEL,
      "gemini-flash-lite-latest",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash"
    ].filter(Boolean)));

    const answersSummary = Array.isArray(additionalAnswers) && additionalAnswers.length > 0
      ? "\nAdditional Answers:\n" + additionalAnswers.map(a => `• ${a.question || ""}: ${a.answer || ""}`).join("\n")
      : "";

    const vitalsSummary = vitals && typeof vitals === "object"
      ? `\nPatient Vitals: BP=${vitals.bpSystolic || '-'}/${vitals.bpDiastolic || '-'} mmHg, Pulse=${vitals.pulse || '-'} bpm, SpO2=${vitals.spo2 || '-'}%, Temp=${vitals.temp || '-'}°F`
      : "";

    const prompt = `You are an emergency healthcare triage clinical safety assistant for Indian public healthcare facilities.
Analyze the patient description, vitals, and additional questions answers:
Patient Symptoms: "${symptomText}"${vitalsSummary}${answersSummary}
Input Language: ${language}

Classify clinical urgency into one of:
- "RED": Urgent / Emergency (Chest pain, acute respiratory distress, severe bleeding, stroke signs, unconsciousness, severe acute abdomen, sudden extreme headache/thunderclap headache, critical/extreme unmanageable pain, severe pain with inability to function, rapidly deteriorating condition, high trauma)
- "YELLOW": Moderate / Needs OPD priority attention (Fever with vomiting, persistent coughing, moderate or severe stomach pain, dizziness, dehydration, worsening infection, unable to do daily tasks, pain rated as severe)
- "GREEN": Normal / Routine OPD consultation (Mild headache, mild body ache, routine checkup, minor cuts, cold, normal vitals, stable symptoms)

Return ONLY a JSON object:
{
  "riskTag": "RED" | "YELLOW" | "GREEN",
  "rationale": "one concise sentence clinical justification in English",
  "keywords": ["list", "of", "key", "clinical", "indicators"]
}`;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const candidate = data.candidates?.[0];
          const textPart = candidate?.content?.parts?.find(p => typeof p.text === "string" && p.text.trim().length > 0);
          if (textPart) {
            const parsed = JSON.parse(textPart.text);
            const aiTag = (parsed.riskTag || "").toUpperCase();
            if (["RED", "YELLOW", "GREEN"].includes(aiTag)) {
              const severity = { RED: 3, YELLOW: 2, GREEN: 1 };
              const finalTag = (severity[aiTag] >= (severity[deterministic.riskTag] || 1)) ? aiTag : deterministic.riskTag;

              const allKeywords = Array.from(new Set([
                ...(deterministic.matchedRiskKeywords || []),
                ...(Array.isArray(parsed.keywords) ? parsed.keywords : [])
              ])).filter(Boolean);

              return {
                riskTag: finalTag,
                matchedRiskKeywords: allKeywords.length > 0 ? allKeywords : [parsed.rationale || "AI Triage Evaluation"],
                aiRationale: parsed.rationale || ""
              };
            }
          }
        }
      } catch (err) {
        // Continue to next candidate model
      }
    }
  }

  // Deterministic local safety rule fallback
  return deterministic;
}

module.exports = {
  SYSTEM_PROMPT,
  generateSummary,
  translateText,
  evaluateRiskWithAI
};
