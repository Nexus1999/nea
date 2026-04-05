import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { startUserSessionLog, endUserSessionLog } from '@/utils/sessionLogger';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  userRole: string | null;
  username: string | null;
  logout: (reason?: 'LOGOUT' | 'TIMEOUT') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes
const CHECK_INTERVAL = 30000; // 30 seconds

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, first_name, last_name, role_id, roles(name)')
        .eq('id', userId)
        .single();
      
      if (data && !error) {
        setUsername(data.username);
        // @ts-ignore
        const roleName = data.roles?.name || 'User';
        setUserRole(roleName);

        localStorage.setItem('neas_user_data', JSON.stringify({
          username: data.username,
          first_name: data.first_name,
          last_name: data.last_name,
          role: roleName
        }));

        return data;
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
    return null;
  }, []);

  const logout = useCallback(async (reason: 'LOGOUT' | 'TIMEOUT' = 'LOGOUT') => {
    const logId = localStorage.getItem('neas_current_log_id');
    if (logId) {
      await endUserSessionLog(logId, reason);
    }

    await supabase.auth.signOut();
    
    if (reason === 'TIMEOUT') {
      localStorage.setItem('neas_session_expired', 'true');
    }
    
    localStorage.removeItem('neas_user_data');
    localStorage.removeItem('neas_last_activity');
    localStorage.removeItem('neas_current_log_id');

    setSession(null);
    setUser(null);
    setUserRole(null);
    setUsername(null);
  }, []);

  const updateActivity = useCallback(() => {
    localStorage.setItem('neas_last_activity', Date.now().toString());
  }, []);

  const checkInactivity = useCallback(() => {
    const lastActivity = localStorage.getItem('neas_last_activity');
    const currentSession = supabase.auth.getSession(); // Check actual session state
    
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity);
      if (elapsed >= INACTIVITY_LIMIT) {
        logout('TIMEOUT');
      }
    }
  }, [logout]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          await fetchUserData(initialSession.user.id);
          updateActivity();
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (event === 'SIGNED_IN' && currentSession?.user) {
        const profile = await fetchUserData(currentSession.user.id);
        updateActivity();
        
        if (!isInitialMount.current) {
          const logId = await startUserSessionLog({
            userId: currentSession.user.id,
            username: profile?.username || currentSession.user.email || 'Unknown',
            action: 'LOGIN',
            status: 'SUCCESS',
            sessionId: currentSession.access_token.substring(0, 20)
          });
          if (logId) localStorage.setItem('neas_current_log_id', logId);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserRole(null);
        setUsername(null);
      }
      
      isInitialMount.current = false;
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, updateActivity]); // updateActivity is now stable

  useEffect(() => {
    if (session) {
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
      const handleActivity = () => updateActivity();
      
      events.forEach(event => window.addEventListener(event, handleActivity));
      window.addEventListener('online', checkInactivity);
      checkIntervalRef.current = setInterval(checkInactivity, CHECK_INTERVAL);

      return () => {
        events.forEach(event => window.removeEventListener(event, handleActivity));
        window.removeEventListener('online', checkInactivity);
        if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      };
    }
  }, [session, updateActivity, checkInactivity]);

  return (
    <AuthContext.Provider value={{ session, user, loading, userRole, username, logout }}>
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