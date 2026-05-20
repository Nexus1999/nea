import React, { useState } from 'react';
import { Settings as SettingsIcon, Plus, Edit, Trash2, Clock, ShieldCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';
import { toast } from 'sonner';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { FormDrawer } from '../../../components/shared/FormDrawer';

const TransportGuidelines = () => {
  const qc = useQueryClient();
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['transport-guidelines'],
    queryFn: () => api.get('/transport-guidelines').then(r => r.data),
  });

  const columns: Column<any>[] = [
    { header: 'Category', cell: (g) => <span className="font-bold text-gray-900">{g.category}</span> },
    { 
      header: 'Allocated Days', 
      cell: (g) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <span className="font-black text-gray-900">{g.days} Days</span>
        </div>
      ) 
    },
    { header: 'Description', cell: (g) => <span className="text-gray-500 text-xs">{g.description || 'No description'}</span> },
    {
      header: 'Actions',
      cell: (g) => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => { setEditingItem(g); setDrawerOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="h-4 w-4" /></button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Transport Guidelines</h1>
          <p className="text-sm text-gray-500 font-medium">Standardized day allocations for supervision travel.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Official Policy</span>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <DataTable 
          data={data?.data || []} 
          columns={columns} 
          isLoading={isLoading}
          keyExtractor={(g) => g.id}
        />
      </div>

      <FormDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        title={editingItem ? 'Edit Guideline' : 'Add New Guideline'}
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 italic">Guideline forms are coming in the next update.</p>
          <div className="flex gap-3">
            <button onClick={() => setDrawerOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">Cancel</button>
            <button className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold opacity-50 cursor-not-allowed">Save Changes</button>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
};

export default TransportGuidelines;
