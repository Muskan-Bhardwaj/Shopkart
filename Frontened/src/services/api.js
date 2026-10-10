import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Adjust base URL if needed
});

// ALWAYS fetch the latest token right before a request is sent
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;