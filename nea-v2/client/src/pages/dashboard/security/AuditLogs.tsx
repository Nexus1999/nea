import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Download, Clock, Database, History, Filter, RefreshCw, Eye, X
} from 'lucide-react';
import { api } from '../../../lib/axios';
import { format } from 'date-fns';
import { FormDrawer } from '../../../components/shared/FormDrawer';
import { DataTable } from '../../../components/shared/DataTable';

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  UPDATE: 'bg-blue-50 text-blue-700 border-blue-100',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-100',
  IMPORT: 'bg-purple-50 text-purple-700 border-purple-100',
};

const ITEMS_PER_PAGE = 15;

const AuditLogs = () => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get('/audit-logs').then(r => r.data),
  });

  const logs: any[] = data?.data ?? [];

  const filtered = logs.filter(log => {
    const matchSearch =
      log.tableName?.toLowerCase().includes(search.toLowerCase()) ||
      log.actionType?.toLowerCase().includes(search.toLowerCase()) ||
      String(log.username || log.changedBy || '').toLowerCase().includes(search.toLowerCase()) ||
      String(log.recordId ?? '').includes(search);
    const matchAction = actionFilter === 'all' || log.actionType === actionFilter;
    return matchSearch && matchAction;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const exportCSV = () => {
    const header = 'Timestamp,User,Action,Table,Record ID';
    const rows = filtered.map(l =>
      `${l.changedAt ? format(new Date(l.changedAt), 'yyyy-MM-dd HH:mm:ss') : ''},${l.changedBy || 'System'},${l.actionType},${l.tableName},${l.recordId}`
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit_logs.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2.5 rounded-xl">
              <History className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Audit Logs</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">System Activity & Data Changes</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => refetch()} disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 hover:border-gray-900 transition-all shadow-sm">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={exportCSV} disabled={isLoading || logs.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:opacity-50">
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search by table, action, user or record ID..."
              className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
            <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setCurrentPage(1); }}
              className="py-2.5 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white">
              <option value="all">All Actions</option>
              {['INSERT', 'UPDATE', 'DELETE', 'IMPORT'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <DataTable
          data={paginated}
          isLoading={isLoading}
          keyExtractor={(l) => l.id}
          columns={[
            {
              header: 'Timestamp',
              cell: (log) => (
                <div className="flex items-center gap-2 font-mono text-gray-500 text-xs">
                  <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                  {log.changedAt ? format(new Date(log.changedAt), 'yyyy-MM-dd HH:mm:ss') : '—'}
                </div>
              )
            },
            {
              header: 'User',
              cell: (log) => (
                <div className="flex items-center gap-2 font-bold text-gray-700 text-sm">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {String(log.username || log.changedBy || 'S').charAt(0).toUpperCase()}
                  </div>
                  {log.username || log.changedBy || 'System'}
                </div>
              )
            },
            {
              header: 'Action',
              cell: (log) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border-2 ${ACTION_COLORS[log.actionType] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                  {log.actionType}
                </span>
              )
            },
            {
              header: 'Table',
              cell: (log) => (
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <Database className="h-3 w-3 text-gray-400 shrink-0" />
                  {log.tableName}
                </div>
              )
            },
            {
              header: 'Record ID',
              cell: (log) => (
                <span className="text-[10px] font-mono text-gray-400">{log.recordId ?? '—'}</span>
              )
            },
            {
              header: 'Details',
              cell: (log) => (
                <div className="flex items-center justify-end">
                  <button onClick={() => handleViewDetails(log)}
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Details">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              )
            }
          ]}
        />

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}
              className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 hover:border-gray-900 disabled:opacity-30 transition-all">Prev</button>
            <span className="px-3 py-2.5 text-[10px] font-black uppercase text-gray-900">{currentPage} / {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}
              className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 hover:border-gray-900 disabled:opacity-30 transition-all">Next</button>
          </div>
        </div>
      </div>

      {/* Details Drawer */}
      <FormDrawer isOpen={drawerOpen} onClose={() => { setDrawerOpen(false); setSelectedLog(null); }} title="Audit Log Details">
        {selectedLog && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border-2 ${ACTION_COLORS[selectedLog.actionType] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                {selectedLog.actionType}
              </span>
              <span className="font-mono text-sm text-gray-500">{selectedLog.tableName}</span>
            </div>

            {[
              { label: 'Timestamp', value: selectedLog.changedAt ? format(new Date(selectedLog.changedAt), 'PPpp') : '—' },
              { label: 'Changed By', value: selectedLog.username || selectedLog.changedBy || 'System' },
              { label: 'Record ID', value: selectedLog.recordId ?? '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm font-semibold text-gray-700 font-mono">{value}</p>
              </div>
            ))}

            {selectedLog.oldData && (
              <div>
                <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">Old Data</p>
                <pre className="text-xs bg-rose-50 border border-rose-100 rounded-xl p-4 overflow-auto max-h-60 text-gray-700">
                  {JSON.stringify(selectedLog.oldData, null, 2)}
                </pre>
              </div>
            )}
            {selectedLog.newData && (
              <div>
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">New Data</p>
                <pre className="text-xs bg-emerald-50 border border-emerald-100 rounded-xl p-4 overflow-auto max-h-60 text-gray-700">
                  {JSON.stringify(selectedLog.newData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </FormDrawer>
    </div>
  );
};

export default AuditLogs;
