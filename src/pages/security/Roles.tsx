"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, PlusCircle, Search, Edit, Trash2, Users 
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
import RoleForm from "@/components/security/RoleForm";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import PaginationControls from "@/components/ui/pagination-controls";

const Roles = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

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
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = () => {
    setSelectedRole(null);
    setIsFormOpen(true);
  };

  const handleEditRole = (role: any) => {
    setSelectedRole(role);
    setIsFormOpen(true);
  };

  const handleDeleteRole = (role: any) => {
    setConfirmConfig({
      title: 'Delete Role?',
      message: `Are you sure you want to delete the role <b>${role.name}</b>? This may affect users assigned to this role.`,
      onConfirm: async () => {
        setConfirmOpen(false);
        try {
          const { error } = await supabase.from('roles').delete().eq('id', role.id);
          if (error) throw error;
          showSuccess("Role deleted successfully");
          fetchRoles();
        } catch (err: any) {
          showError(err.message);
        }
      }
    });
    setConfirmOpen(true);
  };

  const filteredRoles = useMemo(() => {
    return roles.filter(r => 
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [roles, search]);

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const currentData = filteredRoles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      <Card className="w-full relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
            <Spinner label="Loading roles..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-2xl font-bold">Roles Management</CardTitle>
          <Button
            onClick={handleAddRole}
            className="bg-black hover:bg-gray-800"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Role
          </Button>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Search roles..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-md"
            />
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[60px]">SN</TableHead>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No roles found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((role, index) => (
                    <TableRow key={role.id}>
                      <TableCell className="text-muted-foreground font-medium">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                            <Shield className="h-5 w-5" />
                          </div>
                          <div className="font-semibold text-gray-900">{role.name}</div>
                        </div>
                      </TableCell>

                      <TableCell className="text-gray-600 max-w-md">
                        {role.description || <span className="text-muted-foreground italic">No description</span>}
                      </TableCell>

                      <TableCell className="text-sm text-gray-500">
                        {new Date(role.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                            onClick={() => handleEditRole(role)}
                            title="Edit Role"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteRole(role)}
                            title="Delete Role"
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

      <RoleForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        role={selectedRole} 
        onSuccess={fetchRoles} 
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

export default Roles;