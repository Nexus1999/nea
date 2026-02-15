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
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TeacherDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string | null;
}

export const TeacherDetailsDrawer = ({ open, onOpenChange, teacherId }: TeacherDetailsDrawerProps) => {
  const [teacher, setTeacher] = useState<any>(null);
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
      <SheetContent className="sm:max-w-[500px] p-0 flex flex-col bg-white overflow-hidden">
        <div className="px-6 py-6 border-b bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          <SheetHeader className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-xl ring-4 ring-white/10">
                <User className="h-8 w-8 text-white" />
              </div>
              <div>
                <SheetTitle className="text-xl font-black uppercase tracking-tight text-white">
                  {loading ? 'Loading...' : teacher?.teacher_name}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                    teacher?.sex === 'M' ? "bg-blue-500/20 text-blue-200" : "bg-pink-500/20 text-pink-200"
                  )}>
                    {teacher?.sex === 'M' ? 'Male' : 'Female'}
                  </span>
                  <span className="w-1 h-1 bg-white/20 rounded-full" />
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                    ID: {teacher?.id}
                  </span>
                </div>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fetching Profile...</p>
            </div>
          ) : teacher && (
            <>
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Official Identity</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <DetailItem icon={Hash} label="Check Number" value={teacher.check_number} className="bg-slate-900 text-white border-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem icon={Phone} label="Phone Number" value={teacher.phone} />
                    <DetailItem icon={Briefcase} label="Experience" value={`${teacher.experience_years_base} Years (Base: ${teacher.experience_base_year})`} />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Location & Workstation</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <DetailItem icon={Building2} label="Workstation" value={teacher.workstation} />
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem icon={MapPin} label="Region" value={teacher.regions?.region_name} />
                    <DetailItem icon={MapPin} label="District" value={teacher.districts?.district_name} />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <GraduationCap className="h-4 w-4 text-orange-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Academic Records</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem icon={Hash} label="Index Number" value={teacher.index_no} />
                  <DetailItem icon={Calendar} label="CSEE Year" value={teacher.csee_year} />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <CreditCard className="h-4 w-4 text-purple-500" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Banking Details</h3>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <DetailItem icon={Building2} label="Bank Name" value={teacher.bank_name} />
                  <DetailItem icon={User} label="Account Name" value={teacher.account_name} />
                  <DetailItem icon={CreditCard} label="Account Number" value={teacher.account_number} className="font-mono" />
                </div>
              </section>
            </>
          )}
        </div>

        <div className="p-6 border-t bg-slate-50">
          <button 
            onClick={() => onOpenChange(false)}
            className="w-full h-12 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all"
          >
            Close Profile
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};