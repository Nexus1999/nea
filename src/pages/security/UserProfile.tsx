"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Shield, Mail, User, Calendar, 
  Activity, CheckCircle2, XCircle, Edit, Lock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchUserDetails();
  }, [id]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          roles (name, description)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setUser(data);
    } catch (err: any) {
      showError(err.message);
      navigate('/dashboard/security/users');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><Spinner label="Loading profile..." /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">User Profile</h2>
          <p className="text-muted-foreground mt-1">Detailed information for {user.username}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 border-none shadow-sm overflow-hidden">
          <div className="h-32 bg-gradient-to-br from-slate-800 to-black" />
          <CardContent className="relative pt-0">
            <div className="flex flex-col items-center -mt-12">
              <div className="h-24 w-24 rounded-2xl bg-white p-1 shadow-lg">
                <div className="h-full w-full rounded-xl bg-slate-100 flex items-center justify-center text-3xl font-bold text-slate-600">
                  {user.username?.charAt(0).toUpperCase()}
                </div>
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900">{user.first_name} {user.last_name}</h3>
              <p className="text-sm text-gray-500">@{user.username}</p>
              
              <Badge className={cn(
                "mt-4 font-bold text-[10px] uppercase tracking-wider px-3 py-1",
                user.status === 'blocked' ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"
              )}>
                {user.status === 'blocked' ? "Blocked" : "Active Account"}
              </Badge>
            </div>

            <div className="mt-8 space-y-4 border-t pt-6">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-gray-600">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-slate-400" />
                <span className="font-semibold text-indigo-600">{user.roles?.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-gray-500">Joined {new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">First Name</p>
                <p className="font-medium text-gray-900">{user.first_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Last Name</p>
                <p className="font-medium text-gray-900">{user.last_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Username</p>
                <p className="font-medium text-gray-900">{user.username}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Email Address</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-600" />
                Role & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900">{user.roles?.name}</span>
                  <Badge variant="outline" className="bg-white">System Role</Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {user.roles?.description || "This role has standard system access permissions."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;