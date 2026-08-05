import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('rgclocker_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        console.error('Session validation failed:', error);
        logout();
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token: userToken, user: userData } = response.data;
      
      sessionStorage.setItem('rgclocker_token', userToken);
      setToken(userToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      const data = error.response?.data;
      if (data && data.requireActivation) {
        return {
          success: false,
          requireActivation: true,
          username: data.username,
          message: data.message
        };
      }
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Check your connection or credentials.'
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      return { 
        success: true, 
        requireActivation: true, 
        username: response.data.username,
        message: response.data.message 
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed.'
      };
    }
  };

  const activateAccount = async (username, code) => {
    try {
      const response = await api.post('/auth/verify-code', { username, code });
      const { token: userToken, user: userData } = response.data;
      
      sessionStorage.setItem('rgclocker_token', userToken);
      setToken(userToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Código de activación incorrecto.'
      };
    }
  };

  const logout = () => {
    // Clear auth token
    sessionStorage.removeItem('rgclocker_token');
    
    // Clear all temporary locker tokens
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('rgclocker_token_')) {
        sessionStorage.removeItem(key);
      }
    });

    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, activateAccount, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
