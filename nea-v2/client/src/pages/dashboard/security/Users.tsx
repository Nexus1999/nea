import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search, Edit, Trash2, UserPlus, Shield, Eye,
  UserX, UserCheck, ShieldAlert, ShieldCheck, KeyRound, X,
  Mail, Phone, Calendar, User, Activity, RefreshCw
} from 'lucide-react';
import { securityService } from '../../../services/api';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { FormDrawer } from '../../../components/shared/FormDrawer';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';

const userSchema = z.object({
  username: z.string().min(2, 'Min 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().min(6, 'Min 6 characters').optional().or(z.literal('')),
  roleId: z.string().min(1, 'Select a role'),
  status: z.enum(['active', 'blocked']),
});
type UserFormData = z.infer<typeof userSchema>;

const pwSchema = z.object({ newPassword: z.string().min(6, 'Min 6 characters'), confirmPassword: z.string() })
  .refine(d => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });
type PwFormData = z.infer<typeof pwSchema>;

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border-2 ${
    status === 'blocked'
      ? 'bg-red-50 text-red-700 border-red-100'
      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
  }`}>
    {status === 'blocked' ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
    {status || 'active'}
  </span>
);

const Users = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [pwUser, setPwUser] = useState<any>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [toggleTarget, setToggleTarget] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['security-users', page, search],
    queryFn: () => securityService.getUsers({ page, limit: 50 }).then(r => r.data),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => securityService.getRoles().then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const { register: regPw, handleSubmit: handlePw, reset: resetPw, formState: { errors: pwErrors } } = useForm<PwFormData>({
    resolver: zodResolver(pwSchema),
  });

  const saveMutation = useMutation({
    mutationFn: (d: UserFormData) => editUser 
      ? securityService.updateUser(editUser.id, d).then(r => r.data)
      : securityService.createUser(d).then(r => r.data),
    onSuccess: () => {
      toast.success(editUser ? 'User updated successfully' : 'User created successfully');
      qc.invalidateQueries({ queryKey: ['security-users'] });
      setFormOpen(false); setEditUser(null); reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Operation failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { id: string, status: string }) => 
      securityService.updateUser(vars.id, { status: vars.status }).then(r => r.data),
    onSuccess: (_, vars) => {
      toast.success(`User ${vars.status === 'active' ? 'activated' : 'blocked'} successfully`);
      qc.invalidateQueries({ queryKey: ['security-users'] });
      setToggleTarget(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Operation failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => securityService.deleteUser(id).then(r => r.data),
    onSuccess: () => {
      toast.success('User deleted successfully');
      qc.invalidateQueries({ queryKey: ['security-users'] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to delete user'),
  });

  const pwMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      securityService.resetPassword(id, newPassword).then(r => r.data),
    onSuccess: () => {
      toast.success('Password updated successfully');
      setPwOpen(false); setPwUser(null); resetPw(); setNewPasswordVal('');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to update password'),
  });

  const openEdit = (u: any) => {
    setEditUser(u);
    reset({ username: u.username, email: u.email ?? '', firstName: u.firstName ?? '', lastName: u.lastName ?? '', roleId: u.roleId, status: u.status || 'active', password: '' });
    setFormOpen(true);
  };

  const filteredData = data?.data?.filter((u: any) =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  // Password strength calculation
  const strength = useMemo(() => {
    if (!newPasswordVal) return 0;
    let score = 0;
    if (newPasswordVal.length >= 8) score += 1;
    if (/[A-Z]/.test(newPasswordVal)) score += 1;
    if (/[0-9]/.test(newPasswordVal)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPasswordVal)) score += 1;
    return score;
  }, [newPasswordVal]);

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

  const columns: Column<any>[] = [
    { 
      header: 'User', 
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-xs font-bold border border-slate-200 shrink-0">
            {row.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">{row.username}</p>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">User Alias</p>
          </div>
        </div>
      )
    },
    { 
      header: 'Full Name', 
      cell: (row) => (
        <span className="text-sm font-semibold text-slate-700">
          {row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : row.firstName || row.lastName || '—'}
        </span>
      )
    },
    { 
      header: 'Email', 
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Mail className="w-3.5 h-3.5 text-slate-300" />
          {row.email || '—'}
        </div>
      )
    },
    { 
      header: 'Role', 
      cell: (row) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border-2 bg-blue-50 text-blue-700 border-blue-100">
          <Shield className="h-3 w-3" />
          {row.roleName || 'User'}
        </span>
      )
    },
    { 
      header: 'Status', 
      cell: (row) => <StatusBadge status={row.status || 'active'} /> 
    },
    { 
      header: 'Actions', 
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Link to={`/dashboard/profile/${row.id}`}
            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Profile">
            <Eye className="h-4 w-4" />
          </Link>
          <button onClick={() => openEdit(row)} 
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit User">
            <Edit className="h-4 w-4" />
          </button>
          <button onClick={() => { setPwUser(row); setPwOpen(true); }} 
            className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Reset Password">
            <KeyRound className="h-4 w-4" />
          </button>
          <button onClick={() => setToggleTarget(row)} 
            className={`p-2 rounded-xl transition-colors ${row.status === 'blocked' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-orange-500 hover:bg-orange-50'}`} 
            title={row.status === 'blocked' ? 'Activate User' : 'Block User'}>
            {row.status === 'blocked' ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
          </button>
          <button onClick={() => setDeleteTarget(row)} 
            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete User">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">User Management</h2>
          <p className="text-slate-500 mt-1 text-sm">Manage system users and their access levels.</p>
        </div>
        <button 
          onClick={() => { setEditUser(null); reset(); setFormOpen(true); }} 
          className="bg-black hover:bg-gray-800 text-white rounded-xl h-11 px-6 font-medium gap-2 flex items-center shadow-sm text-sm self-start md:self-auto"
        >
          <UserPlus className="h-4 w-4" /> Add New User
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search users..." 
            className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" 
          />
        </div>
        <button 
          onClick={() => refetch()} 
          className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
          title="Refresh Table"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <DataTable 
          data={filteredData} 
          columns={columns} 
          isLoading={isLoading} 
          keyExtractor={(u) => u.id}
        />
        
        <div className="px-6 py-4 bg-slate-50/50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500">Total System Users: {filteredData.length}</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white hover:text-gray-900 transition-all disabled:opacity-30" disabled>Previous</button>
            <button className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white hover:text-gray-900 transition-all disabled:opacity-30" disabled>Next</button>
          </div>
        </div>
      </div>

      {/* Add / Edit Form Drawer */}
      <FormDrawer isOpen={formOpen} onClose={() => { setFormOpen(false); setEditUser(null); reset(); }} title={editUser ? 'Edit User Details' : 'Add New User'}>
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Username <span className="text-red-500">*</span></label>
              <input {...register('username')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all font-semibold" />
              {errors.username && <p className="text-xs text-red-500 font-semibold mt-1 ml-1">{errors.username.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
              <input {...register('email')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all font-semibold" />
              {errors.email && <p className="text-xs text-red-500 font-semibold mt-1 ml-1">{errors.email.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">First Name</label>
              <input {...register('firstName')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Last Name</label>
              <input {...register('lastName')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">System Role <span className="text-red-500">*</span></label>
            <select {...register('roleId')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all cursor-pointer font-semibold">
              <option value="">Choose a role...</option>
              {rolesData?.data?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {errors.roleId && <p className="text-xs text-red-500 font-semibold mt-1 ml-1">{errors.roleId.message}</p>}
          </div>
          {!editUser && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password <span className="text-red-500">*</span></label>
              <input {...register('password')} type="password" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all font-mono" placeholder="••••••••" />
              {errors.password && <p className="text-xs text-red-500 font-semibold mt-1 ml-1">{errors.password.message}</p>}
            </div>
          )}
          <input type="hidden" {...register('status')} defaultValue="active" />
          
          <div className="flex gap-4 pt-6 border-t">
            <button type="button" onClick={() => setFormOpen(false)} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors uppercase tracking-wider">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="flex-1 px-6 py-3 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider shadow-sm">
              {saveMutation.isPending ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </form>
      </FormDrawer>

      {/* Centered Change Password Modal */}
      <AnimatePresence>
        {pwOpen && pwUser && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
                </div>
                <button onClick={() => { setPwOpen(false); setPwUser(null); resetPw(); setNewPasswordVal(''); }} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  Enter a new password for user <b className="text-slate-800">{pwUser.username}</b>.
                </p>

                <form onSubmit={handlePw(d => pwMutation.mutate({ id: pwUser.id, newPassword: d.newPassword }))} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">New Password</label>
                    <input 
                      {...regPw('newPassword')} 
                      type="password" 
                      onChange={(e) => {
                        regPw('newPassword').onChange(e);
                        setNewPasswordVal(e.target.value);
                      }}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all font-mono" 
                      placeholder="••••••••" 
                    />
                    {pwErrors.newPassword && <p className="text-xs text-red-500 font-medium">{pwErrors.newPassword.message}</p>}

                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-slate-500">Strength: {getStrengthText()}</span>
                        {strength === 4 ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Shield className="h-3.5 w-3.5 text-slate-300" />}
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div 
                            key={i} 
                            className={`h-full flex-1 transition-all duration-500 ${
                              i <= strength ? getStrengthColor() : "bg-slate-200"
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Confirm Password</label>
                    <input 
                      {...regPw('confirmPassword')} 
                      type="password" 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all font-mono" 
                      placeholder="••••••••" 
                    />
                    {pwErrors.confirmPassword && <p className="text-xs text-red-500 font-medium">{pwErrors.confirmPassword.message}</p>}
                  </div>

                  <div className="flex gap-3 pt-3 border-t">
                    <button 
                      type="button" 
                      onClick={() => { setPwOpen(false); setPwUser(null); resetPw(); setNewPasswordVal(''); }} 
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={pwMutation.isPending || strength < 2} 
                      className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
                    >
                      {pwMutation.isPending ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={!!toggleTarget} 
        title={toggleTarget?.status === 'blocked' ? 'Activate User?' : 'Block User?'} 
        message={toggleTarget?.status === 'blocked' 
          ? `Restore all access for user "${toggleTarget?.username}"?` 
          : `Immediately block user "${toggleTarget?.username}" and terminate their active sessions?`}
        confirmText={toggleTarget?.status === 'blocked' ? 'Activate' : 'Block'}
        isDestructive={toggleTarget?.status !== 'blocked'}
        onConfirm={() => toggleMutation.mutate({ id: toggleTarget.id, status: toggleTarget.status === 'blocked' ? 'active' : 'blocked' })}
        onCancel={() => setToggleTarget(null)}
      />

      <ConfirmDialog 
        isOpen={!!deleteTarget} 
        title="Delete User Account?" 
        message={`Are you sure you want to permanently delete user account "${deleteTarget?.username}"? This action is irreversible.`}
        confirmText="Yes, Delete Account"
        isDestructive={true}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Users;
