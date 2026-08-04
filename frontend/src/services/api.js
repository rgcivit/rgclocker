import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Defensive check: If VITE_API_URL is missing the '/api' suffix, automatically append it
if (API_URL && !API_URL.endsWith('/api') && !API_URL.endsWith('/api/')) {
  API_URL = API_URL.replace(/\/$/, '') + '/api';
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to automatically add JWT and Locker Tokens
api.interceptors.request.use(
  (config) => {
    // 1. Level 1 Security: Global JWT
    const token = sessionStorage.getItem('rgclocker_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Level 2 Security: Temporary Locker Token
    // We can extract active locker token from sessionStorage or session state.
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
      const lockerToken = sessionStorage.getItem(`rgclocker_token_${lockerId}`);
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
