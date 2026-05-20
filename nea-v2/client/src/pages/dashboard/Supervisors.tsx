import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Search, Edit2, Trash2, Upload, Users } from 'lucide-react';
import { supervisorsService, regionsService } from '../../services/api';
import { DataTable, Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { FormDrawer } from '../../components/shared/FormDrawer';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  supervisorName: z.string().min(1, 'Required'),
  checkNumber: z.string().min(1, 'Required'),
  subject: z.string().optional(),
  phone: z.string().optional(),
  workstation: z.string().optional(),
  regionId: z.coerce.number().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const Supervisors = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['supervisors', page, search],
    queryFn: () => supervisorsService.list({ page, limit: 15, search }).then(r => r.data),
  });

  const { data: regionsData } = useQuery({
    queryKey: ['regions-all'],
    queryFn: () => regionsService.all().then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const saveMutation = useMutation({
    mutationFn: (d: FormData) => editItem
      ? supervisorsService.update(editItem.id, d).then(r => r.data)
      : supervisorsService.create(d).then(r => r.data),
    onSuccess: () => {
      toast.success(editItem ? 'Supervisor updated' : 'Supervisor created');
      qc.invalidateQueries({ queryKey: ['supervisors'] });
      setDrawerOpen(false); reset(); setEditItem(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => supervisorsService.delete(id),
    onSuccess: () => {
      toast.success('Supervisor deleted');
      qc.invalidateQueries({ queryKey: ['supervisors'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const openEdit = (item: any) => {
    setEditItem(item);
    reset({ supervisorName: item.supervisorName, checkNumber: item.checkNumber, subject: item.subject ?? '', phone: item.phone ?? '', workstation: item.workstation ?? '', bankName: item.bankName ?? '', accountNumber: item.accountNumber ?? '', accountName: item.accountName ?? '' });
    setDrawerOpen(true);
  };

  const columns: Column<any>[] = [
    { header: 'Name', cell: (row) => (
      <div>
        <p className="font-semibold text-gray-900">{row.supervisorName}</p>
        <p className="text-xs font-mono text-gray-400">{row.checkNumber}</p>
      </div>
    )},
    { header: 'Region', cell: (row) => <span className="text-sm text-gray-600">{row.regionName ?? '—'}</span> },
    { header: 'District', cell: (row) => <span className="text-sm text-gray-600">{row.districtName ?? '—'}</span> },
    { header: 'Subject', cell: (row) => <span className="text-sm text-gray-600">{row.subject ?? '—'}</span> },
    { header: 'Phone', cell: (row) => <span className="text-sm font-mono text-gray-600">{row.phone ?? '—'}</span> },
    { header: 'Bank', cell: (row) => (
      <div className="text-xs text-gray-500">
        <p className="font-medium">{row.bankName ?? '—'}</p>
        <p className="font-mono">{row.accountNumber ?? ''}</p>
      </div>
    )},
    { header: '', cell: (row) => (
      <div className="flex items-center space-x-2">
        <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supervisors</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ? `${Number(data.total).toLocaleString()} supervisors` : 'Manage exam supervisors'}
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2.5 border border-gray-200 bg-white text-gray-700 rounded-xl font-medium shadow-sm hover:bg-gray-50 transition-all text-sm">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => { setEditItem(null); reset({}); setDrawerOpen(true); }}
            className="flex items-center px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supervisor
          </motion.button>
        </div>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or check number..."
          className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
        />
      </div>

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages}
        onPageChange={setPage}
        keyExtractor={r => r.id}
      />

      <FormDrawer isOpen={drawerOpen} onClose={() => { setDrawerOpen(false); setEditItem(null); reset({}); }} title={editItem ? 'Edit Supervisor' : 'Add Supervisor'}>
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
          {([
            { field: 'supervisorName', label: 'Full Name', type: 'text', required: true },
            { field: 'checkNumber', label: 'Check Number', type: 'text', required: true },
            { field: 'subject', label: 'Subject', type: 'text' },
            { field: 'phone', label: 'Phone', type: 'text' },
            { field: 'workstation', label: 'Workstation', type: 'text' },
          ] as any[]).map(({ field, label, type, required }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
              <input
                {...register(field as any)}
                type={type}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {errors[field as keyof FormData] && <p className="text-xs text-red-500 mt-1">{(errors[field as keyof FormData] as any)?.message}</p>}
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Region</label>
            <select {...register('regionId')} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
              <option value="">Select region...</option>
              {regionsData?.data?.map((r: any) => <option key={r.id} value={r.id}>{r.regionName}</option>)}
            </select>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Bank Details</p>
            {(['bankName', 'accountName', 'accountNumber'] as const).map(field => (
              <div key={field} className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1.5 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                <input {...register(field)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            ))}
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={() => setDrawerOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={saveMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60">
              {saveMutation.isPending ? 'Saving...' : editItem ? 'Update' : 'Create'}
            </motion.button>
          </div>
        </form>
      </FormDrawer>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Supervisor"
        message={`Remove "${deleteTarget?.supervisorName}"? This cannot be undone.`}
        confirmText="Delete" isDestructive
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Supervisors;
