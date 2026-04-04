"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, PlusCircle, Search, Edit, Trash2, 
  Lock, Users, ChevronRight 
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
import { showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";

const Roles = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*');

      if (error) throw error;
      setRoles(data || []);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
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
        <Button className="bg-black hover:bg-gray-800 text-white gap-2">
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
              {filteredRoles.map((role) => (
                <Card key={role.id} className="border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                        <Shield className="h-6 w-6" />
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{role.name}</h3>
                    <p className="text-sm text-gray-500 mb-6">Full administrative access to all system modules and settings.</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium flex items-center gap-1">
                          <Users className="h-3 w-3" /> Assigned Users
                        </span>
                        <span className="font-bold text-gray-900">12</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium flex items-center gap-1">
                          <Lock className="h-3 w-3" /> Permissions
                        </span>
                        <span className="font-bold text-gray-900">All</span>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full mt-6 rounded-xl border-slate-200 group-hover:bg-black group-hover:text-white transition-colors">
                      Manage Permissions
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Roles;