"use client";

import { useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";

export const useSessionMonitor = () => {
  const currentSessionIdRef = useRef<string | null>(localStorage.getItem("current_user_session_id"));
  const heartbeatIntervalRef = useRef<any>(null);

  useEffect(() => {
    const fetchIpAddress = async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
      } catch {
        return 'Unknown IP';
      }
    };

    const startHeartbeat = (sessionId: string) => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      
      // Update last_seen every 1 minute for more responsive tracking
      heartbeatIntervalRef.current = setInterval(async () => {
        try {
          await supabase
            .from('user_sessions')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', sessionId);
        } catch (err) {
          console.error("Failed to update session heartbeat:", err);
        }
      }, 60 * 1000);
    };

    const stopHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    const registerSession = async (userId: string, accessToken: string) => {
      // Check if we already have an active session logged for this token to prevent duplicates
      if (currentSessionIdRef.current) {
        return;
      }

      const ipAddress = await fetchIpAddress();
      const userAgent = navigator.userAgent;

      try {
        // Check if there's already an active session in the database with this token
        const { data: existing } = await supabase
          .from('user_sessions')
          .select('id')
          .eq('session_token', accessToken)
          .eq('is_active', true)
          .maybeSingle();

        if (existing) {
          currentSessionIdRef.current = existing.id;
          localStorage.setItem("current_user_session_id", existing.id);
          startHeartbeat(existing.id);
          return;
        }

        // Otherwise, insert a new session record
        const { data, error } = await supabase
          .from('user_sessions')
          .insert({
            user_id: userId,
            session_token: accessToken,
            ip_address: ipAddress,
            user_agent: userAgent,
            is_active: true,
            login_time: new Date().toISOString(),
            last_seen: new Date().toISOString()
          })
          .select('id')
          .single();

        if (error) {
          console.error("Supabase error inserting session:", error);
          throw error;
        }

        if (data) {
          currentSessionIdRef.current = data.id;
          localStorage.setItem("current_user_session_id", data.id);
          startHeartbeat(data.id);
        }
      } catch (err) {
        console.error("Failed to register user session in database:", err);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed event:", event, "Session user:", session?.user?.email);

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        await registerSession(session.user.id, session.access_token);
      }

      if (event === 'TOKEN_REFRESHED' && session?.user && currentSessionIdRef.current) {
        try {
          await supabase
            .from('user_sessions')
            .update({
              session_token: session.access_token,
              last_seen: new Date().toISOString()
            })
            .eq('id', currentSessionIdRef.current);
        } catch (err) {
          console.error("Failed to update refreshed token session:", err);
        }
      }

      if (event === 'SIGNED_OUT') {
        const sessionId = currentSessionIdRef.current || localStorage.getItem("current_user_session_id");
        stopHeartbeat();
        
        if (sessionId) {
          try {
            await supabase
              .from('user_sessions')
              .update({
                is_active: false,
                logout_time: new Date().toISOString()
              })
              .eq('id', sessionId);
          } catch (err) {
            console.error("Failed to mark session as logged out:", err);
          } finally {
            currentSessionIdRef.current = null;
            localStorage.removeItem("current_user_session_id");
          }
        }
      }
    });

    // Resume heartbeat if session ID exists on mount
    if (currentSessionIdRef.current) {
      startHeartbeat(currentSessionIdRef.current);
    }

    return () => {
      subscription.unsubscribe();
      stopHeartbeat();
    };
  }, []);
};

export default useSessionMonitor;