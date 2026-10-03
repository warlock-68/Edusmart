const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const pool = require('../db');

const router = express.Router();

// Applicant documents are stored here (NOT served publicly - only an admin-only route will open them)
const UPLOAD_DIR = 'uploads/applications/';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Limit how many applications one connection can submit (stops spam)
const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many applications from this connection. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + '.pdf');
  }
});

// Only allow PDF files
const fileFilter = (req, file, cb) => {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';
  if (isPdfMime && isPdfExt) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Three document slots: qualification (required), cv (required), other (optional)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 } // 5MB each
}).fields([
  { name: 'qualification', maxCount: 1 },
  { name: 'cv', maxCount: 1 },
  { name: 'other', maxCount: 1 }
]);

function handleUpload(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Each file must be 5 MB or smaller' });
    }
    if (err.message === 'Only PDF files are allowed') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }
    return res.status(400).json({ error: 'Upload failed. Please check your files and try again.' });
  });
}

function uploadedFiles(req) {
  return Object.values(req.files || {}).flat();
}

function removeFiles(files) {
  for (const f of files) {
    fs.unlink(f.path, () => {});
  }
}

// Check the real file signature (%PDF-), not just the extension/MIME type, which can be faked
function isRealPdf(filePath) {
  try {
    const buffer = Buffer.alloc(5);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);
    return buffer.toString('ascii') === '%PDF-';
  } catch (err) {
    return false;
  }
}

// POST /api/applications - PUBLIC: anyone can apply to become a tutor.
// No account is needed. The application is stored as "pending" until an admin reviews it.
router.post('/', applyLimiter, handleUpload, async (req, res) => {
  const files = uploadedFiles(req);
  const fail = (status, error) => {
    removeFiles(files);
    return res.status(status).json({ error });
  };

  let conn;
  try {
    const { name, email, password, qualifications, experience } = req.body || {};

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof qualifications !== 'string'
    ) {
      return fail(400, 'Name, email, password and qualifications are required');
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanQualifications = qualifications.trim();
    const cleanExperience = typeof experience === 'string' ? experience.trim() : '';

    if (cleanName.length < 2 || cleanName.length > 100) {
      return fail(400, 'Please enter your full name');
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cleanEmail) || cleanEmail.length > 150) {
      return fail(400, 'Please enter a valid email address');
    }

    if (password.length < 6) {
      return fail(400, 'Password must be at least 6 characters');
    }

    if (cleanQualifications.length < 20) {
      return fail(400, 'Please describe your qualifications in a little more detail (at least 20 characters)');
    }
    if (cleanQualifications.length > 2000 || cleanExperience.length > 2000) {
      return fail(400, 'Qualifications and experience must each be under 2000 characters');
    }

    // Required documents
    const qualificationFile = req.files?.qualification?.[0];
    const cvFile = req.files?.cv?.[0];
    const otherFile = req.files?.other?.[0];

    if (!qualificationFile || !cvFile) {
      return fail(400, 'Please upload your qualification certificate (or transcript) and your CV as PDF files');
    }

    for (const f of files) {
      if (!isRealPdf(f.path)) {
        return fail(400, 'One of the uploaded files is not a valid PDF');
      }
    }

    // Already has an account?
    const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingUser.length > 0) {
      return fail(409, 'An account with this email already exists. Please use a different email.');
    }

    // Already has an application waiting?
    const [pending] = await pool.query(
      "SELECT id FROM tutor_applications WHERE email = ? AND status = 'pending'",
      [cleanEmail]
    );
    if (pending.length > 0) {
      return fail(409, 'You already have a pending application with this email.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Save the application and its documents together (all or nothing)
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO tutor_applications (full_name, email, password_hash, qualifications, experience)
       VALUES (?, ?, ?, ?, ?)`,
      [cleanName, cleanEmail, passwordHash, cleanQualifications, cleanExperience || null]
    );
    const applicationId = result.insertId;

    const docs = [
      ['qualification', qualificationFile],
      ['cv', cvFile]
    ];
    if (otherFile) docs.push(['other', otherFile]);

    for (const [docType, f] of docs) {
      await conn.query(
        `INSERT INTO tutor_application_documents (application_id, doc_type, original_name, file_path)
         VALUES (?, ?, ?, ?)`,
        [applicationId, docType, f.originalname.slice(0, 255), f.path]
      );
    }

    await conn.commit();

    res.status(201).json({
      message: 'Application submitted! You will be able to log in as a tutor once an admin approves it.'
    });
  } catch (err) {
    if (conn) await conn.rollback();
    removeFiles(files);
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
