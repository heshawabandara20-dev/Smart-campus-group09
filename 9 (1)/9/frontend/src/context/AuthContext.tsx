import React, { createContext, useContext, useCallback, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';

interface User {
  userId: number;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoize so it never changes reference — prevents infinite refresh loops
  const backendBaseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081',
    []
  );

  const refreshUser = useCallback(async (): Promise<boolean> => {
    try {
      console.log('Refreshing user...');
      const response = await fetch(`${backendBaseUrl}/api/auth/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('User data from backend:', data);
        if (data.authenticated && data.email) {
          setUser({
            userId: data.userId,
            email: data.email,
            name: data.name || data.email.split('@')[0], // Fallback to email prefix if name not available
            role: data.role || 'USER',
          });
          return true;
        } else {
          setUser(null);
          return false;
        }
      } else {
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, [backendBaseUrl]);

  const logout = useCallback(async () => {
    console.log('Logging out...');
    setLoading(true);
    try {
      await fetch(`${backendBaseUrl}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setLoading(false);
      window.location.href = '/login?loggedOut=true';
    }
  }, [backendBaseUrl]);

  // Only runs once on mount — AuthProvider is the single source of truth
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};