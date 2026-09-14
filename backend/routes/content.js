const express = require('express');
const multer = require('multer');
const path = require('path');
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
router.post('/upload', verifyToken, requireRole('teacher', 'tutor', 'admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
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

// Handle multer errors (e.g. wrong file type, too large) with a clean message
router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// GET /api/content - list all content, optionally filtered by topic
router.get('/', verifyToken, async (req, res) => {
  try {
    const { topic_id } = req.query;
    let query = `
      SELECT content.id, content.title, content.file_type, content.created_at,
             curriculum_topics.topic, curriculum_topics.grade,
             users.name AS uploaded_by
      FROM content
      LEFT JOIN curriculum_topics ON content.topic_id = curriculum_topics.id
      LEFT JOIN users ON content.uploader_id = users.id
    `;
    const params = [];

    if (topic_id) {
      query += ' WHERE content.topic_id = ?';
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


module.exports = router;