import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  session: any;
  user: any;
  loading: boolean;
  userRole: string | null;
  login: (username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('demo_user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      setSession({ user: userData });
      setUser(userData);
      setUserRole('Administrator');
    }
    setLoading(false);
  }, []);

  const login = (username: string) => {
    const userData = { username };
    localStorage.setItem('demo_user', JSON.stringify(userData));
    setSession({ user: userData });
    setUser(userData);
    setUserRole('Administrator');
  };

  const logout = () => {
    localStorage.removeItem('demo_user');
    setSession(null);
    setUser(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, userRole, login, logout }}>
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