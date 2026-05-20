import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { api } from '../../lib/axios';
import { toast } from 'sonner';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Building2, Globe, Command, CheckCircle2 } from 'lucide-react';
import nectaLogo from '../../images/NECTA.png';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const queryParams = new URLSearchParams(location.search);
  const isExpired = queryParams.get('reason') === 'expired';

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      const res = await api.post('/auth/login', data);
      await login(res.data.token);
      toast.success('Successfully authenticated');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden font-sans selection:bg-blue-600/10">
      {/* Abstract Architectural Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.05)_0%,transparent_50%)]" />
        <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.05)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
      </div>

      <div className="w-full max-w-[1200px] flex flex-col lg:flex-row items-center justify-between gap-16 px-6 relative z-10 py-12">
        
        {/* Left: Authoritative Branding */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 max-w-xl text-center lg:text-left"
        >
          <div className="mb-10 inline-flex items-center gap-3 px-4 py-2 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">System Integrity: Online</span>
          </div>
          
          <img src={nectaLogo} alt="Logo" className="w-28 h-28 lg:w-36 lg:h-36 mb-10 mx-auto lg:mx-0 drop-shadow-xl" />
          
          <h1 className="text-5xl lg:text-7xl font-black text-gray-900 leading-[0.95] mb-8 tracking-tighter">
            Next-Gen <br />
            <span className="text-blue-600">Administration</span> <br />
            System.
          </h1>
          
          <p className="text-gray-500 text-xl font-medium leading-relaxed max-w-lg mx-auto lg:mx-0">
            Secure enterprise management for national academic standards. 
            Experience the evolution of NEAS v2.
          </p>

          <div className="mt-16 grid grid-cols-2 gap-8 max-w-md mx-auto lg:mx-0">
            <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <ShieldCheck className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">State-Level Encryption</p>
            </div>
            <div className="p-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mb-2" />
              <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Verified Identity</p>
            </div>
          </div>
        </motion.div>

        {/* Right: Premium Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[480px]"
        >
          <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.08)] border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-emerald-500 to-yellow-400" />
            
            <div className="mb-12">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Sign In</h2>
              <p className="text-gray-400 font-bold text-sm mt-2 uppercase tracking-widest">Enter your credentials below</p>
            </div>

            {isExpired && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-4 bg-orange-50 border border-orange-100 rounded-3xl flex items-center gap-4 text-orange-800"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-black uppercase tracking-widest">Session Expired</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Username</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register('username')}
                    type="text"
                    className="block w-full pl-14 pr-6 py-5 bg-gray-50 border border-transparent rounded-[2rem] text-gray-900 placeholder-gray-300 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600/20 transition-all font-bold text-base"
                    placeholder="e.g. jdoe_admin"
                  />
                </div>
                {errors.username && <p className="text-[10px] text-red-500 font-black ml-4">{errors.username.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="block w-full pl-14 pr-14 py-5 bg-gray-50 border border-transparent rounded-[2rem] text-gray-900 placeholder-gray-300 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600/20 transition-all font-bold text-base"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-6 flex items-center text-gray-300 hover:text-gray-900 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-[10px] text-red-500 font-black ml-4">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between px-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="w-5 h-5 bg-gray-100 rounded-md peer-checked:bg-blue-600 transition-all" />
                    <CheckCircle2 className="absolute inset-0 w-5 h-5 text-white scale-0 peer-checked:scale-75 transition-transform" />
                  </div>
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-900 transition-colors">Remember me</span>
                </label>
                <Link to="/forgot-password" name="forgot-password-link" className="text-[11px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest transition-colors">Forgot Key?</Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden flex items-center justify-center py-6 px-8 rounded-[2rem] bg-gray-900 text-white font-black text-sm uppercase tracking-[0.25em] shadow-2xl transition-all hover:bg-black disabled:opacity-50 active:scale-[0.98]"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center gap-3">
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </button>
            </form>

            <div className="mt-12 pt-10 border-t border-gray-100 flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-1">
                <Globe className="w-5 h-5 text-gray-200" />
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">Secure Node</span>
              </div>
              <div className="w-px h-8 bg-gray-100" />
              <div className="flex flex-col items-center gap-1">
                <Building2 className="w-5 h-5 text-gray-200" />
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">Central Hub</span>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-300 text-[10px] font-black uppercase tracking-[0.3em]">
              Authorized Use Only • © {new Date().getFullYear()} NECTA
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
