"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, Download, RefreshCw, Eye, History 
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

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.table_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.action_type?.toLowerCase().includes(search.toLowerCase()) ||
      log.changed_by?.toLowerCase().includes(search.toLowerCase()) ||
      log.record_id?.toString().toLowerCase().includes(search.toLowerCase())
    );
  }, [logs, search]);

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
    <>
      <Card className="w-full relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
            <Spinner label="Loading audit logs..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-2xl font-bold">Audit Logs</CardTitle>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button 
              variant="outline"
              disabled={logs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by table, action, user or record ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 h-10"
              />
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[60px]">SN</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No audit logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentLogs.map((log, index) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground font-medium">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-slate-600">
                        {format(new Date(log.changed_at), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">
                            {log.changed_by?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <span className="font-medium">{log.changed_by || 'System'}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className={cn("font-medium text-xs uppercase tracking-wider border", getActionColor(log.action_type))}>
                          {log.action_type}
                        </Badge>
                      </TableCell>

                      <TableCell className="font-medium text-slate-700">
                        {log.table_name}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-slate-500">
                        {log.record_id}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          onClick={() => handleViewDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && totalPages > 1 && (
            <div className="mt-4">
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
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        log={selectedLog} 
      />
    </>
  );
};

export default AuditLogs;