"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Settings2, 
  Save, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle,
  ChevronRight,
  Calculator,
  Users,
  Truck
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";

const ROLES = [
  { value: 'police_officer', label: 'Police Officer' },
  { value: 'security_officer', label: 'Security Officer' },
  { value: 'examination_officer', label: 'Examination Officer' },
  { value: 'driver', label: 'Driver' },
];

const BudgetSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transportation_rates')
        .select('*')
        .eq('fiscal_year', parseInt(selectedYear));

      if (error) throw error;
      setRates(data || []);
    } catch (err: any) {
      showError("Failed to fetch rates");
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleAddRole = () => {
    const newRate = {
      fiscal_year: parseInt(selectedYear),
      role: 'police_officer',
      allowance_per_day: 0,
      allowance_transit_per_day: 0,
      unloading_per_officer: 0,
      fare_return: 0,
      driver_emergency_normal: 50000,
      driver_emergency_tt: 100000,
    };
    setRates([...rates, newRate]);
  };

  const handleUpdateRate = (index: number, field: string, value: any) => {
    const newRates = [...rates];
    newRates[index] = { ...newRates[index], [field]: value };
    setRates(newRates);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert all rates for the selected year
      const { error } = await supabase
        .from('transportation_rates')
        .upsert(rates, { onConflict: 'fiscal_year,role' });

      if (error) throw error;
      showSuccess("Rates updated successfully");
      fetchRates();
    } catch (err: any) {
      showError(err.message || "Failed to save rates");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRate = async (id: string, index: number) => {
    if (!id) {
      setRates(rates.filter((_, i) => i !== index));
      return;
    }

    try {
      const { error } = await supabase
        .from('transportation_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccess("Rate removed");
      fetchRates();
    } catch (err: any) {
      showError("Failed to delete rate");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" label="Loading settings..." /></div>;

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
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

      <div className="grid grid-cols-1 gap-8">
        {/* PERSONNEL RATES */}
        <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-slate-400" />
                <CardTitle className="text-lg font-black uppercase tracking-tight">Personnel Allowances</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddRole} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
                <Plus className="w-3 h-3 mr-2" /> Add Role
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-8 text-[9px] font-black uppercase tracking-widest">Role</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Daily Allowance</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Transit Allowance</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Unloading Cash</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Return Fare</TableHead>
                  <TableHead className="text-right pr-8 text-[9px] font-black uppercase tracking-widest">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium italic">
                      No rates defined for {selectedYear}. Click "Add Role" to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  rates.map((rate, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50/30">
                      <TableCell className="pl-8">
                        <Select 
                          value={rate.role} 
                          onValueChange={(val) => handleUpdateRate(idx, 'role', val)}
                        >
                          <SelectTrigger className="h-9 rounded-lg border-slate-200 font-bold text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(r => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={rate.allowance_per_day} 
                          onChange={(e) => handleUpdateRate(idx, 'allowance_per_day', parseFloat(e.target.value))}
                          className="h-9 rounded-lg border-slate-200 text-xs font-bold"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={rate.allowance_transit_per_day} 
                          onChange={(e) => handleUpdateRate(idx, 'allowance_transit_per_day', parseFloat(e.target.value))}
                          className="h-9 rounded-lg border-slate-200 text-xs font-bold"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={rate.unloading_per_officer} 
                          onChange={(e) => handleUpdateRate(idx, 'unloading_per_officer', parseFloat(e.target.value))}
                          className="h-9 rounded-lg border-slate-200 text-xs font-bold"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={rate.fare_return} 
                          onChange={(e) => handleUpdateRate(idx, 'fare_return', parseFloat(e.target.value))}
                          className="h-9 rounded-lg border-slate-200 text-xs font-bold"
                        />
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteRate(rate.id, idx)}
                          className="text-slate-300 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* OPERATIONAL DEFAULTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-slate-400" />
                <CardTitle className="text-lg font-black uppercase tracking-tight">Driver Emergency Rates</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Standard Truck (T)</Label>
                <Input 
                  type="number" 
                  placeholder="50,000" 
                  className="h-12 rounded-xl border-slate-200 font-black text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Truck & Trailer (TT)</Label>
                <Input 
                  type="number" 
                  placeholder="100,000" 
                  className="h-12 rounded-xl border-slate-200 font-black text-lg"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
              <div className="flex items-center gap-3">
                <Calculator className="w-5 h-5 text-slate-400" />
                <CardTitle className="text-lg font-black uppercase tracking-tight">Operational Defaults</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Padlock / Route</Label>
                  <Input type="number" className="h-11 rounded-xl border-slate-200 font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Follow-up / Route</Label>
                  <Input type="number" className="h-11 rounded-xl border-slate-200 font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vibarua (Loading) / Day</Label>
                <Input type="number" className="h-11 rounded-xl border-slate-200 font-bold" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BudgetSettingsPage;