import React, { useState } from 'react';
import { GraduationCap, Plus, Edit, Trash2, Search, Filter, BookOpen } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';
import { toast } from 'sonner';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { FormDrawer } from '../../../components/shared/FormDrawer';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';

const Subjects = () => {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get('/subjects').then(r => r.data),
  });

  const { data: examsData } = useQuery({
    queryKey: ['examinations'],
    queryFn: () => api.get('/examinations').then(r => r.data),
  });

  const columns: Column<any>[] = [
    { header: 'Code', cell: (s) => <span className="font-mono font-bold text-gray-500">{s.subjectCode}</span> },
    { header: 'Subject Name', cell: (s) => <span className="font-semibold text-gray-900">{s.subjectName}</span> },
    { 
      header: 'Examination', 
      cell: (s) => (
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-gray-600 font-medium">{s.examCode}</span>
        </div>
      ) 
    },
    {
      header: 'Actions',
      cell: (s) => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => { setEditingItem(s); setDrawerOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
          <button onClick={() => setDeleteTarget(s)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      )
    }
  ];

  const filteredData = (data?.data || []).filter((s: any) => 
    s.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subjectCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Subjects</h1>
          <p className="text-sm text-gray-500 font-medium">Manage examination subjects and their unique codes.</p>
        </div>
        <button 
          onClick={() => { setEditingItem(null); setDrawerOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
        >
          <Plus className="h-4 w-4" /> Add Subject
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search subjects..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <DataTable 
          data={filteredData} 
          columns={columns} 
          isLoading={isLoading}
          keyExtractor={(s) => s.id}
        />
      </div>

      <FormDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        title={editingItem ? 'Edit Subject' : 'Add New Subject'}
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 italic">Subject forms are coming in the next update.</p>
          <div className="flex gap-3">
            <button onClick={() => setDrawerOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">Cancel</button>
            <button className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold opacity-50 cursor-not-allowed">Save Subject</button>
          </div>
        </div>
      </FormDrawer>

      <ConfirmDialog 
        isOpen={!!deleteTarget}
        title="Delete Subject?"
        message={`Are you sure you want to delete ${deleteTarget?.subjectName}?`}
        onConfirm={() => { toast.info('Delete functionality coming soon'); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Subjects;
