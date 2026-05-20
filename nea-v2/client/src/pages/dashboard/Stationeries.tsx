import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Eye, Trash2, BookOpen } from 'lucide-react';
import { stationeriesService, masterSummariesService } from '../../services/api';
import { DataTable, Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { FormDrawer } from '../../components/shared/FormDrawer';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const schema = z.object({ mid: z.coerce.number().int().positive('Select a master summary') });
type FormData = z.infer<typeof schema>;

const statusColors: Record<string, string> = {
  Draft: 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  Complete: 'bg-green-100 text-green-800',
};

const Stationeries = () => {
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['stationeries'],
    queryFn: () => stationeriesService.list().then(r => r.data),
  });

  const { data: summariesData } = useQuery({
    queryKey: ['master-summaries-all'],
    queryFn: () => masterSummariesService.list({ limit: 100 }).then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: (d: FormData) => stationeriesService.create({ mid: d.mid, status: 'Draft' }).then(r => r.data),
    onSuccess: () => {
      toast.success('Stationery record created');
      qc.invalidateQueries({ queryKey: ['stationeries'] });
      setDrawerOpen(false); reset();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const columns: Column<any>[] = [
    { header: 'Examination', cell: (row) => (
      <div>
        <p className="font-semibold text-gray-900">{row.examination ?? '—'}</p>
        {row.code && <p className="text-xs font-mono text-gray-400 mt-0.5">{row.code} · {row.year}</p>}
      </div>
    )},
    { header: 'Status', cell: (row) => (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[row.status] || 'bg-gray-100 text-gray-700'}`}>
        {row.status}
      </span>
    )},
    { header: 'Created', cell: (row) => <span className="text-xs text-gray-400">{format(new Date(row.createdAt), 'dd MMM yyyy')}</span> },
    { header: '', cell: (row) => (
      <div className="flex items-center space-x-2">
        <Link to={`/dashboard/stationeries/${row.id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
          <Eye className="w-4 h-4" />
        </Link>
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
          <h1 className="text-2xl font-bold text-gray-900">Stationeries</h1>
          <p className="text-sm text-gray-500 mt-1">Manage examination stationery planning and box allocation</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => { reset(); setDrawerOpen(true); }}
          className="flex items-center px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Stationery
        </motion.button>
      </div>

      {!isLoading && data?.data?.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No stationery records yet</h3>
          <p className="text-gray-500 mt-2 text-sm">Create a stationery record linked to a master summary to begin planning.</p>
        </div>
      )}

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        keyExtractor={r => r.id}
      />

      <FormDrawer isOpen={drawerOpen} onClose={() => { setDrawerOpen(false); reset(); }} title="Create Stationery Record">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Master Summary <span className="text-red-500">*</span></label>
            <select {...register('mid')} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
              <option value="">Select a master summary...</option>
              {summariesData?.data?.map((ms: any) => (
                <option key={ms.id} value={ms.id}>{ms.examination} {ms.year} (v{ms.version})</option>
              ))}
            </select>
            {errors.mid && <p className="text-xs text-red-500 mt-1">{errors.mid.message}</p>}
          </div>
          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={() => setDrawerOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60">
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </motion.button>
          </div>
        </form>
      </FormDrawer>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Stationery Record"
        message={`Delete stationery for "${deleteTarget?.examination}"? This cannot be undone.`}
        confirmText="Delete" isDestructive
        onConfirm={() => setDeleteTarget(null)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Stationeries;
