import { useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await api.post('/auth/register', form);
      setMessage('Registered successfully! You can now log in.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <div className="page-shell">
      <div className="panel">
        <h2 className="text-2xl mb-6">Register for EduSmart</h2>
        <form onSubmit={handleSubmit}>
          <label className="field-label">Full Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="field-input"
          />

          <label className="field-label">Email</label>
          <input
            name="email"
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={handleChange}
            required
            className="field-input"
          />

          <label className="field-label">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            className="field-input"
          />

          <button type="submit" className="btn-primary">Register</button>
        </form>
        {message && <p className="mt-4">{message}</p>}
        <p className="mt-4">
          Are you a qualified teacher or tutor?{' '}
          <Link to="/become-tutor" className="underline text-[var(--color-bunsen)]">
            Apply to become a tutor
          </Link>.
        </p>
      </div>
    </div>
  );
}

export default Register;