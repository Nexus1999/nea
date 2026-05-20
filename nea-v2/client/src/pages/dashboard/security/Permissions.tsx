import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Lock, Search, PlusCircle, Filter, Shield, Settings, Database,
  RefreshCw, Edit, Trash2, ShieldCheck, LayoutGrid, List, Package, History, Globe, X, CheckCircle2,
  Terminal, ShieldAlert, Fingerprint, Activity, ChevronRight, Check,
  HardDrive, Info as InfoIcon
} from 'lucide-react';
import { securityService } from '../../../services/api';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { FormDrawer } from '../../../components/shared/FormDrawer';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { DataTable } from '../../../components/shared/DataTable';

const schema = z.object({
  name: z.string().min(1, 'Required').regex(/^\w+:\w+$/, 'Format: Module:action e.g. users:view'),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

// --- ROLE PERMISSION MATRIX ---
const RoleMatrixTab = () => {
  const { data: rolesData } = useQuery({ queryKey: ['roles'], queryFn: () => securityService.getRoles().then(r => r.data) });
  const { data: permsData, isLoading } = useQuery({ queryKey: ['permissions'], queryFn: () => securityService.getPermissions().then(r => r.data) });
  const { data: mappingData } = useQuery({ queryKey: ['role-permissions'], queryFn: () => securityService.getRolePermissions().then(r => r.data) });
  
  const roles = rolesData?.data ?? [];
  const perms = permsData?.data ?? [];
  const mappings = mappingData?.data ?? [];

  const modules = useMemo(() => Array.from(new Set(perms.map((p: any) => String(p.name).split(':')[0]))) as string[], [perms]);

  const hasPermission = (roleId: string, permId: string) => {
    return mappings.some((m: any) => m.roleId === roleId && m.permissionId === permId);
  };

  if (isLoading) return (
    <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
      <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs font-semibold text-slate-500">Loading Permission Matrix...</p>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Role Permissions Matrix</h3>
          <p className="text-slate-500 text-xs mt-0.5">View active permissions assigned to each user role</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shadow-sm text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          Active Policy Enforcement
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-72">
                Module & Permission
              </th>
              {roles.map((r: any) => (
                <th key={r.id} className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[120px]">
                  {r.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((mod: string) => (
              <React.Fragment key={mod}>
                <tr className="bg-slate-100/50">
                  <td className="px-6 py-2 border-b border-slate-200">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{mod} Domain</span>
                  </td>
                  <td colSpan={roles.length} className="border-b border-slate-200" />
                </tr>
                {perms.filter((p: any) => String(p.name).startsWith(mod + ':')).map((perm: any) => (
                  <tr key={perm.id} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 border-r border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <div>
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{perm.name.split(':')[1]}</span>
                          {perm.description && <p className="text-[10px] text-slate-400 mt-0.5">{perm.description}</p>}
                        </div>
                      </div>
                    </td>
                    {roles.map((r: any) => {
                      const active = hasPermission(r.id, perm.id);
                      return (
                        <td key={r.id} className="px-6 py-3 text-center border-r border-slate-100 last:border-r-0">
                          <div className="flex items-center justify-center">
                            {active ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <span className="text-slate-300 font-medium">—</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
          <Shield className="w-24 h-24 rotate-12" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Policy & Access Integrity</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">All system route configurations are bound to the RBAC authorization schema.</p>
          </div>
        </div>
        <div className="flex items-center gap-6 z-10">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{perms.length}</p>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Permissions</p>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="text-center">
            <p className="text-lg font-bold text-white">{roles.length}</p>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Roles</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const Permissions = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'matrix' | 'list'>('matrix');
  const [formOpen, setFormOpen] = useState(false);
  const [editPerm, setEditPerm] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => securityService.getPermissions().then(r => r.data),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => securityService.getRoles().then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const saveMutation = useMutation({
    mutationFn: (d: FormData) => editPerm 
      ? securityService.updatePermission(editPerm.id, d).then(r => r.data)
      : securityService.createPermission(d).then(r => r.data),
    onSuccess: () => {
      toast.success(editPerm ? 'Permission updated successfully' : 'Permission created successfully');
      qc.invalidateQueries({ queryKey: ['permissions'] });
      setFormOpen(false); setEditPerm(null); reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Operation failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => securityService.deletePermission(id),
    onSuccess: () => {
      toast.success('Permission deleted successfully');
      qc.invalidateQueries({ queryKey: ['permissions'] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to delete permission'),
  });

  const perms = data?.data ?? [];
  const modulesList = ['all', ...(Array.from(new Set(perms.map((p: any) => String(p.name).split(':')[0]))) as string[])];

  const filtered = perms.filter((p: any) => {
    const matchSearch = String(p.name).toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchModule = moduleFilter === 'all' || String(p.name).startsWith(`${moduleFilter}:`);
    return matchSearch && matchModule;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Permissions Management</h2>
          <p className="text-slate-500 mt-1 text-sm">Manage and assign system permissions for role-based access control.</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button 
            onClick={() => setAssignOpen(true)} 
            className="flex items-center px-4 py-2 border border-slate-200 hover:border-slate-800 text-slate-800 rounded-xl font-semibold text-sm gap-2 transition-all shadow-sm bg-white"
          >
            <ShieldCheck className="h-4 w-4" /> Assign Permissions to Role
          </button>
          <button 
            onClick={() => { setEditPerm(null); reset(); setFormOpen(true); }} 
            className="flex items-center px-4 py-2 bg-black hover:bg-slate-800 text-white rounded-xl font-semibold text-sm gap-2 transition-all shadow-sm"
          >
            <PlusCircle className="h-4 w-4" /> Add New Permission
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex p-1 bg-slate-100 rounded-xl">
          {[
            { id: 'matrix', icon: LayoutGrid, label: 'Access Matrix' },
            { id: 'list', icon: List, label: 'Permissions List' }
          ].map(({ id, icon: Icon, label }) => (
            <button 
              key={id} 
              onClick={() => setActiveTab(id as any)} 
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <button 
          onClick={() => refetch()} 
          disabled={isLoading} 
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'list' ? (
          <motion.div 
            key="list" 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.98 }} 
            className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
          >
            <div className="flex flex-col md:flex-row items-center gap-4 p-4 border-b border-gray-200 bg-slate-50/50">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="Search permissions..." 
                  className="pl-10 pr-4 py-2 w-full border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" 
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <select 
                    value={moduleFilter} 
                    onChange={e => setModuleFilter(e.target.value)} 
                    className="focus:outline-none bg-transparent cursor-pointer font-bold"
                  >
                    {modulesList.map((m: string) => <option key={m} value={m}>{m === 'all' ? 'All Modules' : m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <DataTable
              data={filtered}
              isLoading={isLoading}
              keyExtractor={(p) => p.id}
              columns={[
                {
                  header: 'Permission Key',
                  cell: (perm) => (
                    <span className="font-mono font-bold text-slate-800 text-xs">{perm.name}</span>
                  )
                },
                {
                  header: 'Module',
                  cell: (perm) => (
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                      {String(perm.name).split(':')[0]}
                    </span>
                  )
                },
                {
                  header: 'Description',
                  cell: (perm) => (
                    <span className="text-slate-500 font-medium text-xs">
                      {perm.description || 'No description provided.'}
                    </span>
                  )
                },
                {
                  header: 'Actions',
                  cell: (perm) => (
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditPerm(perm); reset({ name: perm.name, description: perm.description ?? '' }); setFormOpen(true); }} className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(perm)} className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ),
                  className: "text-right"
                }
              ]}
            />
          </motion.div>
        ) : (
          <motion.div key="matrix" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
            <RoleMatrixTab />
          </motion.div>
        )}
      </AnimatePresence>

      <FormDrawer isOpen={formOpen} onClose={() => { setFormOpen(false); setEditPerm(null); reset(); }} title={editPerm ? 'Edit Permission' : 'Add New Permission'}>
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-6 p-6">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
            <InfoIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed font-medium">
              Define the permission key using the <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono font-bold text-blue-900">module:action</code> format. e.g., <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono font-bold text-blue-900">users:view</code>.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Permission Key <span className="text-red-500">*</span></label>
            <input {...register('name')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-blue-600 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all" placeholder="e.g. users:view" />
            {errors.name && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Description</label>
            <textarea {...register('description')} rows={4} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all resize-none font-medium" placeholder="Describe the access granted by this permission..." />
          </div>
          <div className="flex gap-4 pt-6 border-t">
            <button type="button" onClick={() => setFormOpen(false)} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors uppercase tracking-wider">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="flex-1 px-6 py-3 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider shadow-sm">
              {saveMutation.isPending ? 'Saving...' : 'Save Permission'}
            </button>
          </div>
        </form>
      </FormDrawer>

      <FormDrawer isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Permissions to Role">
        <AssignPermissionsForm roles={rolesData?.data ?? []} permissions={perms} onClose={() => setAssignOpen(false)} />
      </FormDrawer>

      <ConfirmDialog isOpen={!!deleteTarget} title="Revoke Permission?" message={`Are you sure you want to permanently delete the "${deleteTarget?.name}" permission? This will immediately revoke it from all roles.`} confirmText="Yes, Delete Permission" isDestructive onConfirm={() => deleteMutation.mutate(deleteTarget?.id)} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
};

// --- ASSIGNMENT FORM ---
const AssignPermissionsForm = ({ roles, permissions, onClose }: any) => {
  const qc = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  const { data: currentPermsData, isFetching: isFetchingCurrent } = useQuery({
    queryKey: ['role-perms', selectedRole],
    queryFn: async () => {
      if (!selectedRole) return [];
      const res = await securityService.getRolePermissions();
      return res.data.data.filter((m: any) => m.roleId === selectedRole).map((m: any) => m.permissionId);
    },
    enabled: !!selectedRole
  });

  React.useEffect(() => {
    if (currentPermsData) {
      setSelectedPerms(new Set(currentPermsData));
    }
  }, [currentPermsData]);

  const assignMutation = useMutation({
    mutationFn: () => securityService.updateRolePermissions(selectedRole, Array.from(selectedPerms)).then(r => r.data),
    onSuccess: () => {
      toast.success('Permissions successfully assigned to role.');
      qc.invalidateQueries({ queryKey: ['role-permissions'] });
      qc.invalidateQueries({ queryKey: ['roles'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to assign permissions'),
  });

  const toggle = (id: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const modules = Array.from(new Set(permissions.map((p: any) => String(p.name).split(':')[0]))) as string[];

  return (
    <div className="flex flex-col h-full space-y-6 p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2 ml-1">
          <Shield className="w-4 h-4 text-slate-400" />
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Select User Role</label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {roles.map((r: any) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRole(r.id)}
              className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                selectedRole === r.id 
                ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-800'
              }`}
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider">{r.name}</span>
                <span className={`text-[9px] font-semibold uppercase tracking-wider mt-0.5 ${selectedRole === r.id ? 'text-slate-400' : 'text-slate-400'}`}>Security Group</span>
              </div>
              {selectedRole === r.id && (
                <div className="p-1 bg-emerald-500 rounded-full">
                  <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col border border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden relative min-h-[300px]">
        <AnimatePresence>
          {isFetchingCurrent && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3"
            >
              <RefreshCw className="w-8 h-8 text-slate-900 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Decrypting Permissions...</p>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Permission List Matrix</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Active mapping for: <span className="text-blue-600 font-bold">{roles.find((r: any) => r.id === selectedRole)?.name || 'NONE'}</span></p>
          </div>
          <div className="bg-slate-900 text-white px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider">
            {selectedPerms.size} Selected
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!selectedRole ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-40 py-20">
              <Shield className="w-12 h-12 text-slate-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select a role above to manage permissions</p>
            </div>
          ) : modules.map((mod: string) => (
            <div key={mod} className="space-y-3">
              <div className="flex items-center gap-3">
                <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">{mod} module</h4>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {permissions.filter((p: any) => String(p.name).startsWith(mod + ':')).map((perm: any) => (
                  <label key={perm.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer group relative ${
                    selectedPerms.has(perm.id) 
                    ? 'bg-white border-emerald-500 text-emerald-900 shadow-sm' 
                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                  }`}>
                    <input type="checkbox" checked={selectedPerms.has(perm.id)} onChange={() => toggle(perm.id)} className="peer sr-only" />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedPerms.has(perm.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-50 border-slate-200'
                    }`}>
                      {selectedPerms.has(perm.id) && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">{perm.name.split(':')[1]}</span>
                      <span className="text-[9px] text-slate-400">Permission</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onClose} className="flex-1 px-6 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors uppercase tracking-wider">Cancel</button>
        <button
          type="button"
          disabled={!selectedRole || assignMutation.isPending}
          onClick={() => assignMutation.mutate()}
          className="flex-1 px-6 py-3 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wider shadow-sm flex items-center justify-center gap-2"
        >
          {assignMutation.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          )}
          <span>{assignMutation.isPending ? 'Saving...' : 'Save Permissions'}</span>
        </button>
      </div>
    </div>
  );
};

export default Permissions;
