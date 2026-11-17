const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../emailService');

const router = express.Router();

// Only these roles may ever be assigned at registration.
// If you add a real "admin" onboarding flow later, keep admin OUT of this
// list and create admin accounts a different way (e.g. directly in the DB
// or via a separate protected endpoint) rather than letting anyone self-register as one.
const ALLOWED_SELF_REGISTER_ROLES = ['student'];

const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 5, // 5 attempts per IP per window
  message: { error: 'Too many login attempts. Please try again in 2 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // 3 reset requests per IP per window
  message: { error: 'Too many password reset requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 code attempts per IP per window
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register a new user
// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (!ALLOWED_SELF_REGISTER_ROLES.includes(role)) {
      return res.status(400).json({
        error: `Invalid role. Must be one of: ${ALLOWED_SELF_REGISTER_ROLES.join(', ')}`
      });
    }

    const [existing] = await pool.query(
      'SELECT id, is_verified FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0 && existing[0].is_verified) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 6-digit verification code, expires in 15 minutes
    const verifyCode = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    if (existing.length > 0) {
      // Same email registered before but never verified: refresh it and resend the code
      await pool.query(
        'UPDATE users SET name = ?, password = ?, verify_code = ?, verify_code_expires = ? WHERE id = ?',
        [name, hashedPassword, verifyCode, expires, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO users (name, email, password, role, is_verified, verify_code, verify_code_expires) VALUES (?, ?, ?, ?, 0, ?, ?)',
        [name, email, hashedPassword, role, verifyCode, expires]
      );
    }

    let emailSent = true;
    try {
      await sendVerificationEmail(email, name, verifyCode);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
      emailSent = false;
    }

    res.status(201).json({
      message: emailSent
        ? 'Account created. Check your email for a verification code.'
        : 'Account created, but we could not send the email. Please use Resend code.',
      requiresVerification: true,
      emailSent,
      email
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Log in an existing user
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
        if (!user.is_verified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password - request a reset code by email
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);

    // Always respond the same way whether or not the email exists,
    // so we don't let people probe which emails are registered.
    if (rows.length === 0) {
      return res.json({ message: 'If that email is registered, a reset code has been sent.' });
    }

    // 6-digit numeric code, expires in 15 minutes
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE id = ?',
      [resetCode, expires, rows[0].id]
    );

    try {
      await sendPasswordResetEmail(email, resetCode);
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr);
      return res.status(500).json({ error: 'Could not send reset email. Please try again shortly.' });
    }

    res.json({ message: 'If that email is registered, a reset code has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password - verify code and set a new password
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and newPassword are all required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid code or email' });
    }

    const user = rows[0];

    if (!user.reset_code || user.reset_code !== code) {
      return res.status(400).json({ error: 'Invalid code or email' });
    }
    if (!user.reset_code_expires || new Date(user.reset_code_expires).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This reset code has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password = ?, reset_code = NULL, reset_code_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 code attempts per IP per window
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // 3 resend requests per IP per window
  message: { error: 'Too many resend requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/verify-email - check the code and activate the account
router.post('/verify-email', verifyEmailLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid code or email' });
    }

    const user = rows[0];

    if (user.is_verified) {
      return res.json({ message: 'This account is already verified. You can log in.' });
    }
    if (!user.verify_code || user.verify_code !== String(code).trim()) {
      return res.status(400).json({ error: 'Invalid code or email' });
    }
    if (!user.verify_code_expires || new Date(user.verify_code_expires).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This code has expired. Please request a new one.' });
    }

    await pool.query(
      'UPDATE users SET is_verified = 1, verify_code = NULL, verify_code_expires = NULL WHERE id = ?',
      [user.id]
    );

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/resend-verification - send a fresh code
router.post('/resend-verification', resendVerificationLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const genericMessage = 'If that account is waiting for verification, a new code has been sent.';

    const [rows] = await pool.query(
      'SELECT id, name FROM users WHERE email = ? AND is_verified = 0',
      [email]
    );
    if (rows.length === 0) {
      return res.json({ message: genericMessage });
    }

    const verifyCode = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'UPDATE users SET verify_code = ?, verify_code_expires = ? WHERE id = ?',
      [verifyCode, expires, rows[0].id]
    );

    try {
      await sendVerificationEmail(email, rows[0].name, verifyCode);
    } catch (emailErr) {
      console.error('Failed to resend verification email:', emailErr);
      return res.status(500).json({ error: 'Could not send the email. Please try again shortly.' });
    }

    res.json({ message: genericMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;