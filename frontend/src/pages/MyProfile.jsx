import { useState, useEffect } from 'react';
import api from '../api';

function getRole() {
  try {
    const token = localStorage.getItem('token');
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).role;
  } catch {
    return null;
  }
}

function authHeader() {
  return { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
}

// Crop to a square and shrink to 400 px so the photo stays small
function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, 400, 400);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not process the photo'))),
        'image/jpeg',
        0.8
      );
    };
    img.onerror = () => reject(new Error('That file is not a readable image'));
    img.src = url;
  });
}

const emptyForm = {
  headline: '',
  bio: '',
  school: '',
  form_level: '',
  experience_years: '',
  education: '',
  languages: '',
  learning_goal: ''
};

const inputStyle = { width: '100%', padding: 8, marginBottom: 14 };

function MyProfile() {
  const role = getRole();
  const isTutor = role === 'tutor';
  const isStudent = role === 'student';

  const [name, setName] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/profile/me', authHeader())
      .then((res) => {
        setName(res.data.name);
        const p = res.data.profile || {};
        setForm({
          headline: p.headline || '',
          bio: p.bio || '',
          school: p.school || '',
          form_level: p.form_level || '',
          experience_years: p.experience_years ?? '',
          education: p.education || '',
          languages: p.languages || '',
          learning_goal: p.learning_goal || ''
        });
        if (res.data.has_photo) {
          return api.get('/profile/me/photo', { ...authHeader(), responseType: 'blob' })
            .then((photo) => setPhotoUrl(URL.createObjectURL(photo.data)));
        }
      })
      .catch(() => setError('Could not load your profile'))
      .finally(() => setLoading(false));
  }, []);

  const change = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async () => {
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await api.put('/profile/me', form, authHeader());
      setMessage('Profile saved');
    } catch {
      setError('Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  const choosePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setMessage('');
    setUploading(true);
    try {
      const blob = await shrinkPhoto(file);
      const data = new FormData();
      data.append('photo', blob, 'photo.jpg');
      await api.post('/profile/me/photo', data, authHeader());
      setPhotoUrl(URL.createObjectURL(blob));
      setMessage('Photo saved');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not upload the photo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="page-shell--wide">
      <div className="panel">
        <h2 className="text-2xl mb-6">My Profile</h2>
        {error && <p className="badge-error mb-4">{error}</p>}
        {message && <p className="mb-4">{message}</p>}
        {loading ? (
          <p>Loading your profile...</p>
        ) : (
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 200px', textAlign: 'center' }}>
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Your profile"
                  style={{ width: 180, height: 180, borderRadius: '50%', objectFit: 'cover', marginBottom: 12 }}
                />
              ) : (
                <div
                  style={{
                    width: 180, height: 180, borderRadius: '50%', margin: '0 auto 12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 64, background: '#e5e7eb'
                  }}
                >
                  {name ? name.charAt(0).toUpperCase() : '?'}
                </div>
              )}
              <h3 className="text-lg mb-2">{name}</h3>
              <label className="btn-secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
                {uploading ? 'Uploading...' : photoUrl ? 'Change photo' : 'Add photo'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={choosePhoto}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
              {!isTutor && (
                <p style={{ fontSize: 13, marginTop: 10 }}>Only you can see your photo.</p>
              )}
            </div>

            <div style={{ flex: '1 1 320px' }}>
              <label>Headline</label>
              <input
                value={form.headline}
                onChange={change('headline')}
                maxLength={150}
                placeholder={isTutor ? 'e.g. KCSE Chemistry tutor' : 'e.g. Form 3 student who loves science'}
                style={inputStyle}
              />

              <label>About me</label>
              <textarea
                value={form.bio}
                onChange={change('bio')}
                rows={5}
                maxLength={2000}
                placeholder="Tell others a little about yourself"
                style={inputStyle}
              />

              {isStudent && (
                <div>
                  <label>School</label>
                  <input value={form.school} onChange={change('school')} maxLength={150} style={inputStyle} />

                  <label>Form</label>
                  <select value={form.form_level} onChange={change('form_level')} style={inputStyle}>
                    <option value="">Select your form</option>
                    <option>Form 1</option>
                    <option>Form 2</option>
                    <option>Form 3</option>
                    <option>Form 4</option>
                  </select>

                  <label>My learning goal</label>
                  <input
                    value={form.learning_goal}
                    onChange={change('learning_goal')}
                    maxLength={255}
                    placeholder="e.g. Score an A in KCSE Chemistry"
                    style={inputStyle}
                  />
                </div>
              )}

              {isTutor && (
                <div>
                  <label>Years of experience</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={form.experience_years}
                    onChange={change('experience_years')}
                    style={inputStyle}
                  />

                  <label>Education</label>
                  <input
                    value={form.education}
                    onChange={change('education')}
                    maxLength={255}
                    placeholder="e.g. BEd Science, Kenyatta University"
                    style={inputStyle}
                  />

                  <label>Languages</label>
                  <input
                    value={form.languages}
                    onChange={change('languages')}
                    maxLength={150}
                    placeholder="e.g. English, Kiswahili"
                    style={inputStyle}
                  />
                </div>
              )}

              <button onClick={save} disabled={saving} className="btn-secondary">
                {saving ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyProfile;