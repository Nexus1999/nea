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
  const isLoggingIn = useRef(false);

  const logout = useCallback(async (reason: 'LOGOUT' | 'TIMEOUT' = 'LOGOUT') => {
    const logId = localStorage.getItem('neas_current_log_id');
    const startTime = localStorage.getItem('neas_current_log_start');
    
    // Clear local state immediately for UI responsiveness
    setSession(null);
    setUser(null);
    setUserRole(null);
    setUsername(null);
    
    if (logId && startTime) {
      await endUserSessionLog(logId, startTime, reason);
      localStorage.removeItem('neas_current_log_id');
      localStorage.removeItem('neas_current_log_start');
    }

    await supabase.auth.signOut();
    
    if (reason === 'TIMEOUT') {
      localStorage.setItem('neas_session_expired', 'true');
    }
    
    localStorage.removeItem('neas_user_data');
    localStorage.removeItem('neas_last_activity');
  }, []);

  const updateActivity = useCallback(() => {
    localStorage.setItem('neas_last_activity', Date.now().toString());
  }, []);

  const checkInactivity = useCallback(() => {
    const lastActivity = localStorage.getItem('neas_last_activity');
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity);
      if (elapsed >= INACTIVITY_LIMIT) {
        logout('TIMEOUT');
      }
    }
  }, [logout]);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, first_name, last_name, roles(name)')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setUsername(data.username);
        // @ts-ignore
        const roleName = data.roles?.name || 'User';
        setUserRole(roleName);
        return data;
      }
    } catch (err) {
      console.error('AuthProvider: Profile fetch error:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    // 1. Initial Session Check
    const init = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        await fetchUserData(initialSession.user.id);
        updateActivity();
      }
      setLoading(false);
    };
    init();

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`AuthProvider: Event -> ${event}`);
      
      if (event === 'SIGNED_IN' && currentSession && !isLoggingIn.current) {
        isLoggingIn.current = true;
        setLoading(true);
        
        setSession(currentSession);
        setUser(currentSession.user);
        updateActivity();
        
        const profile = await fetchUserData(currentSession.user.id);
        const logData = await startUserSessionLog({
          userId: currentSession.user.id,
          username: profile?.username || currentSession.user.email || 'Unknown',
          action: 'LOGIN',
          status: 'SUCCESS',
          sessionId: currentSession.access_token.substring(0, 20)
        });

        if (logData) {
          localStorage.setItem('neas_current_log_id', logData.id);
          localStorage.setItem('neas_current_log_start', logData.startTime);
        }
        
        setLoading(false);
        isLoggingIn.current = false;
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setUserRole(null);
        setUsername(null);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData, updateActivity]);

  useEffect(() => {
    if (session) {
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
      const handleActivity = () => updateActivity();
      events.forEach(e => window.addEventListener(e, handleActivity));
      checkIntervalRef.current = setInterval(checkInactivity, CHECK_INTERVAL);
      return () => {
        events.forEach(e => window.removeEventListener(e, handleActivity));
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
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};