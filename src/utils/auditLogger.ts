"use client";

import { supabase } from "@/integrations/supabase/client";

/**
 * Logs a data change event to the datachange_logs table.
 */
export const logDataChange = async (params: {
  table_name: string;
  record_id: string | number;
  action_type: 'INSERT' | 'UPDATE' | 'DELETE' | 'IMPORT';
  old_data?: any;
  new_data?: any;
}) => {
  // Try to get username from local storage
  const stored = localStorage.getItem('neas_user_profile');
  let username = 'system';
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      username = parsed.username || 'system';
    } catch (e) {
      console.error('AuditLogger: Failed to parse user profile');
    }
  } else {
    // Fallback: Try to get the current session user if local storage is empty
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      username = session.user.email;
    }
  }

  const logEntry = {
    table_name: params.table_name,
    record_id: params.record_id.toString(),
    action_type: params.action_type,
    old_data: params.old_data || null,
    new_data: params.new_data || null,
    changed_by: username,
    changed_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('datachange_logs')
    .insert([logEntry]);

  if (error) {
    console.error(`AuditLogger Error [${params.action_type}]:`, error.message);
  } else {
    console.log(`AuditLogger: Successfully logged ${params.action_type} for ${params.table_name}`);
  }
};