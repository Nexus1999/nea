"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, Search, Download, Filter, 
  User, Clock, Globe, Activity 
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
import { cn } from "@/lib/utils";

const AuditLogs = () => {
  const [search, setSearch] = useState('');

  const logs = [
    { id: 1, user: "admin_john", action: "LOGIN", module: "Auth", ip: "192.168.1.1", timestamp: "2024-03-20 10:30:45", status: "Success" },
    { id: 2, user: "editor_sarah", action: "UPLOAD_SUMMARY", module: "Data", ip: "192.168.1.42", timestamp: "2024-03-20 11:15:22", status: "Success" },
    { id: 3, user: "admin_john", action: "DELETE_USER", module: "Security", ip: "192.168.1.1", timestamp: "2024-03-20 12:05:10", status: "Warning" },
    { id: 4, user: "unknown", action: "FAILED_LOGIN", module: "Auth", ip: "45.12.33.102", timestamp: "2024-03-20 13:45:00", status: "Failed" },
    { id: 5, user: "system", action: "BACKUP_COMPLETED", module: "System", ip: "localhost", timestamp: "2024-03-20 14:00:00", status: "Success" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Success': return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case 'Warning': return "bg-orange-50 text-orange-700 border-orange-100";
      case 'Failed': return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Audit Logs</h2>
          <p className="text-muted-foreground mt-1">Track all system activities and administrative actions.</p>
        </div>
        <Button variant="outline" className="border-slate-200 gap-2 h-11 rounded-xl">
          <Download className="h-4 w-4" />
          Export Logs
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search logs by user, action or IP..." 
              className="pl-10 h-11 rounded-xl border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 ml-4">
            <Button variant="outline" className="h-11 rounded-xl border-slate-200 gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">Timestamp</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">User</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">Action</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">Module</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">IP Address</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-xs font-mono text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {log.timestamp}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-bold text-gray-900">
                        <User className="h-3 w-3 text-slate-400" />
                        {log.user}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none font-bold text-[10px] uppercase tracking-tighter">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-gray-600">{log.module}</TableCell>
                    <TableCell className="text-xs font-mono text-gray-500">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        {log.ip}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("font-bold text-[10px] uppercase tracking-wider", getStatusColor(log.status))}>
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;