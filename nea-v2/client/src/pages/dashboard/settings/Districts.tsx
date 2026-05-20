import React, { useState } from 'react';
import { MapPin, Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';
import { toast } from 'sonner';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { FormDrawer } from '../../../components/shared/FormDrawer';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';

const Districts = () => {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data: regionsData } = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.get('/regions').then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['districts'],
    queryFn: () => api.get('/districts').then(r => r.data),
  });

  const columns: Column<any>[] = [
    { header: 'District Name', cell: (d) => <span className="font-semibold text-gray-900">{d.districtName}</span> },
    { header: 'Region', cell: (d) => <span className="text-gray-600">{regionsData?.data?.find((r: any) => r.id === d.regionId)?.regionName || '—'}</span> },
    { header: 'District Code', cell: (d) => <span className="font-mono text-gray-500">{d.districtCode || '—'}</span> },
    {
      header: 'Actions',
      cell: (d) => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => { setEditingItem(d); setDrawerOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
          <button onClick={() => setDeleteTarget(d)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      )
    }
  ];

  const filteredData = (data?.data || []).filter((d: any) => 
    d.districtName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Districts</h1>
          <p className="text-sm text-gray-500 font-medium">Manage councils and administrative districts.</p>
        </div>
        <button 
          onClick={() => { setEditingItem(null); setDrawerOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
        >
          <Plus className="h-4 w-4" /> Add District
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search districts..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 outline-none transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
          <Filter className="h-4 w-4" /> Filters
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <DataTable 
          data={filteredData} 
          columns={columns} 
          isLoading={isLoading}
          keyExtractor={(d) => d.id}
        />
      </div>

      <FormDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        title={editingItem ? 'Edit District' : 'Add New District'}
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 italic">District forms are coming in the next update.</p>
          <div className="flex gap-3">
            <button onClick={() => setDrawerOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">Cancel</button>
            <button className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold opacity-50 cursor-not-allowed">Save District</button>
          </div>
        </div>
      </FormDrawer>

      <ConfirmDialog 
        isOpen={!!deleteTarget}
        title="Delete District?"
        message={`Are you sure you want to delete ${deleteTarget?.districtName}?`}
        onConfirm={() => { toast.info('Delete functionality coming soon'); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Districts;
