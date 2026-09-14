const nodemailer = require('nodemailer');

/**
 * Jan Samadhan Email Service
 * Handles all transactional email notifications using Nodemailer.
 */

// ── SMTP Transporter (Gmail with App Password) ──
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify connection on startup (non-blocking)
transporter.verify().then(() => {
  console.log('[EmailService] SMTP transporter is ready to send emails.');
}).catch((err) => {
  console.warn('[EmailService] SMTP transporter verification failed:', err.message);
  console.warn('[EmailService] Emails will NOT be sent until EMAIL_USER and EMAIL_PASS are correctly configured in .env');
});

/**
 * Sends a professional challenge registration confirmation email.
 * Triggered when a citizen submits a challenge via the web form.
 *
 * @param {string} recipientEmail - Citizen's email address
 * @param {string} recipientName - Citizen's full name
 * @param {string} challengeId - MongoDB ObjectId of the created challenge
 * @param {string} challengeTitle - Title of the submitted challenge
 */
async function sendChallengeConfirmation(recipientEmail, recipientName, challengeId, challengeTitle) {
  if (!recipientEmail) {
    console.log('[EmailService] No email provided, skipping confirmation email.');
    return;
  }

  const trackingId = challengeId.toString();

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;">Jan Samadhan</h1>
          <p style="color:#94a3b8;margin:8px 0 0;font-size:13px;">Government of India — Citizen Grievance Resolution Platform</p>
        </div>

        <!-- Body -->
        <div style="padding:36px 40px;">
          <h2 style="color:#0f172a;font-size:20px;margin:0 0 8px;">Challenge Registered Successfully</h2>
          <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 24px;">
            Dear <strong>${recipientName}</strong>,
          </p>
          <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 24px;">
            Thank you for bringing this matter to our attention. Your challenge has been successfully registered on the Jan Samadhan platform. Our team will review and categorize your submission using AI-assisted analysis within <strong>3 working days</strong>.
          </p>

          <!-- Challenge Summary Card -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin:0 0 24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;width:140px;">Tracking ID</td>
                <td style="padding:8px 0;color:#0f172a;font-size:15px;font-weight:700;font-family:monospace;letter-spacing:1px;">${trackingId}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;">Challenge Title</td>
                <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;">${challengeTitle}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;">Full Reference ID</td>
                <td style="padding:8px 0;color:#475569;font-size:12px;font-family:monospace;">${challengeId}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:12px;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;">Status</td>
                <td style="padding:8px 0;">
                  <span style="background:#dbeafe;color:#1e40af;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:600;">Submitted — Under Review</span>
                </td>
              </tr>
            </table>
          </div>

          <h3 style="color:#0f172a;font-size:15px;margin:0 0 12px;">What Happens Next?</h3>
          <ol style="color:#334155;font-size:13px;line-height:2;padding-left:20px;margin:0 0 24px;">
            <li>Your submission will be reviewed and verified by a designated Government Official.</li>
            <li>AI-powered analysis will categorize the challenge and assess its urgency level.</li>
            <li>Once verified, the challenge will be routed to a relevant Higher Education Institution for solution development.</li>
            <li>You will receive status updates via email and SMS at each milestone.</li>
          </ol>

          <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 24px;">
            Please retain your <strong>Tracking ID: ${trackingId}</strong> for future reference. You can use this ID to check the status of your challenge on our platform.
          </p>

          <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
            <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0;">
              This is an automated notification from the Jan Samadhan platform. If you did not submit this challenge, please disregard this email. For assistance, contact our support team.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} Jan Samadhan — Government of India | All Rights Reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Jan Samadhan" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: `Challenge Registered — Tracking ID: ${trackingId}`,
      html: htmlBody
    });
    console.log(`[EmailService] Confirmation email sent to ${recipientEmail} for challenge ${challengeId}`);
  } catch (error) {
    console.error(`[EmailService] Failed to send confirmation email to ${recipientEmail}:`, error.message);
    // Non-blocking: do not throw, challenge submission should still succeed
  }
}

