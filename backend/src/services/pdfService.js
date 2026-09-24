const PDFDocument = require("pdfkit");

/**
 * Generates an official medical triage PDF receipt buffer
 * @param {Object} data Triage case and patient data
 * @returns {Promise<Buffer>}
 */
function generateTriageReceiptPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A5", margin: 30 });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const receiptNo = data.receiptNumber || `TRIAQ-${new Date().toISOString().slice(0, 10)}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
      const dateStr = data.createdAt ? new Date(data.createdAt).toLocaleString("en-IN") : new Date().toLocaleString("en-IN");
      const risk = (data.riskTag || "GREEN").toUpperCase();
      const facility = data.facility || "Government Primary Health Centre (PHC)";

      // Top Clinic Branding Header
      doc
        .rect(30, 25, doc.page.width - 60, 42)
        .fill("#064E3B");

      doc
        .fontSize(14)
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text("TRIAQ CLINICAL TRIAGE PASS", 30, 32, { align: "center" });

      doc
        .fontSize(8.5)
        .fillColor("#A7F3D0")
        .font("Helvetica")
        .text(facility, 30, 49, { align: "center" });

      // Receipt Number Monospace Box
      let y = 80;
      doc
        .rect(30, y, doc.page.width - 60, 32)
        .fillAndStroke("#F8FAFC", "#E2E8F0");

      doc
        .fontSize(8)
        .fillColor("#64748B")
        .font("Helvetica-Bold")
        .text("OPD TOKEN RECEIPT NUMBER", 40, y + 6);

      doc
        .fontSize(12)
        .fillColor("#0F172A")
        .font("Courier-Bold")
        .text(receiptNo, 40, y + 17);

      doc
        .fontSize(8)
        .fillColor("#64748B")
        .font("Helvetica")
        .text(`Generated: ${dateStr}`, doc.page.width - 190, y + 12, { width: 150, align: "right" });

      // Priority Flag Banner
      y += 42;
      let badgeBg = "#DCFCE7";
      let badgeText = "#166534";
      let flagLabel = "🟢 NORMAL PRIORITY (GREEN)";

      if (risk === "RED") {
        badgeBg = "#FEE2E2";
        badgeText = "#991B1B";
        flagLabel = "🔴 URGENT EMERGENCY (RED)";
      } else if (risk === "AMBER" || risk === "YELLOW") {
        badgeBg = "#FEF3C7";
        badgeText = "#92400E";
        flagLabel = "🟡 MODERATE PRIORITY (YELLOW)";
      }

      doc
        .rect(30, y, doc.page.width - 60, 26)
        .fillAndStroke(badgeBg, badgeBg);

      doc
        .fontSize(10.5)
        .fillColor(badgeText)
        .font("Helvetica-Bold")
        .text(flagLabel, 30, y + 7, { align: "center" });

      // Assigned Room / Ward Destination Banner if present
      const dest = data.assignedRoom || data.patient?.assignedRoom || data.disposition;
      if (dest) {
        y += 32;
        doc
          .rect(30, y, doc.page.width - 60, 22)
          .fillAndStroke("#ECFDF5", "#059669");
        doc
          .fontSize(8.5)
          .fillColor("#065F46")
          .font("Helvetica-Bold")
          .text(`ASSIGNED DESTINATION: ${String(dest).toUpperCase()}`, 35, y + 6);
        y += 28;
      } else {
        y += 35;
      }

      // Patient Demographics
      doc
        .fontSize(9)
        .fillColor("#334155")
        .font("Helvetica-Bold")
        .text("PATIENT INFORMATION", 35, y);

      doc
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .moveTo(35, y + 13)
        .lineTo(doc.page.width - 35, y + 13)
        .stroke();

      y += 20;
      doc.fontSize(8.5).font("Helvetica");
      
      const pName = data.patientName || data.name || "Patient";
      const pAge = data.age ? `${data.age} yrs` : "--";
      const pPhone = data.phone || "--";
      const pWard = data.address || data.ward || "--";

      doc.fillColor("#64748B").text("Name:", 35, y);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(pName, 75, y);

      doc.fillColor("#64748B").font("Helvetica").text("Age / Gender:", 230, y);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(pAge, 290, y);

      y += 14;
      doc.fillColor("#64748B").font("Helvetica").text("Phone:", 35, y);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(pPhone, 75, y);

      doc.fillColor("#64748B").font("Helvetica").text("Ward/Area:", 230, y);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(pWard, 290, y);

      // Recorded Vital Signs Table if present
      y += 22;
      const vitals = data.vitals || {};
      const hasVitals = vitals.bpSystolic || vitals.pulse || vitals.spo2 || vitals.temp;

      if (hasVitals) {
        doc
          .fontSize(9)
          .fillColor("#334155")
          .font("Helvetica-Bold")
          .text("CLINICAL VITALS SNAPSHOT", 35, y);

        doc
          .strokeColor("#E2E8F0")
          .lineWidth(1)
          .moveTo(35, y + 13)
          .lineTo(doc.page.width - 35, y + 13)
          .stroke();

        y += 20;
        doc
          .rect(35, y, doc.page.width - 70, 24)
          .fillAndStroke("#F1F5F9", "#E2E8F0");

        const bpStr = vitals.bpSystolic ? `${vitals.bpSystolic}/${vitals.bpDiastolic || '--'} mmHg` : "--";
        const pulseStr = vitals.pulse ? `${vitals.pulse} bpm` : "--";
        const spo2Str = vitals.spo2 ? `${vitals.spo2} %` : "--";
        const tempStr = vitals.temp ? `${vitals.temp} °F` : "--";

        doc.fontSize(7.5).fillColor("#475569").font("Helvetica");
        doc.text(`BP: ${bpStr}`, 45, y + 7);
        doc.text(`Pulse: ${pulseStr}`, 130, y + 7);
        doc.text(`SpO2: ${spo2Str}`, 215, y + 7);
        doc.text(`Temp: ${tempStr}`, 285, y + 7);

        y += 32;
      }

      // Symptoms & Chief Complaints
      doc
        .fontSize(9)
        .fillColor("#334155")
        .font("Helvetica-Bold")
        .text("REPORTED SYMPTOMS & CHIEF COMPLAINT", 35, y);

      doc
        .strokeColor("#E2E8F0")
        .lineWidth(1)
        .moveTo(35, y + 13)
        .lineTo(doc.page.width - 35, y + 13)
        .stroke();

      y += 18;
      const symptomsText = data.rawSymptomText || data.symptoms || "No symptoms recorded";
      doc
        .fontSize(8.5)
        .fillColor("#1E293B")
        .font("Helvetica")
        .text(symptomsText, 35, y, { width: doc.page.width - 70, height: 60, ellipsis: true });

      // Medical Safety Disclaimer Box
      const footerY = doc.page.height - 90;
      doc
        .rect(30, footerY, doc.page.width - 60, 55)
        .fillAndStroke("#FEF2F2", "#FCA5A5");

      doc
        .fontSize(7.5)
        .fillColor("#991B1B")
        .font("Helvetica-Bold")
        .text("IMPORTANT CLINICAL NOTICE", 40, footerY + 7);

      doc
        .fontSize(7)
        .fillColor("#7F1D1D")
        .font("Helvetica")
        .text(
          "This token is an administrative triage receipt and does NOT constitute a medical diagnosis or prescription. A qualified medical officer will examine your case in order of clinical priority. If you experience severe chest pain, extreme breathlessness, or collapse, alert emergency staff immediately.",
          40,
          footerY + 18,
          { width: doc.page.width - 80 }
        );

      // Hospital Helpline Contact
      doc
        .fontSize(6.5)
        .fillColor("#64748B")
        .text("PHC Triage Helpdesk: +91-11-2338-9000 • Keep this receipt for OPD consultation", 30, doc.page.height - 25, {
          align: "center",
          width: doc.page.width - 60
        });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  generateTriageReceiptPDF
};
