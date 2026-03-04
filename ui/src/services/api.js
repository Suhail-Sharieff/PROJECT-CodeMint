// src/services/api.js

import axios from 'axios';

// The base URL is now dynamically set from environment variables
const API_BASE_URL = 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default api;