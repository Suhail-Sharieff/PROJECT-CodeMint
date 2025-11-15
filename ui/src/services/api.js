// src/services/api.js

import axios from 'axios';

// The base URL is now dynamically set from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default api;