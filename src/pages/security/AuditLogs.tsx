"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, Download, Filter, 
  User, Clock, Database, Activity, RefreshCw
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

const AuditLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('datachange_logs')
        .select(`
          *,
          profiles:changed_by (username, first_name, last_name)
        `)
        .order('changed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case 'UPDATE': return "bg-blue-50 text-blue-700 border-blue-100";
      case 'DELETE': return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const filteredLogs = logs.filter(log => 
    log.table_name.toLowerCase().includes(search.toLowerCase()) ||
    log.action_type.toLowerCase().includes(search.toLowerCase()) ||
    log.profiles?.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Audit Logs</h2>
          <p className="text-muted-foreground mt-1">Track all data modifications across the system.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} className="rounded-xl h-11">
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" className="border-slate-200 gap-2 h-11 rounded-xl">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search by table, action, or user..." 
              className="pl-10 h-11 rounded-xl border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-20 flex justify-center"><Spinner label="Fetching logs..." /></div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Timestamp</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">User</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Action</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Table</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Record ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-gray-500">No logs found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-xs font-mono text-gray-500">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.changed_at), 'yyyy-MM-dd HH:mm:ss')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 font-bold text-gray-900">
                            <User className="h-3 w-3 text-slate-400" />
                            {log.profiles?.username || 'System'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("font-bold text-[10px] uppercase tracking-wider", getActionColor(log.action_type))}>
                            {log.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                            <Database className="h-3 w-3 text-slate-400" />
                            {log.table_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-slate-400">
                          {log.record_id}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;