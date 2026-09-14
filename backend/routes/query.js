const express = require('express');
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const { getChemistryExplanation, LLMServiceError } = require('../llmService');

const router = express.Router();

// POST /api/query - student asks a question, gets an aligned explanation
router.post('/', verifyToken, async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const [topics] = await pool.query('SELECT id, grade, topic FROM curriculum_topics');

    if (!topics || topics.length === 0) {
      return res.status(503).json({ error: 'No curriculum topics are set up yet. Please contact an administrator.' });
    }

    let result;
    try {
      result = await getChemistryExplanation(question.trim(), topics);
    } catch (err) {
      if (err instanceof LLMServiceError) {
        console.error('LLM service error:', err.message, err.cause || '');
        return res.status(503).json({ error: err.message });
      }
      throw err; // unexpected error - fall through to generic handler below
    }

    const matchedTopicData = topics.find(t =>
      result.matched_topic.toLowerCase().includes(t.topic.toLowerCase())
    );
    const topicId = matchedTopicData ? matchedTopicData.id : null;

    await pool.query(
      'INSERT INTO student_queries (student_id, topic_id, query_text, response_text) VALUES (?, ?, ?, ?)',
      [req.user.id, topicId, question.trim(), JSON.stringify(result)]
    );

    res.json({ ...result, grade: matchedTopicData ? matchedTopicData.grade : null, topic_id: topicId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;