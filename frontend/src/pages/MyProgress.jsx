import { useState, useEffect } from 'react';
import api from '../api';

function MyProgress() {
  const [weakAreas, setWeakAreas] = useState([]);
  const [loadingWeakAreas, setLoadingWeakAreas] = useState(true);
  const [error, setError] = useState('');
  const [catchup, setCatchup] = useState(null);
  const [loadingCatchup, setLoadingCatchup] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setLoadingWeakAreas(true);
    setError('');
    api.get('/dashboard/weak-areas', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setWeakAreas(res.data))
      .catch(err => setError(err.response?.data?.error || 'Could not load progress'))
      .finally(() => setLoadingWeakAreas(false));
  }, []);

  const handleGetHelp = async (topicId) => {
    setCatchup(null);
    setError('');
    setLoadingCatchup(true);
    const token = localStorage.getItem('token');
    try {
      const res = await api.get(`/dashboard/catchup/${topicId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCatchup(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load catch-up resources');
    } finally {
      setLoadingCatchup(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2>My Progress</h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h3>Topics to Revisit</h3>
      {loadingWeakAreas ? (
        <p>Loading your progress...</p>
      ) : weakAreas.length === 0 ? (
        <p>No weak areas detected yet — keep taking quizzes to see your progress here.</p>
      ) : (
        weakAreas.map((area) => (
          <div key={area.topic_id} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 15, marginBottom: 15 }}>
            <p><strong>{area.grade}: {area.topic}</strong></p>
            <p>Average Score: {area.avg_percentage}%</p>
            <button onClick={() => handleGetHelp(area.topic_id)} style={{ padding: 8 }}>
              Get Help With This Topic
            </button>
          </div>
        ))
      )}

      {loadingCatchup && <p>Loading resources...</p>}

      {catchup && (
        <div style={{ marginTop: 30, border: '2px solid #4a90e2', borderRadius: 8, padding: 20 }}>
          <h3>Catch-up Notes: {catchup.topic} ({catchup.grade})</h3>
          <p><strong>Explanation:</strong> {catchup.notes.explanation}</p>
          <p><strong>Example:</strong> {catchup.notes.example}</p>
          <p><strong>Practice Question:</strong> {catchup.notes.practice_question}</p>
          <p>
            <a href={catchup.videoSearchUrl} target="_blank" rel="noopener noreferrer">
              Watch videos on this topic on YouTube →
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

export default MyProgress;
