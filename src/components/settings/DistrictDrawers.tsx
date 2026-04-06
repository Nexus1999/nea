"use client";

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
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
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { logDataChange } from "@/utils/auditLogger";
import { Layers, Save } from "lucide-react";

interface DistrictDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  regions: any[];
  onSuccess: () => void;
}

const initialForm = {
  district_number: '',
  district_name: '',
  region_number: '',
  full_form: ''
};

export const AddDistrictDrawer = ({ open, onOpenChange, regions, onSuccess }: DistrictDrawerProps) => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.region_number) return showError("Please select a region");
    
    setLoading(true);
    const { data, error } = await supabase
      .from('districts')
      .insert([{ 
        ...form, 
        district_number: parseInt(form.district_number),
        region_number: parseInt(form.region_number)
      }])
      .select()
      .single();

    if (error) {
      showError(error.message);
    } else {
      await logDataChange({
        table_name: 'districts',
        record_id: data.id,
        action_type: 'INSERT',
        new_data: data
      });
      showSuccess("District added successfully");
      setForm(initialForm);
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px]">
        <SheetHeader className="mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <Layers className="h-6 w-6 text-white" />
          </div>
          <SheetTitle className="text-2xl font-black uppercase tracking-tight">Add New District</SheetTitle>
          <SheetDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Register a new local government authority
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Parent Region</Label>
            <Select 
              value={form.region_number} 
              onValueChange={val => setForm({...form, region_number: val})}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select a region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map(r => (
                  <SelectItem key={r.region_code} value={r.region_code.toString()}>
                    {r.region_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">District Number</Label>
              <Input required type="number" value={form.district_number} onChange={e => setForm({...form, district_number: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. 101" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">District Name</Label>
              <Input required value={form.district_name} onChange={e => setForm({...form, district_name: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Accra Metro" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Form / Description</Label>
            <Input value={form.full_form} onChange={e => setForm({...form, full_form: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Accra Metropolitan Assembly" />
          </div>

          <SheetFooter className="pt-8">
            <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-xl">
              {loading ? "Saving..." : "Create District"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export const EditDistrictDrawer = ({ open, onOpenChange, district, regions, onSuccess }: any) => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (district) setForm({
      district_number: district.district_number.toString(),
      district_name: district.district_name || '',
      region_number: district.region_number.toString(),
      full_form: district.full_form || ''
    });
  }, [district]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase
      .from('districts')
      .update({ 
        ...form, 
        district_number: parseInt(form.district_number),
        region_number: parseInt(form.region_number)
      })
      .eq('id', district.id)
      .select()
      .single();

    if (error) {
      showError(error.message);
    } else {
      await logDataChange({
        table_name: 'districts',
        record_id: district.id,
        action_type: 'UPDATE',
        old_data: district,
        new_data: data
      });
      showSuccess("District updated successfully");
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px]">
        <SheetHeader className="mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <Save className="h-6 w-6 text-white" />
          </div>
          <SheetTitle className="text-2xl font-black uppercase tracking-tight">Edit District</SheetTitle>
          <SheetDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Update details for {district?.district_name}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Parent Region</Label>
            <Select 
              value={form.region_number} 
              onValueChange={val => setForm({...form, region_number: val})}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select a region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map(r => (
                  <SelectItem key={r.region_code} value={r.region_code.toString()}>
                    {r.region_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">District Number</Label>
              <Input required type="number" value={form.district_number} onChange={e => setForm({...form, district_number: e.target.value})} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">District Name</Label>
              <Input required value={form.district_name} onChange={e => setForm({...form, district_name: e.target.value})} className="h-11 rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Form / Description</Label>
            <Input value={form.full_form} onChange={e => setForm({...form, full_form: e.target.value})} className="h-11 rounded-xl" />
          </div>

          <SheetFooter className="pt-8">
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-xl">
              {loading ? "Saving Changes..." : "Update District"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};