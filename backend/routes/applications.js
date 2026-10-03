const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const pool = require('../db');

const router = express.Router();

// Limit how many applications one connection can submit (stops spam)
const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many applications from this connection. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// POST /api/applications - PUBLIC: anyone can apply to become a tutor.
// No account is needed. The application is stored as "pending" until an admin reviews it.
router.post('/', applyLimiter, async (req, res) => {
  try {
    const { name, email, password, qualifications, experience } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof qualifications !== 'string'
    ) {
      return res.status(400).json({ error: 'Name, email, password and qualifications are required' });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanQualifications = qualifications.trim();
    const cleanExperience = typeof experience === 'string' ? experience.trim() : '';

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({ error: 'Please enter your full name' });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cleanEmail) || cleanEmail.length > 150) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (cleanQualifications.length < 20) {
      return res.status(400).json({
        error: 'Please describe your qualifications in a little more detail (at least 20 characters)'
      });
    }
    if (cleanQualifications.length > 2000 || cleanExperience.length > 2000) {
      return res.status(400).json({ error: 'Qualifications and experience must each be under 2000 characters' });
    }

    // Already has an account?
    const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Please use a different email.' });
    }

    // Already has an application waiting?
    const [pending] = await pool.query(
      "SELECT id FROM tutor_applications WHERE email = ? AND status = 'pending'",
      [cleanEmail]
    );
    if (pending.length > 0) {
      return res.status(409).json({ error: 'You already have a pending application with this email.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO tutor_applications (full_name, email, password_hash, qualifications, experience)
       VALUES (?, ?, ?, ?, ?)`,
      [cleanName, cleanEmail, passwordHash, cleanQualifications, cleanExperience || null]
    );

    res.status(201).json({
      message: 'Application submitted! You will be able to log in as a tutor once an admin approves it.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
