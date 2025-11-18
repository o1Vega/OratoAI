import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


export const loginUser = async (data) => {
  return api.post('/login', data);
};

export const registerUser = async (data) => {
  return api.post('/register', data);
};

export const analyzeSpeech = async (text, duration) => {
  return api.post('/analyze', { transcript: text, durationSeconds: duration });
};

export const fetchHistory = async () => {
  return api.get('/history');
};