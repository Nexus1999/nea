import { supabase } from "@/integrations/supabase/client";

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

interface LogParams {
  tableName: string;
  recordId: string | number;
  actionType: AuditAction;
  oldData?: any;
  newData?: any;
}

export const logChange = async ({
  tableName,
  recordId,
  actionType,
  oldData = null,
  newData = null
}: LogParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('datachange_logs')
      .insert({
        table_name: tableName,
        record_id: String(recordId),
        action_type: actionType,
        old_data: oldData,
        new_data: newData,
        changed_by: user?.id || null
      });

    if (error) console.error("Audit Log Error:", error);
  } catch (err) {
    console.error("Failed to record audit log:", err);
  }
};