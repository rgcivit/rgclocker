import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Dynamically resolve API URL, fallback to local development only if not in native platform
let API_URL = import.meta.env.VITE_API_URL || '';

if (!API_URL) {
  if (Capacitor.isNativePlatform()) {
    console.warn('[rgClocker API] Warning: VITE_API_URL is empty in this native mobile build! Defaulting to localhost, which may fail on a physical device. Please configure your .env file.');
    API_URL = 'http://localhost:5000/api';
  } else {
    API_URL = 'http://localhost:5000/api';
  }
}

// 1. Remove any trailing slashes from the API URL
API_URL = API_URL.trim().replace(/\/+$/, '');

// 2. Fix potential duplicate '/api/api' that can occur from misconfigured env vars
API_URL = API_URL.replace(/\/api\/api$/, '/api');

// 3. If it does not end with '/api', automatically append it
if (!API_URL.endsWith('/api')) {
  API_URL = API_URL + '/api';
}

// 4. Force a single trailing slash at the end so Axios handles path concatenation correctly
API_URL = API_URL + '/';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to automatically add JWT and Locker Tokens
api.interceptors.request.use(
  (config) => {
    // Force relative URLs to NOT have a leading slash so they combine correctly with baseURL's path
    if (config.url && config.url.startsWith('/')) {
      config.url = config.url.substring(1);
    }

    // 1. Level 1 Security: Global JWT
    const token = localStorage.getItem('rgclocker_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Level 2 Security: Temporary Locker Token
    // We can extract active locker token from localStorage or session state.
    // To make it easy and decoupled from react state, we can retrieve it
    // from a naming pattern, e.g. 'rgclocker_lockertoken_<lockerId>'
    // we can pass lockerId in custom config headers or extract it from the URL
    const urlParts = config.url ? config.url.split('/') : [];
    // If request contains /documents/:lockerId or /lockers/:lockerId, we find the lockerId
    let lockerId = null;
    
    // Find lockerId from request parameters if possible
    if (urlParts.includes('documents')) {
      const idx = urlParts.indexOf('documents');
      if (urlParts[idx + 1]) lockerId = urlParts[idx + 1];
    } else if (urlParts.includes('lockers')) {
      const idx = urlParts.indexOf('lockers');
      if (urlParts[idx + 1] && urlParts[idx + 1] !== 'unlock') lockerId = urlParts[idx + 1];
    }

    if (lockerId) {
      const lockerToken = localStorage.getItem(`rgclocker_token_${lockerId}`);
      if (lockerToken) {
        config.headers['X-Locker-Token'] = lockerToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
