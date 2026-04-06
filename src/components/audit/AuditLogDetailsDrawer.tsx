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
  FileJson
} from "lucide-react";
import { format } from "date-fns";

interface AuditLogDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: any;
}

export const AuditLogDetailsDrawer = ({ open, onOpenChange, log }: AuditLogDetailsDrawerProps) => {
  if (!log) return null;

  const getActionColor = (action: string) => {
    switch (action?.toUpperCase()) {
      case 'INSERT': return 'bg-emerald-500';
      case 'UPDATE': return 'bg-blue-500';
      case 'DELETE': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const JsonView = ({ data, title }: { data: any, title: string }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
        <FileJson className="h-3 w-3" />
        {title}
      </div>
      <div className="bg-slate-950 rounded-xl p-4 overflow-hidden border border-slate-800">
        <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] p-0 bg-slate-50 border-l-0 shadow-2xl">
        <div className="h-full flex flex-col">
          <div className="p-8 bg-white border-b">
            <SheetHeader className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={`${getActionColor(log.action_type)} text-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-tighter`}>
                  {log.action_type}
                </Badge>
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-bold">{format(new Date(log.created_at), 'PPP p')}</span>
                </div>
              </div>
              <div>
                <SheetTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                  <History className="h-6 w-6 text-slate-400" />
                  Audit Trail Details
                </SheetTitle>
                <SheetDescription className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                  Transaction ID: {log.id}
                </SheetDescription>
              </div>
            </SheetHeader>
          </div>

          <ScrollArea className="flex-1 p-8">
            <div className="space-y-8">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-1">
                    <User className="h-3 w-3" /> Performed By
                  </div>
                  <p className="text-sm font-bold text-slate-900">{log.user_email || 'System'}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 mb-1">
                    <Database className="h-3 w-3" /> Target Table
                  </div>
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">{log.table_name}</p>
                </div>
              </div>

              {/* Data Comparison */}
              <div className="space-y-6">
                {log.old_data && (
                  <JsonView data={log.old_data} title="Previous State" />
                )}
                
                {log.old_data && log.new_data && (
                  <div className="flex justify-center">
                    <div className="bg-white p-2 rounded-full shadow-sm border border-slate-100">
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                )}

                {log.new_data && (
                  <JsonView data={log.new_data} title={log.action_type === 'INSERT' ? 'Inserted Data' : 'New State'} />
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="p-6 bg-white border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px] font-black uppercase text-slate-400">Status: Verified Log</span>
            </div>
            <button 
              onClick={() => onOpenChange(false)}
              className="text-[10px] font-black uppercase tracking-widest text-slate-900 hover:underline"
            >
              Close Details
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};