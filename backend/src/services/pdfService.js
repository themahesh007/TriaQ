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
        .fontSize(13.5)
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text(String(facility).toUpperCase(), 30, 31, { align: "center" });

      doc
        .fontSize(8)
        .fillColor("#A7F3D0")
        .font("Helvetica-Bold")
        .text("OFFICIAL CLINICAL TRIAGE & CONSULTATION TOKEN PASS", 30, 48, { align: "center" });

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

      // Patient Guidance & Official Notice Box
      const footerY = doc.page.height - 90;
      doc
        .rect(30, footerY, doc.page.width - 60, 55)
        .fillAndStroke("#F8FAFC", "#CBD5E1");

      doc
        .fontSize(7.5)
        .fillColor("#1E293B")
        .font("Helvetica-Bold")
        .text("GENERAL PATIENT INSTRUCTIONS & CLINICAL GUIDANCE", 40, footerY + 7);

      doc
        .fontSize(7)
        .fillColor("#475569")
        .font("Helvetica")
        .text(
          "1. Please proceed to the waiting area of your assigned room. Your token number will be announced.\n2. Present this token pass to the nursing officer upon entering the consultation room.\n3. In case of sudden acute pain, extreme breathlessness, or trauma, report directly to the Emergency Room.",
          40,
          footerY + 18,
          { width: doc.page.width - 80 }
        );

      // Official Hospital Address & Contact Details Footer
      const facAddress = data.facilityAddress || data.address || "Main Healthcare Campus";
      const facPhone = data.facilityPhone || data.phone ? `+91 ${data.facilityPhone || data.phone}` : "+91-1800-TRIAQ";

      doc
        .fontSize(7)
        .fillColor("#1E293B")
        .font("Helvetica-Bold")
        .text(`${String(facility).toUpperCase()} • ${facAddress} • Helpline: ${facPhone}`, 30, doc.page.height - 26, {
          align: "center",
          width: doc.page.width - 60
        });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}


/**
 * Generates an official Medical Referral Letter PDF buffer
 * @param {Object} data Referral details including patient, referring doctor & target hospital
 * @returns {Promise<Buffer>}
 */
function generateReferralLetterPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err) => reject(err));

      const refNo = data.id || `REF-${Date.now().toString().slice(-6)}`;
      const dateStr = new Date(data.createdAt || Date.now()).toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric"
      });
      const timeStr = new Date(data.createdAt || Date.now()).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit"
      });
      const referringFacility = data.facility || "Community Health Center";
      const targetFacility = data.targetFacility || "District Hospital (Secondary Care)";
      const doctorName = data.doctorName || "Duty Medical Officer";
      const doctorRole = data.doctorRole || "Attending Physician";

      // 1. Header Banner
      doc.rect(40, 35, doc.page.width - 80, 50).fill("#064E3B");

      doc.fontSize(15).fillColor("#FFFFFF").font("Helvetica-Bold")
        .text(String(referringFacility).toUpperCase(), 40, 45, { align: "center" });

      doc.fontSize(8.5).fillColor("#A7F3D0").font("Helvetica-Bold")
        .text("OFFICIAL PATIENT CLINICAL REFERRAL & TRANSFER LETTER", 40, 65, { align: "center" });

      let y = 100;

      // 2. Metadata Box
      doc.rect(40, y, doc.page.width - 80, 48).fillAndStroke("#F8FAFC", "#CBD5E1");

      doc.fontSize(8.5).fillColor("#64748B").font("Helvetica")
        .text(`Referral Ref No: ${refNo}`, 50, y + 8);
      doc.text(`Date of Referral: ${dateStr} at ${timeStr}`, doc.page.width - 240, y + 8, { width: 190, align: "right" });

      doc.fontSize(10).fillColor("#0F172A").font("Helvetica-Bold")
        .text(`To Receiving Facility: ${targetFacility}`, 50, y + 26);

      y += 62;

      // 3. Patient Information Section
      doc.fontSize(10).fillColor("#064E3B").font("Helvetica-Bold")
        .text("PATIENT DEMOGRAPHICS & INTAKE RECORD", 45, y);

      doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(45, y + 14).lineTo(doc.page.width - 45, y + 14).stroke();

      y += 22;
      doc.rect(40, y, doc.page.width - 80, 48).fillAndStroke("#FFFFFF", "#E2E8F0");

      doc.fontSize(9).fillColor("#475569").font("Helvetica");
      doc.text("Patient Name:", 55, y + 8);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(data.patientName || "OPD Patient", 140, y + 8);

      doc.fillColor("#475569").font("Helvetica").text("Token Number:", 330, y + 8);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(data.patientToken || "--", 420, y + 8);

      doc.fillColor("#475569").font("Helvetica").text("Age / Gender:", 55, y + 28);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(data.patientAge ? `${data.patientAge} Yrs` : "--", 140, y + 28);

      doc.fillColor("#475569").font("Helvetica").text("Triage Priority:", 330, y + 28);
      const isRed = (data.riskTag || "").toUpperCase() === "RED";
      doc.fillColor(isRed ? "#B91C1C" : "#D97706").font("Helvetica-Bold")
        .text(isRed ? "CATEGORY 1 - URGENT EMERGENCY" : "CATEGORY 2 - PRIORITY ATTENTION", 420, y + 28);

      y += 62;

      // 4. Reason for Referral Box (Highlighted)
      doc.fontSize(10).fillColor("#064E3B").font("Helvetica-Bold")
        .text("CLINICAL REASON FOR ESCALATION / REFERRAL", 45, y);
      doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(45, y + 14).lineTo(doc.page.width - 45, y + 14).stroke();

      y += 22;
      doc.rect(40, y, doc.page.width - 80, 56).fillAndStroke("#FEF3C7", "#F59E0B");

      doc.fontSize(9.5).fillColor("#78350F").font("Helvetica-Bold")
        .text("Reason for Transfer:", 55, y + 8);

      doc.fontSize(9.5).fillColor("#1E293B").font("Helvetica")
        .text(data.referralReason || "Higher clinical evaluation, specialist diagnostics, and critical bed admission required.", 55, y + 24, {
          width: doc.page.width - 110,
          lineGap: 2
        });

      y += 72;

      // 5. Clinical Summary & Presenting Symptoms
      doc.fontSize(10).fillColor("#064E3B").font("Helvetica-Bold")
        .text("CLINICAL PRESENTATION & RECORDED SYMPTOMS", 45, y);
      doc.strokeColor("#E2E8F0").lineWidth(1).moveTo(45, y + 14).lineTo(doc.page.width - 45, y + 14).stroke();

      y += 22;
      doc.rect(40, y, doc.page.width - 80, 75).fillAndStroke("#FFFFFF", "#E2E8F0");

      doc.fontSize(9).fillColor("#1E293B").font("Helvetica")
        .text(data.symptoms || data.summary || "Symptoms evaluated during primary outpatient triage intake.", 55, y + 10, {
          width: doc.page.width - 110,
          lineGap: 3
        });

      y += 92;

      // 6. Attending Doctor Signature Block
      doc.rect(40, y, doc.page.width - 80, 80).fillAndStroke("#F8FAFC", "#E2E8F0");

      doc.fontSize(8.5).fillColor("#64748B").font("Helvetica")
        .text("Referring Medical Officer:", 55, y + 10);
      doc.fontSize(10).fillColor("#0F172A").font("Helvetica-Bold")
        .text(`${doctorName} (${doctorRole})`, 55, y + 24);
      doc.fontSize(8.5).fillColor("#64748B").font("Helvetica")
        .text(`Facility: ${referringFacility}`, 55, y + 40);

      doc.fontSize(8.5).fillColor("#64748B").font("Helvetica")
        .text("Attending Doctor Signature & Hospital Seal:", doc.page.width - 270, y + 10, { width: 220, align: "right" });

      doc.strokeColor("#94A3B8").dash(3, { space: 2 }).moveTo(doc.page.width - 240, y + 55).lineTo(doc.page.width - 55, y + 55).stroke();
      doc.undash();

      doc.fontSize(7.5).fillColor("#94A3B8").font("Helvetica")
        .text("[Official Signature & Stamp]", doc.page.width - 240, y + 60, { width: 185, align: "right" });

      // 7. Footer Instructions
      const footerY = doc.page.height - 50;
      doc.fontSize(7.5).fillColor("#64748B").font("Helvetica")
        .text("Notice: This referral letter transfers clinical presentation details for priority emergency/specialist triage at the receiving facility. Please present this letter directly at the reception or emergency desk.", 45, footerY, {
          width: doc.page.width - 90,
          align: "center"
        });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

module.exports = {
  generateTriageReceiptPDF,
  generateReferralLetterPDF
};
