import { useState, useEffect } from 'react';
import { getCurrentUser, getLoginUrl, getLogoutUrl } from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, []);

  const login = () => {
    window.location.href = getLoginUrl();
  };

  const logout = () => {
    window.location.href = getLogoutUrl();
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
