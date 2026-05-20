import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, Shield, Key, Mail, Clock, ShieldCheck, Save, Eye, EyeOff, 
  Camera, MapPin, Briefcase, Calendar, Info, Settings, Lock, LogOut,
  CheckCircle2, Globe, Heart, MoreHorizontal, ThumbsUp, MessageSquare, Share2,
  Smartphone, Monitor, Activity, X
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { api } from '../../lib/axios';
import { securityService } from '../../services/api';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DataTable, Column } from '../../components/shared/DataTable';
import nectaLogo from '../../images/NECTA.png';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordForm = z.infer<typeof passwordSchema>;

const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Fetch target user data
  const { data: targetUserData, isLoading: isUserLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => userId ? securityService.getUser(userId).then(r => r.data) : Promise.resolve(currentUser),
    enabled: !!userId || !!currentUser
  });

  const displayUser = targetUserData || currentUser;
  const isOwnProfile = !userId || userId === currentUser?.id;

  // Fetch sessions for this user
  const { data: sessionsData, isLoading: isSessionsLoading } = useQuery({
    queryKey: ['user-sessions', displayUser?.id],
    queryFn: () => securityService.getSessions({ userId: displayUser?.id }).then(r => r.data),
    enabled: !!displayUser?.id
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const newPassword = watch('newPassword');

  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(0);
      return;
    }
    let strength = 0;
    if (newPassword.length >= 8) strength += 25;
    if (/[A-Z]/.test(newPassword)) strength += 25;
    if (/[0-9]/.test(newPassword)) strength += 25;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength += 25;
    setPasswordStrength(strength);
  }, [newPassword]);

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      setIsLoading(true);
      await api.post('/auth/update-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Security key updated successfully');
      reset();
      setIsChangingPassword(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update security key');
    } finally {
      setIsLoading(false);
    }
  };

  const sessionColumns: Column<any>[] = [
    { header: 'Source', cell: (s) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
          {s.userAgent?.toLowerCase().includes('mobile') ? <Smartphone className="w-5 h-5 text-gray-400" /> : <Monitor className="w-5 h-5 text-gray-400" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-gray-900 truncate max-w-[200px]" title={s.userAgent}>{s.userAgent || 'Unknown Device'}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.ipAddress}</p>
        </div>
      </div>
    )},
    { header: 'Last Activity', cell: (s) => (
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
        <Activity className="w-3.5 h-3.5 text-emerald-500" />
        {s.lastActivity ? new Date(s.lastActivity).toLocaleString() : 'Just now'}
      </div>
    )},
    { header: 'Status', cell: (s) => {
      const status = s.status || 'ACTIVE';
      const colors: any = {
        ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        TERMINATED: 'bg-red-50 text-red-700 border-red-100',
        EXPIRED: 'bg-orange-50 text-orange-700 border-orange-100'
      };
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${colors[status] || colors.ACTIVE}`}>
          {status}
        </span>
      );
    }}
  ];

  if (isUserLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-10 pb-20 px-4 md:px-8">
      
      {/* Premium Header */}
      <div className="relative rounded-[3rem] overflow-hidden bg-white border border-gray-100 shadow-xl">
        <div className="h-48 md:h-64 bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-950 relative">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>
        
        <div className="px-8 md:px-16 pb-12 relative">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-8 -mt-20 md:-mt-24">
            <div className="relative group">
              <div className="w-40 h-40 md:w-48 md:h-48 rounded-[3rem] bg-gray-900 border-[6px] border-white shadow-2xl flex items-center justify-center text-white text-6xl font-black overflow-hidden relative">
                {displayUser?.username?.charAt(0).toUpperCase()}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Camera className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left mb-4">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">{displayUser?.username}</h1>
                {displayUser?.roleName?.toUpperCase() === 'ADMINISTRATOR' && (
                  <CheckCircle2 className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3">
                <span className="px-3 py-1 bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
                  {displayUser?.roleName}
                </span>
                <div className="flex items-center gap-2 text-gray-400 text-sm font-bold">
                  <Globe className="w-4 h-4" />
                  National Hub
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              {isOwnProfile && (
                <button 
                  onClick={() => setIsChangingPassword(true)}
                  className="px-6 py-3.5 bg-white border border-gray-200 text-gray-900 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Update Security Key
                </button>
              )}
              <button className="p-3.5 bg-gray-50 text-gray-400 rounded-2xl border border-gray-100 hover:text-gray-900 transition-all">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Access History Section */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Access History</h2>
            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-1">Live monitoring of authorized nodes</p>
          </div>
          <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2 text-emerald-700">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Authorized Only</span>
          </div>
        </div>
        <div className="p-2">
          <DataTable 
            data={sessionsData?.data || []} 
            columns={sessionColumns} 
            isLoading={isSessionsLoading} 
            keyExtractor={(s) => s.id}
          />
        </div>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangingPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsChangingPassword(false)}
              className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Security Restoration</h3>
                  <button onClick={() => setIsChangingPassword(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Current Key</label>
                    <div className="relative">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        {...register('currentPassword')}
                        type={showPass.current ? 'text' : 'password'}
                        className="block w-full pl-14 pr-14 py-4.5 bg-gray-50 border border-transparent rounded-2xl text-gray-900 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600/20 transition-all font-bold"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPass(s => ({...s, current: !s.current}))} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-900">
                        {showPass.current ? <EyeOff className="w-5 h-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">New Security Key</label>
                    <div className="relative">
                      <Key className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        {...register('newPassword')}
                        type={showPass.new ? 'text' : 'password'}
                        className="block w-full pl-14 pr-14 py-4.5 bg-gray-50 border border-transparent rounded-2xl text-gray-900 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600/20 transition-all font-bold"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPass(s => ({...s, new: !s.new}))} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-900">
                        {showPass.new ? <EyeOff className="w-5 h-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {/* Strength Meter */}
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-3">
                      <motion.div animate={{ width: `${passwordStrength}%` }} className={`h-full transition-all duration-500 ${passwordStrength <= 25 ? 'bg-red-500' : passwordStrength <= 50 ? 'bg-orange-500' : passwordStrength <= 75 ? 'bg-yellow-400' : 'bg-emerald-500'}`} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Confirm Key</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        {...register('confirmPassword')}
                        type={showPass.confirm ? 'text' : 'password'}
                        className="block w-full pl-14 pr-14 py-4.5 bg-gray-50 border border-transparent rounded-2xl text-gray-900 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600/20 transition-all font-bold"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-5 bg-gray-900 text-white font-black text-xs uppercase tracking-[0.25em] rounded-2xl shadow-xl hover:bg-black transition-all disabled:opacity-50"
                  >
                    {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" /> : 'Authorize Update'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
