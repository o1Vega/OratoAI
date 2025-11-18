import axios from 'axios';

// Создаем экземпляр axios
export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Добавляем токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- ВОТ ЭТИ ФУНКЦИИ, КОТОРЫЕ ИЩЕТ REACT ---

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