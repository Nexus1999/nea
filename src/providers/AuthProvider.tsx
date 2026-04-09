"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  userRole: string | null;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  refreshPermissions: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile with role name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          role_id,
          roles (
            name
          )
        `)
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      if (profile?.roles) {
        setUserRole((profile.roles as any).name);
      }

      // Fetch permissions for this role
      if (profile?.role_id) {
        const { data, error } = await supabase
          .from('role_permissions')
          .select(`
            permissions (
              name
            )
          `)
          .eq('role_id', profile.role_id);

        if (error) throw error;

        const permList = data
          ?.map((item: any) => item.permissions?.name)
          .filter(Boolean) || [];
        
        setPermissions(permList);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setPermissions([]);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasPermission = (permission: string) => {
    return permissions.includes(permission) || userRole === 'ADMINISTRATOR';
  };

  const refreshPermissions = async () => {
    if (user) await fetchUserData(user.id);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      loading, 
      userRole, 
      permissions, 
      hasPermission, 
      refreshPermissions,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};