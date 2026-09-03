import axios from 'axios';

const API = axios.create({
  baseURL: 'https://atea-back-0309.onrender.com/api',
});

// Automatically attach the user's token to requests if available
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;