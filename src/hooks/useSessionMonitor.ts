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
      
      // Update last_seen every 2 minutes
      heartbeatIntervalRef.current = setInterval(async () => {
        try {
          await supabase
            .from('user_sessions')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', sessionId);
        } catch (err) {
          console.error("Failed to update session heartbeat:", err);
        }
      }, 2 * 60 * 1000);
    };

    const stopHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const ipAddress = await fetchIpAddress();
        const userAgent = navigator.userAgent;

        try {
          const { data, error } = await supabase
            .from('user_sessions')
            .insert({
              user_id: session.user.id,
              session_token: session.access_token,
              ip_address: ipAddress,
              user_agent: userAgent,
              is_active: true,
              login_time: new Date().toISOString(),
              last_seen: new Date().toISOString()
            })
            .select('id')
            .single();

          if (error) throw error;

          if (data) {
            currentSessionIdRef.current = data.id;
            localStorage.setItem("current_user_session_id", data.id);
            startHeartbeat(data.id);
          }
        } catch (err) {
          console.error("Failed to register user session:", err);
        }
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