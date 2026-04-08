"use client";

import React, { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Check, Minus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const RoleMatrix = () => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes, assignRes] = await Promise.all([
        supabase.from('roles').select('id, name').order('name'),
        supabase.from('permissions').select('id, name').order('name'),
        supabase.from('role_permissions').select('role_id, permission_id')
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (permsRes.error) throw permsRes.error;
      if (assignRes.error) throw assignRes.error;

      setRoles(rolesRes.data || []);
      setPermissions(permsRes.data || []);

      const mapping: Record<string, Set<string>> = {};
      assignRes.data?.forEach(item => {
        if (!mapping[item.role_id]) mapping[item.role_id] = new Set();
        mapping[item.role_id].add(item.permission_id);
      });
      setAssignments(mapping);
    } catch (err) {
      console.error("Error fetching matrix data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        <p className="text-sm text-slate-500 font-medium">Generating access matrix...</p>
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="min-w-[250px] font-bold text-[10px] uppercase tracking-widest text-slate-500">Permission Key</TableHead>
              {roles.map(role => (
                <TableHead key={role.id} className="text-center min-w-[120px] font-bold text-[10px] uppercase tracking-widest text-slate-500">
                  {role.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map(perm => (
              <TableRow key={perm.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell>
                  <code className="px-2 py-1 bg-slate-100 rounded text-[11px] font-mono font-bold text-indigo-600 border border-indigo-100/50">
                    {perm.name}
                  </code>
                </TableCell>
                {roles.map(role => {
                  const isAssigned = assignments[role.id]?.has(perm.id);
                  return (
                    <TableCell key={`${role.id}-${perm.id}`} className="text-center">
                      <div className="flex justify-center">
                        {isAssigned ? (
                          <div className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <Minus className="h-4 w-4 text-slate-200" />
                        )}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RoleMatrix;