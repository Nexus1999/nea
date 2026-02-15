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
import { UserPlus, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner"; // Assuming sonner or similar toast library is used

interface AddSupervisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const AddSupervisorDrawer = ({ isOpen, onClose, onRefresh }: AddSupervisorDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [shake, setShake] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    nin: '',
    phone: '',
    tsc_no: '',
    cheque_no: '',
    region: '',
    district: '',
    center_no: '',
    center_type: '',
    index_no: '',
    csee_year: ''
  });

  // --- MASK LOGIC ---
  const applyPhoneMask = (input: string) => {
    let raw = input.replace(/\D/g, '');
    if (raw.length > 12) raw = raw.slice(0, 12);
    let formatted = '+255 ';
    if (raw.length > 3) {
      formatted += raw.slice(3, 6) + ' ';
      if (raw.length > 6) {
        formatted += raw.slice(6, 9) + ' ';
        if (raw.length > 9) formatted += raw.slice(9, 12);
      }
    }
    return formatted.trim();
  };

  const applyNINMask = (input: string) => {
    let raw = input.replace(/\D/g, '');
    if (raw.length > 21) raw = raw.slice(0, 21);
    let formatted = '';
    for (let i = 0; i < raw.length; i++) {
      if (i === 9 || i === 14 || i === 19) formatted += '-';
      formatted += raw[i];
    }
    return formatted;
  };

  const applyIndexMask = (input: string) => {
    let val = input.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    if (val.length > 0 && !/^[SP]/.test(val)) return formData.index_no;
    if (val.length > 1) {
      const parts = val.split('-');
      let firstPart = parts[0][0] + parts[0].slice(1).replace(/\D/g, '');
      if (firstPart.length > 5) firstPart = firstPart.slice(0, 5);
      val = firstPart + (parts[1] ? '-' + parts[1].replace(/\D/g, '').slice(0, 4) : '');
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
    if (!formData.first_name.trim()) newErrors.first_name = "Required";
    if (!formData.last_name.trim()) newErrors.last_name = "Required";
    
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 12) newErrors.phone = "Invalid number";
    
    if (!formData.region) newErrors.region = "Required";
    if (!formData.district) newErrors.district = "Required";
    
    if (!/^S\d{4}$/.test(formData.center_no)) newErrors.center_no = "Format: S0101";
    if (!formData.center_type) newErrors.center_type = "Required";

    // Index & Year logic: Provide both or none
    if (formData.index_no || formData.csee_year) {
      if (!formData.index_no) newErrors.index_no = "Required with Year";
      if (!formData.csee_year) newErrors.csee_year = "Required with Index";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (isOpen) {
      const fetchRegions = async () => {
        const { data } = await supabase.from('regions').select('*').order('region_name');
        if (data) setRegions(data);
      };
      fetchRegions();
    }
  }, [isOpen]);

  const handleRegionChange = async (regionName: string) => {
    setFormData(prev => ({ ...prev, region: regionName, district: '' }));
    setErrors(prev => ({ ...prev, region: '', district: '' }));
    const selectedRegion = regions.find(r => r.region_name === regionName);
    if (selectedRegion) {
      const { data } = await supabase
        .from('districts')
        .select('*')
        .eq('region_number', selectedRegion.region_code);
      if (data) setDistricts(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const { data: centerData } = await supabase
        .from('secondaryschools')
        .select('region, district, center_type')
        .eq('center_no', formData.center_no)
        .maybeSingle();

      if (!centerData) throw new Error(`Center ${formData.center_no} does not exist.`);
      
      // Verify Region, District AND Ownership
      if (centerData.region !== formData.region || centerData.district !== formData.district) {
        throw new Error(`Location mismatch: Center is in ${centerData.region}/${centerData.district}`);
      }

      if (centerData.center_type.toLowerCase() !== formData.center_type.toLowerCase()) {
        throw new Error(`Ownership mismatch: This center is registered as ${centerData.center_type}`);
      }

      const { error } = await supabase.from('supervisors').insert([{
        ...formData,
        added_by: localStorage.getItem('username') || 'system',
        year_imported: new Date().getFullYear().toString()
      }]);

      if (error) throw error;

      toast.success('Supervisor Registered Successfully');
      onRefresh();
      onClose();
      setFormData({
        first_name: '', middle_name: '', last_name: '', nin: '', phone: '',
        tsc_no: '', cheque_no: '', region: '', district: '', center_no: '', center_type: '',
        index_no: '', csee_year: ''
      });
      setErrors({});
    } catch (err: any) {
      setErrors({ submit: err.message });
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[600px] p-0 flex flex-col bg-white overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-black text-white rounded-md"><UserPlus className="h-4 w-4" /></div>
              <SheetTitle className="text-lg font-bold">Register New Supervisor</SheetTitle>
            </div>
          </SheetHeader>
        </div>

        <form onSubmit={handleSubmit} className={`flex-1 px-8 py-4 space-y-3 overflow-y-auto transition-transform ${shake ? 'animate-shake' : ''}`}>
          
          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
            <div className="space-y-1">
              <Label className={`text-xs ${errors.first_name ? "text-red-500" : ""}`}>First Name *</Label>
              <Input 
                className={`h-8 ${errors.first_name ? "border-red-500" : ""}`}
                value={formData.first_name} 
                onChange={e => setFormData({...formData, first_name: e.target.value})} 
              />
              {errors.first_name && <p className="text-[9px] text-red-500 font-bold uppercase leading-tight">{errors.first_name}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Middle Name</Label>
              <Input className="h-8" value={formData.middle_name} onChange={e => setFormData({...formData, middle_name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label className={`text-xs ${errors.last_name ? "text-red-500" : ""}`}>Last Name *</Label>
              <Input 
                className={`h-8 ${errors.last_name ? "border-red-500" : ""}`}
                value={formData.last_name} 
                onChange={e => setFormData({...formData, last_name: e.target.value})} 
              />
              {errors.last_name && <p className="text-[9px] text-red-500 font-bold uppercase leading-tight">{errors.last_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="space-y-1">
              <Label className="text-xs">National ID (NIN)</Label>
              <Input className="h-8" value={formData.nin} onChange={e => setFormData({...formData, nin: applyNINMask(e.target.value)})} placeholder="000000000-00000-00000-00" />
            </div>
            <div className="space-y-1">
              <Label className={`text-xs ${errors.phone ? "text-red-500" : ""}`}>Phone Number *</Label>
              <Input 
                className={`h-8 ${errors.phone ? "border-red-500" : ""}`}
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: applyPhoneMask(e.target.value)})} 
              />
              {errors.phone && <p className="text-[9px] text-red-500 font-bold uppercase leading-tight">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="space-y-1">
              <Label className="text-xs">TSC Number</Label>
              <Input className="h-8" value={formData.tsc_no} onChange={e => setFormData({...formData, tsc_no: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cheque Number</Label>
              <Input className="h-8" value={formData.cheque_no} onChange={e => setFormData({...formData, cheque_no: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="space-y-1">
              <Label className={`text-xs ${errors.region ? "text-red-500" : ""}`}>Region *</Label>
              <Select onValueChange={handleRegionChange} value={formData.region}>
                <SelectTrigger className={`h-8 ${errors.region ? "border-red-500" : ""}`}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {regions.map(r => <SelectItem key={r.id} value={r.region_name}>{r.region_name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.region && <p className="text-[9px] text-red-500 font-bold uppercase leading-tight">{errors.region}</p>}
            </div>
            <div className="space-y-1">
              <Label className={`text-xs ${errors.district ? "text-red-500" : ""}`}>District *</Label>
              <Select disabled={!formData.region} onValueChange={val => setFormData({...formData, district: val})} value={formData.district}>
                <SelectTrigger className={`h-8 ${errors.district ? "border-red-500" : ""}`}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {districts.map(d => <SelectItem key={d.id} value={d.district_name}>{d.district_name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.district && <p className="text-[9px] text-red-500 font-bold uppercase leading-tight">{errors.district}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="space-y-1">
              <Label className={`text-xs ${errors.center_no ? "text-red-500" : ""}`}>Center Number *</Label>
              <Input 
                className={`h-8 uppercase font-mono ${errors.center_no ? "border-red-500" : ""}`}
                value={formData.center_no} 
                onChange={e => {
                  let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  if (val.length > 0 && val[0] !== 'S') val = 'S' + val.replace(/\D/g, '');
                  setFormData({...formData, center_no: val.slice(0, 5)});
                }} 
              />
              {errors.center_no && <p className="text-[9px] text-red-500 font-bold uppercase leading-tight">{errors.center_no}</p>}
            </div>
            <div className="space-y-1">
              <Label className={`text-xs ${errors.center_type ? "text-red-500" : ""}`}>Center Ownership *</Label>
              <Select onValueChange={val => setFormData({...formData, center_type: val})} value={formData.center_type}>
                <SelectTrigger className={`h-8 ${errors.center_type ? "border-red-500" : ""}`}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
              {errors.center_type && <p className="text-[9px] text-red-500 font-bold uppercase leading-tight">{errors.center_type}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-2">
            <div className="space-y-1">
              <Label className={`text-xs ${errors.index_no ? "text-red-500" : ""}`}>Index Number</Label>
              <Input className={`h-8 ${errors.index_no ? "border-red-500" : ""}`} value={formData.index_no} onChange={e => setFormData({...formData, index_no: applyIndexMask(e.target.value)})} placeholder="S0101-0001" />
              {errors.index_no && <p className="text-[9px] text-red-500 font-bold uppercase leading-tight">{errors.index_no}</p>}
            </div>
            <div className="space-y-1">
              <Label className={`text-xs ${errors.csee_year ? "text-red-500" : ""}`}>CSEE Year</Label>
              <Input className={`h-8 ${errors.csee_year ? "border-red-500" : ""}`} value={formData.csee_year} onChange={e => setFormData({...formData, csee_year: e.target.value.replace(/\D/g, '')})} placeholder="2024" maxLength={4} />
              {errors.csee_year && <p className="text-[9px] text-red-500 font-bold uppercase leading-tight">{errors.csee_year}</p>}
            </div>
          </div>

          {errors.submit && <div className="py-1.5 px-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-[10px] font-semibold">{errors.submit}</div>}
        </form>

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button size="sm" className="bg-black text-white hover:bg-slate-800 px-6" disabled={loading} onClick={handleSubmit}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Supervisor</>}
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

export default AddSupervisorDrawer;