"use client";

import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  User, 
  MapPin, 
  Building2, 
  Phone, 
  Hash, 
  GraduationCap, 
  Calendar,
  Briefcase,
  CreditCard,
  ShieldCheck,
  Loader2,
  History,
  ExternalLink
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TeacherDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string | null;
}

export const TeacherDetailsDrawer = ({ open, onOpenChange, teacherId }: TeacherDetailsDrawerProps) => {
  const [teacher, setTeacher] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && teacherId) {
      fetchTeacherDetails();
    }
  }, [open, teacherId]);

  const fetchTeacherDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('primaryteachers')
        .select(`
          *,
          regions:region_code (region_name),
          districts:district_number (district_name)
        `)
        .eq('id', teacherId)
        .single();

      if (error) throw error;
      setTeacher(data);

      // Fetch Job History
      const { data: historyData } = await supabase
        .from('teacher_assignments')
        .select(`
          id,
          assigned_at,
          jobassignments (
            name,
            section,
            status
          )
        `)
        .eq('teacher_id', teacherId)
        .order('assigned_at', { ascending: false });
      
      setHistory(historyData || []);
    } catch (err) {
      console.error("Error fetching teacher details:", err);
    } finally {
      setLoading(false);
    }
  };

  const DetailItem = ({ icon: Icon, label, value, className }: any) => (
    <div className={cn("flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100", className)}>
      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-sm font-bold text-slate-900">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[800px] p-0 flex flex-col bg-white overflow-hidden">
        <div className="px-8 py-8 border-b bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <SheetHeader className="relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center shadow-2xl ring-4 ring-white/10">
                <User className="h-10 w-10 text-white" />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-2xl font-black uppercase tracking-tight text-white">
                  {loading ? 'Loading...' : teacher?.teacher_name}
                </SheetTitle>
                <div className="flex items-center gap-3 mt-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    teacher?.sex === 'M' ? "bg-blue-500/30 text-blue-100" : "bg-pink-500/30 text-pink-100"
                  )}>
                    {teacher?.sex === 'M' ? 'Male' : 'Female'}
                  </span>
                  <span className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                  <div className="flex items-center gap-1.5 text-orange-400">
                    <Hash className="h-3.5 w-3.5" />
                    <span className="text-xs font-black tracking-widest uppercase">{teacher?.check_number}</span>
                  </div>
                </div>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-slate-200" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Profile...</p>
            </div>
          ) : teacher && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Identity & Contact</h3>
                    </div>
                    <div className="grid gap-3">
                      <DetailItem icon={Phone} label="Phone Number" value={teacher.phone} />
                      <DetailItem icon={Briefcase} label="Experience" value={`${teacher.experience_years_base} Years (Base: ${teacher.experience_base_year})`} />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Workstation</h3>
                    </div>
                    <div className="grid gap-3">
                      <DetailItem icon={Building2} label="Current Station" value={teacher.workstation} />
                      <div className="grid grid-cols-2 gap-3">
                        <DetailItem icon={MapPin} label="Region" value={teacher.regions?.region_name} />
                        <DetailItem icon={MapPin} label="District" value={teacher.districts?.district_name} />
                      </div>
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <GraduationCap className="h-4 w-4 text-orange-500" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Academic</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <DetailItem icon={Hash} label="Index No" value={teacher.index_no} />
                      <DetailItem icon={Calendar} label="CSEE Year" value={teacher.csee_year} />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <CreditCard className="h-4 w-4 text-purple-500" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Banking</h3>
                    </div>
                    <div className="grid gap-3">
                      <DetailItem icon={Building2} label="Bank" value={teacher.bank_name} />
                      <DetailItem icon={CreditCard} label="Account" value={teacher.account_number} className="font-mono" />
                    </div>
                  </section>
                </div>
              </div>

              <section className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-slate-900" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Participation History</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{history.length} Assignments</span>
                </div>
                
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] font-black uppercase text-slate-500">Job Name</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-500">Section</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-500">Assigned Date</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-500">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            No previous assignments found
                          </TableCell>
                        </TableRow>
                      ) : (
                        history.map((item) => (
                          <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-bold text-slate-900 text-xs uppercase">{item.jobassignments?.name}</TableCell>
                            <TableCell className="text-xs font-medium text-slate-500">{item.jobassignments?.section}</TableCell>
                            <TableCell className="text-xs text-slate-500">{new Date(item.assigned_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter",
                                item.jobassignments?.status === 'active' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                              )}>
                                {item.jobassignments?.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </>
          )}
        </div>

        <div className="p-8 border-t bg-slate-50">
          <button 
            onClick={() => onOpenChange(false)}
            className="w-full h-14 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all shadow-sm"
          >
            Close Profile
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};