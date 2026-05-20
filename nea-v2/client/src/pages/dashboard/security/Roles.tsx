import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Shield, PlusCircle, Search, Edit, Trash2, Users, ChevronRight } from 'lucide-react';
import { securityService } from '../../../services/api';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { FormDrawer } from '../../../components/shared/FormDrawer';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/shared/DataTable';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const Roles = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => securityService.getRoles().then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const saveMutation = useMutation({
    mutationFn: (d: FormData) => editRole
      ? securityService.updateRole(editRole.id, d).then(r => r.data)
      : securityService.createRole(d).then(r => r.data),
    onSuccess: () => {
      toast.success(editRole ? 'Role updated' : 'Role created');
      qc.invalidateQueries({ queryKey: ['roles'] });
      setFormOpen(false); setEditRole(null); reset();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      return securityService.deleteRole(id);
    },
    onSuccess: () => {
      toast.success('Role deleted');
      qc.invalidateQueries({ queryKey: ['roles'] });
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Cannot delete role — it may have users assigned'),
  });

  const openEdit = (role: any) => {
    setEditRole(role);
    reset({ name: role.name, description: role.description ?? '' });
    setFormOpen(true);
  };

  const filtered = data?.data?.filter((r: any) =>
    r.name?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Roles & Access</h2>
          <p className="text-sm text-gray-500 mt-1">Define and manage system access roles.</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => { setEditRole(null); reset(); setFormOpen(true); }}
          className="flex items-center px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm gap-2 transition-colors shadow-sm"
        >
          <PlusCircle className="h-4 w-4" /> Create New Role
        </motion.button>
      </div>

      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles..."
            className="pl-10 pr-4 py-2.5 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <DataTable
          data={filtered}
          isLoading={isLoading}
          keyExtractor={(r) => r.id}
          columns={[
            {
              header: 'Role',
              cell: (row) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{row.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">System Access Role</p>
                  </div>
                </div>
              )
            },
            {
              header: 'Description',
              cell: (row) => (
                <span className="text-xs font-medium text-slate-500">
                  {row.description || 'No description provided.'}
                </span>
              )
            },
            {
              header: 'Created On',
              cell: (row) => (
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {row.createdAt ? format(new Date(row.createdAt), 'dd MMM yyyy') : '—'}
                </span>
              )
            },
            {
              header: 'Actions',
              cell: (row) => (
                <div className="flex items-center justify-end gap-1.5">
                  <button onClick={() => navigate('/dashboard/security/permissions')}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Manage Permissions">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button onClick={() => openEdit(row)}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit Role">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(row)}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete Role">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            }
          ]}
        />
        <div className="px-6 py-4 bg-slate-50/50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500">Total System Roles: {filtered.length}</p>
          </div>
        </div>
      </div>

      <FormDrawer isOpen={formOpen} onClose={() => { setFormOpen(false); setEditRole(null); reset(); }} title={editRole ? 'Edit Role' : 'Create New Role'}>
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role Name <span className="text-red-500">*</span></label>
            <input {...register('name')} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="e.g. Regional Coordinator" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea {...register('description')} rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              placeholder="Describe the role's responsibilities..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setFormOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
              {saveMutation.isPending ? 'Saving...' : editRole ? 'Update' : 'Create Role'}
            </button>
          </div>
        </form>
      </FormDrawer>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Role?"
        message={`Delete role "${deleteTarget?.name}"? This may affect users assigned to this role.`}
        confirmText="Yes, Delete" isDestructive
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Roles;
