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
    <div className="page-shell--wide">
      <div className="panel">
        <h2 className="text-2xl mb-6">My Progress</h2>

        {error && <p className="badge-error mb-4">{error}</p>}

        <h3 className="text-lg mb-3">Topics to Revisit</h3>
        {loadingWeakAreas ? (
          <p>Loading your progress...</p>
        ) : weakAreas.length === 0 ? (
          <p>No weak areas detected yet — keep taking quizzes to see your progress here.</p>
        ) : (
          weakAreas.map((area) => (
            <div key={area.topic_id} className="border border-[var(--color-line)] rounded-sm p-4 mb-4">
              <p className="font-medium mb-1">{area.grade}: {area.topic}</p>
              <p className="text-[var(--color-ink)]/70 mb-3">Average Score: {area.avg_percentage}%</p>
              <button onClick={() => handleGetHelp(area.topic_id)} className="btn-secondary">
                Get Help With This Topic
              </button>
            </div>
          ))
        )}

        {loadingCatchup && <p className="mt-4">Loading resources...</p>}

        {catchup && (
          <div className="mt-8 border-t-4 border-[var(--color-amber)] bg-white p-6">
            <h3 className="text-lg mb-4">Catch-up Notes: {catchup.topic} ({catchup.grade})</h3>
            <p className="mb-3"><span className="field-label inline">Explanation:</span> {catchup.notes.explanation}</p>
            <p className="mb-3"><span className="field-label inline">Example:</span> {catchup.notes.example}</p>
            <p className="mb-4"><span className="field-label inline">Practice Question:</span> {catchup.notes.practice_question}</p>
            <a href={catchup.videoSearchUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-bunsen)] font-medium hover:underline">
              Watch videos on this topic on YouTube →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyProgress;