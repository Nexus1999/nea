"use client";

import React, { useState, useEffect } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetFooter,
  SheetDescription
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, ShieldCheck, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AssignPermissionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AssignPermissionsDrawer: React.FC<AssignPermissionsDrawerProps> = ({ open, onOpenChange, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (selectedRoleId) {
      fetchAssignedPermissions(selectedRoleId);
    } else {
      setAssignedPermissionIds(new Set());
    }
  }, [selectedRoleId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        supabase.from('roles').select('id, name').order('name'),
        supabase.from('permissions').select('*').order('name')
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (permsRes.error) throw permsRes.error;

      setRoles(rolesRes.data || []);
      setPermissions(permsRes.data || []);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedPermissions = async (roleId: string) => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', roleId);

      if (error) throw error;
      setAssignedPermissionIds(new Set(data.map(item => item.permission_id)));
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleTogglePermission = (permissionId: string) => {
    const newSet = new Set(assignedPermissionIds);
    if (newSet.has(permissionId)) {
      newSet.delete(permissionId);
    } else {
      newSet.add(permissionId);
    }
    setAssignedPermissionIds(newSet);
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;

    setSaving(true);
    try {
      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', selectedRoleId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (assignedPermissionIds.size > 0) {
        const assignments = Array.from(assignedPermissionIds).map(pid => ({
          role_id: selectedRoleId,
          permission_id: pid
        }));

        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(assignments);

        if (insertError) throw insertError;
      }

      showSuccess("Permissions updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const modules = ["all", ...new Set(permissions.map(p => p.name.split(':')[0]))];

  const filteredPermissions = permissions.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesModule = moduleFilter === "all" || p.name.startsWith(`${moduleFilter}:`);
    return matchesSearch && matchesModule;
  });

  // Group by module
  const groupedPermissions: Record<string, any[]> = {};
  filteredPermissions.forEach(p => {
    const module = p.name.split(':')[0];
    if (!groupedPermissions[module]) groupedPermissions[module] = [];
    groupedPermissions[module].push(p);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] flex flex-col">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            Assign Permissions
          </SheetTitle>
          <SheetDescription>
            Manage which permissions are granted to specific system roles.
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4 border-b">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Select Role</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200">
                <SelectValue placeholder="Choose a role..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search permissions..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl border-slate-200"
              />
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[140px] h-10 rounded-xl border-slate-200">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                {modules.map(m => (
                  <SelectItem key={m} value={m}>{m === "all" ? "All Modules" : m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          {!selectedRoleId ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <ShieldCheck className="h-12 w-12 opacity-20" />
              <p className="text-sm font-medium">Select a role to manage permissions</p>
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([module, perms]) => (
                <div key={module} className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{module}</span>
                    <Badge variant="outline" className="bg-white text-[10px]">
                      {perms.filter(p => assignedPermissionIds.has(p.id)).length} / {perms.length}
                    </Badge>
                  </div>
                  <div className="space-y-1 px-1">
                    {perms.map(p => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-slate-900">{p.name.split(':').pop()}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{p.description || `Access to ${p.name}`}</p>
                        </div>
                        <Switch 
                          checked={assignedPermissionIds.has(p.id)}
                          onCheckedChange={() => handleTogglePermission(p.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !selectedRoleId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Assignments"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default AssignPermissionsDrawer;