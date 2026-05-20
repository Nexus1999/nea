import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Upload, Search, Eye, Trash2, FileText, TrendingUp, Users, BookOpen } from 'lucide-react';
import { masterSummariesService, examinationsService } from '../../services/api';
import { DataTable, Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { FormDrawer } from '../../components/shared/FormDrawer';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const schema = z.object({
  examination: z.string().min(1, 'Required'),
  code: z.string().min(1, 'Required'),
  year: z.coerce.number().int().min(2000).max(2100),
});
type FormData = z.infer<typeof schema>;

const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <div className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center space-x-4`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const MasterSummaries = () => {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['master-summaries', page],
    queryFn: () => masterSummariesService.list({ page, limit: 10 }).then(r => r.data),
  });

  const { data: exams } = useQuery({
    queryKey: ['examinations'],
    queryFn: () => examinationsService.list().then(r => r.data),
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const watchedCode = watch('code');

  const createMutation = useMutation({
    mutationFn: (d: FormData) => masterSummariesService.create(d).then(r => r.data),
    onSuccess: () => {
      toast.success('Master summary created — ready for CSV import');
      qc.invalidateQueries({ queryKey: ['master-summaries'] });
      setDrawerOpen(false);
      reset();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => masterSummariesService.delete(id),
    onSuccess: () => {
      toast.success('Master summary deleted');
      qc.invalidateQueries({ queryKey: ['master-summaries'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to delete'),
  });

  const totalSummaries = data?.total ?? 0;
  const totalCenters = data?.data?.reduce((s: number, r: any) => s + Number(r.centerCount ?? 0), 0) ?? 0;
  const totalRegistered = data?.data?.reduce((s: number, r: any) => s + Number(r.totalRegistered ?? 0), 0) ?? 0;

  const columns: Column<any>[] = [
    { header: 'Examination', cell: (row) => (
      <div>
        <p className="font-semibold text-gray-900">{row.examination}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5">{row.code} · v{row.version}</p>
      </div>
    )},
    { header: 'Year', cell: (row) => (
      <span className="font-bold text-lg text-gray-700">{row.year}</span>
    )},
    { header: 'Centers', cell: (row) => (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
        {Number(row.centerCount ?? 0).toLocaleString()}
      </span>
    )},
    { header: 'Registered', cell: (row) => (
      <span className="font-semibold text-gray-700">{Number(row.totalRegistered ?? 0).toLocaleString()}</span>
    )},
    { header: 'Uploaded', cell: (row) => (
      <span className="text-xs text-gray-400">{row.createdAt ? format(new Date(row.createdAt), 'dd MMM yyyy') : '—'}</span>
    )},
    { header: '', cell: (row) => (
      <div className="flex items-center space-x-2">
        <Link
          to={`/dashboard/master-summaries/${row.id}`}
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
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
          <h1 className="text-2xl font-bold text-gray-900">Master Summaries</h1>
          <p className="text-sm text-gray-500 mt-1">Manage examination enrollment data uploads</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => { reset(); setDrawerOpen(true); }}
          className="flex items-center px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Summary
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Summaries" value={totalSummaries} icon={FileText} color="bg-red-500" />
        <StatCard label="Total Centers" value={totalCenters.toLocaleString()} icon={BookOpen} color="bg-blue-500" />
        <StatCard label="Total Registered" value={totalRegistered.toLocaleString()} icon={Users} color="bg-emerald-500" />
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

      <FormDrawer isOpen={drawerOpen} onClose={() => { setDrawerOpen(false); reset(); }} title="Create Master Summary">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Examination</label>
            <select
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
              onChange={e => {
                const selected = exams?.data?.find((ex: any) => ex.id === Number(e.target.value));
                if (selected) { setValue('examination', selected.examination); setValue('code', selected.code); }
              }}
            >
              <option value="">Select examination...</option>
              {exams?.data?.map((ex: any) => (
                <option key={ex.id} value={ex.id}>{ex.examination} ({ex.code})</option>
              ))}
            </select>
            {errors.examination && <p className="text-xs text-red-500 mt-1">{errors.examination.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
            <input
              {...register('year')}
              type="number"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder={new Date().getFullYear().toString()}
            />
            {errors.year && <p className="text-xs text-red-500 mt-1">{errors.year.message}</p>}
          </div>
          <div className="pt-4 bg-blue-50 -mx-6 px-6 py-4 rounded-b-none text-xs text-blue-700 flex items-start space-x-2">
            <Upload className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>After creating this record, you can import centers from a CSV file on the detail page.</p>
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={() => setDrawerOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <motion.button
              whileTap={{ scale: 0.98 }} type="submit" disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </motion.button>
          </div>
        </form>
      </FormDrawer>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Master Summary"
        message={`Delete "${deleteTarget?.examination} ${deleteTarget?.year}"? All center records will be permanently removed.`}
        confirmText="Delete"
        isDestructive
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default MasterSummaries;
