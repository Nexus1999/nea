"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, PlusCircle, Search, Edit, Trash2, 
  ShieldCheck 
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
import { showError, showSuccess } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import PermissionFormDrawer from "@/components/security/PermissionFormDrawer";
import AssignPermissionsDrawer from "@/components/security/AssignPermissionsDrawer";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import PaginationControls from "@/components/ui/pagination-controls";

const Permissions = () => {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<any>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Confirm Dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    title: '',
    message: '',
    onConfirm: () => {},
  });

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

  const handleDelete = (permission: any) => {
    setConfirmConfig({
      title: 'Delete Permission?',
      message: `Are you sure you want to delete <b>${permission.name}</b>?`,
      onConfirm: async () => {
        setConfirmOpen(false);
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
    });
    setConfirmOpen(true);
  };

  const getModuleIcon = (name: string) => {
    const module = name.split(':')[0];
    switch (module) {
      case 'Security': return <Shield className="h-3 w-3" />;
      case 'Master Summaries': return <Shield className="h-3 w-3" />;
      case 'Stationery': return <Shield className="h-3 w-3" />;
      case 'Settings': return <Shield className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  const getModuleColor = (name: string) => {
    const module = name.split(':')[0];
    switch (module) {
      case 'Security': return "bg-blue-50 text-blue-700 border-blue-100";
      case 'Master Summaries': return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case 'Stationery': return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case 'Settings': return "bg-orange-50 text-orange-700 border-orange-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const modules = ["all", ...new Set(permissions.map(p => p.name.split(':')[0]))];

  const filteredPermissions = useMemo(() => {
    return permissions.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
      const matchesModule = moduleFilter === "all" || p.name.startsWith(`${moduleFilter}:`);
      return matchesSearch && matchesModule;
    });
  }, [permissions, search, moduleFilter]);

  const totalPages = Math.ceil(filteredPermissions.length / itemsPerPage);
  const currentData = filteredPermissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      <Card className="w-full relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
            <Spinner label="Loading permissions..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-2xl font-bold">Permissions Management</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsAssignOpen(true)}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Assign to Role
            </Button>

            <Button 
              onClick={() => { setSelectedPermission(null); setIsFormOpen(true); }}
              className="bg-black hover:bg-gray-800"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Permission
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search permissions..." 
                className="pl-10 h-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <select 
                value={moduleFilter}
                onChange={(e) => {
                  setModuleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm focus:ring-2 focus:ring-slate-200"
              >
                {modules.map(m => (
                  <option key={m} value={m}>
                    {m === "all" ? "All Modules" : m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[60px]">SN</TableHead>
                  <TableHead>Permission Key</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No permissions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((perm, index) => (
                    <TableRow key={perm.id}>
                      <TableCell className="text-muted-foreground font-medium">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </TableCell>

                      <TableCell>
                        <code className="px-2.5 py-1 bg-slate-100 rounded text-xs font-mono font-bold text-indigo-600">
                          {perm.name}
                        </code>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1.5 font-medium text-xs uppercase tracking-wider border", getModuleColor(perm.name))}>
                          {getModuleIcon(perm.name)}
                          {perm.name.split(':')[0]}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-sm text-gray-600 max-w-md">
                        {perm.description || `Access to ${perm.name}`}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                            onClick={() => { setSelectedPermission(perm); setIsFormOpen(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(perm)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* Drawers */}
      <PermissionFormDrawer 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        permission={selectedPermission} 
        onSuccess={fetchPermissions} 
      />

      <AssignPermissionsDrawer 
        isOpen={isAssignOpen} 
        onClose={() => setIsAssignOpen(false)} 
        onSuccess={fetchPermissions} 
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={true}
        confirmText="Yes, delete it!"
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
};

export default Permissions;