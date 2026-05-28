"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Check, Minus, Loader2, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleMatrixProps {
  isOpen: boolean;
  onClose: () => void;
}

const RoleMatrix: React.FC<RoleMatrixProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-[98vw] sm:w-[98vw] md:w-[98vw] lg:w-[98vw] xl:w-[98vw] max-w-none p-0 flex flex-col overflow-hidden bg-white border-l shadow-2xl"
      >
        {/* Header */}
        <div className="px-8 py-5 border-b bg-slate-50 flex items-center justify-between sticky top-0 z-20">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-2xl font-bold">Role Permission Matrix</SheetTitle>
                <p className="text-sm text-slate-500 mt-0.5">
                  Complete overview of all roles and their permissions
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={fetchData} 
              disabled={loading}
              className="gap-2 rounded-xl"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh Matrix
            </Button>
            
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-xl">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8 bg-white">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-slate-300" />
              <p className="text-slate-500 font-medium">Loading permission matrix...</p>
            </div>
          ) : (
            <div className="border rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="min-w-[340px] font-semibold text-sm py-5 pl-8 text-slate-700 border-r">
                        Permission Key
                      </TableHead>
                      {roles.map(role => (
                        <TableHead 
                          key={role.id} 
                          className="text-center min-w-[150px] font-semibold text-sm py-5 text-slate-700 border-r last:border-r-0"
                        >
                          {role.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map(perm => (
                      <TableRow key={perm.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="pl-8 border-r font-medium">
                          <code className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-mono text-indigo-700 border border-indigo-100">
                            {perm.name}
                          </code>
                        </TableCell>
                        {roles.map(role => {
                          const isAssigned = assignments[role.id]?.has(perm.id);
                          return (
                            <TableCell 
                              key={`${role.id}-${perm.id}`} 
                              className="text-center border-r last:border-r-0 py-4"
                            >
                              <div className="flex justify-center">
                                {isAssigned ? (
                                  <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200">
                                    <Check className="h-5 w-5" />
                                  </div>
                                ) : (
                                  <Minus className="h-6 w-6 text-slate-200" />
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
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RoleMatrix;