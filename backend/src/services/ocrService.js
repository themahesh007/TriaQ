const Tesseract = require("tesseract.js");

/**
 * Perform server-side OCR on a base64 encoded image
 * @param {string} base64Data 
 * @returns {Promise<object>}
 */
async function processReportImage(base64Data) {
  if (!base64Data || typeof base64Data !== "string") {
    return null;
  }

  try {
    // Clean base64 header if present (e.g. data:image/png;base64,...)
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    const result = await Tesseract.recognize(buffer, "eng", {
      logger: () => {} // quiet logging
    });

    const text = result?.data?.text || "";

    // Extract basic key-value or lab indicators if present
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    return {
      rawText: text.trim(),
      lineCount: lines.length,
      sampleLines: lines.slice(0, 5),
      confidence: result?.data?.confidence || null,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("OCR processing error:", error.message);
    return {
      error: "Failed to perform OCR on image",
      details: error.message,
      processedAt: new Date().toISOString()
    };
  }
}

module.exports = {
  processReportImage
};
