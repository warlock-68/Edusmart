const express = require('express');
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { getChemistryExplanation } = require('../llmService');

const router = express.Router();

// GET /api/dashboard/overview - admin/teacher analytics
router.get('/overview', verifyToken, requireRole('teacher', 'tutor', 'admin'), async (req, res) => {
  try {
    const [downloads] = await pool.query(`
      SELECT content.title, curriculum_topics.topic, COUNT(usage_logs.id) AS download_count
      FROM usage_logs
      JOIN content ON usage_logs.content_id = content.id
      LEFT JOIN curriculum_topics ON content.topic_id = curriculum_topics.id
      WHERE usage_logs.action_type = 'download'
      GROUP BY content.id
      ORDER BY download_count DESC
    `);

    const [topicEngagement] = await pool.query(`
      SELECT curriculum_topics.topic, curriculum_topics.grade, COUNT(student_queries.id) AS questions_asked
      FROM curriculum_topics
      LEFT JOIN student_queries ON student_queries.topic_id = curriculum_topics.id
      GROUP BY curriculum_topics.id
      ORDER BY questions_asked DESC
    `);

    const [quizPerformance] = await pool.query(`
      SELECT curriculum_topics.topic, curriculum_topics.grade,
             COUNT(quiz_attempts.id) AS attempts,
             AVG(quiz_attempts.score) AS avg_score
      FROM quiz_attempts
      JOIN quizzes ON quiz_attempts.quiz_id = quizzes.id
      JOIN curriculum_topics ON quizzes.topic_id = curriculum_topics.id
      GROUP BY curriculum_topics.id
      ORDER BY avg_score ASC
    `);

    res.json({ downloads, topicEngagement, quizPerformance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/weak-areas - for the logged-in student
router.get('/weak-areas', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT topic_id, topic, grade, AVG(pct) AS avg_percentage
      FROM (
        SELECT curriculum_topics.id AS topic_id, curriculum_topics.topic, curriculum_topics.grade,
               (quiz_attempts.score / (
                 SELECT COUNT(*) FROM quiz_questions WHERE quiz_questions.quiz_id = quiz_attempts.quiz_id
               )) AS pct
        FROM quiz_attempts
        JOIN quizzes ON quiz_attempts.quiz_id = quizzes.id
        JOIN curriculum_topics ON quizzes.topic_id = curriculum_topics.id
        WHERE quiz_attempts.student_id = ?
      ) AS attempt_scores
      GROUP BY topic_id, topic, grade
      HAVING avg_percentage < 0.6
    `, [req.user.id]);

    res.json(rows.map(r => ({
      topic_id: r.topic_id,
      topic: r.topic,
      grade: r.grade,
      avg_percentage: Math.round(r.avg_percentage * 100)
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/catchup/:topicId - generate revision notes + video link for a weak topic
router.get('/catchup/:topicId', verifyToken, async (req, res) => {
  try {
    const [topicRows] = await pool.query('SELECT * FROM curriculum_topics WHERE id = ?', [req.params.topicId]);
    if (topicRows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    const topic = topicRows[0];

    const [allTopics] = await pool.query('SELECT grade, topic FROM curriculum_topics');
    const notes = await getChemistryExplanation(
      `Give me a full revision summary of ${topic.topic}`,
      allTopics
    );

    const videoSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(topic.topic + ' chemistry KCSE')}`;

    res.json({ topic: topic.topic, grade: topic.grade, notes, videoSearchUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;