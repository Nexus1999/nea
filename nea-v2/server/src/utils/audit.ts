import { db } from '../db';
import { auditLogs } from '../db/schema';

export async function auditLog({
  tableName,
  recordId,
  actionType,
  oldData,
  newData,
  changedBy,
}: {
  tableName: string;
  recordId: string | number;
  actionType: 'INSERT' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'IMPORT';
  oldData?: any;
  newData?: any;
  changedBy?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      tableName,
      recordId: String(recordId),
      actionType,
      oldData,
      newData,
      changedBy,
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}
