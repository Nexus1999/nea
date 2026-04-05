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
  const processedSessionId = useRef<string | null>(null);

  const logout = useCallback(async (reason: 'LOGOUT' | 'TIMEOUT' = 'LOGOUT') => {
    const logId = localStorage.getItem('neas_current_log_id');
    const startTime = localStorage.getItem('neas_current_log_start');
    
    // Clear state immediately
    setSession(null);
    setUser(null);
    setUserRole(null);
    setUsername(null);
    processedSessionId.current = null;
    
    if (logId && startTime) {
      // Don't await this to keep logout snappy, but it will run
      endUserSessionLog(logId, startTime, reason);
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
    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        fetchUserData(initialSession.user.id);
        updateActivity();
      }
      setLoading(false);
    });

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`AuthProvider: Event -> ${event}`);
      
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        updateActivity();
        
        // Only process login logging once per session token
        const sessionId = currentSession.access_token.substring(0, 20);
        if (event === 'SIGNED_IN' && processedSessionId.current !== sessionId) {
          processedSessionId.current = sessionId;
          
          // Fetch profile and log in background - DON'T block the UI
          fetchUserData(currentSession.user.id).then(profile => {
            startUserSessionLog({
              userId: currentSession.user.id,
              username: profile?.username || currentSession.user.email || 'Unknown',
              action: 'LOGIN',
              status: 'SUCCESS',
              sessionId: sessionId
            }).then(logData => {
              if (logData) {
                localStorage.setItem('neas_current_log_id', logData.id);
                localStorage.setItem('neas_current_log_start', logData.startTime);
              }
            });
          });
        }
      } else {
        setSession(null);
        setUser(null);
        setUserRole(null);
        setUsername(null);
        processedSessionId.current = null;
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