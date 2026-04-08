"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Lock, Search, PlusCircle, Filter, 
  CheckCircle2, Shield, Settings, Database, 
  Users, RefreshCw, Edit, Trash2, ShieldCheck,
  LayoutGrid, List
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { showStyledSwal } from '@/utils/alerts';
import Spinner from "@/components/Spinner";
import PermissionFormDrawer from "@/components/security/PermissionFormDrawer";
import AssignPermissionsDrawer from "@/components/security/AssignPermissionsDrawer";
import RoleMatrix from "@/components/security/RoleMatrix";
import { cn } from "@/lib/utils";

const Permissions = () => {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  
  // Drawer states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<any>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('name');

      if (error) throw error;
      setPermissions(data || []);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (permission: any) => {
    const result = await showStyledSwal({
      title: 'Delete Permission?',
      html: `Are you sure you want to delete <b>${permission.name}</b>? This will remove it from all assigned roles.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      confirmButtonColor: '#ef4444',
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('permissions')
          .delete()
          .eq('id', permission.id);
        
        if (error) throw error;
        showSuccess("Permission deleted");
        fetchPermissions();
      } catch (err: any) {
        showError(err.message);
      }
    }
  };

  const getModuleIcon = (name: string) => {
    const module = name.split(':')[0];
    switch (module) {
      case 'Security': return <Shield className="h-3 w-3" />;
      case 'Master Summaries': return <Database className="h-3 w-3" />;
      case 'Settings': return <Settings className="h-3 w-3" />;
      case 'Reports': return <List className="h-3 w-3" />;
      default: return <Lock className="h-3 w-3" />;
    }
  };

  const getModuleColor = (name: string) => {
    const module = name.split(':')[0];
    switch (module) {
      case 'Security': return "bg-blue-50 text-blue-700 border-blue-100";
      case 'Master Summaries': return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case 'Settings': return "bg-orange-50 text-orange-700 border-orange-100";
      case 'Reports': return "bg-purple-50 text-purple-700 border-purple-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const modules = ["all", ...new Set(permissions.map(p => p.name.split(':')[0]))];

  const filteredPermissions = permissions.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesModule = moduleFilter === "all" || p.name.startsWith(`${moduleFilter}:`);
    return matchesSearch && matchesModule;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Permissions</h2>
          <p className="text-muted-foreground mt-1">Role-based access control — manage and assign permissions to roles.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsAssignOpen(true)}
            className="h-11 rounded-xl border-slate-200 gap-2 px-6"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Assign to Role
          </Button>
          <Button 
            onClick={() => { setSelectedPermission(null); setIsFormOpen(true); }}
            className="bg-black hover:bg-gray-800 text-white gap-2 h-11 rounded-xl px-6"
          >
            <PlusCircle className="h-4 w-4" />
            Add Permission
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-slate-100 p-1 rounded-xl h-11">
            <TabsTrigger value="list" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <List className="h-4 w-4 mr-2" />
              Permissions List
            </TabsTrigger>
            <TabsTrigger value="matrix" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Role Matrix
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={fetchPermissions} 
              disabled={loading}
              className="h-10 w-10 rounded-xl"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        <TabsContent value="list" className="space-y-4 mt-0">
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
              <div className="flex items-center gap-2 ml-4">
                <Filter className="h-4 w-4 text-slate-400" />
                <select 
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-100"
                >
                  {modules.map(m => (
                    <option key={m} value={m}>{m === "all" ? "All Modules" : m}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-20 flex justify-center"><Spinner label="Loading permissions..." /></div>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[40px] font-bold text-[10px] uppercase tracking-widest text-slate-500">S/N</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Permission Key</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Module</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Description</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Status</TableHead>
                        <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest text-slate-500">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPermissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-20 text-slate-400 text-sm">
                            No permissions found matching your criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPermissions.map((perm, index) => (
                          <TableRow key={perm.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="text-[11px] font-medium text-slate-400">{index + 1}</TableCell>
                            <TableCell>
                              <code className="px-2 py-1 bg-slate-100 rounded text-[11px] font-mono font-bold text-indigo-600 border border-indigo-100/50">
                                {perm.name}
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("gap-1.5 font-bold text-[10px] uppercase tracking-wider border-2", getModuleColor(perm.name))}>
                                {getModuleIcon(perm.name)}
                                {perm.name.split(':')[0]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 max-w-[300px] truncate">
                              {perm.description || `Access to ${perm.name}`}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[11px] uppercase tracking-wider">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Active
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button 
                                  variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                  onClick={() => { setSelectedPermission(perm); setIsFormOpen(true); }}
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600"
                                  onClick={() => handleDelete(perm)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
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
        </TabsContent>

        <TabsContent value="matrix" className="mt-0">
          <RoleMatrix />
        </TabsContent>
      </Tabs>

      <PermissionFormDrawer 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        permission={selectedPermission} 
        onSuccess={fetchPermissions} 
      />

      <AssignPermissionsDrawer 
        open={isAssignOpen} 
        onOpenChange={setIsAssignOpen} 
        onSuccess={fetchPermissions} 
      />
    </div>
  );
};

export default Permissions;