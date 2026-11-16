const express = require('express');
const multer = require('multer');
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

// Photos are kept in memory only long enough to save them to the database
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Photo must be a JPG, PNG or WEBP image'), false);
    }
  }
});

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

const clip = (value, max) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === '' ? null : text.slice(0, max);
};

// GET /api/profile/me - my own profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [[user]] = await pool.query('SELECT id, name, role FROM users WHERE id = ?', [req.user.id]);
    const [[profile]] = await pool.query(
      'SELECT headline, bio, school, form_level, experience_years, education, languages, learning_goal FROM user_profiles WHERE user_id = ?',
      [req.user.id]
    );
    const [[photo]] = await pool.query('SELECT user_id FROM user_photos WHERE user_id = ?', [req.user.id]);
    res.json({ ...user, profile: profile || {}, has_photo: !!photo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/profile/me - save my profile details
router.put('/me', verifyToken, async (req, res) => {
  try {
    const b = req.body || {};
    let years = parseInt(b.experience_years, 10);
    if (isNaN(years) || years < 0 || years > 60) years = null;

    await pool.query(
      `INSERT INTO user_profiles
         (user_id, headline, bio, school, form_level, experience_years, education, languages, learning_goal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         headline = VALUES(headline), bio = VALUES(bio), school = VALUES(school),
         form_level = VALUES(form_level), experience_years = VALUES(experience_years),
         education = VALUES(education), languages = VALUES(languages),
         learning_goal = VALUES(learning_goal)`,
      [
        req.user.id,
        clip(b.headline, 150),
        clip(b.bio, 2000),
        clip(b.school, 150),
        clip(b.form_level, 20),
        years,
        clip(b.education, 255),
        clip(b.languages, 150),
        clip(b.learning_goal, 255)
      ]
    );
    res.json({ message: 'Profile saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/me/photo - upload or replace my photo
router.post('/me/photo', verifyToken, (req, res) => {
  photoUpload.single('photo')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Photo is too large' : err.message;
      return res.status(400).json({ error: message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }
    try {
      await pool.query(
        `INSERT INTO user_photos (user_id, mime, data) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE mime = VALUES(mime), data = VALUES(data)`,
        [req.user.id, req.file.mimetype, req.file.buffer]
      );
      res.json({ message: 'Photo saved' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// GET /api/profile/me/photo - my own photo (needs login, so it stays private)
router.get('/me/photo', verifyToken, async (req, res) => {
  try {
    const [[photo]] = await pool.query('SELECT mime, data FROM user_photos WHERE user_id = ?', [req.user.id]);
    if (!photo) return res.status(404).json({ error: 'No photo' });
    res.set('Content-Type', photo.mime);
    res.set('Cache-Control', 'private, max-age=60');
    res.send(photo.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/profile/photo/:userId - tutor and admin photos only (public, so <img> tags can load them)
router.get('/photo/:userId', async (req, res) => {
  try {
    const [[photo]] = await pool.query(
      "SELECT p.mime, p.data FROM user_photos p JOIN users u ON u.id = p.user_id WHERE p.user_id = ? AND u.role IN ('tutor', 'admin')",
      [req.params.userId]
    );
    if (!photo) return res.status(404).json({ error: 'No photo' });
    res.set('Content-Type', photo.mime);
    res.set('Cache-Control', 'public, max-age=300');
    res.send(photo.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/profile/public/:tutorId - a tutor's public profile and materials
router.get('/public/:tutorId', verifyToken, async (req, res) => {
  try {
    const [[tutor]] = await pool.query(
      "SELECT id, name FROM users WHERE id = ? AND role = 'tutor'",
      [req.params.tutorId]
    );
    if (!tutor) return res.status(404).json({ error: 'Tutor not found' });

    const [[profile]] = await pool.query(
      'SELECT headline, bio, experience_years, education, languages FROM user_profiles WHERE user_id = ?',
      [tutor.id]
    );
    const [[photo]] = await pool.query('SELECT user_id FROM user_photos WHERE user_id = ?', [tutor.id]);
    const [materials] = await pool.query(
      `SELECT m.id, m.title, m.file_size, m.created_at, t.grade, t.topic
       FROM tutor_materials m
       LEFT JOIN curriculum_topics t ON m.topic_id = t.id
       WHERE m.tutor_id = ?
       ORDER BY m.created_at DESC`,
      [tutor.id]
    );
    res.json({ ...tutor, profile: profile || {}, has_photo: !!photo, materials });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profile/materials - a tutor uploads a PDF to their own profile
router.post('/materials', verifyToken, requireRole('tutor'), (req, res) => {
  pdfUpload.single('file')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large. Maximum size is 5MB.' : err.message;
      return res.status(400).json({ error: message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    if (req.file.buffer.slice(0, 5).toString('ascii') !== '%PDF-') {
      return res.status(400).json({ error: 'The uploaded file is not a valid PDF' });
    }
    const title = clip(req.body.title, 200);
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    try {
      const topicId = parseInt(req.body.topic_id, 10);
      await pool.query(
        'INSERT INTO tutor_materials (tutor_id, topic_id, title, file_name, file_size, data) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, isNaN(topicId) ? null : topicId, title, req.file.originalname.slice(0, 255), req.file.size, req.file.buffer]
      );
      res.status(201).json({ message: 'Material uploaded' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

// GET /api/profile/materials/:id/download
router.get('/materials/:id/download', verifyToken, async (req, res) => {
  try {
    const [[row]] = await pool.query('SELECT title, data FROM tutor_materials WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'File not found' });
    res.attachment(row.title + '.pdf');
    res.send(row.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/profile/materials/:id - the owner (or an admin) removes a material
router.delete('/materials/:id', verifyToken, async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM tutor_materials WHERE id = ? AND (tutor_id = ? OR ? = ?)',
      [req.params.id, req.user.id, req.user.role, 'admin']
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }
    res.json({ message: 'Material deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;