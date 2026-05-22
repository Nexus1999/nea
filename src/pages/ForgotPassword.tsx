"use client";

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import NectaLogo from '@/components/NectaLogo';
import { showError, showSuccess } from '@/utils/toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;

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
  };

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

          {/* Content */}
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
              <p className="text-gray-400 text-sm">
                {submitted 
                  ? "Check your email for the reset link." 
                  : "Enter your email address and we'll send you a link to reset your password."}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {!submitted ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  {/* Email Field */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-2 block">
                      EMAIL ADDRESS
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        className="w-full bg-gray-800 border border-gray-700 focus:border-orange-500 rounded-2xl py-3.5 pl-12 pr-5 text-white placeholder-gray-500 focus:outline-none transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-400 hover:brightness-110 transition-all text-black font-bold py-3.5 rounded-2xl text-base flex items-center justify-center gap-3 shadow-lg shadow-orange-500/30 disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin w-5 h-5" />
                        Sending...
                      </>
                    ) : (
                      <>
                        SEND RESET LINK
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-6 py-4"
                >
                  <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>

                  <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-5 rounded-2xl text-sm">
                    If an account exists for <span className="font-medium text-white">{email}</span>, you will receive a password reset link shortly.
                  </div>

                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setEmail('');
                    }}
                    className="w-full h-12 border border-gray-700 hover:bg-gray-800 text-white font-medium rounded-2xl transition-all"
                  >
                    Try Another Email
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Link */}
          <div className="px-8 py-6 border-t border-gray-800 text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-orange-400 transition-colors"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back to Login
            </Link>
          </div>

          {/* Bottom Footer */}
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

export default ForgotPassword;