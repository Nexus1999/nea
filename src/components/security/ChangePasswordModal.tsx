"use client";

import React, { useState, useMemo } from "react";
import { Loader2, Lock, Save, Check, X } from "lucide-react";
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

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ open, onOpenChange, user }) => {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const strength = useMemo(() => {
    let score = 0;
    if (!newPassword) return 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  }, [newPassword]);

  const strengthLabel = ["Weak", "Fair", "Good", "Strong", "Excellent"][strength];
  const strengthColor = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-emerald-500"][strength];

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
            
            {newPassword && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-gray-500">Strength: {strengthLabel}</span>
                  <span className={cn("px-1.5 py-0.5 rounded text-white", strengthColor)}>{strength * 25}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-500", strengthColor)} 
                    style={{ width: `${(strength / 4) * 100}%` }} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                  <div className={cn("flex items-center gap-1.5 text-[10px]", newPassword.length >= 8 ? "text-emerald-600" : "text-slate-400")}>
                    {newPassword.length >= 8 ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} 8+ characters
                  </div>
                  <div className={cn("flex items-center gap-1.5 text-[10px]", /[A-Z]/.test(newPassword) ? "text-emerald-600" : "text-slate-400")}>
                    {/[A-Z]/.test(newPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Uppercase
                  </div>
                  <div className={cn("flex items-center gap-1.5 text-[10px]", /[0-9]/.test(newPassword) ? "text-emerald-600" : "text-slate-400")}>
                    {/[0-9]/.test(newPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Number
                  </div>
                  <div className={cn("flex items-center gap-1.5 text-[10px]", /[^A-Za-z0-9]/.test(newPassword) ? "text-emerald-600" : "text-slate-400")}>
                    {/[^A-Za-z0-9]/.test(newPassword) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} Special char
                  </div>
                </div>
              </div>
            )}
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