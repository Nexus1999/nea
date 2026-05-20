import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Search, Edit2, Trash2, Upload, Briefcase } from 'lucide-react';
import { teachersService, regionsService } from '../../services/api';
import { DataTable, Column } from '../../components/shared/DataTable';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { FormDrawer } from '../../components/shared/FormDrawer';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  teacherName: z.string().min(1, 'Required'),
  checkNumber: z.string().min(1, 'Required'),
  indexNo: z.string().optional(),
  cseeYear: z.string().optional(),
  phone: z.string().optional(),
  workstation: z.string().optional(),
  regionId: z.coerce.number().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const Teachers = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'teachers' | 'jobs'>('teachers');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', page, search],
    queryFn: () => teachersService.list({ page, limit: 15, search }).then(r => r.data),
    enabled: tab === 'teachers',
  });

  const { data: regionsData } = useQuery({
    queryKey: ['regions-all'],
    queryFn: () => regionsService.all().then(r => r.data),
  });

  const { data: jobsData } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => teachersService.getJobs().then(r => r.data),
    enabled: tab === 'jobs',
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const saveMutation = useMutation({
    mutationFn: (d: FormData) => editItem
      ? teachersService.update(editItem.id, d).then(r => r.data)
      : teachersService.create(d).then(r => r.data),
    onSuccess: () => {
      toast.success(editItem ? 'Teacher updated' : 'Teacher created');
      qc.invalidateQueries({ queryKey: ['teachers'] });
      setDrawerOpen(false); reset(); setEditItem(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => teachersService.delete(id),
    onSuccess: () => {
      toast.success('Teacher deleted');
      qc.invalidateQueries({ queryKey: ['teachers'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const teacherColumns: Column<any>[] = [
    { header: 'Name', cell: (row) => (
      <div>
        <p className="font-semibold text-gray-900">{row.teacherName}</p>
        <p className="text-xs font-mono text-gray-400">{row.checkNumber}</p>
      </div>
    )},
    { header: 'Index No', cell: (row) => <span className="text-sm font-mono text-gray-600">{row.indexNo ?? '—'}</span> },
    { header: 'Region', cell: (row) => <span className="text-sm text-gray-600">{row.regionName ?? '—'}</span> },
    { header: 'Workstation', cell: (row) => <span className="text-sm text-gray-600">{row.workstation ?? '—'}</span> },
    { header: 'Phone', cell: (row) => <span className="text-sm font-mono text-gray-600">{row.phone ?? '—'}</span> },
    { header: '', cell: (row) => (
      <div className="flex items-center space-x-2">
        <button onClick={() => { setEditItem(row); reset({ ...row }); setDrawerOpen(true); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
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
          <h1 className="text-2xl font-bold text-gray-900">Teachers & Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">{data?.total ? `${Number(data.total).toLocaleString()} teachers registered` : 'Manage teachers and job assignments'}</p>
        </div>
        <div className="flex space-x-3">
          {tab === 'teachers' && (
            <>
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
                Add Teacher
              </motion.button>
            </>
          )}
        </div>
      </div>

      <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['teachers', 'jobs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'teachers' && (
        <>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search teachers..."
              className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" />
          </div>
          <DataTable data={data?.data ?? []} columns={teacherColumns} isLoading={isLoading} page={page} totalPages={data?.totalPages} onPageChange={setPage} keyExtractor={r => r.id} />
        </>
      )}

      {tab === 'jobs' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          {jobsData?.data?.length === 0 ? (
            <div className="p-16 text-center">
              <Briefcase className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No job assignments yet</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Name', 'Section', 'Start', 'End', 'Required'].map(h => (
                    <th key={h} className="px-6 py-4 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobsData?.data?.map((job: any) => (
                  <tr key={job.id} className="border-b border-gray-50 hover:bg-red-50/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{job.name}</td>
                    <td className="px-6 py-4 text-gray-600">{job.section ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{job.startDate ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{job.endDate ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-600">{job.totalRequired}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Teacher Form Drawer */}
      <FormDrawer isOpen={drawerOpen} onClose={() => { setDrawerOpen(false); setEditItem(null); reset({}); }} title={editItem ? 'Edit Teacher' : 'Add Teacher'}>
        <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
          {([
            { field: 'teacherName', label: 'Full Name', required: true },
            { field: 'checkNumber', label: 'Check Number', required: true },
            { field: 'indexNo', label: 'Index No' },
            { field: 'cseeYear', label: 'CSEE Year' },
            { field: 'phone', label: 'Phone' },
            { field: 'workstation', label: 'Workstation' },
          ] as any[]).map(({ field, label, required }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
              <input {...register(field)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
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
          <div className="flex space-x-3 pt-3">
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
        title="Delete Teacher"
        message={`Remove "${deleteTarget?.teacherName}"? This cannot be undone.`}
        confirmText="Delete" isDestructive
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Teachers;
