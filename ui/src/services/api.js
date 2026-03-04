// src/services/api.js

import axios from 'axios';

// The base URL is now dynamically set from environment variables
const API_BASE_URL = 'https://vz59qj8k-8080.inc1.devtunnels.ms/';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default api;