import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Globe, Monitor, Smartphone, Clock, Shield, LogOut, Wifi, Activity, MapPin, Fingerprint, ShieldCheck, Lock as LockIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../../providers/AuthProvider';
import { securityService } from '../../../services/api';
import { DataTable, Column } from '../../../components/shared/DataTable';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';

const Sessions = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sessionToTerminate, setSessionToTerminate] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => securityService.getSessions().then(r => r.data),
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const sessions = data?.data || [];

  const terminateMutation = useMutation({
    mutationFn: (id: string) => securityService.deleteSession(id).then(r => r.data),
    onSuccess: () => {
      toast.success('Session terminated successfully');
      qc.invalidateQueries({ queryKey: ['sessions'] });
      setSessionToTerminate(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed to terminate session'),
  });

  const columns: Column<any>[] = [
    { 
      header: 'User', 
      cell: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-xs font-bold border border-slate-200">
            {s.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">{s.username || 'System'}</p>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Session User</p>
          </div>
        </div>
      )
    },
    { 
      header: 'IP & Device', 
      cell: (s) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            {s.ipAddress || '0.0.0.0'}
          </div>
          <div className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">
            {s.userAgent || 'Unknown Browser'}
          </div>
        </div>
      )
    },
    { 
      header: 'Last Active', 
      cell: (s) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
          <Clock className="h-3.5 w-3.5 text-slate-300" />
          {s.lastActivity ? format(new Date(s.lastActivity), 'yyyy-MM-dd HH:mm:ss') : 'Just now'}
        </div>
      )
    },
    { 
      header: 'Expires At', 
      cell: (s) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Clock className="h-3.5 w-3.5 text-slate-300" />
          {s.expiresAt ? format(new Date(s.expiresAt), 'yyyy-MM-dd HH:mm:ss') : '—'}
        </div>
      )
    },
    {
      header: 'Status',
      cell: (s) => {
        const isExpired = new Date(s.expiresAt) <= new Date();
        const status = isExpired ? 'EXPIRED' : (s.status || 'ACTIVE');
        
        let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
        let StatusIcon = ShieldCheck;
        
        if (status === 'TERMINATED') {
          colorClass = 'bg-red-50 text-red-700 border-red-100';
          StatusIcon = Shield;
        } else if (status === 'EXPIRED') {
          colorClass = 'bg-amber-50 text-amber-700 border-amber-100';
          StatusIcon = Clock;
        }
        
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border-2 ${colorClass}`}>
            <StatusIcon className="w-3 h-3" />
            {status}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      cell: (s) => {
        const isExpired = new Date(s.expiresAt) <= new Date();
        const isTerminated = s.status === 'TERMINATED';
        if (isExpired || isTerminated) return null;
        
        return (
          <div className="flex justify-end">
            <button 
              onClick={() => setSessionToTerminate(s)}
              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Terminate Session"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Active Sessions</h2>
          <p className="text-slate-500 mt-1 text-sm">Real-time monitoring of all active system user sessions.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 shadow-sm text-xs font-semibold">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Session Telemetry
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200/80 p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{sessions.filter((s: any) => new Date(s.expiresAt) > new Date() && s.status !== 'TERMINATED').length}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Sessions</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/80 p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">100%</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Authentication Integrity</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/80 p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">Continuous</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Session Lifespan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <DataTable 
          data={sessions} 
          columns={columns} 
          isLoading={isLoading} 
          keyExtractor={(s) => s.id}
        />
      </div>

      <div className="p-6 bg-slate-900 rounded-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
          <Shield className="w-32 h-32 rotate-12" />
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <LockIcon className="h-5 w-5 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold">Session Termination Policy</h3>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
          Authorized users are tracked via stateful session tokens. Every user interaction is validated 
          against our secure database. Administrative personnel reserve the right to immediately terminate 
          any active session if unauthorized behavior or security thresholds are breached.
        </p>
      </div>

      <ConfirmDialog 
        isOpen={!!sessionToTerminate} 
        title="Terminate User Session?" 
        message={`Are you sure you want to terminate the active session for user "${sessionToTerminate?.username}"? This will log them out immediately.`}
        confirmText="Yes, Terminate"
        isDestructive={true}
        onConfirm={() => terminateMutation.mutate(sessionToTerminate.id)}
        onCancel={() => setSessionToTerminate(null)}
      />
    </div>
  );
};

export default Sessions;
