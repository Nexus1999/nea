import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';
import { toast } from 'sonner';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { FormDrawer } from '../../../components/shared/FormDrawer';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';

const Regions = () => {
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: () => api.get('/regions').then(r => r.data),
  });

  const columns: Column<any>[] = [
    { header: 'Region Code', cell: (r) => <span className="font-mono font-bold text-gray-500">{r.regionCode}</span> },
    { header: 'Region Name', cell: (r) => <span className="font-semibold text-gray-900">{r.regionName}</span> },
    { header: 'Town/HQ', cell: (r) => <span className="text-gray-600">{r.town}</span> },
    {
      header: 'Actions',
      cell: (r) => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => { setEditingItem(r); setDrawerOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
          <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      )
    }
  ];

  const filteredData = (data?.data || []).filter((r: any) => 
    r.regionName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.regionCode.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Regions</h1>
          <p className="text-sm text-gray-500 font-medium">Manage geographical regions and their headquarters.</p>
        </div>
        <button 
          onClick={() => { setEditingItem(null); setDrawerOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
        >
          <Plus className="h-4 w-4" /> Add Region
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search regions..." 
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
          keyExtractor={(r) => r.id}
        />
      </div>

      <FormDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        title={editingItem ? 'Edit Region' : 'Add New Region'}
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 italic">Region forms are coming in the next update.</p>
          <div className="flex gap-3">
            <button onClick={() => setDrawerOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">Cancel</button>
            <button className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold opacity-50 cursor-not-allowed">Save Region</button>
          </div>
        </div>
      </FormDrawer>

      <ConfirmDialog 
        isOpen={!!deleteTarget}
        title="Delete Region?"
        message={`Are you sure you want to delete ${deleteTarget?.regionName}? This will affect linked districts.`}
        onConfirm={() => { toast.info('Delete functionality coming soon'); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Regions;
