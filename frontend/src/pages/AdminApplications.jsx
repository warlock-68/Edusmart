import { useState, useEffect } from 'react';
import api from '../api';

function AdminApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notes, setNotes] = useState({}); // rejection note per application id
  const [messages, setMessages] = useState({}); // { [id]: { text, type } }
  const [busyId, setBusyId] = useState(null);

  const loadApplications = async () => {
    try {
      const res = await api.get('/admin/applications');
      setApplications(res.data);
      setLoadError('');
    } catch (err) {
      setLoadError(err.response?.data?.error || 'Could not load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const setMessage = (id, text, type) => {
    setMessages((prev) => ({ ...prev, [id]: { text, type } }));
  };

  const openDocument = async (doc) => {
    try {
      const res = await api.get(`/admin/applications/documents/${doc.id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.original_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not open this document.');
    }
  };

  // Approve/reject also send an email, which can be slow, so they get a longer timeout
  const SLOW_REQUEST = { timeout: 30000 };

  const approve = async (app) => {
    if (!window.confirm(`Approve ${app.full_name} as a tutor?`)) return;
    setBusyId(app.id);
    try {
      const res = await api.put(`/admin/applications/${app.id}/approve`, {}, SLOW_REQUEST);
      setMessage(app.id, res.data.message, 'success');
    } catch (err) {
      setMessage(app.id, err.response?.data?.error || 'Something went wrong', 'error');
    } finally {
      // Always reload so the screen matches the real status, even after an error
      await loadApplications();
      setBusyId(null);
    }
  };

  const reject = async (app) => {
    if (!window.confirm(`Reject ${app.full_name}? Their documents will be deleted and they will be emailed.`)) return;
    setBusyId(app.id);
    try {
      const res = await api.put(
        `/admin/applications/${app.id}/reject`,
        { note: notes[app.id] || '' },
        SLOW_REQUEST
      );
      setMessage(app.id, res.data.message, 'success');
    } catch (err) {
      setMessage(app.id, err.response?.data?.error || 'Something went wrong', 'error');
    } finally {
      await loadApplications();
      setBusyId(null);
    }
  };

  const docLabel = (type) => {
    if (type === 'qualification') return 'Qualification';
    if (type === 'cv') return 'CV';
    return 'Other';
  };

  return (
    <div className="page-shell">
      <div className="panel">
        <h2 className="text-2xl mb-6">Tutor Applications</h2>

        {loading && <p>Loading applications...</p>}
        {loadError && <p className="badge-error">{loadError}</p>}

        {!loading && !loadError && applications.length === 0 && (
          <p>No applications yet.</p>
        )}

        {applications.map((app) => (
          <div key={app.id} className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">
              {app.full_name}{' '}
              <span className="text-sm font-normal">({app.status})</span>
            </h3>
            <p>{app.email}</p>
            <p className="mt-2"><strong>Qualifications:</strong> {app.qualifications}</p>
            {app.experience && (
              <p className="mt-1"><strong>Experience:</strong> {app.experience}</p>
            )}
            <p className="mt-1 text-sm">
              Applied: {new Date(app.created_at).toLocaleString()}
            </p>

            {app.documents.length > 0 && (
              <div className="mt-2">
                <strong>Documents:</strong>{' '}
                {app.documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => openDocument(doc)}
                    className="underline text-[var(--color-bunsen)] mr-4"
                  >
                    {docLabel(doc.doc_type)}
                  </button>
                ))}
              </div>
            )}

            {app.status === 'rejected' && app.admin_note && (
              <p className="mt-2"><strong>Rejection note:</strong> {app.admin_note}</p>
            )}

            {app.status === 'pending' && (
              <div className="mt-3">
                <input
                  className="field-input"
                  placeholder="Reason for rejection (optional, sent to the applicant)"
                  maxLength={500}
                  value={notes[app.id] || ''}
                  onChange={(e) => setNotes({ ...notes, [app.id]: e.target.value })}
                />
                <button
                  type="button"
                  className="btn-primary mr-3"
                  disabled={busyId === app.id}
                  onClick={() => approve(app)}
                >
                  {busyId === app.id ? 'Working...' : 'Approve'}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busyId === app.id}
                  onClick={() => reject(app)}
                >
                  {busyId === app.id ? 'Working...' : 'Reject'}
                </button>
              </div>
            )}

            {messages[app.id] && (
              <p className={messages[app.id].type === 'success' ? 'badge-success mt-2' : 'badge-error mt-2'}>
                {messages[app.id].text}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminApplications;