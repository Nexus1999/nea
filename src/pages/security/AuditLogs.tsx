"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, Download, Clock, Database, User, RefreshCw, Eye, History, Filter
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import Spinner from "@/components/Spinner";
import { cn } from "@/lib/utils";
import { AuditLogDetailsDrawer } from "@/components/audit/AuditLogDetailsDrawer";
import PaginationControls from "@/components/ui/pagination-controls";

const AuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    document.title = "Security - Audit Logs | NEAS";
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('datachange_logs')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action?.toUpperCase()) {
      case 'INSERT': return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case 'UPDATE': return "bg-blue-50 text-blue-700 border-blue-100";
      case 'DELETE': return "bg-rose-50 text-rose-700 border-rose-100";
      case 'IMPORT': return "bg-purple-50 text-purple-700 border-purple-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const filteredLogs = logs.filter(log => 
    log.table_name.toLowerCase().includes(search.toLowerCase()) ||
    log.action_type.toLowerCase().includes(search.toLowerCase()) ||
    log.changed_by?.toLowerCase().includes(search.toLowerCase()) ||
    log.record_id?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="w-full relative min-h-[600px] border-none shadow-sm">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-lg">
            <Spinner label="Fetching logs..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Audit Logs</CardTitle>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">System Activity & Data Changes</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 rounded-xl border-slate-200 gap-2"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 rounded-xl border-slate-200 gap-2"
              disabled={loading || logs.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by table, action, user or ID..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 h-10 rounded-xl border-slate-200 focus:ring-slate-100"
                disabled={loading}
              />
            </div>
            <Button variant="ghost" size="sm" className="text-slate-500 gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-b border-slate-200">
                  <TableHead className="w-[180px] text-[10px] font-black uppercase text-slate-500">Timestamp</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">User</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Action</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Table</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Record ID</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 px-6">Details</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentLogs.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      No audit logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/30 border-b border-slate-100 transition-colors">
                      <TableCell className="text-xs font-mono text-slate-500">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-slate-300" />
                          {format(new Date(log.changed_at), 'yyyy-MM-dd HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-bold text-slate-700">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">
                            {log.changed_by?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          {log.changed_by || 'System'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("font-bold text-[9px] uppercase tracking-wider border-2", getActionColor(log.action_type))}>
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                          <Database className="h-3 w-3 text-slate-300" />
                          {log.table_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-slate-400">
                        {log.record_id}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-lg border-slate-200 hover:border-slate-900 transition-all"
                          onClick={() => handleViewDetails(log)}
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <AuditLogDetailsDrawer 
        open={isDrawerOpen} 
        onOpenChange={setIsDrawerOpen} 
        log={selectedLog} 
      />
    </div>
  );
};

export default AuditLogs;