import React, { useState } from 'react';
import { GraduationCap, Plus, Search, Filter, Building, MapPin, ExternalLink } from 'lucide-react';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { useInstitutions } from '../../../hooks/useInstitutions';

const PrimarySchools = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const { data: queryData, isLoading } = useInstitutions({ 
    type: 'primary', 
    search: searchTerm, 
    page, 
    limit: 15 
  });

  const data = queryData?.data || [];

  const columns: Column<any>[] = [
    { 
      header: 'Center Info', 
      cell: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">{s.name}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.centerNumber}</p>
          </div>
        </div>
      )
    },
    { 
      header: 'Location', 
      cell: (s: any) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <MapPin className="h-3 w-3 text-red-500" />
            {s.regionName}
          </div>
          <p className="text-[10px] text-gray-400 pl-4 uppercase font-bold">{s.districtName}</p>
        </div>
      )
    },
    { 
      header: 'Category', 
      cell: (s: any) => (
        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${s.category === 'GOVERNMENT' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
          {s.category || 'N/A'}
        </span>
      ) 
    },
    { 
      header: 'Status', 
      cell: (s) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {s.status}
        </span>
      ) 
    },
    {
      header: 'Actions',
      cell: (s) => (
        <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-900 transition-colors">
          <ExternalLink className="h-4 w-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Primary Schools</h1>
            <p className="text-sm text-gray-500 font-medium">Registry for PSLE examination centers.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-xl shadow-gray-200">
          <Plus className="h-4 w-4" /> Register School
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by school name or center number..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-gray-900 outline-none transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
          <Filter className="h-4 w-4" /> Filter
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-20 text-center text-gray-400 font-medium">Loading institutional data...</div>
        ) : (
          <DataTable data={data} columns={columns} keyExtractor={(s) => s.id} />
        )}
      </div>
    </div>
  );
};

export default PrimarySchools;
