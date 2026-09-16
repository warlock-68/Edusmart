import { useState, useEffect } from 'react';
import api from '../api';

function Upload() {
  const [topics, setTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [title, setTitle] = useState('');
  const [topicId, setTopicId] = useState('');
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0); // bump to force-reset the native file input
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' | 'error'

  useEffect(() => {
    const token = localStorage.getItem('token');
    setLoadingTopics(true);
    api.get('/content/topics', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setTopics(res.data))
      .catch(() => {
        setMessage('Could not load topics');
        setMessageType('error');
      })
      .finally(() => setLoadingTopics(false));
  }, []);

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
      setFileInputKey(k => k + 1); // clear the invalid selection from the input
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

    const token = localStorage.getItem('token');
    setSubmitting(true);
    try {
      await api.post('/content/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage('Uploaded successfully!');
      setMessageType('success');
      setTitle('');
      setFile(null);
      setTopicId('');
      setFileInputKey(k => k + 1); // actually clears the visible filename in the file input
    } catch (err) {
      setMessage(err.response?.data?.error || 'Upload failed');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const noTopicsAvailable = !loadingTopics && topics.length === 0;

  return (
    <div className="page-shell">
      <div className="panel">
        <h2 className="text-2xl mb-6">Upload Chemistry Material</h2>

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

            <label className="field-label">PDF File</label>
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
      </div>
    </div>
  );
}

export default Upload;