/**
 * Sends a professional email requesting evidence and location after a voice call.
 * Contains a link to the frontend evidence upload page that uses the Geolocation API.
 *
 * @param {string} recipientEmail - Citizen's email address
 * @param {string} recipientName - Citizen's name
 * @param {string} leadId - The Sarvam lead ID used to track the voice call
 */
async function sendEvidenceRequestEmail(recipientEmail, recipientName, leadId) {
  if (!recipientEmail) {
    console.log('[EmailService] No email provided, skipping evidence request email.');
    return;
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const evidenceLink = `${frontendUrl}/#/upload-evidence/${leadId}`;

  const htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;">Jan Samadhan</h1>
          <p style="color:#94a3b8;margin:8px 0 0;font-size:13px;">Government of India — Citizen Grievance Resolution Platform</p>
        </div>

        <!-- Body -->
        <div style="padding:36px 40px;">
          <h2 style="color:#0f172a;font-size:20px;margin:0 0 8px;">Action Required: Submit Evidence &amp; Location</h2>
          <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 24px;">
            Dear <strong>${recipientName || 'Citizen'}</strong>,
          </p>
          <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 24px;">
            Thank you for speaking with <strong>Jagriti</strong>, our Jan Samadhan AI Support Agent. Your concern has been recorded and we are preparing to formally register it as a challenge on our platform.
          </p>
          <p style="color:#334155;font-size:14px;line-height:1.7;margin:0 0 24px;">
            To ensure accurate categorization and expedite the resolution process, we require the following additional information:
          </p>

          <!-- Requirements Card -->
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px 24px;margin:0 0 24px;">
            <h3 style="color:#92400e;font-size:14px;margin:0 0 12px;">Information Required</h3>
            <ul style="color:#78350f;font-size:13px;line-height:2;padding-left:20px;margin:0;">
              <li><strong>Live GPS Location</strong> — Your browser will request permission to capture your exact coordinates. This helps us precisely identify the affected area.</li>
              <li><strong>Photographic Evidence</strong> — Upload clear photographs (JPEG, PNG) of the problem for verification.</li>
              <li><strong>Video Evidence</strong> <em>(optional)</em> — Upload a short video (MP4, max 10 MB) for additional context if available.</li>
              <li><strong>Supporting Documents</strong> <em>(optional)</em> — Any related documents (PDF, DOC) that may help in assessment.</li>
            </ul>
          </div>

          <!-- CTA Button -->
          <div style="text-align:center;margin:32px 0;">
            <a href="${evidenceLink}" style="display:inline-block;background:linear-gradient(135deg,#08743f 0%,#0a9f56 100%);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.5px;box-shadow:0 4px 14px rgba(8,116,63,0.3);">
              Upload Evidence &amp; Share Location
            </a>
          </div>
          <p style="color:#64748b;font-size:12px;text-align:center;margin:0 0 24px;">
            If the button above does not work, copy and paste the following link into your browser:<br/>
            <a href="${evidenceLink}" style="color:#2563eb;word-break:break-all;">${evidenceLink}</a>
          </p>

          <h3 style="color:#0f172a;font-size:15px;margin:0 0 12px;">Why Is This Needed?</h3>
          <p style="color:#334155;font-size:13px;line-height:1.7;margin:0 0 24px;">
            Accurate location data and visual evidence significantly improve the speed and quality of the resolution process. Government officials and partnered educational institutions rely on this information to validate, prioritize, and develop effective solutions for community challenges.
          </p>

          <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
            <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0;">
              This is an automated follow-up from the Jan Samadhan platform after your recent call with Jagriti. If you did not initiate this call, please disregard this email. For assistance, contact our support team.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} Jan Samadhan — Government of India | All Rights Reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Jan Samadhan" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: 'Action Required: Submit Evidence & Location — Jan Samadhan',
      html: htmlBody
    });
    console.log(`[EmailService] Evidence request email sent to ${recipientEmail} for lead ${leadId}`);
  } catch (error) {
    console.error(`[EmailService] Failed to send evidence request email to ${recipientEmail}:`, error.message);
    // Non-blocking
  }
}

module.exports = {
  sendChallengeConfirmation,
  sendEvidenceRequestEmail
};
