const nodemailer = require("nodemailer");

/**
 * Configure Nodemailer transport with Gmail SMTP
 */
function createTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "").replace(/\s+/g, "");

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000
  });
}

/**
 * Send 6-digit OTP email for Password Reset
 */
async function sendPasswordResetOTP(toEmail, otp, recipientName = "User") {
  const transporter = createTransporter();
  const fromUser = process.env.GMAIL_USER || process.env.SMTP_USER || "security@triaq.health";

  const subject = `🔐 TriaQ Security: ${otp} is your verification code`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b; color: #f8fafc;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); padding: 32px 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">TriaQ</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; color: #e0f2fe; font-weight: 500;">Next-Gen Clinical Emergency & Triage System</p>
      </div>

      <!-- Body -->
      <div style="padding: 32px 24px;">
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #ffffff;">Password Reset Request</h2>
        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
          Hello <strong style="color: #f1f5f9;">${recipientName}</strong>,<br/>
          We received a request to reset the password for your TriaQ account registered with this email address (<strong>${toEmail}</strong>).
        </p>

        <!-- OTP Code Box -->
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #38bdf8;">Your 6-Digit One-Time Code</p>
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: 'Courier New', monospace; margin: 8px 0;">
            ${otp}
          </div>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8;">
            ⏱️ Valid for <strong>5 minutes</strong> only. Do not share this code with anyone.
          </p>
        </div>

        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.5; color: #64748b;">
          If you did not request a password reset, you can safely ignore this email. Your current password will remain unchanged.
        </p>

        <div style="border-top: 1px solid #1e293b; margin-top: 32px; padding-top: 20px; text-align: center; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">Automated message from TriaQ Hospital Emergency Infrastructure.</p>
          <p style="margin: 4px 0 0 0;">Secured with 256-bit HIPAA-compliant encryption.</p>
        </div>
      </div>
    </div>
  `;

  const textContent = `TriaQ Password Reset\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 5 minutes.\nIf you did not request this, please ignore this email.`;

  if (!transporter) {
    console.warn(`[EMAIL SERVICE] No Gmail SMTP credentials configured in .env. Live OTP is: [${otp}] for ${toEmail}`);
    return {
      success: false,
      deliveredLive: false,
      otp,
      message: "SMTP not configured. OTP displayed on screen for testing."
    };
  }

  try {
    const sendPromise = transporter.sendMail({
      from: `"TriaQ Security" <${fromUser}>`,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Email dispatch timed out after 6 seconds.")), 6000)
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);

    console.log(`[EMAIL SERVICE] ✅ Live password reset email successfully sent to ${toEmail}. MessageId: ${info.messageId}`);
    return {
      success: true,
      deliveredLive: true,
      messageId: info.messageId,
      to: toEmail
    };
  } catch (error) {
    console.error(`[EMAIL SERVICE] ❌ Failed to dispatch email to ${toEmail}:`, error.message);
    return {
      success: false,
      deliveredLive: false,
      otp,
      error: error.message
    };
  }
}

module.exports = {
  createTransporter,
  sendPasswordResetOTP
};
