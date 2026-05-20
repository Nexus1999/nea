import React, { useState } from 'react';
import { BookOpen, Plus, Search, Filter, MapPin, ExternalLink, GraduationCap } from 'lucide-react';
import { DataTable, Column } from '../../../components/shared/DataTable';

const TeachersColleges = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const data = [
    { id: 1, name: 'KOROGWE TEACHERS COLLEGE', code: 'C01', region: 'TANGA', district: 'KOROGWE', type: 'DIPLOMA', status: 'ACTIVE' },
    { id: 2, name: 'BUTIMBA TEACHERS COLLEGE', code: 'C02', region: 'MWANZA', district: 'NYAMAGANA', type: 'DIPLOMA & CERTIFICATE', status: 'ACTIVE' },
    { id: 3, name: 'MPWAPWA TEACHERS COLLEGE', code: 'C03', region: 'DODOMA', district: 'MPWAPWA', type: 'DIPLOMA', status: 'ACTIVE' },
    { id: 4, name: 'KASULU TEACHERS COLLEGE', code: 'C04', region: 'KIGOMA', district: 'KASULU', type: 'CERTIFICATE', status: 'ACTIVE' },
  ];

  const columns: Column<any>[] = [
    { 
      header: 'College Info', 
      cell: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">{s.name}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.code}</p>
          </div>
        </div>
      )
    },
    { 
      header: 'Location', 
      cell: (s) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <MapPin className="h-3 w-3 text-red-500" />
            {s.region}
          </div>
          <p className="text-[10px] text-gray-400 pl-4 uppercase font-bold">{s.district}</p>
        </div>
      )
    },
    { 
      header: 'Award Levels', 
      cell: (s) => (
        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
          {s.type}
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
          <div className="w-14 h-14 bg-purple-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-purple-200">
            <BookOpen className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Teachers Colleges</h1>
            <p className="text-sm text-gray-500 font-medium">Registry for Teacher Education examination centers.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-xl shadow-gray-200">
          <Plus className="h-4 w-4" /> Register College
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search colleges..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-gray-900 outline-none transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <DataTable data={data} columns={columns} keyExtractor={(s) => s.id} />
      </div>
    </div>
  );
};

export default TeachersColleges;
