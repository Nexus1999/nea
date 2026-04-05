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
  const isInitialized = useRef(false);

  const logout = useCallback(async (reason: 'LOGOUT' | 'TIMEOUT' = 'LOGOUT') => {
    console.log(`AuthProvider: Initiating ${reason} sequence...`);
    
    const logId = localStorage.getItem('neas_current_log_id');
    if (logId) {
      // Update log in background
      endUserSessionLog(logId, reason).catch(err => console.error("Logout log error:", err));
      localStorage.removeItem('neas_current_log_id');
    }

    await supabase.auth.signOut();
    
    if (reason === 'TIMEOUT') {
      localStorage.setItem('neas_session_expired', 'true');
    }
    
    localStorage.removeItem('neas_user_data');
    localStorage.removeItem('neas_last_activity');

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
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity);
      if (elapsed >= INACTIVITY_LIMIT) {
        console.log("AuthProvider: Inactivity detected");
        logout('TIMEOUT');
      }
    }
  }, [logout]);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, first_name, last_name, role_id, roles(name)')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;

      if (data) {
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
      console.error('AuthProvider: Profile fetch error:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Get initial session immediately
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      if (initialSession?.user) {
        fetchUserData(initialSession.user.id);
        updateActivity();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`AuthProvider: Auth Event -> ${event}`);
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        updateActivity();
        
        // Handle profile and logging in background to avoid blocking UI
        if (event === 'SIGNED_IN') {
          fetchUserData(currentSession.user.id).then(profile => {
            startUserSessionLog({
              userId: currentSession.user.id,
              username: profile?.username || currentSession.user.email || 'Unknown',
              action: 'LOGIN',
              status: 'SUCCESS',
              sessionId: currentSession.access_token.substring(0, 20)
            }).then(logId => {
              if (logId) localStorage.setItem('neas_current_log_id', logId);
            });
          });
        } else {
          fetchUserData(currentSession.user.id);
        }
      } else {
        setUserRole(null);
        setUsername(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData, updateActivity]);

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