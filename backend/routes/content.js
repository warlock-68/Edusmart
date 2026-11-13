const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

// Configure storage: where files go and what they're named
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + '.pdf';
    cb(null, uniqueName);
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

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// POST /api/content/upload
// Admin uploads appear on the Content page; tutor uploads appear on that tutor's profile
router.post('/upload', verifyToken, requireRole('tutor', 'admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Verify the file is actually a PDF by checking its binary signature (%PDF-),
    // not just trusting the extension/MIME type which can be faked
    const buffer = Buffer.alloc(5);
    const fd = fs.openSync(req.file.path, 'r');
    fs.readSync(fd, buffer, 0, 5, 0);
    fs.closeSync(fd);

    if (buffer.toString('ascii') !== '%PDF-') {
      fs.unlinkSync(req.file.path); // delete the fake file we just saved
      return res.status(400).json({ error: 'The uploaded file is not a valid PDF' });
    }

    const { title, topic_id } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const uploaderId = req.user.id;

    const [result] = await pool.query(
      'INSERT INTO content (uploader_id, topic_id, title, file_path, file_type) VALUES (?, ?, ?, ?, ?)',
      [uploaderId, topic_id || null, title, req.file.path, 'pdf']
    );

    res.status(201).json({
      message: 'File uploaded successfully',
      contentId: result.insertId,
      fileName: req.file.filename
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// Handles errors thrown by multer during upload (e.g. file too large)
router.use('/upload', (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// Handle multer errors (e.g. wrong file type, too large) with a clean message
router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// GET /api/content - the official Content page: ADMIN uploads only, optionally filtered by topic
router.get('/', verifyToken, async (req, res) => {
  try {
    const { topic_id } = req.query;
    let query = `
      SELECT content.id, content.title, content.file_type, content.created_at,
             curriculum_topics.topic, curriculum_topics.grade,
             users.name AS uploaded_by
      FROM content
      LEFT JOIN curriculum_topics ON content.topic_id = curriculum_topics.id
      INNER JOIN users ON content.uploader_id = users.id
      WHERE users.role = 'admin'
    `;
    const params = [];

    if (topic_id) {
      query += ' AND content.topic_id = ?';
      params.push(topic_id);
    }

    query += ' ORDER BY content.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/content/tutor/:tutorId - everything one tutor has uploaded (for their profile)
router.get('/tutor/:tutorId', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT content.id, content.title, content.file_type, content.created_at,
              curriculum_topics.topic, curriculum_topics.grade
       FROM content
       LEFT JOIN curriculum_topics ON content.topic_id = curriculum_topics.id
       WHERE content.uploader_id = ?
       ORDER BY content.created_at DESC`,
      [req.params.tutorId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/content/topics - list all curriculum topics (for dropdowns)
router.get('/topics', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, subject, grade, topic FROM curriculum_topics ORDER BY grade, topic');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/content/:id/download - download a specific file
router.get('/:id/download', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM content WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }
    await pool.query(
      'INSERT INTO usage_logs (user_id, content_id, topic_id, action_type) VALUES (?, ?, ?, ?)',
      [req.user.id, rows[0].id, rows[0].topic_id, 'download']
    );

    const filePath = path.resolve(rows[0].file_path);
    res.download(filePath, `${rows[0].title}.pdf`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/content/notes - every topic, with a flag showing whether it has notes yet
router.get('/notes', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.grade, t.topic, (n.id IS NOT NULL) AS has_notes
       FROM curriculum_topics t
       LEFT JOIN topic_notes n ON n.topic_id = t.id
       ORDER BY t.grade, t.topic`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/content/notes/:topicId - the notes for one topic
router.get('/notes/:topicId', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.grade, t.topic, n.body, n.updated_at
       FROM curriculum_topics t
       LEFT JOIN topic_notes n ON n.topic_id = t.id
       WHERE t.id = ?`,
      [req.params.topicId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/content/notes/:topicId - ADMIN ONLY: create or update the notes for a topic
router.put('/notes/:topicId', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Notes cannot be empty' });
    }
    await pool.query(
      `INSERT INTO topic_notes (topic_id, body, updated_by) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE body = VALUES(body), updated_by = VALUES(updated_by)`,
      [req.params.topicId, body, req.user.id]
    );
    res.json({ message: 'Notes saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router;