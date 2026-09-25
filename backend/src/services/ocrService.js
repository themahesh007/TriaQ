const Tesseract = require("tesseract.js");

// Common clinical lab value regex patterns
const LAB_VALUE_PATTERNS = {
  hemoglobin: {
    pattern: /(?:Hb|Hemoglobin|HGB|Haemoglobin)[:\s]+(\d+\.?\d*)\s*(?:g\/dL|g\/dl|gm\/dl|g\/100ml)?/i,
    label: "Hemoglobin (Hb)",
    unit: "g/dL",
    normalRange: "12.0 - 17.5 g/dL"
  },
  bloodSugar: {
    pattern: /(?:BS|Blood\s*Sugar|FBS|Fasting\s*Blood\s*Sugar|RBS|Random\s*Blood\s*Sugar|Glucose)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mg\/dl)?/i,
    label: "Blood Sugar (Glucose)",
    unit: "mg/dL",
    normalRange: "70 - 140 mg/dL"
  },
  whiteBloodCells: {
    pattern: /(?:WBC|White\s*Blood\s*Cells|Leukocytes|Total\s*Leukocyte\s*Count|TLC)[:\s]+(\d+\.?\d*)\s*(?:K\/uL|K\/μL|\/cumm)?/i,
    label: "WBC Count",
    unit: "K/μL",
    normalRange: "4.5 - 11.0 K/μL"
  },
  redBloodCells: {
    pattern: /(?:RBC|Red\s*Blood\s*Cells|Erythrocytes)[:\s]+(\d+\.?\d*)\s*(?:M\/uL|M\/μL)?/i,
    label: "RBC Count",
    unit: "M/μL",
    normalRange: "4.1 - 5.5 M/μL"
  },
  platelets: {
    pattern: /(?:Platelets|PLT|Thrombocytes|Platelet\s*Count)[:\s]+(\d+\.?\d*)\s*(?:K\/uL|K\/μL|\/cumm|\s*lakhs)?/i,
    label: "Platelets",
    unit: "K/μL",
    normalRange: "150 - 400 K/μL"
  },
  cholesterol: {
    pattern: /(?:Total\s*Cholesterol|Cholesterol|Lipid)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mg\/dl)?/i,
    label: "Total Cholesterol",
    unit: "mg/dL",
    normalRange: "< 200 mg/dL"
  },
  creatinine: {
    pattern: /(?:Creatinine|CREAT|Serum\s*Creatinine)[:\s]+(\d+\.?\d*)\s*(?:mg\/dL|mg\/dl)?/i,
    label: "Serum Creatinine",
    unit: "mg/dL",
    normalRange: "0.7 - 1.3 mg/dL"
  }
};

/**
 * Assess clinical status of a lab value
 */
function assessLabStatus(labName, value) {
  const num = parseFloat(value);
  if (isNaN(num)) return "UNKNOWN";

  const thresholds = {
    hemoglobin: { min: 12.0, max: 17.5 },
    bloodSugar: { min: 70, max: 140 },
    whiteBloodCells: { min: 4.5, max: 11.0 },
    redBloodCells: { min: 4.1, max: 5.5 },
    platelets: { min: 150, max: 400 },
    cholesterol: { max: 200 },
    creatinine: { min: 0.7, max: 1.3 }
  };

  const rule = thresholds[labName];
  if (!rule) return "NORMAL";

  if (rule.min !== undefined && num < rule.min) return "LOW";
  if (rule.max !== undefined && num > rule.max) return "HIGH";
  return "NORMAL";
}

/**
 * Extract structured lab metrics from OCR text
 */
function extractLabValuesFromText(rawText = "") {
  if (!rawText || typeof rawText !== "string") return {};

  const extractedLabs = {};

  Object.entries(LAB_VALUE_PATTERNS).forEach(([key, config]) => {
    const match = rawText.match(config.pattern);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val)) {
        extractedLabs[key] = {
          label: config.label,
          value: val,
          unit: config.unit,
          normalRange: config.normalRange,
          status: assessLabStatus(key, val)
        };
      }
    }
  });

  return extractedLabs;
}

/**
 * Perform server-side OCR on a base64 encoded image and extract lab metrics
 * @param {string} base64Data 
 * @returns {Promise<object>}
 */
async function processReportImage(base64Data) {
  if (!base64Data || typeof base64Data !== "string") {
    return null;
  }

  try {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    const result = await Tesseract.recognize(buffer, "eng", {
      logger: () => {}
    });

    const text = (result?.data?.text || "").trim();
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const extractedLabs = extractLabValuesFromText(text);

    return {
      success: true,
      rawText: text,
      lineCount: lines.length,
      sampleLines: lines.slice(0, 5),
      confidence: result?.data?.confidence || null,
      extractedLabs,
      hasStructuredLabs: Object.keys(extractedLabs).length > 0,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("OCR processing error:", error.message);
    return {
      success: false,
      error: "Failed to perform OCR on image",
      details: error.message,
      extractedLabs: {},
      processedAt: new Date().toISOString()
    };
  }
}

module.exports = {
  processReportImage,
  extractLabValuesFromText,
  assessLabStatus,
  LAB_VALUE_PATTERNS
};
