"use client";

import { supabase } from "@/integrations/supabase/client";

export interface UserLogParams {
  userId: string;
  username: string;
  action: 'LOGIN' | 'LOGOUT' | 'TIMEOUT';
  status: string;
  sessionId?: string;
}

/**
 * Captures device and browser information from the user agent string.
 */
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  let device = "Desktop";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "Mac OS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  if (/Mobi|Android/i.test(ua)) device = "Mobile";

  return { browser, os, device, userAgent: ua };
};

/**
 * Records a session event in the user_logs table.
 */
export const startUserSessionLog = async (params: UserLogParams) => {
  try {
    const { browser, os, device, userAgent } = getDeviceInfo();
    
    // Attempt to get IP (optional, might be blocked by adblockers)
    let ipAddress = "Client-side";
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      ipAddress = ipData.ip;
    } catch (e) {
      console.warn("Could not fetch IP address");
    }

    const { data, error } = await supabase
      .from('user_logs')
      .insert({
        user_id: params.userId,
        username: params.username,
        action: params.action,
        session_start: new Date().toISOString(),
        status: params.status,
        browser,
        os,
        device,
        user_agent: userAgent,
        ip_address: ipAddress,
        session_id: params.sessionId || null
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (err) {
    console.error("Failed to start user log:", err);
    return null;
  }
};

/**
 * Updates an existing session log with end time and duration.
 */
export const endUserSessionLog = async (logId: string, action: 'LOGOUT' | 'TIMEOUT') => {
  if (!logId) return;

  try {
    const { data: log } = await supabase
      .from('user_logs')
      .select('session_start')
      .eq('id', logId)
      .single();

    if (!log) return;

    const endTime = new Date();
    const startTime = new Date(log.session_start);
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    await supabase
      .from('user_logs')
      .update({
        action: action,
        session_end: endTime.toISOString(),
        session_duration: durationSeconds,
        status: 'COMPLETED'
      })
      .eq('id', logId);
  } catch (err) {
    console.error("Failed to end user log:", err);
  }
};