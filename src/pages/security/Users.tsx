"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, Edit, Trash2, UserPlus, 
  Shield, Mail, CheckCircle2, XCircle, Lock, Ban, Unlock
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
import Spinner from "@/components/Spinner";
import UserForm from "@/components/security/UserForm";
import ChangePasswordModal from "@/components/security/ChangePasswordModal";
import { cn } from "@/lib/utils";

const Users = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          email,
          first_name,
          last_name,
          role_id,
          is_blocked,
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

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleToggleBlock = async (user: any) => {
    const action = user.is_blocked ? 'ACTIVATE_USER' : 'BLOCK_USER';
    const actionLabel = user.is_blocked ? 'Activate' : 'Block';
    
    const result = await showStyledSwal({
      title: `${actionLabel} User?`,
      text: `Are you sure you want to ${actionLabel.toLowerCase()} ${user.username}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionLabel}`,
    });

    if (result.isConfirmed) {
      try {
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: { action, userData: { userId: user.id } }
        });
        if (error) throw error;
        showSuccess(`User ${actionLabel.toLowerCase()}ed successfully`);
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
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d32f2f',
    });

    if (result.isConfirmed) {
      try {
        const { data, error } = await supabase.functions.invoke('manage-users', {
          body: { action: 'DELETE_USER', userData: { userId: user.id } }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        showSuccess("User account deleted");
        fetchUsers();
      } catch (err: any) {
        showError(err.message);
      }
    }
  };

  const handleResetPassword = (user: any) => {
    setSelectedUser(user);
    setIsPasswordModalOpen(true);
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">User Management</h2>
          <p className="text-muted-foreground mt-1">Manage system users and their access levels.</p>
        </div>
        <Button onClick={() => { setSelectedUser(null); setIsFormOpen(true); }} className="bg-black hover:bg-gray-800 text-white gap-2 h-11 rounded-xl px-6">
          <UserPlus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search users by name or email..." 
              className="pl-10 h-11 rounded-xl border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-20 flex justify-center">
              <Spinner label="Loading users..." />
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">User</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Full Name</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Role</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Status</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id} className={cn("hover:bg-slate-50/50 transition-colors", user.is_blocked && "bg-red-50/30")}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold">
                              {user.username?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{user.username}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-700">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] uppercase tracking-wider">
                            <Shield className="h-3 w-3 mr-1" />
                            {user.roles?.name || 'User'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.is_blocked ? (
                            <div className="flex items-center gap-1.5 text-red-600 font-bold text-xs">
                              <Ban className="h-4 w-4" />
                              Blocked
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                              <CheckCircle2 className="h-4 w-4" />
                              Active
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                              title="Edit User"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn("h-8 w-8", user.is_blocked ? "text-emerald-600 hover:bg-emerald-50" : "text-orange-600 hover:bg-orange-50")}
                              title={user.is_blocked ? "Activate User" : "Block User"}
                              onClick={() => handleToggleBlock(user)}
                            >
                              {user.is_blocked ? <Unlock className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-600 hover:bg-slate-50"
                              title="Reset Password"
                              onClick={() => handleResetPassword(user)}
                            >
                              <Lock className="h-4 w-4" />
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
          )}
        </CardContent>
      </Card>

      <UserForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        onSuccess={fetchUsers} 
        user={selectedUser}
      />

      <ChangePasswordModal 
        open={isPasswordModalOpen} 
        onOpenChange={setIsPasswordModalOpen} 
        user={selectedUser} 
      />
    </div>
  );
};

export default Users;