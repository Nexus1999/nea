import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Eye, Trash2, TrendingUp, DollarSign } from 'lucide-react';
import { budgetsService, masterSummariesService } from '../../services/api';
import { DataTable, Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { FormDrawer } from '../../components/shared/FormDrawer';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const schema = z.object({
  name: z.string().min(1, 'Required'),
  mid: z.coerce.number().optional(),
  status: z.string().default('draft'),
});
type FormData = z.infer<typeof schema>;

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  finalized: 'bg-blue-100 text-blue-800',
};

const Budgets = () => {
  const qc = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetsService.list().then(r => r.data),
  });

  const { data: summariesData } = useQuery({
    queryKey: ['master-summaries-all'],
    queryFn: () => masterSummariesService.list({ limit: 100 }).then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft' },
  });

  const createMutation = useMutation({
    mutationFn: (d: FormData) => budgetsService.create(d).then(r => r.data),
    onSuccess: () => {
      toast.success('Budget created successfully');
      qc.invalidateQueries({ queryKey: ['budgets'] });
      setDrawerOpen(false); reset();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const columns: Column<any>[] = [
    { header: 'Budget Name', cell: (row) => (
      <div>
        <p className="font-semibold text-gray-900">{row.name}</p>
        {row.examination && <p className="text-xs text-gray-400 mt-0.5">{row.examination} · {row.year}</p>}
      </div>
    )},
    { header: 'Status', cell: (row) => (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[row.status] || 'bg-gray-100 text-gray-700'}`}>
        {row.status}
      </span>
    )},
    { header: 'Created', cell: (row) => (
      <span className="text-xs text-gray-400">{row.createdAt ? format(new Date(row.createdAt), 'dd MMM yyyy') : '—'}</span>
    )},
    { header: '', cell: (row) => (
      <div className="flex items-center space-x-2">
        <Link to={`/dashboard/budgets/${row.id}`} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
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
          <h1 className="text-2xl font-bold text-gray-900">Budgets & Transportation</h1>
          <p className="text-sm text-gray-500 mt-1">Manage examination budgets and transport planning</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => { reset({ status: 'draft' }); setDrawerOpen(true); }}
          className="flex items-center px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Budget
        </motion.button>
      </div>

      <DataTable
        data={data?.data ?? []}
        columns={columns}
        isLoading={isLoading}
        keyExtractor={r => r.id}
      />

      <FormDrawer isOpen={drawerOpen} onClose={() => { setDrawerOpen(false); reset(); }} title="Create Budget">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Budget Name <span className="text-red-500">*</span></label>
            <input {...register('name')} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="e.g. CSEE 2025 Transportation Budget" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Linked Master Summary (Optional)</label>
            <select {...register('mid')} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
              <option value="">None</option>
              {summariesData?.data?.map((ms: any) => (
                <option key={ms.id} value={ms.id}>{ms.examination} {ms.year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select {...register('status')} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white">
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="finalized">Finalized</option>
            </select>
          </div>
          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={() => setDrawerOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60">
              {createMutation.isPending ? 'Creating...' : 'Create Budget'}
            </motion.button>
          </div>
        </form>
      </FormDrawer>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Budget"
        message={`Delete "${deleteTarget?.name}"? All transport routes and participants will be removed.`}
        confirmText="Delete" isDestructive
        onConfirm={() => setDeleteTarget(null)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Budgets;
