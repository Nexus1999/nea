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
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { logDataChange } from "@/utils/auditLogger";
import { Globe, Save } from "lucide-react";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const initialForm = {
  region_code: '',
  region_name: '',
  reo: '',
  reo_email: '',
  reo_phone: '',
  town: '',
  postal_address: ''
};

export const AddRegionDrawer = ({ open, onOpenChange, onSuccess }: DrawerProps) => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase
      .from('regions')
      .insert([{ ...form, region_code: parseInt(form.region_code) }])
      .select()
      .single();

    if (error) {
      showError(error.message);
    } else {
      await logDataChange({
        table_name: 'regions',
        record_id: data.id,
        action_type: 'INSERT',
        new_data: data
      });
      showSuccess("Region added successfully");
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
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mb-4">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <SheetTitle className="text-2xl font-black uppercase tracking-tight">Add New Region</SheetTitle>
          <SheetDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Create a new administrative region
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region Code</Label>
              <Input required type="number" value={form.region_code} onChange={e => setForm({...form, region_code: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. 01" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region Name</Label>
              <Input required value={form.region_name} onChange={e => setForm({...form, region_name: e.target.value})} className="h-11 rounded-xl" placeholder="e.g. Greater Accra" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">REO Name</Label>
            <Input value={form.reo} onChange={e => setForm({...form, reo: e.target.value})} className="h-11 rounded-xl" placeholder="Regional Education Officer" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">REO Email</Label>
              <Input type="email" value={form.reo_email} onChange={e => setForm({...form, reo_email: e.target.value})} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">REO Phone</Label>
              <Input value={form.reo_phone} onChange={e => setForm({...form, reo_phone: e.target.value})} className="h-11 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Town</Label>
              <Input value={form.town} onChange={e => setForm({...form, town: e.target.value})} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Postal Address</Label>
              <Input value={form.postal_address} onChange={e => setForm({...form, postal_address: e.target.value})} className="h-11 rounded-xl" />
            </div>
          </div>

          <SheetFooter className="pt-8">
            <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-xl">
              {loading ? "Saving..." : "Create Region"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export const EditRegionDrawer = ({ open, onOpenChange, region, onSuccess }: any) => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (region) setForm({
      region_code: region.region_code.toString(),
      region_name: region.region_name || '',
      reo: region.reo || '',
      reo_email: region.reo_email || '',
      reo_phone: region.reo_phone || '',
      town: region.town || '',
      postal_address: region.postal_address || ''
    });
  }, [region]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase
      .from('regions')
      .update({ ...form, region_code: parseInt(form.region_code) })
      .eq('id', region.id)
      .select()
      .single();

    if (error) {
      showError(error.message);
    } else {
      await logDataChange({
        table_name: 'regions',
        record_id: region.id,
        action_type: 'UPDATE',
        old_data: region,
        new_data: data
      });
      showSuccess("Region updated successfully");
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
          <SheetTitle className="text-2xl font-black uppercase tracking-tight">Edit Region</SheetTitle>
          <SheetDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Update region details for {region?.region_name}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Form fields same as AddRegionDrawer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region Code</Label>
              <Input required type="number" value={form.region_code} onChange={e => setForm({...form, region_code: e.target.value})} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region Name</Label>
              <Input required value={form.region_name} onChange={e => setForm({...form, region_name: e.target.value})} className="h-11 rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">REO Name</Label>
            <Input value={form.reo} onChange={e => setForm({...form, reo: e.target.value})} className="h-11 rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">REO Email</Label>
              <Input type="email" value={form.reo_email} onChange={e => setForm({...form, reo_email: e.target.value})} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">REO Phone</Label>
              <Input value={form.reo_phone} onChange={e => setForm({...form, reo_phone: e.target.value})} className="h-11 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Town</Label>
              <Input value={form.town} onChange={e => setForm({...form, town: e.target.value})} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Postal Address</Label>
              <Input value={form.postal_address} onChange={e => setForm({...form, postal_address: e.target.value})} className="h-11 rounded-xl" />
            </div>
          </div>

          <SheetFooter className="pt-8">
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest h-12 rounded-xl">
              {loading ? "Saving Changes..." : "Update Region"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};