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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Shield } from "lucide-react";

const MODULES = [
  { name: 'Timetables', actions: ['view', 'add', 'edit', 'delete'] },
  { name: 'Budgets', actions: ['view', 'add', 'edit', 'delete', 'approve'] },
  { name: 'Master Summaries', actions: ['view', 'view details', 'add', 'delete', 'manage version', 'manage special needs'] },
  { name: 'Supervisors', actions: ['view', 'add supervisor', 'assign supervisors', 'reshuffle supervisors'] },
  { name: 'Security', subModels: ['Users', 'Roles', 'Permissions', 'Audit'], actions: ['view'] },
  { name: 'Settings', subModels: ['Regions', 'Districts', 'Examinations', 'Subjects'], actions: ['view'] },
];

const SUB_ACTIONS: Record<string, string[]> = {
  'Users': ['view', 'add user', 'view profile', 'reset password', 'block', 'delete'],
  'Roles': ['view', 'add', 'edit', 'delete'],
  'Permissions': ['view', 'add', 'edit', 'delete'],
  'Regions': ['view', 'add', 'edit', 'delete'],
};

interface PermissionFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission?: any;
  onSuccess: () => void;
}

const PermissionFormDrawer: React.FC<PermissionFormDrawerProps> = ({ open, onOpenChange, permission, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [parentModule, setParentModule] = useState("");
  const [subModule, setSubModule] = useState("");
  const [action, setAction] = useState("");
  const [description, setDescription] = useState("");

  const isEditing = !!permission;

  useEffect(() => {
    if (open && permission) {
      const parts = permission.name.split(':');
      if (parts.length === 3) {
        setParentModule(parts[0]);
        setSubModule(parts[1]);
        setAction(parts[2]);
      } else {
        setParentModule(parts[0]);
        setSubModule("");
        setAction(parts[1]);
      }
      setDescription(permission.description || "");
    } else if (open) {
      setParentModule("");
      setSubModule("");
      setAction("");
      setDescription("");
    }
  }, [open, permission]);

  const selectedModule = MODULES.find(m => m.name === parentModule);
  const availableSubModules = selectedModule?.subModels || [];
  const availableActions = subModule 
    ? (SUB_ACTIONS[subModule] || selectedModule?.actions || [])
    : (selectedModule?.actions || []);

  const generatedName = parentModule && action 
    ? (subModule ? `${parentModule}:${subModule}:${action}` : `${parentModule}:${action}`)
    : "";

  const handleSave = async () => {
    if (!parentModule || !action) {
      showError("Please select a module and action");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: generatedName,
        description: description || `Permission to ${action} on ${subModule || parentModule}`
      };

      if (isEditing) {
        const { error } = await supabase
          .from('permissions')
          .update(payload)
          .eq('id', permission.id);
        if (error) throw error;
        showSuccess("Permission updated successfully");
      } else {
        const { error } = await supabase
          .from('permissions')
          .insert([payload]);
        if (error) throw error;
        showSuccess("Permission created successfully");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[420px] flex flex-col">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Permission" : "Add Permission"}
          </SheetTitle>
          <SheetDescription>
            Define granular access control keys for the system.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Parent Module</Label>
            <Select 
              value={parentModule} 
              onValueChange={(val) => { setParentModule(val); setSubModule(""); setAction(""); }}
              disabled={isEditing}
            >
              <SelectTrigger className="h-11 rounded-xl border-slate-200">
                <SelectValue placeholder="Select module..." />
              </SelectTrigger>
              <SelectContent>
                {MODULES.map(m => (
                  <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableSubModules.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sub-Module</Label>
              <Select 
                value={subModule} 
                onValueChange={(val) => { setSubModule(val); setAction(""); }}
                disabled={isEditing}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue placeholder="Select sub-module..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSubModules.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</Label>
            <Select 
              value={action} 
              onValueChange={setAction}
              disabled={isEditing || !parentModule}
            >
              <SelectTrigger className="h-11 rounded-xl border-slate-200">
                <SelectValue placeholder="Select action..." />
              </SelectTrigger>
              <SelectContent>
                {availableActions.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</Label>
            <Input 
              placeholder="Describe what this permission allows..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-11 rounded-xl border-slate-200"
            />
          </div>

          {generatedName && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Permission Key Preview</Label>
              <div className="flex">
                <code className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-indigo-600">
                  {generatedName}
                </code>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !parentModule || !action}
            className="bg-black hover:bg-gray-800 text-white rounded-xl px-8"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEditing ? "Save Changes" : "Add Permission")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default PermissionFormDrawer;