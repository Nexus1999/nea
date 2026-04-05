"use client";

import { supabase } from "@/integrations/supabase/client";

const SESSION_TOKEN_KEY = 'neas_session_token';
const HEARTBEAT_INTERVAL = 60000; // 60 seconds

export const generateToken = () => {
  return crypto.randomUUID();
};

export const getStoredToken = () => {
  return localStorage.getItem(SESSION_TOKEN_KEY);
};

export const createSession = async (userId: string) => {
  try {
    const existingToken = getStoredToken();
    if (existingToken) {
      const { data: existingSession } = await supabase
        .from('user_sessions')
        .select('id')
        .eq('session_token', existingToken)
        .eq('is_active', true)
        .maybeSingle();
      
      if (existingSession) {
        console.log("SessionTracker: Reusing existing active session");
        return existingToken;
      }
    }

    const sessionToken = generateToken();
    const userAgent = navigator.userAgent;
    
    let ipAddress = "Unknown";
    try {
      const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
      const data = await res.json();
      ipAddress = data.ip;
    } catch (e) {
      console.warn("SessionTracker: IP fetch failed");
    }

    const { error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        login_time: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_active: true,
        user_agent: userAgent,
        ip_address: ipAddress
      });

    if (error) throw error;

    localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
    console.log("SessionTracker: New session created");
    return sessionToken;
  } catch (err) {
    console.error("SessionTracker: Failed to create session:", err);
    return null;
  }
};

export const updateSessionHeartbeat = async () => {
  const token = getStoredToken();
  if (!token) return;

  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({ last_seen: new Date().toISOString() })
      .eq('session_token', token)
      .eq('is_active', true);

    if (error) throw error;
  } catch (err) {
    console.error("SessionTracker: Heartbeat failed:", err);
  }
};

export const closeSession = async () => {
  const token = getStoredToken();
  if (!token) return;

  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        logout_time: new Date().toISOString(),
        is_active: false,
        last_seen: new Date().toISOString()
      })
      .eq('session_token', token);

    if (error) throw error;
    localStorage.removeItem(SESSION_TOKEN_KEY);
    console.log("SessionTracker: Session closed successfully");
  } catch (err) {
    console.error("SessionTracker: Failed to close session:", err);
  }
};

export const initSessionLifecycle = () => {
  const interval = setInterval(updateSessionHeartbeat, HEARTBEAT_INTERVAL);
  
  const handleUnload = () => {
    const token = getStoredToken();
    if (token) {
      // Best effort update on close
      updateSessionHeartbeat();
    }
  };

  window.addEventListener('beforeunload', handleUnload);

  return () => {
    clearInterval(interval);
    window.removeEventListener('beforeunload', handleUnload);
  };
};