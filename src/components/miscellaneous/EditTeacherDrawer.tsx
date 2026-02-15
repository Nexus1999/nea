"use client";

import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EditTeacherDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  teacherId: string | null;
}

const EditTeacherDrawer = ({ isOpen, onClose, onRefresh, teacherId }: EditTeacherDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [shake, setShake] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    teacher_name: '',
    sex: '',
    check_number: '',
    phone: '',
    region_code: '',
    district_number: '',
    workstation: '',
    experience_years_base: '1',
    experience_base_year: '',
    index_no: '',
    csee_year: ''
  });

  const applyPhoneMask = (input: string) => {
    let raw = input.replace(/\D/g, '');
    if (raw.startsWith('255')) raw = raw.slice(3);
    if (raw.length > 9) raw = raw.slice(0, 9);
    let formatted = '+255 ';
    if (raw.length > 0) {
      formatted += raw.slice(0, 3);
      if (raw.length > 3) formatted += ' ' + raw.slice(3, 6);
      if (raw.length > 6) formatted += ' ' + raw.slice(6, 9);
    }
    return raw.length === 0 ? '' : formatted.trim();
  };

  const applyIndexMask = (input: string) => {
    let val = input.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    if (val.length > 0 && !/^[SP]/.test(val)) return '';
    if (val.length > 1) {
      const parts = val.split('-');
      let firstPart = parts[0][0] + parts[0].slice(1).replace(/\D/g, '');
      if (firstPart.length > 5) firstPart = firstPart.slice(0, 5);
      let secondPart = parts[1] ? parts[1].replace(/\D/g, '').slice(0, 4) : '';
      val = firstPart + (val.includes('-') ? '-' + secondPart : '');
    }
    if (val.length === 5 && !val.includes('-')) val += '-';
    return val.slice(0, 10);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.teacher_name.trim()) newErrors.teacher_name = "Required";
    if (!formData.sex) newErrors.sex = "Required";
    if (!formData.check_number.trim()) newErrors.check_number = "Required";
    if (!formData.region_code) newErrors.region_code = "Required";
    if (!formData.district_number) newErrors.district_number = "Required";
    if (!formData.workstation.trim()) newErrors.workstation = "Required";
    
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (formData.phone && phoneDigits.length !== 12) newErrors.phone = "Invalid format";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (isOpen && teacherId) {
      fetchTeacherData();
    }
  }, [isOpen, teacherId]);

  const fetchTeacherData = async () => {
    setFetching(true);
    try {
      const { data: regionsData } = await supabase.from('regions').select('*').order('region_name');
      if (regionsData) setRegions(regionsData);

      const { data: teacher, error } = await supabase
        .from('primaryteachers')
        .select('*')
        .eq('id', teacherId)
        .single();

      if (error) throw error;

      if (teacher) {
        setFormData({
          teacher_name: teacher.teacher_name,
          sex: teacher.sex,
          check_number: teacher.check_number,
          phone: teacher.phone ? applyPhoneMask(teacher.phone) : '',
          region_code: teacher.region_code.toString(),
          district_number: teacher.district_number.toString(),
          workstation: teacher.workstation,
          experience_years_base: teacher.experience_years_base.toString(),
          experience_base_year: teacher.experience_base_year.toString(),
          index_no: teacher.index_no || '',
          csee_year: teacher.csee_year?.toString() || ''
        });

        const { data: districtsData } = await supabase
          .from('districts')
          .select('*')
          .eq('region_number', teacher.region_code)
          .order('district_name');
        if (districtsData) setDistricts(districtsData);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleRegionChange = async (code: string) => {
    setFormData(prev => ({ ...prev, region_code: code, district_number: '' }));
    const { data } = await supabase
      .from('districts')
      .select('*')
      .eq('region_number', parseInt(code))
      .order('district_name');
    if (data) setDistricts(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('primaryteachers')
        .update({
          teacher_name: formData.teacher_name.toUpperCase(),
          sex: formData.sex,
          check_number: formData.check_number,
          phone: formData.phone.replace(/\s/g, ''),
          region_code: parseInt(formData.region_code),
          district_number: parseInt(formData.district_number),
          workstation: formData.workstation,
          experience_years_base: parseInt(formData.experience_years_base),
          experience_base_year: parseInt(formData.experience_base_year),
          index_no: formData.index_no || null,
          csee_year: formData.csee_year ? parseInt(formData.csee_year) : null
        })
        .eq('id', teacherId);

      if (error) throw error;

      toast.success('Teacher Updated Successfully');
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[550px] p-0 flex flex-col bg-white overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-600 text-white rounded-md">
                <Edit className="h-4 w-4" />
              </div>
              <SheetTitle className="text-lg font-bold">Edit Primary Teacher</SheetTitle>
            </div>
          </SheetHeader>
        </div>

        {fetching ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
        ) : (
          <form onSubmit={handleSubmit} className={cn("flex-1 overflow-y-auto px-8 py-6 space-y-5", shake && "animate-shake")}>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className={cn("text-xs font-bold uppercase", errors.teacher_name ? "text-red-500" : "text-muted-foreground")}>Teacher Full Name *</Label>
                <Input className={cn("h-9", errors.teacher_name && "border-red-500")} value={formData.teacher_name} onChange={e => setFormData({...formData, teacher_name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className={cn("text-xs font-bold uppercase", errors.sex ? "text-red-500" : "text-muted-foreground")}>Sex *</Label>
                  <Select onValueChange={val => setFormData({...formData, sex: val})} value={formData.sex}>
                    <SelectTrigger className={cn("h-9", errors.sex && "border-red-500")}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className={cn("text-xs font-bold uppercase", errors.check_number ? "text-red-500" : "text-muted-foreground")}>Check Number *</Label>
                  <Input className={cn("h-9 font-mono", errors.check_number && "border-red-500")} value={formData.check_number} onChange={e => setFormData({...formData, check_number: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className={cn("text-xs font-bold uppercase", errors.region_code ? "text-red-500" : "text-muted-foreground")}>Region *</Label>
                  <Select onValueChange={handleRegionChange} value={formData.region_code}>
                    <SelectTrigger className={cn("h-9", errors.region_code && "border-red-500")}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {regions.map(r => <SelectItem key={r.id} value={r.region_code.toString()}>{r.region_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className={cn("text-xs font-bold uppercase", errors.district_number ? "text-red-500" : "text-muted-foreground")}>District *</Label>
                  <Select disabled={!formData.region_code} onValueChange={val => setFormData({...formData, district_number: val})} value={formData.district_number}>
                    <SelectTrigger className={cn("h-9", errors.district_number && "border-red-500")}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {districts.map(d => <SelectItem key={d.id} value={d.district_number.toString()}>{d.district_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className={cn("text-xs font-bold uppercase", errors.workstation ? "text-red-500" : "text-muted-foreground")}>Workstation *</Label>
                <Input className={cn("h-9", errors.workstation && "border-red-500")} value={formData.workstation} onChange={e => setFormData({...formData, workstation: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Index Number</Label>
                  <Input className="h-9 font-mono" value={formData.index_no} onChange={e => setFormData({...formData, index_no: applyIndexMask(e.target.value)})} placeholder="S0101-0001" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">CSEE Year</Label>
                  <Input className="h-9" value={formData.csee_year} onChange={e => setFormData({...formData, csee_year: e.target.value.replace(/\D/g, '')})} placeholder="YYYY" maxLength={4} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className={cn("text-xs font-bold uppercase", errors.phone ? "text-red-500" : "text-muted-foreground")}>Phone Number *</Label>
                <Input className={cn("h-9 font-mono", errors.phone && "border-red-500")} value={formData.phone} onChange={e => setFormData({...formData, phone: applyPhoneMask(e.target.value)})} placeholder="+255 712 345 678" />
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Experience (Years) *</Label>
                  <Input type="number" min="1" className="h-8 bg-white" value={formData.experience_years_base} onChange={e => setFormData({...formData, experience_years_base: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-slate-500">Base Year</Label>
                  <Input type="number" className="h-8 bg-white" value={formData.experience_base_year} onChange={e => setFormData({...formData, experience_base_year: e.target.value})} />
                </div>
              </div>
            </div>
          </form>
        )}

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700 px-6" disabled={loading} onClick={handleSubmit}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Update Teacher</>}
          </Button>
        </div>
      </SheetContent>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </Sheet>
  );
};

export default EditTeacherDrawer;