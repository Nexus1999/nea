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
const CHECK_INTERVAL = 10000; // 10 seconds

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLoggingIn = useRef(false);
  const isLoggingOut = useRef(false);

  const logout = useCallback(async (reason: 'LOGOUT' | 'TIMEOUT' = 'LOGOUT') => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    console.log(`AuthProvider: Initiating ${reason} sequence...`);
    
    const logId = localStorage.getItem('neas_active_log_id');
    const startTime = localStorage.getItem('neas_active_log_start');
    
    // 1. Update the database log record FIRST using the primary key ID
    if (logId && startTime) {
      try {
        const success = await endUserSessionLog(logId, startTime, reason);
        if (!success) {
          console.warn('AuthProvider: Database log update failed');
        }
      } catch (err) {
        console.error('AuthProvider: Error during endUserSessionLog:', err);
      }
    }

    // 2. Clear all custom localStorage items
    localStorage.removeItem('neas_active_log_id');
    localStorage.removeItem('neas_active_log_start');
    localStorage.removeItem('neas_last_activity');
    localStorage.removeItem('neas_pending_log');
    localStorage.removeItem('neas_custom_session_id');
    
    if (reason === 'TIMEOUT') {
      localStorage.setItem('neas_session_expired', 'true');
    }

    // 3. Sign out from Supabase
    try {
      await supabase.auth.signOut();
    } catch (signOutErr) {
      console.error('AuthProvider: Supabase signOut error:', signOutErr);
    }
    
    // 4. Clear React state
    setSession(null);
    setUser(null);
    setUserRole(null);
    setUsername(null);
    
    // 5. Small delay to ensure network requests are finished before redirect
    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.href = '/login';
  }, []);

  const updateActivity = useCallback(() => {
    localStorage.setItem('neas_last_activity', Date.now().toString());
  }, []);

  const checkInactivity = useCallback(() => {
    const lastActivity = localStorage.getItem('neas_last_activity');
    if (lastActivity && session && !isLoggingOut.current) {
      const elapsed = Date.now() - parseInt(lastActivity);
      if (elapsed >= INACTIVITY_LIMIT) {
        logout('TIMEOUT');
      }
    }
  }, [logout, session]);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, roles(name)')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setUsername(data.username);
        // @ts-ignore
        setUserRole(data.roles?.name || 'User');
        return data;
      }
    } catch (err) {
      console.error('AuthProvider: Profile fetch error:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    const handleNewSessionLog = async () => {
      if (!session || isLoggingIn.current || isLoggingOut.current) return;
      
      const hasActiveLog = localStorage.getItem('neas_active_log_id');
      const isPending = localStorage.getItem('neas_pending_log') === 'true';
      const customSessionId = localStorage.getItem('neas_custom_session_id');

      if (isPending && !hasActiveLog && customSessionId) {
        isLoggingIn.current = true;
        const profile = await fetchUserData(session.user.id);
        const logData = await startUserSessionLog({
          userId: session.user.id,
          username: profile?.username || session.user.email || 'Unknown',
          action: 'LOGIN',
          status: 'SUCCESS',
          sessionId: customSessionId
        });

        if (logData) {
          localStorage.setItem('neas_active_log_id', logData.id);
          localStorage.setItem('neas_active_log_start', logData.startTime);
          localStorage.removeItem('neas_pending_log');
        }
        isLoggingIn.current = false;
      }
    };

    handleNewSessionLog();
  }, [session, fetchUserData]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        fetchUserData(initialSession.user.id);
        updateActivity();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        updateActivity();
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
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