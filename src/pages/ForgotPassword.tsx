"use client";

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import NectaLogo from '@/components/NectaLogo';
import { motion } from 'framer-motion';
import { showError, showSuccess } from '@/utils/toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
          <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">
            NEAS <span className="text-red-600">Admin</span>
          </h1>
        </div>

        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white/80 backdrop-blur-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="pt-10 pb-2 px-8 text-center">
            <p className="text-gray-500 font-medium">National Examination Administration System</p>
            <div className="flex justify-center mb-6 mt-4">
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="p-6 bg-white rounded-3xl shadow-xl ring-1 ring-gray-100"
              >
                <NectaLogo className="w-24 h-24" />
              </motion.div>
            </div>
            <CardDescription className="text-gray-500">
              {submitted 
                ? "Check your email for the reset link." 
                : "Enter your email address and we'll send you a link to reset your password."}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            {!submitted ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!email) return;
                setLoading(true);
                try {
                  const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  if (error) throw error;
                  setSubmitted(true);
                  showSuccess("Password reset link sent to your email!");
                } catch (error: any) {
                  showError(error.message || "Failed to send reset link");
                } finally {
                  setLoading(false);
                }
              }} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 ml-1">Email Address</Label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                      <Mail size={18} />
                    </div>
                    <Input 
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-11 h-12 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-red-500 focus:border-red-500 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-6">
                <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
                  If an account exists for {email}, you will receive a password reset link shortly.
                </div>
                <Button 
                  variant="outline"
                  className="w-full h-12 rounded-xl border-gray-200 font-bold"
                  onClick={() => setSubmitted(false)}
                >
                  Try another email
                </Button>
              </div>
            )}

            <div className="mt-8 text-center">
              <Link to="/login" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-red-600 transition-colors">
                <ArrowLeft size={16} className="mr-2" /> Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">
            © 2024 NECTA • All Rights Reserved
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;