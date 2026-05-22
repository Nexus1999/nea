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
import { Textarea } from "@/components/ui/textarea";
import { Shield, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { logDataChange } from "@/utils/auditLogger";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface RoleFormProps {
  isOpen: boolean;
  onClose: () => void;
  role?: any;
  onSuccess: () => void;
}

const RoleForm: React.FC<RoleFormProps> = ({ isOpen, onClose, role, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<any>(null);

  const isEditing = !!role?.id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (role) {
        setFormData({
          name: role.name || '',
          description: role.description || '',
        });
      } else {
        setFormData({ name: '', description: '' });
      }
    }
  }, [isOpen, role]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const validate = () => {
    if (!formData.name.trim()) {
      triggerShake();
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setPendingValues(formData);
    setConfirmOpen(true);
  };

  const handleSave = async () => {
    if (!pendingValues) return;
    setConfirmOpen(false);
    setLoading(true);

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("roles")
          .update({
            name: pendingValues.name.toUpperCase(),
            description: pendingValues.description,
          })
          .eq("id", role.id);

        if (error) throw error;

        await logDataChange({
          table_name: 'roles',
          record_id: role.id,
          action_type: 'UPDATE',
          old_data: role,
          new_data: pendingValues
        });

        showSuccess("Role updated successfully");
      } else {
        const { data, error } = await supabase
          .from("roles")
          .insert({
            name: pendingValues.name.toUpperCase(),
            description: pendingValues.description,
          })
          .select('id')
          .single();

        if (error) throw error;

        await logDataChange({
          table_name: 'roles',
          record_id: data.id,
          action_type: 'INSERT',
          new_data: pendingValues
        });

        showSuccess("Role created successfully");
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
        <SheetContent className="sm:max-w-[520px] p-0 flex flex-col bg-white overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b bg-slate-50/50">
            <SheetHeader>
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-black text-white rounded-md">
                  <Shield className="h-4 w-4" />
                </div>
                <SheetTitle className="text-lg font-bold">
                  {isEditing ? "Edit Role" : "Create New Role"}
                </SheetTitle>
              </div>
            </SheetHeader>
          </div>

          {/* Form */}
          <form 
            onSubmit={handleSubmit} 
            className={`flex-1 px-8 py-6 space-y-6 overflow-y-auto transition-transform ${shake ? 'animate-shake' : ''}`}
          >
            <div className="space-y-1">
              <Label className="text-xs font-medium">Role Name *</Label>
              <Input
                className="h-9 uppercase"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ADMINISTRATOR"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea
                className="min-h-[120px] resize-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this role can do..."
              />
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="bg-black hover:bg-gray-800 px-6"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? "Update Role" : "Create Role"}
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

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title={isEditing ? "Update Role?" : "Create Role?"}
        message={isEditing 
          ? `Are you sure you want to update the role <b>${pendingValues?.name}</b>?` 
          : `Are you sure you want to create the role <b>${pendingValues?.name}</b>?`
        }
        confirmText={isEditing ? "Yes, Update" : "Yes, Create"}
        isDestructive={false}
        onConfirm={handleSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
};

export default RoleForm;