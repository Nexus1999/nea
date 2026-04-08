"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  const fetchPermissions = async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role_id')
        .eq('id', userId)
        .single();

      if (profileError || !profile?.role_id) return;

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
    } catch (err) {
      console.error("Error fetching permissions:", err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchPermissions(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPermissions(session.user.id);
      } else {
        setPermissions([]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasPermission = (permission: string) => {
    return permissions.includes(permission) || permissions.includes('ADMINISTRATOR');
  };

  const refreshPermissions = async () => {
    if (user) await fetchPermissions(user.id);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, permissions, hasPermission, refreshPermissions }}>
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