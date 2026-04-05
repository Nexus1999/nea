import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { createSession, closeSession, initSessionLifecycle } from '@/utils/sessionTracker';

const USER_PROFILE_KEY = 'neas_user_profile';

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
  const isLoggingOut = useRef(false);

  // ====================== LOCAL STORAGE HELPERS ======================
  
  const saveProfileToStorage = useCallback((uname: string | null, role: string | null) => {
    if (uname && role) {
      const profileData = {
        username: uname,
        userRole: role,
        timestamp: Date.now()
      };
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profileData));
    } else {
      localStorage.removeItem(USER_PROFILE_KEY);
    }
  }, []);

  const loadProfileFromStorage = useCallback(() => {
    const stored = localStorage.getItem(USER_PROFILE_KEY);
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored);
      // Optional: Check if data is too old (e.g., older than 1 day)
      if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(USER_PROFILE_KEY);
        return null;
      }
      setUsername(parsed.username);
      setUserRole(parsed.userRole);
      return parsed;
    } catch (e) {
      console.error('Failed to parse stored profile');
      localStorage.removeItem(USER_PROFILE_KEY);
      return null;
    }
  }, []);

  // ====================== LOGOUT ======================
  
  const logout = useCallback(async (reason: 'LOGOUT' | 'TIMEOUT' = 'LOGOUT') => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    console.log(`AuthProvider: Initiating ${reason} sequence...`);
    
    await closeSession();

    // Clear local storage
    localStorage.removeItem('neas_last_activity');
    if (reason === 'TIMEOUT') {
      localStorage.setItem('neas_session_expired', 'true');
    }
    localStorage.removeItem(USER_PROFILE_KEY);        // ← Clear profile

    try {
      await supabase.auth.signOut();
    } catch (signOutErr) {
      console.error('AuthProvider: Supabase signOut error:', signOutErr);
    }
    
    // Clear state
    setSession(null);
    setUser(null);
    setUserRole(null);
    setUsername(null);
    
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

  // ====================== FETCH USER PROFILE ======================
  
  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, roles(name)')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        const roleName = data.roles?.name || 'User';

        setUsername(data.username);
        setUserRole(roleName);

        // Save to localStorage
        saveProfileToStorage(data.username, roleName);

        return data;
      }
    } catch (err) {
      console.error('AuthProvider: Profile fetch error:', err);
    }
    return null;
  }, [saveProfileToStorage]);

  // ====================== EFFECTS ======================

  // Quick restore from localStorage on mount
  useEffect(() => {
    loadProfileFromStorage();
  }, [loadProfileFromStorage]);

  // Session lifecycle
  useEffect(() => {
    if (session && !isLoggingOut.current) {
      createSession(session.user.id);
      const cleanupLifecycle = initSessionLifecycle();
      return cleanupLifecycle;
    }
  }, [session]);

  // Auth initialization & listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        fetchUserData(initialSession.user.id);   // This will also save to localStorage
        updateActivity();
      } else {
        localStorage.removeItem(USER_PROFILE_KEY);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        updateActivity();
        // fetchUserData will handle saving to localStorage
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setUserRole(null);
        setUsername(null);
        localStorage.removeItem(USER_PROFILE_KEY);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData, updateActivity]);

  // Activity tracking
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