const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendPasswordResetEmail(toEmail, resetCode) {
  const mailOptions = {
    from: `"EduSmart" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'EduSmart Password Reset Code',
    text: `Your EduSmart password reset code is: ${resetCode}\n\nThis code expires in 15 minutes. If you did not request this, you can safely ignore this email.`,
    html: `
      <p>Your EduSmart password reset code is:</p>
      <h2 style="letter-spacing: 4px;">${resetCode}</h2>
      <p>This code expires in <strong>15 minutes</strong>.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendPasswordResetEmail };