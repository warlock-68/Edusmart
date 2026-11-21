const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const { getChatReply, ChatServiceError } = require('../chatService');

const router = express.Router();

// A student who asks this many questions about one topic is treated as struggling
const STRUGGLING_THRESHOLD = 3;

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 chat messages per IP per minute
  message: { error: 'You are sending messages too fast. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/chat - the chatbot: understands slang, finds the topic, spots struggling
router.post('/', verifyToken, chatLimiter, async (req, res) => {
  try {
    if (req.user.role !== 'student' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'The chat assistant is for students.' });
    }

    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Please type a message.' });
    }
    if (message.trim().length > 500) {
      return res.status(400).json({ error: 'Message is too long. Please keep it under 500 characters.' });
    }

    const [topics] = await pool.query('SELECT id, grade, topic FROM curriculum_topics');
    if (!topics || topics.length === 0) {
      return res.status(503).json({ error: 'No curriculum topics are set up yet.' });
    }

    let result;
    try {
      result = await getChatReply(message.trim(), topics);
    } catch (err) {
      if (err instanceof ChatServiceError) {
        console.error('Chat service error:', err.message, err.cause || '');
        return res.status(503).json({ error: err.message });
      }
      throw err;
    }

    // Match the topic the AI picked: exact name first, then a partial match
    let matched = null;
    if (result.matched_topic) {
      const wanted = result.matched_topic.toLowerCase().trim();
      matched =
        topics.find(t => t.topic.toLowerCase() === wanted) ||
        topics.find(t => wanted.includes(t.topic.toLowerCase()));
    }
    const topicId = matched ? matched.id : null;

    // Save the question so it counts towards the student's history and the dashboard
    await pool.query(
      'INSERT INTO student_queries (student_id, topic_id, query_text, response_text) VALUES (?, ?, ?, ?)',
      [req.user.id, topicId, message.trim(), JSON.stringify(result)]
    );

    // How many times has this student asked about this topic?
    let questionCount = 0;
    let struggling = false;
    let tutors = [];
    if (topicId) {
      const [[row]] = await pool.query(
        'SELECT COUNT(*) AS total FROM student_queries WHERE student_id = ? AND topic_id = ?',
        [req.user.id, topicId]
      );
      questionCount = row.total;
      struggling = questionCount >= STRUGGLING_THRESHOLD;
      
    // Tutors who teach this topic, best rated first (up to 3)
   
    if (topicId) {
      const [rows] = await pool.query(
        `SELECT u.id, u.name,
                (SELECT headline FROM user_profiles WHERE user_id = u.id) AS headline,
                (SELECT COUNT(*) FROM user_photos WHERE user_id = u.id) AS has_photo,
                ROUND(AVG(r.rating), 1) AS avg_rating,
                COUNT(DISTINCT r.id) AS rating_count
         FROM tutor_topics tt
         JOIN users u ON u.id = tt.tutor_id
         LEFT JOIN tutor_ratings r ON r.tutor_id = u.id
         WHERE tt.topic_id = ? AND u.role = 'tutor'
         GROUP BY u.id, u.name
         ORDER BY AVG(r.rating) IS NULL, AVG(r.rating) DESC, u.name
         LIMIT 3`,
        [topicId]
      );
      tutors = rows;
    }
    }

    res.json({
      understood_as: result.understood_as,
      reply: result.reply,
      needs_clarification: result.needs_clarification,
      topic_id: topicId,
      topic: matched ? matched.topic : null,
      grade: matched ? matched.grade : null,
      question_count: questionCount,
      struggling,
      tutors
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;