const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { sendPasswordResetEmail } = require('../emailService');

const router = express.Router();

// Only these roles may ever be assigned at registration.
// If you add a real "admin" onboarding flow later, keep admin OUT of this
// list and create admin accounts a different way (e.g. directly in the DB
// or via a separate protected endpoint) rather than letting anyone self-register as one.
const ALLOWED_SELF_REGISTER_ROLES = ['student', 'teacher', 'tutor'];

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

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Log in an existing user
router.post('/login', async (req, res) => {
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
router.post('/forgot-password', async (req, res) => {
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
router.post('/reset-password', async (req, res) => {
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

module.exports = router;