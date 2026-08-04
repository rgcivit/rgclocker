import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const LockerContext = createContext(null);

export const LockerProvider = ({ children }) => {
  const { token } = useAuth();
  const [lockers, setLockers] = useState([]);
  const [unlockedLockers, setUnlockedLockers] = useState({});
  const [loading, setLoading] = useState(false);

  // Sync unlocked lockers state on mount or when token changes
  useEffect(() => {
    if (!token) {
      setLockers([]);
      setUnlockedLockers({});
      return;
    }
    
    // Scan localStorage for active locker tokens
    const activeLockers = {};
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('rgclocker_token_')) {
        const lockerId = key.replace('rgclocker_token_', '');
        activeLockers[lockerId] = true;
      }
    });
    setUnlockedLockers(activeLockers);
    fetchLockers();
  }, [token]);

  const fetchLockers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await api.get('/lockers');
      setLockers(response.data.lockers);
    } catch (error) {
      console.error('Failed to fetch lockers:', error);
    } finally {
      setLoading(false);
    }
  };

  const createLocker = async (name, category, pin) => {
    try {
      const response = await api.post('/lockers', { name, category, pin });
      setLockers((prev) => [response.data.locker, ...prev]);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create locker.'
      };
    }
  };

  const unlockLocker = async (lockerId, pin) => {
    try {
      const response = await api.post(`/lockers/${lockerId}/unlock`, { pin });
      const { lockerToken } = response.data;
      
      // Store token with locker specific key
      localStorage.setItem(`rgclocker_token_${lockerId}`, lockerToken);
      
      // Update local state
      setUnlockedLockers(prev => ({ ...prev, [lockerId]: true }));
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid PIN.'
      };
    }
  };

  const lockLocker = (lockerId) => {
    localStorage.removeItem(`rgclocker_token_${lockerId}`);
    setUnlockedLockers(prev => {
      const next = { ...prev };
      delete next[lockerId];
      return next;
    });
  };

  const deleteLocker = async (lockerId) => {
    try {
      await api.delete(`/lockers/${lockerId}`);
      // Remove local token just in case
      localStorage.removeItem(`rgclocker_token_${lockerId}`);
      
      setLockers(prev => prev.filter(l => l.id !== lockerId));
      setUnlockedLockers(prev => {
        const next = { ...prev };
        delete next[lockerId];
        return next;
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete locker.'
      };
    }
  };

  const isLockerUnlocked = (lockerId) => {
    return !!unlockedLockers[lockerId];
  };

  return (
    <LockerContext.Provider value={{
      lockers,
      loading,
      fetchLockers,
      createLocker,
      unlockLocker,
      lockLocker,
      deleteLocker,
      isLockerUnlocked,
      unlockedLockers
    }}>
      {children}
    </LockerContext.Provider>
  );
};

export const useLockers = () => {
  const context = useContext(LockerContext);
  if (!context) {
    throw new Error('useLockers must be used within a LockerProvider');
  }
  return context;
};
