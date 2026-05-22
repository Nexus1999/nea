"use client";

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Save, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface AssignPermissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AssignPermissionsDrawer: React.FC<AssignPermissionsDrawerProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shake, setShake] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [assignedPermissionIds, setAssignedPermissionIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

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

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handlePreSave = () => {
    if (!selectedRoleId) {
      showError("Please select a role");
      triggerShake();
      return;
    }
    setConfirmOpen(true);
  };

  const handleSave = async () => {
    setConfirmOpen(false);
    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', selectedRoleId);

      if (deleteError) throw deleteError;

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
      onClose();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedRoleName = roles.find(r => r.id === selectedRoleId)?.name || "the selected role";
  const modules = ["all", ...new Set(permissions.map(p => p.name.split(':')[0]))];

  const filteredPermissions = permissions.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesModule = moduleFilter === "all" || p.name.startsWith(`${moduleFilter}:`);
    return matchesSearch && matchesModule;
  });

  const groupedPermissions: Record<string, any[]> = {};
  filteredPermissions.forEach(p => {
    const module = p.name.split(':')[0];
    if (!groupedPermissions[module]) groupedPermissions[module] = [];
    groupedPermissions[module].push(p);
  });

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-[520px] p-0 flex flex-col bg-white overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b bg-slate-50/50">
            <SheetHeader>
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-emerald-600 text-white rounded-md">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <SheetTitle className="text-lg font-bold">Assign Permissions to Role</SheetTitle>
              </div>
            </SheetHeader>
          </div>

          {/* Controls */}
          <div className="px-6 py-4 border-b bg-slate-50 space-y-4">
            <div className="space-y-1">
              <Label>Select Role *</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search permissions..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-[160px] h-10">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map(m => (
                    <SelectItem key={m} value={m}>
                      {m === "all" ? "All Modules" : m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Permissions List */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {!selectedRoleId ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                <ShieldCheck className="h-16 w-16 opacity-20" />
                <p className="text-sm font-medium">Select a role to manage permissions</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <div key={module} className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-lg border">
                      <span className="font-semibold text-slate-700">{module}</span>
                      <Badge variant="secondary" className="text-xs">
                        {perms.filter(p => assignedPermissionIds.has(p.id)).length} / {perms.length}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      {perms.map(p => (
                        <div key={p.id} className="flex items-center justify-between py-3 px-1 border-b last:border-0 hover:bg-slate-50 rounded-lg group">
                          <div className="pr-4">
                            <p className="text-sm font-medium">{p.name.split(':').pop()}</p>
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {p.description || `Access to ${p.name}`}
                            </p>
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

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button 
              onClick={handlePreSave} 
              disabled={saving || !selectedRoleId}
              className="bg-emerald-600 hover:bg-emerald-700 px-6"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Assignments
                </>
              )}
            </Button>
          </div>
        </SheetContent>

        {/* Shake Animation */}
        <style jsx global>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
          }
          .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        `}</style>
      </Sheet>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Save Permission Assignments?"
        message={`Are you sure you want to update permissions for <b>${selectedRoleName}</b>?`}
        confirmText="Yes, Save Changes"
        onConfirm={handleSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
};

export default AssignPermissionsDrawer;