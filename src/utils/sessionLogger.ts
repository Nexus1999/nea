"use client";

import { supabase } from "@/integrations/supabase/client";

export interface UserLogParams {
  userId: string;
  username: string;
  action: 'LOGIN' | 'LOGOUT' | 'TIMEOUT';
  status: string;
  sessionId: string;
}

export const generateSessionId = () => {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

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

export const startUserSessionLog = async (params: UserLogParams) => {
  try {
    const { browser, os, device, userAgent } = getDeviceInfo();
    const startTime = new Date().toISOString();
    
    let ipAddress = "Unknown";
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
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
        action: 'LOGIN',
        session_start: startTime,
        status: 'ACTIVE',
        browser,
        os,
        device,
        user_agent: userAgent,
        ip_address: ipAddress,
        session_id: params.sessionId
      })
      .select('id')
      .single();

    if (error) throw error;
    console.log(`SessionLogger: Started log ${data.id} for session ${params.sessionId}`);
    return { id: data.id, startTime };
  } catch (err) {
    console.error("SessionLogger: Failed to start log:", err);
    return null;
  }
};

export const endUserSessionLog = async (logId: string, startTimeStr: string, action: 'LOGOUT' | 'TIMEOUT') => {
  if (!logId) {
    console.warn("SessionLogger: No logId provided to endUserSessionLog");
    return false;
  }

  try {
    const endTime = new Date();
    const startTime = new Date(startTimeStr);
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    console.log(`SessionLogger: Updating log ${logId} with action ${action}...`);

    const { error } = await supabase
      .from('user_logs')
      .update({
        action: action,
        session_end: endTime.toISOString(),
        session_duration: durationSeconds,
        status: 'COMPLETED'
      })
      .eq('id', logId);

    if (error) throw error;
    
    console.log(`SessionLogger: Successfully updated log ${logId} to ${action}`);
    return true;
  } catch (err) {
    console.error("SessionLogger: Failed to update log record:", err);
    return false;
  }
};