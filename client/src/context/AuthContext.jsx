import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import api from '../services/api.js';

const AuthContext = createContext(null);

function showToast(message, type = 'success') {
  window.dispatchEvent(
    new CustomEvent('wanderplan:toast', {
      detail: { message, type },
    }),
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const currentUser = response.data.user;

      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      try {
        const response = await api.get('/auth/me');

        if (active) {
          setUser(response.data.user);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      active = false;
    };
  }, []);

  const signup = useCallback(async (formData) => {
    const response = await api.post('/auth/signup', formData);
    setUser(response.data.user);
    return response.data;
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    setUser(response.data.user);
    return response.data;
  }, []);

  const googleLogin = useCallback(async (credential) => {
    if (
      typeof credential !== 'string' ||
      credential.length === 0
    ) {
      throw new Error('Google credential is missing. Please try again.');
    }

    const response = await api.post('/auth/google', {
      credential,
    });

    setUser(response.data.user);
    return response.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      showToast('Logged out successfully!', 'success');
    } catch (error) {
      setUser(null);

      showToast(
        error.response?.data?.message ||
          'Logout request failed. Please try again.',
        'error',
      );
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    signup,
    login,
    googleLogin,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
