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
      console.error('AuditLogger: Failed to parse user profile');
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

  console.log(`AuditLogger: Attempting to log ${params.action_type} on ${params.table_name}...`, logEntry);

  const { error } = await supabase
    .from('datachange_logs')
    .insert([logEntry]);

  if (error) {
    console.error(`AuditLogger Error [${params.action_type}]:`, error.message, error.details);
    // If you see a "invalid input syntax for type uuid" error here, 
    // it means you need to change the record_id column to TEXT in your database.
  } else {
    console.log(`AuditLogger: Successfully logged ${params.action_type} for record ${params.record_id}`);
  }
};