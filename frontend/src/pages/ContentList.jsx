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
    <div className="page-shell--wide">
      <div className="panel">
        <h2 className="text-2xl mb-6">Chemistry Materials</h2>
        {error && <p className="badge-error mb-4">{error}</p>}
        {loading ? (
          <p>Loading materials...</p>
        ) : content.length === 0 && !error ? (
          <p>No materials uploaded yet.</p>
        ) : (
          <div>
            {content.map((item) => (
              <div key={item.id} className="py-3 border-b border-[var(--color-line)]">
                <span className="font-medium">{item.title}</span>
                <span className="text-[var(--color-ink)]/60">
                  {' '}— {item.grade}, {item.topic} (by {item.uploaded_by})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ContentList;
