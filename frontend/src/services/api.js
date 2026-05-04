import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'X-API-KEY': 'samindex_secret_key_2026' // Match backend .env
  }
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

export const searchCode = async (query, page = 1) => {
  const { data } = await api.get(`/code-search?q=${query}&page=${page}`);
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
