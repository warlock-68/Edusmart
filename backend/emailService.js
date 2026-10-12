const nodemailer = require('nodemailer');
require('dotenv').config();

// Local development: Gmail SMTP (Render's free plan blocks SMTP ports)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Sends one email. Uses the Brevo API (over HTTPS) when BREVO_API_KEY is set,
// otherwise falls back to Gmail SMTP.
async function sendEmail({ to, subject, text, html }) {
  if (process.env.BREVO_API_KEY) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: { name: 'EduSmart', email: process.env.EMAIL_USER },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html
      })
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Brevo API error ${response.status}: ${details}`);
    }
    return;
  }

  await transporter.sendMail({
    from: `"EduSmart" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html
  });
}

async function sendPasswordResetEmail(toEmail, resetCode) {
  await sendEmail({
    to: toEmail,
    subject: 'EduSmart Password Reset Code',
    text: `Your EduSmart password reset code is: ${resetCode}\n\nThis code expires in 15 minutes. If you did not request this, you can safely ignore this email.`,
    html: `
      <p>Your EduSmart password reset code is:</p>
      <h2 style="letter-spacing: 4px;">${resetCode}</h2>
      <p>This code expires in <strong>15 minutes</strong>.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `
  });
}

async function sendApplicationApprovedEmail(toEmail, fullName) {
  await sendEmail({
    to: toEmail,
    subject: 'Your EduSmart Tutor Application Has Been Approved',
    text: `Hello ${fullName},\n\nGood news! Your application to become an EduSmart tutor has been approved.\n\nYou can now log in with your account and start setting up your tutor profile.\n\nWelcome to the team,\nThe EduSmart Team`,
    html: `
      <p>Hello ${escapeHtml(fullName)},</p>
      <p>Good news! Your application to become an EduSmart tutor has been <strong>approved</strong>.</p>
      <p>You can now log in with your account and start setting up your tutor profile.</p>
      <p>Welcome to the team,<br>The EduSmart Team</p>
    `
  });
}

async function sendApplicationRejectedEmail(toEmail, fullName, adminNote) {
  const noteText = adminNote ? `\n\nNote from our team: ${adminNote}` : '';
  const noteHtml = adminNote
    ? `<p><strong>Note from our team:</strong> ${escapeHtml(adminNote)}</p>`
    : '';

  await sendEmail({
    to: toEmail,
    subject: 'Update on Your EduSmart Tutor Application',
    text: `Hello ${fullName},\n\nThank you for applying to become an EduSmart tutor. After reviewing your application, we are unable to approve it at this time.${noteText}\n\nYou are welcome to apply again in the future.\n\nThe EduSmart Team`,
    html: `
      <p>Hello ${escapeHtml(fullName)},</p>
      <p>Thank you for applying to become an EduSmart tutor. After reviewing your application, we are unable to approve it at this time.</p>
      ${noteHtml}
      <p>You are welcome to apply again in the future.</p>
      <p>The EduSmart Team</p>
    `
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendApplicationApprovedEmail,
  sendApplicationRejectedEmail
};