import { useState, useEffect } from 'react';
import api from '../api';

function ContentList() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setError('');
    api.get('/content', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setContent(res.data))
      .catch(() => setError('Could not load content'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2>Chemistry Materials</h2>
      {error && <p>{error}</p>}
      {loading ? (
        <p>Loading materials...</p>
      ) : content.length === 0 && !error ? (
        <p>No materials uploaded yet.</p>
      ) : (
        <ul>
          {content.map((item) => (
            <li key={item.id} style={{ marginBottom: 10 }}>
              <strong>{item.title}</strong> — {item.grade}, {item.topic} (by {item.uploaded_by})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ContentList;
