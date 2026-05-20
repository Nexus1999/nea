import React, { useState } from 'react';
import { Navigation, Plus, Edit, Trash2, Search, Filter, MapPin } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/axios';
import { toast } from 'sonner';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { FormDrawer } from '../../../components/shared/FormDrawer';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';

const RegionalDistances = () => {
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
    queryKey: ['regional-distances'],
    queryFn: () => api.get('/region-distances').then(r => r.data),
  });

  const getRegionName = (id: number) => regionsData?.data?.find((r: any) => r.id === id)?.regionName || '—';

  const columns: Column<any>[] = [
    { 
      header: 'From Region', 
      cell: (d) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-blue-500" />
          <span className="font-semibold text-gray-900">{getRegionName(d.fromRegionId)}</span>
        </div>
      ) 
    },
    { 
      header: 'To Region', 
      cell: (d) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-orange-500" />
          <span className="font-semibold text-gray-900">{getRegionName(d.toRegionId)}</span>
        </div>
      ) 
    },
    { 
      header: 'Distance', 
      cell: (d) => (
        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-black">
          {d.distanceKm} KM
        </span>
      ) 
    },
    { header: 'Via', cell: (d) => <span className="text-gray-500 text-xs italic">{d.via || 'Direct'}</span> },
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Regional Distances</h1>
          <p className="text-sm text-gray-500 font-medium">Logistics data for transport cost calculations.</p>
        </div>
        <button 
          onClick={() => { setEditingItem(null); setDrawerOpen(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
        >
          <Plus className="h-4 w-4" /> Add Distance
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <DataTable 
          data={data?.data || []} 
          columns={columns} 
          isLoading={isLoading}
          keyExtractor={(d) => d.id}
        />
      </div>

      <FormDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        title={editingItem ? 'Edit Distance' : 'Add New Distance'}
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 italic">Distance matrix forms are coming in the next update.</p>
          <div className="flex gap-3">
            <button onClick={() => setDrawerOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600">Cancel</button>
            <button className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold opacity-50 cursor-not-allowed">Save Distance</button>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
};

export default RegionalDistances;
