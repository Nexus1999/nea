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
  const stored = localStorage.getItem('neas_user_profile');
  let username = 'system';
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      username = parsed.username || 'system';
    } catch (e) {
      console.error('Failed to parse user profile for logging');
    }
  }

  const { error } = await supabase
    .from('datachange_logs')
    .insert([{
      table_name: params.table_name,
      record_id: params.record_id.toString(), // Convert to string for flexibility
      action_type: params.action_type,
      old_data: params.old_data || null,
      new_data: params.new_data || null,
      changed_by: username,
      changed_at: new Date().toISOString()
    }]);

  if (error) {
    console.error(`Audit log failed for ${params.action_type} on ${params.table_name}:`, error);
  }
};