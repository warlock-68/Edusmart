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
    }
    return Promise.reject(error);
  }
);

export default api;