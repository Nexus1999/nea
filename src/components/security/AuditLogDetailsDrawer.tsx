"use client";

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  User, 
  Calendar, 
  Database, 
  Activity,
  ArrowRight,
  FileJson,
  Fingerprint,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditLogDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: any;
}

export const AuditLogDetailsDrawer = ({ open, onOpenChange, log }: AuditLogDetailsDrawerProps) => {
  if (!log) return null;

  const getActionStyles = (action: string) => {
    switch (action?.toUpperCase()) {
      case 'INSERT': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UPDATE': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELETE': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'IMPORT': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const DataBlock = ({ data, title, type }: { data: any, title: string, type: 'old' | 'new' }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            type === 'old' ? "bg-rose-400" : "bg-emerald-400"
          )} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            {title}
          </span>
        </div>
        <FileJson className="h-3 w-3 text-slate-300" />
      </div>
      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 shadow-inner">
        <pre className="text-[12px] font-mono text-slate-700 leading-relaxed overflow-x-auto whitespace-pre-wrap">
          {data ? JSON.stringify(data, null, 2) : "// No data available"}
        </pre>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[650px] p-0 bg-white border-l shadow-2xl flex flex-col">
        {/* Header Section */}
        <div className="p-8 border-b bg-slate-50/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          
          <SheetHeader className="relative z-10 space-y-6">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={cn(
                "px-4 py-1 text-[10px] font-black uppercase tracking-widest border-2",
                getActionStyles(log.action_type)
              )}>
                {log.action_type}
              </Badge>
              <div className="flex items-center gap-4 text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-bold uppercase tracking-tighter">
                    {format(new Date(log.changed_at), 'HH:mm:ss')}
                  </span>
                </div>
                <div className="w-px h-3 bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-bold uppercase tracking-tighter">
                    {format(new Date(log.changed_at), 'dd MMM yyyy')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-5">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
                <History className="h-7 w-7 text-slate-400" />
              </div>
              <div className="space-y-1">
                <SheetTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
                  Audit Trail Entry
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  <Fingerprint className="h-3 w-3" />
                  Log ID: {log.id}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content Section */}
        <ScrollArea className="flex-1">
          <div className="p-8 space-y-10">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <User className="h-3 w-3" /> Performed By
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
                    {log.changed_by?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  <p className="text-sm font-bold text-slate-900">{log.changed_by || 'System'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Database className="h-3 w-3" /> Target Table
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">{log.table_name}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">Record ID: {log.record_id}</p>
                </div>
              </div>
            </div>

            {/* Data Comparison */}
            <div className="space-y-8">
              {log.old_data && (
                <DataBlock data={log.old_data} title="Previous State" type="old" />
              )}
              
              {log.old_data && log.new_data && (
                <div className="flex items-center gap-4 py-2">
                  <div className="h-px flex-1 bg-slate-100" />
                  <div className="bg-white p-2 rounded-full shadow-sm border border-slate-100">
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="h-px flex-1 bg-slate-100" />
                </div>
              )}

              {log.new_data && (
                <DataBlock 
                  data={log.new_data} 
                  title={log.action_type === 'INSERT' ? 'Inserted Data' : 'New State'} 
                  type="new" 
                />
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer Section */}
        <div className="p-6 bg-slate-50 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verified System Log</span>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="h-10 px-6 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all shadow-sm"
          >
            Close Trail
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};