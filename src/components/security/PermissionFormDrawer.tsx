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
import { Shield, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const MODULES = [
  { name: 'Timetables', actions: ['view', 'add', 'edit', 'delete'] },
  { name: 'Budgets', actions: ['view', 'add', 'edit', 'delete', 'approve'] },
  { name: 'Master Summaries', actions: ['view', 'view details', 'add', 'delete', 'manage version', 'manage special needs'] },
  { name: 'Supervisors', actions: ['view', 'add supervisor', 'assign supervisors', 'reshuffle supervisors'] },
  { name: 'Security', subModels: ['Users', 'Roles', 'Permissions', 'Audit'], actions: ['view'] },
  { name: 'Settings', subModels: ['Regions', 'Districts', 'Examinations', 'Subjects'], actions: ['view'] },
  { name: 'Stationeries', actions: ['view', 'add', 'edit', 'delete'] },
  { name: 'Institutions', subModels: ['Primary Schools', 'Secondary Schools', 'Teachers Colleges'], actions: ['view', 'add', 'edit', 'delete','import'] },
  { name: 'Miscellaneous', subModels: ['Teachers Inventory'], actions: ['view', 'add', 'edit', 'delete','import'] },
  { name: 'Reports', actions: ['view', 'generate', 'export'] },
];

const SUB_ACTIONS: Record<string, string[]> = {
  'Users': ['view', 'add user', 'view profile', 'reset password', 'block', 'delete'],
  'Roles': ['view', 'add', 'edit', 'delete'],
  'Permissions': ['view', 'add', 'edit', 'delete'],
  'Regions': ['view', 'add', 'edit', 'delete'],
  'Districts': ['view', 'add', 'edit', 'delete'],
  'Examinations': ['view', 'add', 'edit', 'delete'],
  'Subjects': ['view', 'add', 'edit', 'delete'],
  'Primary Schools': ['view', 'add', 'edit', 'delete','import'],
  'Secondary Schools': ['view', 'add', 'edit', 'delete','import'],
  'Teachers Colleges': ['view', 'add', 'edit', 'delete','import'],
  'Teachers Inventory': ['Manage Teachers', 'Add Teacher', 'Import Teachers', 'delete Teacher','delete All Teachers', 'view Teacher','edit Teacher','add assignment',
    'assign teachers','edit assignment','delete assignment','auto-assign teachers','create accounts link','reset assignments','export assignments'
  ]
};

interface PermissionFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  permission?: any;
  onSuccess: () => void;
}

const PermissionFormDrawer: React.FC<PermissionFormDrawerProps> = ({ 
  isOpen, 
  onClose, 
  permission, 
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isEditing = !!permission;

  const [formData, setFormData] = useState({
    parentModule: '',
    subModule: '',
    action: '',
    description: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (permission) {
        const parts = permission.name.split(':');
        setFormData({
          parentModule: parts[0] || '',
          subModule: parts.length === 3 ? parts[1] : '',
          action: parts.length === 3 ? parts[2] : parts[1] || '',
          description: permission.description || '',
        });
      } else {
        setFormData({
          parentModule: '',
          subModule: '',
          action: '',
          description: '',
        });
      }
    }
  }, [isOpen, permission]);

  const selectedModule = MODULES.find(m => m.name === formData.parentModule);
  const availableSubModules = selectedModule?.subModels || [];
  const availableActions = formData.subModule 
    ? (SUB_ACTIONS[formData.subModule] || selectedModule?.actions || [])
    : (selectedModule?.actions || []);

  const generatedName = formData.parentModule && formData.action 
    ? (formData.subModule 
        ? `${formData.parentModule}:${formData.subModule}:${formData.action}` 
        : `${formData.parentModule}:${formData.action}`)
    : "";

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const validate = () => {
    if (!formData.parentModule || !formData.action) {
      triggerShake();
      showError("Please select a module and action");
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const handleSave = async () => {
    setConfirmOpen(false);
    setLoading(true);

    try {
      const payload = {
        name: generatedName,
        description: formData.description || `Permission to ${formData.action} on ${formData.subModule || formData.parentModule}`
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
      onClose();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-[460px] p-0 flex flex-col bg-white overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b bg-slate-50/50">
            <SheetHeader>
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-black text-white rounded-md">
                  <Shield className="h-4 w-4" />
                </div>
                <SheetTitle className="text-lg font-bold">
                  {isEditing ? "Edit Permission" : "Add New Permission"}
                </SheetTitle>
              </div>
            </SheetHeader>
          </div>

          {/* Form Content */}
          <form 
            onSubmit={handleSubmit} 
            className={`flex-1 px-8 py-6 space-y-6 overflow-y-auto transition-transform ${shake ? 'animate-shake' : ''}`}
          >
            <div className="space-y-1">
              <Label>Parent Module *</Label>
              <Select 
                value={formData.parentModule} 
                onValueChange={(val) => setFormData({ ...formData, parentModule: val, subModule: '', action: '' })}
                disabled={isEditing}
              >
                <SelectTrigger className="h-10">
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
              <div className="space-y-1">
                <Label>Sub-Module</Label>
                <Select 
                  value={formData.subModule} 
                  onValueChange={(val) => setFormData({ ...formData, subModule: val, action: '' })}
                  disabled={isEditing}
                >
                  <SelectTrigger className="h-10">
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

            <div className="space-y-1">
              <Label>Action *</Label>
              <Select 
                value={formData.action} 
                onValueChange={(val) => setFormData({ ...formData, action: val })}
                disabled={isEditing || !formData.parentModule}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select action..." />
                </SelectTrigger>
                <SelectContent>
                  {availableActions.map(a => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Description</Label>
              <Input 
                placeholder="Describe what this permission allows..." 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-10"
              />
            </div>

            {generatedName && (
              <div className="p-4 rounded-xl bg-slate-50 border">
                <Label className="text-xs text-slate-500 mb-1 block">Generated Permission Key</Label>
                <code className="text-sm font-mono text-indigo-600 bg-white px-3 py-1.5 rounded border">
                  {generatedName}
                </code>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !formData.parentModule || !formData.action}
              className="bg-black hover:bg-gray-800 px-6"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? "Update Permission" : "Create Permission"}
                </>
              )}
            </Button>
          </div>
        </SheetContent>

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
        title={isEditing ? "Update Permission?" : "Create Permission?"}
        message={isEditing 
          ? `Are you sure you want to update <b>${generatedName}</b>?` 
          : `Are you sure you want to create <b>${generatedName}</b>?`
        }
        confirmText={isEditing ? "Yes, Update" : "Yes, Create"}
        onConfirm={handleSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
};

export default PermissionFormDrawer;