import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/axios';
import { toast } from 'sonner';
import { Mail, ArrowLeft, ArrowRight, ShieldCheck, MailCheck, AlertCircle, Lock } from 'lucide-react';
import nectaLogo from '../../images/NECTA.png';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setIsLoading(true);
      await api.post('/auth/forgot-password', data);
      setIsSent(true);
      toast.success('Recovery vector dispatched.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Protocol failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] relative overflow-hidden font-sans">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[500px] px-6 relative z-10"
      >
        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 md:p-14 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          
          <Link to="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mb-10">
            <ArrowLeft className="w-4 h-4" />
            Return to Core Entry
          </Link>

          {!isSent ? (
            <>
              <div className="mb-10 text-center md:text-left">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400 mb-6">
                  <Lock className="w-7 h-7" />
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight mb-3 leading-tight">Access <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Restoration</span></h1>
                <p className="text-slate-500 font-medium text-sm leading-relaxed uppercase tracking-wider text-[11px]">
                  Provide your registered institutional email to authorize a security key reset.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      {...register('email')}
                      type="email"
                      className="block w-full pl-12 pr-4 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-bold text-sm"
                      placeholder="e.g. operator@necta.go.tz"
                    />
                  </div>
                  {errors.email && <p className="text-[10px] text-red-400 font-bold ml-1">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative overflow-hidden flex items-center justify-center py-4.5 px-6 rounded-2xl bg-white text-gray-950 font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all hover:bg-blue-50 disabled:opacity-50"
                >
                  <span className="relative flex items-center gap-2">
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                    ) : (
                      <>
                        Request Restoration
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </span>
                </button>
              </form>
            </>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-10">
                <MailCheck className="w-12 h-12 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Transmission Sent</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-10 font-medium uppercase tracking-wider text-[11px]">
                If an authorized account exists, a security vector has been dispatched. Please check your secure inbox.
              </p>
              <Link 
                to="/login"
                className="inline-flex items-center justify-center w-full py-4.5 px-6 rounded-2xl bg-white text-gray-950 font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-xl"
              >
                Back to Core Login
              </Link>
            </motion.div>
          )}

          <div className="mt-14 pt-8 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-500/40">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase tracking-widest">Encrypted Restoration</span>
            </div>
            <img src={nectaLogo} alt="NECTA" className="h-6 w-6 opacity-30 grayscale" />
          </div>
        </div>
        
        <p className="text-center mt-12 text-slate-600 text-[10px] font-black uppercase tracking-widest leading-relaxed">
          Authorized personnel only. <br /> All attempts are audited by NECTA Security Command.
        </p>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
