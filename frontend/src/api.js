import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000, // 10 seconds — treat a hung request as "unreachable"
});

api.interceptors.response.use(
  (response) => response, // success — pass through unchanged
  (error) => {
    if (!error.response) {
      // No response at all = server down, no internet, or timed out
      error.response = {
        data: { error: 'Cannot reach the server. Please check your connection and try again.' },
      };
      return Promise.reject(error);
    }

    const code = error.response.data?.code;
    if (code === 'TOKEN_EXPIRED' || code === 'TOKEN_INVALID') {
      // Session is dead — clear stale data and bounce to Login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login?sessionExpired=true';
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;