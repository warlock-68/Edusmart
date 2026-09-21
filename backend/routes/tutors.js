const express = require('express');
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

// GET /api/tutors - list all tutors with their topics and average rating
router.get('/', verifyToken, async (req, res) => {
  try {
    const [tutors] = await pool.query(
      `SELECT u.id, u.name, u.availability_note,
              ROUND(AVG(r.rating), 1) AS avg_rating,
              COUNT(DISTINCT r.id) AS rating_count
       FROM users u
       LEFT JOIN tutor_ratings r ON r.tutor_id = u.id
       WHERE u.role = 'tutor'
       GROUP BY u.id, u.name, u.availability_note
       ORDER BY avg_rating DESC`
    );

    for (const tutor of tutors) {
      const [topics] = await pool.query(
        `SELECT ct.id, ct.grade, ct.topic
         FROM tutor_topics tt
         JOIN curriculum_topics ct ON ct.id = tt.topic_id
         WHERE tt.tutor_id = ?`,
        [tutor.id]
      );
      tutor.topics = topics;
    }

    res.json(tutors);
  } catch (err) {
    console.error('Error fetching tutors:', err);
    res.status(500).json({ error: 'Could not load tutors' });
  }
});

// GET /api/tutors/:id - single tutor profile with topics and reviews
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [[tutor]] = await pool.query(
      `SELECT u.id, u.name, u.availability_note,
              ROUND(AVG(r.rating), 1) AS avg_rating,
              COUNT(DISTINCT r.id) AS rating_count
       FROM users u
       LEFT JOIN tutor_ratings r ON r.tutor_id = u.id
       WHERE u.role = 'tutor' AND u.id = ?
       GROUP BY u.id, u.name, u.availability_note`,
      [req.params.id]
    );

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor not found' });
    }

    const [topics] = await pool.query(
      `SELECT ct.id, ct.grade, ct.topic
       FROM tutor_topics tt
       JOIN curriculum_topics ct ON ct.id = tt.topic_id
       WHERE tt.tutor_id = ?`,
      [tutor.id]
    );

    const [reviews] = await pool.query(
      `SELECT r.rating, r.comment, r.created_at, u.name AS student_name
       FROM tutor_ratings r
       JOIN users u ON u.id = r.student_id
       WHERE r.tutor_id = ?
       ORDER BY r.created_at DESC`,
      [tutor.id]
    );

    tutor.topics = topics;
    tutor.reviews = reviews;
    res.json(tutor);
  } catch (err) {
    console.error('Error fetching tutor profile:', err);
    res.status(500).json({ error: 'Could not load tutor profile' });
  }
});

// PUT /api/tutors/availability - tutor sets their availability note
router.put('/availability', verifyToken, requireRole('tutor'), async (req, res) => {
  const { availability_note } = req.body;
  if (!availability_note || !availability_note.trim()) {
    return res.status(400).json({ error: 'Availability note is required' });
  }
  try {
    await pool.query('UPDATE users SET availability_note = ? WHERE id = ?', [availability_note.trim(), req.user.id]);
    res.json({ message: 'Availability updated' });
  } catch (err) {
    console.error('Error updating availability:', err);
    res.status(500).json({ error: 'Could not update availability' });
  }
});

// GET /api/tutors/topics/mine - tutor sees their own listed topics
router.get('/topics/mine', verifyToken, requireRole('tutor'), async (req, res) => {
  try {
    const [topics] = await pool.query(
      `SELECT ct.id, ct.grade, ct.topic
       FROM tutor_topics tt
       JOIN curriculum_topics ct ON ct.id = tt.topic_id
       WHERE tt.tutor_id = ?`,
      [req.user.id]
    );
    res.json(topics);
  } catch (err) {
    console.error('Error fetching own topics:', err);
    res.status(500).json({ error: 'Could not load your topics' });
  }
});

// POST /api/tutors/topics - tutor adds a topic they teach
router.post('/topics', verifyToken, requireRole('tutor'), async (req, res) => {
  const { topic_id } = req.body;
  if (!topic_id) {
    return res.status(400).json({ error: 'topic_id is required' });
  }
  try {
    await pool.query(
      'INSERT IGNORE INTO tutor_topics (tutor_id, topic_id) VALUES (?, ?)',
      [req.user.id, topic_id]
    );
    res.json({ message: 'Topic added' });
  } catch (err) {
    console.error('Error adding topic:', err);
    res.status(500).json({ error: 'Could not add topic' });
  }
});

// DELETE /api/tutors/topics/:topicId - tutor removes a topic they teach
router.delete('/topics/:topicId', verifyToken, requireRole('tutor'), async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM tutor_topics WHERE tutor_id = ? AND topic_id = ?',
      [req.user.id, req.params.topicId]
    );
    res.json({ message: 'Topic removed' });
  } catch (err) {
    console.error('Error removing topic:', err);
    res.status(500).json({ error: 'Could not remove topic' });
  }
});

module.exports = router;