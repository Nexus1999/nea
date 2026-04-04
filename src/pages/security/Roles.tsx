"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, PlusCircle, Search, Edit, Trash2, 
  Lock, Users, ChevronRight, AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { showStyledSwal } from '@/utils/alerts';
import Spinner from "@/components/Spinner";
import RoleForm from "@/components/security/RoleForm";

const Roles = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);

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

  const handleDeleteRole = async (role: any) => {
    const result = await showStyledSwal({
      title: 'Delete Role?',
      html: `Are you sure you want to delete the role <b>${role.name}</b>? This may affect users assigned to this role.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('roles').delete().eq('id', role.id);
        if (error) throw error;
        showSuccess("Role deleted successfully");
        fetchRoles();
      } catch (err: any) {
        showError(err.message);
      }
    }
  };

  const filteredRoles = roles.filter(r => 
    r.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Roles & Access</h2>
          <p className="text-muted-foreground mt-1">Define and manage system access roles.</p>
        </div>
        <Button onClick={handleAddRole} className="bg-black hover:bg-gray-800 text-white gap-2 h-11 rounded-xl px-6">
          <PlusCircle className="h-4 w-4" />
          Create New Role
        </Button>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search roles..." 
              className="pl-10 h-11 rounded-xl border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-20 flex justify-center">
              <Spinner label="Loading roles..." />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRoles.length === 0 ? (
                <div className="col-span-full py-20 text-center text-slate-500">
                  No roles found.
                </div>
              ) : (
                filteredRoles.map((role) => (
                  <Card key={role.id} className="border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                          <Shield className="h-6 w-6" />
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-blue-600"
                            onClick={() => handleEditRole(role)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                            onClick={() => handleDeleteRole(role)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{role.name}</h3>
                      <p className="text-sm text-gray-500 mb-6 line-clamp-2 min-h-[40px]">
                        {role.description || "No description provided for this role."}
                      </p>
                      
                      <div className="space-y-3 pt-4 border-t border-slate-50">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium flex items-center gap-1">
                            <Users className="h-3 w-3" /> Created On
                          </span>
                          <span className="font-bold text-gray-900">
                            {new Date(role.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <Button variant="outline" className="w-full mt-6 rounded-xl border-slate-200 group-hover:bg-black group-hover:text-white transition-colors">
                        Manage Permissions
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <RoleForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        role={selectedRole} 
        onSuccess={fetchRoles} 
      />
    </div>
  );
};

export default Roles;