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

  const logout = useCallback(async (reason: 'LOGOUT' | 'TIMEOUT' = 'LOGOUT') => {
    console.log(`AuthProvider: Logging out. Reason: ${reason}`);
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
    if (session) {
      localStorage.setItem('neas_last_activity', Date.now().toString());
    }
  }, [session]);

  const checkInactivity = useCallback(() => {
    const lastActivity = localStorage.getItem('neas_last_activity');
    if (lastActivity && session) {
      const elapsed = Date.now() - parseInt(lastActivity);
      if (elapsed >= INACTIVITY_LIMIT) {
        console.log("AuthProvider: Inactivity limit reached");
        logout('TIMEOUT');
      }
    }
  }, [session, logout]);

  const fetchUserData = async (userId: string) => {
    console.log(`AuthProvider: Fetching profile for user ${userId}`);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, first_name, last_name, role_id, roles(name)')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('AuthProvider: Error fetching profile:', error);
        return null;
      }

      if (data) {
        console.log('AuthProvider: Profile data received:', data.username);
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
      console.error('AuthProvider: Unexpected error in fetchUserData:', err);
    }
    return null;
  };

  useEffect(() => {
    console.log("AuthProvider: Initializing...");
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) {
        console.error("AuthProvider: Session fetch error:", error);
      }
      
      console.log("AuthProvider: Initial session check complete. Session exists:", !!initialSession);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      if (initialSession?.user) {
        fetchUserData(initialSession.user.id);
        updateActivity();
      }
      
      setLoading(false);
      console.log("AuthProvider: Loading set to false (initial)");
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`AuthProvider: Auth state changed: ${event}`);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (event === 'SIGNED_IN' && currentSession?.user) {
        const profile = await fetchUserData(currentSession.user.id);
        updateActivity();
        
        const logId = await startUserSessionLog({
          userId: currentSession.user.id,
          username: profile?.username || currentSession.user.email || 'Unknown',
          action: 'LOGIN',
          status: 'SUCCESS',
          sessionId: currentSession.access_token.substring(0, 20)
        });
        if (logId) localStorage.setItem('neas_current_log_id', logId);
      } else if (event === 'SIGNED_OUT') {
        setUserRole(null);
        setUsername(null);
      }
      
      setLoading(false);
      console.log("AuthProvider: Loading set to false (auth change)");
    });

    return () => {
      console.log("AuthProvider: Cleaning up subscription");
      subscription.unsubscribe();
    };
  }, [updateActivity]);

  useEffect(() => {
    if (session) {
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
      events.forEach(event => window.addEventListener(event, updateActivity));
      window.addEventListener('online', checkInactivity);
      checkIntervalRef.current = setInterval(checkInactivity, CHECK_INTERVAL);

      return () => {
        events.forEach(event => window.removeEventListener(event, updateActivity));
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