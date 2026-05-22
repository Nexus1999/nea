"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search, Edit, Trash2, UserPlus, Eye, UserX, UserCheck,
  KeyRound, ShieldAlert, ShieldCheck, Shield
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
import { showStyledSwal } from '@/utils/alerts';
import { cn } from "@/lib/utils";

import Spinner from "@/components/Spinner";
import UserForm from "@/components/security/UserForm";
import ChangePasswordModal from "@/components/security/ChangePasswordModal";
import { logChange } from "@/utils/audit";
import PaginationControls from "@/components/ui/pagination-controls";

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, username, email, first_name, last_name, role_id, status,
          roles (name)
        `)
        .order('username');

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: any) => {
    const currentStatus = user.status || 'active';
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    const actionText = newStatus === 'active' ? 'Activate' : 'Block';

    const result = await showStyledSwal({
      title: `${actionText} User?`,
      text: `Are you sure you want to ${actionText.toLowerCase()} ${user.username}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionText}!`,
      confirmButtonColor: newStatus === 'active' ? '#10b981' : '#ef4444',
    });

    if (result.isConfirmed) {
      try {
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: {
            action: 'TOGGLE_USER_STATUS',
            userData: { userId: user.id, status: newStatus }
          }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        await logChange({
          tableName: 'profiles',
          recordId: user.id,
          actionType: 'UPDATE',
          oldData: { status: currentStatus },
          newData: { status: newStatus }
        });

        showSuccess(`User ${newStatus === 'active' ? 'activated' : 'blocked'} successfully`);
        fetchUsers();
      } catch (err: any) {
        showError(err.message);
      }
    }
  };

  const handleDeleteUser = async (user: any) => {
    const result = await showStyledSwal({
      title: 'Delete User?',
      html: `Are you sure you want to delete <b>${user.username}</b>? This will permanently remove their access.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete account',
      confirmButtonColor: '#d32f2f',
    });

    if (result.isConfirmed) {
      try {
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: { action: 'DELETE_USER', userData: { userId: user.id } }
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        await logChange({
          tableName: 'profiles',
          recordId: user.id,
          actionType: 'DELETE',
          oldData: user
        });

        showSuccess("User account deleted");
        fetchUsers();
      } catch (err: any) {
        showError(err.message);
      }
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentData = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      <Card className="w-full relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
            <Spinner label="Loading users..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-2xl font-bold">User Management</CardTitle>
          <Button
            onClick={() => { 
              setSelectedUser(null); 
              setIsFormOpen(true); 
            }}
            className="bg-black hover:bg-gray-800"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add New User
          </Button>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Search users by username or email..."
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
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-muted-foreground font-medium">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                            {user.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.username}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-medium">
                          <Shield className="h-3.5 w-3.5 mr-1" />
                          {user.roles?.name || 'User'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge className={cn(
                          "font-medium text-xs uppercase tracking-wider border",
                          (user.status || 'active') === 'blocked'
                            ? "bg-red-100 text-red-700 border-red-200"
                            : "bg-emerald-100 text-emerald-700 border-emerald-200"
                        )}>
                          {(user.status || 'active') === 'blocked' ? (
                            <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                          )}
                          {user.status || 'active'}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                            title="View Profile"
                            onClick={() => navigate(`/dashboard/security/users/${user.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                            title="Edit User"
                            onClick={() => { 
                              setSelectedUser(user); 
                              setIsFormOpen(true); 
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8",
                              (user.status || 'active') === 'blocked'
                                ? "text-emerald-600 hover:bg-emerald-50"
                                : "text-orange-600 hover:bg-orange-50"
                            )}
                            onClick={() => handleToggleStatus(user)}
                            title={(user.status || 'active') === 'blocked' ? "Activate User" : "Block User"}
                          >
                            {(user.status || 'active') === 'blocked' ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:bg-orange-50"
                            title="Reset Password"
                            onClick={() => { 
                              setSelectedUser(user); 
                              setIsPasswordModalOpen(true); 
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                            title="Delete User"
                            onClick={() => handleDeleteUser(user)}
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

      {/* Updated UserForm Drawer */}
      <UserForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      <ChangePasswordModal
        open={isPasswordModalOpen}
        onOpenChange={setIsPasswordModalOpen}
        user={selectedUser}
      />
    </>
  );
};

export default Users;