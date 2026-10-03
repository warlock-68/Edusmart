const express = require('express');
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

// Every route in this file is admin-only
router.use(verifyToken, requireRole('admin'));

// GET /api/admin/applications - all applications, pending first, newest first
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, qualifications, experience, status, admin_note, created_at, reviewed_at
       FROM tutor_applications
       ORDER BY (status = 'pending') DESC, created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/applications/:id/approve - creates the tutor account from the application
router.put('/:id/approve', async (req, res) => {
  const applicationId = Number(req.params.id);
  if (!Number.isInteger(applicationId) || applicationId <= 0) {
    return res.status(400).json({ error: 'Invalid application id' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [apps] = await conn.query(
      'SELECT * FROM tutor_applications WHERE id = ? FOR UPDATE',
      [applicationId]
    );
    if (apps.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = apps[0];
    if (application.status !== 'pending') {
      await conn.rollback();
      return res.status(409).json({ error: 'This application has already been reviewed' });
    }

    // Someone may have registered as a student with this email since the application was sent
    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [application.email]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        error: 'An account with this email already exists, so a tutor account cannot be created for it.'
      });
    }

    await conn.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'tutor')",
      [application.full_name, application.email, application.password_hash]
    );

    await conn.query(
      "UPDATE tutor_applications SET status = 'approved', reviewed_at = NOW() WHERE id = ?",
      [applicationId]
    );

    await conn.commit();
    res.json({ message: `Approved. ${application.full_name} can now log in as a tutor.` });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// PUT /api/admin/applications/:id/reject - optional note explaining why
router.put('/:id/reject', async (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({ error: 'Invalid application id' });
    }

    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 500) : '';

    const [result] = await pool.query(
      `UPDATE tutor_applications
       SET status = 'rejected', admin_note = ?, reviewed_at = NOW()
       WHERE id = ? AND status = 'pending'`,
      [note || null, applicationId]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ error: 'Application not found or already reviewed' });
    }

    res.json({ message: 'Application rejected.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
