import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
});

// Token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-API-KEY'] = 'samindex_secret_key_2026';
  return config;
});

export const searchGitHub = async (query, page = 1, sort = 'score') => {
  const { data } = await api.get(`/search?q=${query}&page=${page}&sort=${sort}`);
  return data;
};

export const fetchUser = async (username) => {
  const { data } = await api.post(`/fetch/${username}`);
  return data;
};

export const getUserDetails = async (username) => {
  const { data } = await api.get(`/user/${username}`);
  return data;
};

export const searchCode = async (query, page = 1, repo = '') => {
  let url = `/code-search?q=${query}&page=${page}`;
  if (repo) url += `&repo=${repo}`;
  const { data } = await api.get(url);
  return data;
};

export const getHistory = async (repo = '') => {
  let url = '/history';
  if (repo) url += `?repo=${repo}`;
  const { data } = await api.get(url);
  return data;
};

export const clearHistory = async () => {
  const { data } = await api.delete('/history');
  return data;
};

export const indexRepo = async (owner, repo) => {
  const { data } = await api.post('/index-repo', { owner, repo });
  return data;
};

export const getIndexStatus = async (jobId) => {
  const { data } = await api.get(`/index-status/${jobId}`);
  return data;
};

export default api;
