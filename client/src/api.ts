import axios, { InternalAxiosRequestConfig } from 'axios';

export interface AuthResponse {
  token?: string;
  message?: string;
  step?: string;
  error?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  telegramId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyRequest {
  email: string;
  code: string;
}

export interface AnalysisMetrics {
  confidence: number;
  vocabulary: number;
  structure: number;
  empathy: number;
  conciseness: number;
}

export interface AnalysisData {
  clarityScore: number;
  pace: number;
  fillerWords: string[];
  feedback: string;
  tip: string;
  transcript?: string;
  metrics?: AnalysisMetrics;
}

export interface HistoryItem extends AnalysisData {
  id: number;
  transcript: string;
  date: string;
}

export interface CompanionResponse {
  reply: string;
}

export interface UserProfile {
  username: string;
  xp: number;
  level: number;
  nextLvlXp: number;
  streak: number;
  badges: string[];
  title: string;
}

export const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const registerInit = async (data: RegisterRequest) => {
  return api.post<AuthResponse>('/auth/register-init', data);
};

export const loginInit = async (data: LoginRequest) => {
  return api.post<AuthResponse>('/auth/login-init', data);
};

export const verifyCode = async (data: VerifyRequest) => {
  return api.post<AuthResponse>('/auth/verify', data);
};

export const analyzeSpeech = async (text: string, sec: number, language: string) => {
  return api.post<AnalysisData>('/analyze', { transcript: text, durationSeconds: sec, language });
};

export const fetchHistory = async () => {
  return api.get<HistoryItem[]>('/history');
};

export const clearHistory = async () => {
  return api.delete<{ msg: string }>('/history');
};

export const chatWithCompanion = async (message: string, mode: string = 'mentor', language: string) => {
  return api.post<CompanionResponse>('/companion/chat', { message, mode, language });
};

export const getProfile = async () => {
  return api.get<UserProfile>('/profile');
};

export const getRandomTopic = async (language: string) => {
  return api.get<{ id: number; text: string }>(`/topics/random?lang=${language}`);
};

// OAuth
export const getGoogleAuthUrl = async () => {
  return api.get<{ url: string }>('/auth/google');
};

export const getGitHubAuthUrl = async () => {
  return api.get<{ url: string }>('/auth/github');
};