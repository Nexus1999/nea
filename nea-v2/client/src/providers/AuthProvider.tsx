import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/axios';

interface User {
  id: string;
  username: string;
  roleId: number;
  roleName: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (token: string) => {
    // The backend sets the HttpOnly cookie, but we can re-fetch the user
    await fetchUser();
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    // Explicitly allow Administrator role to access everything
    if (user.roleName?.toUpperCase() === 'ADMINISTRATOR') return true;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
