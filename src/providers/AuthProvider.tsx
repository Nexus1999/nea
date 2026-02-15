import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  session: any;
  user: any;
  loading: boolean;
  userRole: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Mocking auth state for demonstration
  const [session] = useState({ user: { email: 'admin@example.com' } });
  const [user] = useState({ email: 'admin@example.com' });
  const [loading] = useState(false);
  const [userRole] = useState('Administrator');

  return (
    <AuthContext.Provider value={{ session, user, loading, userRole }}>
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