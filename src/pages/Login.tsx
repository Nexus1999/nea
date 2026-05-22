"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { showError, showSuccess } from '@/utils/toast';
import { User, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import NectaLogo from '@/components/NectaLogo';

const Login = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    document.title = "Log In | NEAS";
    const expired = localStorage.getItem('neas_session_expired');
    if (expired === 'true') {
      setSessionExpired(true);
      localStorage.removeItem('neas_session_expired');
    }
  }, []);

  useEffect(() => {
    if (!authLoading && session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || loading) return;
    
    setLoading(true);
    setSessionExpired(false);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', username)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error("Username not found. Please check your credentials.");

      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: password,
      });

      if (error) throw error;
      
      showSuccess(`Welcome back, ${username}!`);
    } catch (error: any) {
      showError(error.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4 font-sans overflow-hidden">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293740_1px,transparent_1px),linear-gradient(to_bottom,#1f293740_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-900/70 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-2xl overflow-hidden"
        >

          {/* Header */}
          <div className="pt-5 pb-4 px-8 text-center border-b border-gray-800">
            <p className="text-white text-xl font-extrabold tracking-wide">
              EXAMINATIONS ADMINISTRATION
            </p>

            <div className="flex justify-center mt-4 mb-2">
              <div className="p-4 bg-gray-800/50 rounded-2xl">
                <NectaLogo className="w-32 h-32" />
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            <AnimatePresence>
              {sessionExpired && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-6 flex gap-3 items-start bg-orange-500/10 border border-orange-500/30 text-orange-400 p-4 rounded-2xl text-sm"
                >
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Your session has expired. Please sign in again.</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block">
                  USERNAME
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Enter your username"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-orange-500 rounded-2xl py-3.5 pl-12 pr-5 text-white placeholder-gray-500 focus:outline-none transition-all"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-medium text-gray-400 mb-2 block">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full bg-gray-800 border border-gray-700 focus:border-orange-500 rounded-2xl py-3.5 pl-12 pr-12 text-white placeholder-gray-500 focus:outline-none transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-orange-500 bg-gray-800 border-gray-600"
                  />
                  Remember me
                </label>

                <Link
                  to="/forgot-password"
                  className="text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-400 hover:brightness-110 transition-all text-black font-bold py-3.5 rounded-2xl text-base flex items-center justify-center gap-3 shadow-lg shadow-orange-500/30 disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    SIGN IN
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-gray-800 text-center">
            <p className="text-gray-500 text-xs">
              © {new Date().getFullYear()} NECTA • National Examinations Council
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;