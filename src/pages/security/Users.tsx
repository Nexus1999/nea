"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, Edit, Trash2, UserPlus, 
  Shield, Mail, CheckCircle2, XCircle, Lock, Eye, 
  UserX, UserCheck, ShieldAlert, ShieldCheck, KeyRound
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
import { logChange } from "@/utils/audit";
import { cn } from "@/lib/utils";

const Users = () => {
  const navigate = useNavigate();
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

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
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
              placeholder="Search users..." 
              className="pl-10 h-11 rounded-xl border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-20 flex justify-center"><Spinner label="Loading users..." /></div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">User</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Role</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest">Status</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                            {user.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{user.username}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] uppercase tracking-wider">
                          <Shield className="h-3 w-3 mr-1" />
                          {user.roles?.name || 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "font-bold text-[10px] uppercase tracking-wider",
                          (user.status || 'active') === 'blocked' ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        )}>
                          {(user.status || 'active') === 'blocked' ? <ShieldAlert className="h-3 w-3 mr-1" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
                          {user.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" size="icon" className="h-9 w-9 text-blue-600 hover:bg-blue-50"
                            onClick={() => navigate(`/dashboard/security/users/${user.id}`)}
                            title="View Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" size="icon" className="h-9 w-9 text-slate-600 hover:bg-slate-100"
                            onClick={() => { setSelectedUser(user); setIsFormOpen(true); }}
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" size="icon" 
                            className={cn("h-9 w-9", (user.status || 'active') === 'blocked' ? "text-emerald-600 hover:bg-emerald-50" : "text-orange-600 hover:bg-orange-50")}
                            onClick={() => handleToggleStatus(user)}
                            title={(user.status || 'active') === 'blocked' ? "Activate User" : "Block User"}
                          >
                            {(user.status || 'active') === 'blocked' ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                          </Button>
                          <Button 
                            variant="ghost" size="icon" className="h-9 w-9 text-orange-600 hover:bg-orange-50"
                            onClick={() => { setSelectedUser(user); setIsPasswordModalOpen(true); }}
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" size="icon" className="h-9 w-9 text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteUser(user)}
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserForm open={isFormOpen} onOpenChange={setIsFormOpen} user={selectedUser} onSuccess={fetchUsers} />
      <ChangePasswordModal open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen} user={selectedUser} />
    </div>
  );
};

export default Users;