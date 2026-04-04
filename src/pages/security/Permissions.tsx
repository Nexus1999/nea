"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Lock, Search, PlusCircle, Filter, 
  CheckCircle2, Shield, Settings, Database, Users 
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

const Permissions = () => {
  const [search, setSearch] = useState('');

  const permissions = [
    { id: 1, name: "users.view", module: "Security", description: "View user list and profiles", status: "Active" },
    { id: 2, name: "users.create", module: "Security", description: "Create new system users", status: "Active" },
    { id: 3, name: "mastersummaries.upload", module: "Data", description: "Upload new master summaries", status: "Active" },
    { id: 4, name: "mastersummaries.delete", module: "Data", description: "Delete existing master summaries", status: "Active" },
    { id: 5, name: "settings.manage", module: "System", description: "Modify system-wide settings", status: "Active" },
    { id: 6, name: "audit.view", module: "Security", description: "View system audit logs", status: "Active" },
  ];

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'Security': return <Shield className="h-3 w-3" />;
      case 'Data': return <Database className="h-3 w-3" />;
      case 'System': return <Settings className="h-3 w-3" />;
      default: return <Lock className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Permissions</h2>
          <p className="text-muted-foreground mt-1">Granular access control for system features.</p>
        </div>
        <Button className="bg-black hover:bg-gray-800 text-white gap-2">
          <PlusCircle className="h-4 w-4" />
          Add Permission
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search permissions..." 
              className="pl-10 h-11 rounded-xl border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="ml-4 h-11 rounded-xl border-slate-200 gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">Permission Key</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">Module</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">Description</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-widest">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((perm) => (
                  <TableRow key={perm.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <code className="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-bold text-indigo-600">
                        {perm.name}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1.5 font-bold text-[10px] uppercase tracking-wider">
                        {getModuleIcon(perm.module)}
                        {perm.module}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{perm.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                        {perm.status}
                      </div>
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

export default Permissions;