import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function AskQuestion() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAnswer(null);

    if (!question.trim()) {
      setError('Please enter a question.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await api.post(
        '/query',
        { question: question.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnswer(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const matchedCurriculumTopic = Boolean(answer && answer.topic_id);

  return (
    <div style={{ maxWidth: 600, margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2>Ask a Chemistry Question</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          placeholder="e.g. What is an alkane?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          rows={3}
          style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8, fontSize: 16 }}
        />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {answer && (
        <div style={{ marginTop: 30, border: '1px solid #ccc', borderRadius: 8, padding: 20 }}>
          {!matchedCurriculumTopic && (
            <p style={{ fontStyle: 'italic', color: '#666' }}>
              This question doesn't match a specific curriculum topic, so no revision quiz is available for it.
            </p>
          )}
          {matchedCurriculumTopic && (
            <>
              <p><strong>Grade:</strong> {answer.grade}</p>
              <p><strong>Topic:</strong> {answer.matched_topic}</p>
            </>
          )}
          <p><strong>Explanation:</strong> {answer.explanation}</p>
          <p><strong>Example:</strong> {answer.example}</p>
          <p><strong>Practice Question:</strong> {answer.practice_question}</p>
          {matchedCurriculumTopic && (
            <button
              onClick={() => navigate(`/quiz?topic_id=${answer.topic_id}`)}
              style={{ marginTop: 15, padding: 10, width: '100%' }}
            >
              Would you like to attempt some revision questions on this topic?
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default AskQuestion;
