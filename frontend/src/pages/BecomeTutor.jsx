import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB, same as the backend

export default function BecomeTutor() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    qualifications: '',
    experience: ''
  });
  const [files, setFiles] = useState({ qualification: null, cv: null, other: null });
  const [fileKey, setFileKey] = useState(0); // changing this resets the file inputs
  const [message, setMessage] = useState(null); // { text, type }
  const [submitting, setSubmitting] = useState(false);

  const handleText = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFile = (e) => {
    const field = e.target.name;
    const file = e.target.files[0] || null;

    if (file) {
      if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
        setMessage({ text: 'Only PDF files are allowed.', type: 'error' });
        e.target.value = '';
        return;
      }
      if (file.size > MAX_SIZE) {
        setMessage({ text: 'Each file must be 5 MB or smaller.', type: 'error' });
        e.target.value = '';
        return;
      }
    }
    setMessage(null);
    setFiles({ ...files, [field]: file });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!files.qualification || !files.cv) {
      setMessage({
        text: 'Please upload your qualification certificate (or transcript) and your CV.',
        type: 'error'
      });
      return;
    }

    const data = new FormData();
    data.append('name', form.name);
    data.append('email', form.email);
    data.append('password', form.password);
    data.append('qualifications', form.qualifications);
    data.append('experience', form.experience);
    data.append('qualification', files.qualification);
    data.append('cv', files.cv);
    if (files.other) data.append('other', files.other);

    setSubmitting(true);
    try {
      const res = await api.post('/applications', data);
      setMessage({ text: res.data.message, type: 'success' });
      setForm({ name: '', email: '', password: '', qualifications: '', experience: '' });
      setFiles({ qualification: null, cv: null, other: null });
      setFileKey(fileKey + 1);
    } catch (err) {
      setMessage({
        text: err.response?.data?.error || 'Something went wrong. Please try again.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel max-w-2xl mx-auto">
      <h2>Become a Tutor</h2>
      <p>
        Qualified Chemistry teachers and tutors can apply here. An admin will review your
        documents, and if approved you can log in as a tutor, upload materials and take
        student sessions. You do not need an account to apply.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label>Full name</label>
          <input className="field-input" name="name" value={form.name} onChange={handleText} required />
        </div>

        <div>
          <label>Email</label>
          <input className="field-input" type="email" name="email" autoComplete="off"
            value={form.email} onChange={handleText} required />
        </div>

        <div>
          <label>Password (at least 6 characters)</label>
          <input className="field-input" type="password" name="password" autoComplete="new-password"
            value={form.password} onChange={handleText} required />
        </div>

        <div>
          <label>Qualifications</label>
          <textarea className="field-input" name="qualifications" rows="3"
            placeholder="e.g. B.Ed (Science) Chemistry, University of Nairobi, 2019"
            value={form.qualifications} onChange={handleText} required />
        </div>

        <div>
          <label>Teaching experience (optional)</label>
          <textarea className="field-input" name="experience" rows="3"
            value={form.experience} onChange={handleText} />
        </div>

        <div key={fileKey} className="space-y-4">
          <div>
            <label>Qualification certificate or transcript (PDF, required)</label>
            <input className="field-input" type="file" name="qualification" accept=".pdf" onChange={handleFile} />
          </div>
          <div>
            <label>CV (PDF, required)</label>
            <input className="field-input" type="file" name="cv" accept=".pdf" onChange={handleFile} />
          </div>
          <div>
            <label>Other supporting document (PDF, optional)</label>
            <input className="field-input" type="file" name="other" accept=".pdf" onChange={handleFile} />
          </div>
        </div>

        <button className="btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>

        {message && (
          <p className={message.type === 'success' ? 'badge-success' : 'badge-error'}>
            {message.text}
          </p>
        )}
      </form>

      <p className="mt-4">
        Already approved? <Link to="/login">Log in here</Link>.
      </p>
    </div>
  );
}