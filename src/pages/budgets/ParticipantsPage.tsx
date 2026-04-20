"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Plus, 
  Search, 
  UserPlus, 
  Shield, 
  Truck, 
  UserCheck,
  MoreVertical,
  Trash2,
  Edit2
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";

const ParticipantsPage = () => {
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setParticipants(data || []);
    } catch (err: any) {
      showError("Failed to load participants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'police_officer': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'driver': return <Truck className="w-4 h-4 text-amber-500" />;
      case 'examination_officer': return <UserCheck className="w-4 h-4 text-emerald-500" />;
      default: return <Users className="w-4 h-4 text-slate-400" />;
    }
  };

  const filtered = participants.filter(p => 
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" label="Loading HR Database..." /></div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
              <span>Workforce Management</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span>HR Layer</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              Participants Registry
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search staff..." 
              className="pl-10 h-11 w-64 rounded-xl border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button className="rounded-xl h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest gap-2">
            <UserPlus className="w-4 h-4" /> Add Participant
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="pl-8 text-[9px] font-black uppercase tracking-widest">Full Name</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest">Role</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest">Rank / Level</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest">Status</TableHead>
              <TableHead className="text-right pr-8 text-[9px] font-black uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                    <Users className="w-12 h-12" />
                    <p className="font-bold uppercase text-xs tracking-widest">No participants found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50/30 group">
                  <TableCell className="pl-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">
                        {p.full_name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <span className="font-black text-slate-900 uppercase text-xs tracking-tight">{p.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(p.role)}
                      <span className="text-[10px] font-bold uppercase text-slate-600">{p.role.replace(/_/g, ' ')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-slate-200">
                      {p.rank || 'STANDARD'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${p.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="text-[10px] font-bold uppercase text-slate-500">{p.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default ParticipantsPage;