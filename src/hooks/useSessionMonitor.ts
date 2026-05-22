"use client";

import { useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { logDataChange } from "@/utils/auditLogger";

export const useSessionMonitor = () => {
  const lastEventRef = useRef<string | null>(null);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Prevent duplicate logging for the same event in rapid succession
      if (lastEventRef.current === event) return;
      lastEventRef.current = event;

      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        const ipAddress = await fetchIpAddress();
        const userAgent = navigator.userAgent;
        const userEmail = session?.user?.email || 'Unknown User';
        const userId = session?.user?.id || 'N/A';

        try {
          await logDataChange({
            table_name: 'auth.sessions',
            record_id: userId,
            action_type: event === 'SIGNED_OUT' ? 'DELETE' : 'INSERT',
            old_data: event === 'SIGNED_OUT' ? { event, user: userEmail, user_agent: userAgent, ip_address: ipAddress } : null,
            new_data: event !== 'SIGNED_OUT' ? { event, user: userEmail, user_agent: userAgent, ip_address: ipAddress } : null,
          });
        } catch (err) {
          console.error("Failed to log session event to audit trail:", err);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
};

export default useSessionMonitor;