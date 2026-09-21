import { useState, useEffect } from 'react';
import api from '../api';

function ContentList() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setError('');
    api.get('/content', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setContent(res.data))
      .catch(() => setError('Could not load content'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (item) => {
    setDownloadError('');
    setDownloadingId(item.id);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/content/${item.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `${item.title}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setDownloadError(`Could not download "${item.title}". Please try again.`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="page-shell--wide">
      <div className="panel">
        <h2 className="text-2xl mb-6">Chemistry Materials</h2>
        {error && <p className="badge-error mb-4">{error}</p>}
        {downloadError && <p className="badge-error mb-4">{downloadError}</p>}
        {loading ? (
          <p>Loading materials...</p>
        ) : content.length === 0 && !error ? (
          <p>No materials uploaded yet.</p>
        ) : (
          <div>
            {content.map((item) => (
              <div key={item.id} className="py-3 border-b border-[var(--color-line)] flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-medium">{item.title}</span>
                  <span className="text-[var(--color-ink)]/60">
                    {' '}— {item.grade}, {item.topic} (by {item.uploaded_by})
                  </span>
                </div>
                <button
                  onClick={() => handleDownload(item)}
                  disabled={downloadingId === item.id}
                  className="btn-secondary"
                >
                  {downloadingId === item.id ? 'Downloading...' : 'Download'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ContentList;
