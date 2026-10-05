const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { sendApplicationApprovedEmail, sendApplicationRejectedEmail } = require('../emailService');


const router = express.Router();

// Every route in this file is admin-only
router.use(verifyToken, requireRole('admin'));

// Applicant documents live here. A stored path is only used if it really points inside this folder.
const UPLOADS_ROOT = path.resolve('uploads/applications');

function safeFullPath(filePath) {
  const full = path.resolve(filePath);
  return full.startsWith(UPLOADS_ROOT + path.sep) ? full : null;
}

// GET /api/admin/applications - all applications (with their documents), pending first, newest first
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, qualifications, experience, status, admin_note, created_at, reviewed_at
       FROM tutor_applications
       ORDER BY (status = 'pending') DESC, created_at DESC`
    );

    for (const row of rows) row.documents = [];

    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      const [docs] = await pool.query(
        `SELECT id, application_id, doc_type, original_name
         FROM tutor_application_documents
         WHERE application_id IN (?)
         ORDER BY id`,
        [ids]
      );
      for (const row of rows) {
        row.documents = docs
          .filter((d) => d.application_id === row.id)
          .map((d) => ({ id: d.id, doc_type: d.doc_type, original_name: d.original_name }));
      }
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/applications/documents/:docId/download - admin opens an applicant's document
router.get('/documents/:docId/download', async (req, res) => {
  try {
    const docId = Number(req.params.docId);
    if (!Number.isInteger(docId) || docId <= 0) {
      return res.status(400).json({ error: 'Invalid document id' });
    }

    const [rows] = await pool.query(
      'SELECT original_name, file_path FROM tutor_application_documents WHERE id = ?',
      [docId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fullPath = safeFullPath(rows[0].file_path);
    if (!fullPath || !fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(fullPath, path.basename(rows[0].original_name));
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
        try {
      await sendApplicationApprovedEmail(application.email, application.full_name);
    } catch (emailErr) {
      console.error('Approval email failed:', emailErr);
    }
    res.json({ message: `Approved. ${application.full_name} can now log in as a tutor.` });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// PUT /api/admin/applications/:id/reject - optional note explaining why.
// A rejected applicant's uploaded documents are deleted (we don't keep personal documents we don't need).
router.put('/:id/reject', async (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    if (!Number.isInteger(applicationId) || applicationId <= 0) {
      return res.status(400).json({ error: 'Invalid application id' });
    }

    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
        const [found] = await pool.query(
      'SELECT full_name, email FROM tutor_applications WHERE id = ?',
      [applicationId]
    );

    const [result] = await pool.query(
      `UPDATE tutor_applications
       SET status = 'rejected', admin_note = ?, reviewed_at = NOW()
       WHERE id = ? AND status = 'pending'`,
      [note || null, applicationId]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ error: 'Application not found or already reviewed' });
    }

    // Delete the stored files, then the records that point to them
    const [docs] = await pool.query(
      'SELECT file_path FROM tutor_application_documents WHERE application_id = ?',
      [applicationId]
    );
    for (const doc of docs) {
      const fullPath = safeFullPath(doc.file_path);
      if (fullPath) fs.unlink(fullPath, () => {});
    }
    await pool.query('DELETE FROM tutor_application_documents WHERE application_id = ?', [applicationId]);

        if (found.length > 0) {
      try {
        await sendApplicationRejectedEmail(found[0].email, found[0].full_name, note);
      } catch (emailErr) {
        console.error('Rejection email failed:', emailErr);
      }
    }
    res.json({ message: 'Application rejected.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
