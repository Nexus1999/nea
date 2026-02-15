"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import NectaLogo from '@/components/NectaLogo';
import { motion } from 'framer-motion';
import { showError, showSuccess } from '@/utils/toast';

const Login = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && session) {
      navigate('/dashboard');
    }
  }, [session, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Try to find the email associated with this username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', username)
        .single();

      let loginEmail = username; // Fallback to username if it's actually an email

      if (profile && !profileError) {
        loginEmail = profile.email;
      }

      // 2. Sign in with the resolved email
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (error) throw error;
      
      showSuccess("Welcome back!");
      navigate('/dashboard');
    } catch (error: any) {
      showError(error.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-100 rounded-full blur-[120px] opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-100 rounded-full blur-[120px] opacity-50" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[440px] px-4 z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex p-4 bg-white rounded-3xl shadow-xl mb-6 ring-1 ring-gray-100"
          >
            <NectaLogo className="w-12 h-12 text-red-600" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2">
            NEAS <span className="text-red-600">Admin</span>
          </h1>
          <p className="text-gray-500 font-medium">National Examination Administration System</p>
        </div>

        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] bg-white/80 backdrop-blur-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="pt-10 pb-6 px-8">
            <CardTitle className="text-2xl font-bold text-gray-800">Sign In</CardTitle>
            <CardDescription className="text-gray-500">Enter your username to access your account</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold text-gray-700 ml-1">Username</Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors">
                    <User size={18} />
                  </div>
                  <Input 
                    id="username"
                    placeholder="Enter your username"
                    className="pl-11 h-12 bg-gray-50/50 border-gray-200 rounded-xl focus:ring-red-500 focus:border-red-500 transition-all"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
                  <button type="button" className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors">
                    Forgot Password?
                  </button>
                </div>
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

              <Button 
                type="submit" 
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin mr-2" size={20} />
                ) : (
                  <>
                    Sign In <ArrowRight className="ml-2" size={18} />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account? <button className="font-bold text-red-600 hover:underline">Contact Admin</button>
              </p>
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

export default Login;