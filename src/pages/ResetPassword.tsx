"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import NectaLogo from '@/components/NectaLogo';
import { motion } from 'framer-motion';
import { showError, showSuccess } from '@/utils/toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we have a session (Supabase handles the hash fragment automatically)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showError("Invalid or expired reset link.");
        navigate('/login');
      }
    };
    checkSession();
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;
    
    if (password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      showSuccess("Password updated successfully!");
      navigate('/login');
    } catch (error: any) {
      showError(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-100 rounded-full blur-[120px] opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-100 rounded-full blur-[120px] opacity-50" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[440px] px-4 z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-white rounded-3xl shadow-xl mb-6 ring-1 ring-gray-100">
            <NectaLogo className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">
            NEAS <span className="text-red-600">Admin</span>
          </h1>
        </div>

        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white/80 backdrop-blur-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="pt-10 pb-6 px-8">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-green-600" />
              <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Secure Reset</span>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">Set New Password</CardTitle>
            <CardDescription className="text-gray-500">
              Please enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 ml-1">New Password</Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <Input 
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-11 h-12 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-red-500 focus:border-red-500 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700 ml-1">Confirm Password</Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                    <CheckCircle2 size={18} />
                  </div>
                  <Input 
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="pl-11 h-12 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-red-500 focus:border-red-500 transition-all"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin mr-2" size={20} />
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;