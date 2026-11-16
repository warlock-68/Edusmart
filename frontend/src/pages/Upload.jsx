import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function authHeader() {
  return { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
}

function getRole() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')?.role || null;
  } catch {
    return null;
  }
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function Upload() {
  const isTutor = getRole() === 'tutor';

  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [materials, setMaterials] = useState([]);
  const [title, setTitle] = useState('');
  const [topicId, setTopicId] = useState('');
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const loadMaterials = async () => {
    try {
      const me = await api.get('/profile/me', authHeader());
      const mine = await api.get(`/profile/public/${me.data.id}`, authHeader());
      setMaterials(mine.data.materials || []);
    } catch {
      setMaterials([]);
    }
  };

  useEffect(() => {
    if (!isTutor) return;
    setLoadingTopics(true);
    api.get('/content/topics', authHeader())
      .then((res) => setTopics(res.data))
      .catch(() => {
        setMessage('Could not load topics');
        setMessageType('error');
      })
      .finally(() => setLoadingTopics(false));
    loadMaterials();
  }, [isTutor]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.type !== 'application/pdf') {
      setMessage('Please select a PDF file.');
      setMessageType('error');
      setFile(null);
      setFileInputKey((k) => k + 1);
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setMessage('File is too large. Maximum size is 5MB.');
      setMessageType('error');
      setFile(null);
      setFileInputKey((k) => k + 1);
      return;
    }
    setFile(selected);
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!file) {
      setMessage('Please select a PDF file');
      setMessageType('error');
      return;
    }
    if (!topicId) {
      setMessage('Please select a topic');
      setMessageType('error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('topic_id', topicId);

    setSubmitting(true);
    try {
      await api.post('/profile/materials', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessage('Uploaded to your profile!');
      setMessageType('success');
      setTitle('');
      setFile(null);
      setTopicId('');
      setFileInputKey((k) => k + 1);
      loadMaterials();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Upload failed');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const removeMaterial = async (m) => {
    if (!window.confirm(`Delete "${m.title}"?`)) return;
    try {
      await api.delete(`/profile/materials/${m.id}`, authHeader());
      setMaterials(materials.filter((x) => x.id !== m.id));
      setMessage('Deleted');
      setMessageType('success');
    } catch {
      setMessage('Could not delete that material');
      setMessageType('error');
    }
  };

  if (!isTutor) {
    return (
      <div className="page-shell">
        <div className="panel">
          <h2 className="text-2xl mb-6">Upload</h2>
          <p className="mb-4">
            The official chemistry notes are edited directly on the Content page.
            Open a topic there and click Edit notes.
          </p>
          <Link to="/content" className="btn-secondary">Go to Content</Link>
        </div>
      </div>
    );
  }

  const noTopicsAvailable = !loadingTopics && topics.length === 0;

  return (
    <div className="page-shell">
      <div className="panel">
        <h2 className="text-2xl mb-2">Upload to My Profile</h2>
        <p className="mb-6">
          PDFs you upload here appear on your own tutor profile, where students can download them.
        </p>

        {loadingTopics ? (
          <p>Loading topics...</p>
        ) : noTopicsAvailable ? (
          <p>No curriculum topics are set up yet. Please contact an administrator before uploading.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="field-label">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="field-input"
            />

            <label className="field-label">Topic</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              required
              className="field-input"
            >
              <option value="">-- Select Topic --</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.grade} - {t.topic}
                </option>
              ))}
            </select>

            <label className="field-label">PDF File (maximum 5MB)</label>
            <input
              key={fileInputKey}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              required
              className="field-input"
            />

            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Uploading...' : 'Upload'}
            </button>
          </form>
        )}

        {message && (
          <p className={`mt-4 ${messageType === 'error' ? 'badge-error' : 'badge-success'}`}>
            {message}
          </p>
        )}

        <div className="mt-8">
          <h3 className="text-lg mb-2">My uploaded materials</h3>
          {materials.length === 0 ? (
            <p>You have not uploaded anything yet.</p>
          ) : (
            materials.map((m) => (
              <div
                key={m.id}
                className="py-3 border-b border-[var(--color-line)] flex items-center justify-between flex-wrap gap-2"
              >
                <div>
                  <span className="font-medium">{m.title}</span>
                  <span className="text-[var(--color-ink)]/60">
                    {' '}({m.topic ? `${m.grade}: ${m.topic}, ` : ''}{formatSize(m.file_size)})
                  </span>
                </div>
                <button onClick={() => removeMaterial(m)} className="btn-secondary">Delete</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Upload;