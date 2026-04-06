"use client";

import React, { useState, useMemo } from "react";
import { Loader2, Lock, Save, ShieldCheck, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { logDataChange } from "@/utils/auditLogger";

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ open, onOpenChange, user }) => {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const strength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  }, [newPassword]);

  const getStrengthColor = () => {
    switch (strength) {
      case 0: return "bg-slate-200";
      case 1: return "bg-red-500";
      case 2: return "bg-orange-500";
      case 3: return "bg-yellow-500";
      case 4: return "bg-emerald-500";
      default: return "bg-slate-200";
    }
  };

  const getStrengthText = () => {
    switch (strength) {
      case 0: return "Too short";
      case 1: return "Weak";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Strong";
      default: return "";
    }
  };

  const handleReset = async () => {
    if (newPassword.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { 
          action: 'UPDATE_PASSWORD', 
          userData: { userId: user.id, newPassword } 
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      await logDataChange({
        table_name: 'auth.users',
        record_id: user.id,
        action_type: 'UPDATE',
        new_data: { action: 'PASSWORD_RESET', username: user.username }
      });

      showSuccess(`Password for ${user.username} updated successfully`);
      onOpenChange(false);
      setNewPassword("");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-orange-600" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Set a new password for <b>{user?.username}</b>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase">New Password</Label>
            <Input 
              type="password" 
              placeholder="••••••••" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                <span className="text-slate-500">Strength: {getStrengthText()}</span>
                {strength === 4 ? <ShieldCheck className="h-3 w-3 text-emerald-500" /> : <Shield className="h-3 w-3 text-slate-300" />}
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-full flex-1 transition-all duration-500",
                      i <= strength ? getStrengthColor() : "bg-slate-200"
                    )} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleReset} disabled={loading || strength < 2} className="bg-orange-600 hover:bg-orange-700 text-white">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordModal;