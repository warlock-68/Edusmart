import { useState } from 'react';
import api from '../api';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await api.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setMessage(`Welcome, ${res.data.user.name}! (role: ${res.data.user.role})`);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Something went wrong');
    }
  };

      return (
    <div className="page-shell">
      <div className="panel">
        <h2 className="text-2xl mb-6">Log in to EduSmart</h2>
        <form onSubmit={handleSubmit}>
          <label className="field-label">Email</label>
          <input
            name="email"
            type="email"
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

          <button type="submit" className="btn-primary">Log In</button>
        </form>
        {message && <p className="mt-4">{message}</p>}
      </div>
    </div>
  );
}

export default Login;