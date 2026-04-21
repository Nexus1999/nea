"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Settings2, 
  Save, 
  Loader2, 
  ChevronRight,
  Calculator,
  Users,
  Truck,
  Fuel
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";

const BudgetSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transportation_rates')
        .select('*')
        .eq('effective_year', parseInt(selectedYear))
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setRates(data);
      } else {
        // Default values if no rates exist for this year
        setRates({
          effective_year: parseInt(selectedYear),
          exam_officer_rate: 170000,
          police_rate: 170000,
          security_rate: 170000,
          driver_rate: 150000,
          transit_rate_factor: 0.5,
          emergency_tt: 100000,
          emergency_standard: 50000,
          unloading_rate_per_box: 1000,
          loading_vibarua_count: 30,
          loading_vibarua_rate: 20000,
          padlock_set_cost: 240000,
          fuel_price_per_liter: 3500,
          fuel_consumption_tt: 3.5,
          fuel_consumption_truck: 4.5,
          fuel_consumption_escort: 10.0,
        });
      }
    } catch (err: any) {
      showError("Failed to fetch rates");
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('transportation_rates')
        .upsert(rates, { onConflict: 'effective_year' });

      if (error) throw error;
      showSuccess("Rates updated successfully");
    } catch (err: any) {
      showError(err.message || "Failed to save rates");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" label="Loading settings..." /></div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <Settings2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
              <span>Configuration</span>
              <ChevronRight className="w-3 h-3" />
              <span>Allowances & Rates</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              Budget Settings
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fiscal Year</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32 h-11 rounded-xl border-slate-200 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="rounded-xl h-11 px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest gap-2 shadow-lg"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* PERSONNEL RATES */}
        <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-400" />
              <CardTitle className="text-lg font-black uppercase tracking-tight">Personnel Allowances (Daily)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <RateInput label="Exam Officer" value={rates.exam_officer_rate} onChange={v => setRates({...rates, exam_officer_rate: v})} />
              <RateInput label="Police Officer" value={rates.police_rate} onChange={v => setRates({...rates, police_rate: v})} />
              <RateInput label="Security Officer" value={rates.security_rate} onChange={v => setRates({...rates, security_rate: v})} />
              <RateInput label="Driver" value={rates.driver_rate} onChange={v => setRates({...rates, driver_rate: v})} />
            </div>
            <div className="pt-4 border-t">
              <RateInput label="Transit Factor (e.g. 0.5 for 50%)" value={rates.transit_rate_factor} onChange={v => setRates({...rates, transit_rate_factor: v})} step="0.1" />
            </div>
          </CardContent>
        </Card>

        {/* FUEL & VEHICLE */}
        <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
            <div className="flex items-center gap-3">
              <Fuel className="w-5 h-5 text-slate-400" />
              <CardTitle className="text-lg font-black uppercase tracking-tight">Fuel & Vehicle Config</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <RateInput label="Fuel Price (per Liter)" value={rates.fuel_price_per_liter} onChange={v => setRates({...rates, fuel_price_per_liter: v})} />
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <RateInput label="TT Consumption (km/L)" value={rates.fuel_consumption_tt} onChange={v => setRates({...rates, fuel_consumption_tt: v})} step="0.1" />
              <RateInput label="Truck Consumption (km/L)" value={rates.fuel_consumption_truck} onChange={v => setRates({...rates, fuel_consumption_truck: v})} step="0.1" />
              <RateInput label="Escort Consumption (km/L)" value={rates.fuel_consumption_escort} onChange={v => setRates({...rates, fuel_consumption_escort: v})} step="0.1" />
            </div>
          </CardContent>
        </Card>

        {/* OPERATIONAL DEFAULTS */}
        <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-slate-400" />
              <CardTitle className="text-lg font-black uppercase tracking-tight">Operational Defaults</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <RateInput label="Unloading (per Box)" value={rates.unloading_rate_per_box} onChange={v => setRates({...rates, unloading_rate_per_box: v})} />
              <RateInput label="Padlock Set Cost" value={rates.padlock_set_cost} onChange={v => setRates({...rates, padlock_set_cost: v})} />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <RateInput label="Vibarua Count" value={rates.loading_vibarua_count} onChange={v => setRates({...rates, loading_vibarua_count: v})} />
              <RateInput label="Vibarua Rate" value={rates.loading_vibarua_rate} onChange={v => setRates({...rates, loading_vibarua_rate: v})} />
            </div>
          </CardContent>
        </Card>

        {/* EMERGENCY ALLOWANCES */}
        <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-slate-400" />
              <CardTitle className="text-lg font-black uppercase tracking-tight">Emergency Allowances</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <RateInput label="Truck & Trailer (TT)" value={rates.emergency_tt} onChange={v => setRates({...rates, emergency_tt: v})} />
            <RateInput label="Standard Truck / Escort" value={rates.emergency_standard} onChange={v => setRates({...rates, emergency_standard: v})} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const RateInput = ({ label, value, onChange, step = "1" }: { label: string, value: number, onChange: (v: number) => void, step?: string }) => (
  <div className="space-y-1.5">
    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</Label>
    <Input 
      type="number" 
      step={step}
      value={value} 
      onChange={e => onChange(parseFloat(e.target.value))}
      className="h-11 rounded-xl border-slate-200 font-bold"
    />
  </div>
);

export default BudgetSettingsPage;