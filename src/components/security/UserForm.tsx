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
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Edit, Save, Loader2, Mail, Lock, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { logDataChange } from "@/utils/auditLogger";

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  onSuccess: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, user, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [shake, setShake] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!user;

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone_number: '',
    password: '',
    role_id: '',
  });

  const applyPhoneMask = (input: string) => {
    let raw = input.replace(/\D/g, '');
    if (raw.length > 12) raw = raw.slice(0, 12);
    let formatted = '+255 ';
    if (raw.length > 3) formatted += raw.slice(3, 6) + ' ';
    if (raw.length > 6) formatted += raw.slice(6, 9) + ' ';
    if (raw.length > 9) formatted += raw.slice(9, 12);
    return formatted.trim();
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      if (user) {
        setFormData({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          username: user.username || '',
          email: user.email || '',
          phone_number: user.phone_number || '',
          password: '',
          role_id: user.role_id || '',
        });
      } else {
        setFormData({
          first_name: '',
          last_name: '',
          username: '',
          email: '',
          phone_number: '',
          password: '',
          role_id: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, user]);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("roles")
        .select("id, name")
        .order("name");
      if (error) throw error;
      if (data) setRoles(data);
    } catch (err: any) {
      console.error("Error fetching roles:", err.message);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) newErrors.first_name = "First name is required";
    if (!formData.last_name.trim()) newErrors.last_name = "Last name is required";
    if (!formData.username.trim() || formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.role_id) newErrors.role_id = "Please select a role";

    const phoneDigits = formData.phone_number.replace(/\D/g, '');
    if (phoneDigits.length > 0 && phoneDigits.length !== 12) {
      newErrors.phone_number = "Phone number must be 12 digits (+255)";
    }

    if (!isEditing && (!formData.password || formData.password.length < 6)) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            username: formData.username,
            email: formData.email,
            phone_number: formData.phone_number,
            role_id: formData.role_id,
          })
          .eq('id', user.id);

        if (error) throw error;

        await logDataChange({
          table_name: 'profiles',
          record_id: user.id,
          action_type: 'UPDATE',
          old_data: user,
          new_data: formData,
        });

        showSuccess("User updated successfully");
      } else {
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: { 
            action: 'CREATE_USER', 
            userData: formData 
          }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        await logDataChange({
          table_name: 'profiles',
          record_id: data.user.id,
          action_type: 'INSERT',
          new_data: formData,
        });

        showSuccess("User created successfully");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      showError(err.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[580px] p-0 flex flex-col bg-white overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-black text-white rounded-md">
                {isEditing ? <Edit className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              </div>
              <SheetTitle className="text-lg font-bold">
                {isEditing ? "Edit User" : "Register New User"}
              </SheetTitle>
            </div>
          </SheetHeader>
        </div>

        <form 
          onSubmit={handleSubmit} 
          className={`flex-1 px-8 py-6 space-y-5 overflow-y-auto transition-transform ${shake ? 'animate-shake' : ''}`}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className={`text-xs ${errors.first_name ? "text-red-500" : ""}`}>First Name *</Label>
              <Input
                className={`h-9 ${errors.first_name ? "border-red-500" : ""}`}
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="John"
              />
              {errors.first_name && <p className="text-[10px] text-red-500 font-medium">{errors.first_name}</p>}
            </div>

            <div className="space-y-1">
              <Label className={`text-xs ${errors.last_name ? "text-red-500" : ""}`}>Last Name *</Label>
              <Input
                className={`h-9 ${errors.last_name ? "border-red-500" : ""}`}
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Doe"
              />
              {errors.last_name && <p className="text-[10px] text-red-500 font-medium">{errors.last_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className={`text-xs ${errors.username ? "text-red-500" : ""}`}>Username *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className={`h-9 pl-9 ${errors.username ? "border-red-500" : ""}`}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="johndoe"
                />
              </div>
              {errors.username && <p className="text-[10px] text-red-500 font-medium">{errors.username}</p>}
            </div>

            <div className="space-y-1">
              <Label className={`text-xs ${errors.role_id ? "text-red-500" : ""}`}>System Role *</Label>
              <Select onValueChange={(val) => setFormData({ ...formData, role_id: val })} value={formData.role_id}>
                <SelectTrigger className={`h-9 ${errors.role_id ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role_id && <p className="text-[10px] text-red-500 font-medium">{errors.role_id}</p>}
            </div>
          </div>

          {/* Email & Phone on the same line */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className={`text-xs ${errors.email ? "text-red-500" : ""}`}>Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className={`h-9 pl-9 ${errors.email ? "border-red-500" : ""}`}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              {errors.email && <p className="text-[10px] text-red-500 font-medium">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <Label className={`text-xs ${errors.phone_number ? "text-red-500" : ""}`}>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className={`h-9 pl-9 ${errors.phone_number ? "border-red-500" : ""}`}
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: applyPhoneMask(e.target.value) })}
                  placeholder="+255 712 345 678"
                />
              </div>
              {errors.phone_number && <p className="text-[10px] text-red-500 font-medium">{errors.phone_number}</p>}
            </div>
          </div>

          {!isEditing && (
            <div className="space-y-1">
              <Label className={`text-xs ${errors.password ? "text-red-500" : ""}`}>Initial Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className={`h-9 pl-9 ${errors.password ? "border-red-500" : ""}`}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-[10px] text-red-500 font-medium">{errors.password}</p>}
            </div>
          )}
        </form>

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
                {isEditing ? "Update User" : "Create User"}
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
  );
};

export default UserForm;