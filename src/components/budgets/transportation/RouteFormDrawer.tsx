"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { 
  Truck, 
  Plus, 
  Trash2, 
  MapPin, 
  Save, 
  Loader2, 
  Bus, 
  Car, 
  Container,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

const VEHICLE_TYPES = [
  { value: 'HORSE', label: 'Horse', icon: <Truck className="w-4 h-4" /> },
  { value: 'HORSE_TRAILER', label: 'Horse & Trailer', icon: <Container className="w-4 h-4" /> },
  { value: 'HARDTOP', label: 'Hardtop (Toyota LC)', icon: <Car className="w-4 h-4" /> },
  { value: 'COASTER', label: 'Coaster', icon: <Bus className="w-4 h-4" /> },
];

const TANZANIA_REGIONS = [
  "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma", 
  "Kilimanjaro", "Lindi", "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara", "Mwanza", 
  "Njombe", "Pemba North", "Pemba South", "Pwani", "Rukwa", "Ruvuma", "Shinyanga", 
  "Simiyu", "Singida", "Songwe", "Tabora", "Tanga", "Zanzibar North", "Zanzibar South", "Zanzibar West"
];

interface RouteFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  budgetId: string;
  editingRoute?: any;
  existingRoutes: any[];
}

const RouteFormDrawer = ({ isOpen, onClose, onSuccess, budgetId, editingRoute, existingRoutes }: RouteFormDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([{ type: 'HORSE', count: 1 }]);

  // Filter out regions already assigned to other routes in this action plan
  const availableRegions = useMemo(() => {
    const assignedRegions = new Set(
      existingRoutes
        .filter(r => r.id !== editingRoute?.id)
        .flatMap(r => r.regions || [])
    );
    return TANZANIA_REGIONS.filter(reg => !assignedRegions.has(reg));
  }, [existingRoutes, editingRoute]);

  useEffect(() => {
    if (editingRoute) {
      setName(editingRoute.name);
      setDestination(editingRoute.destination);
      setSelectedRegions(editingRoute.regions || []);
      setVehicles(editingRoute.vehicles || [{ type: 'HORSE', count: 1 }]);
    } else {
      setName('');
      setDestination('');
      setSelectedRegions([]);
      setVehicles([{ type: 'HORSE', count: 1 }]);
    }
  }, [editingRoute, isOpen]);

  const handleAddRegion = (region: string) => {
    if (region && !selectedRegions.includes(region)) {
      setSelectedRegions([...selectedRegions, region]);
    }
  };

  const handleRemoveRegion = (region: string) => {
    setSelectedRegions(selectedRegions.filter(r => r !== region));
  };

  const handleAddVehicle = () => {
    setVehicles([...vehicles, { type: 'HORSE', count: 1 }]);
  };

  const handleUpdateVehicle = (index: number, field: string, value: any) => {
    const newVehicles = [...vehicles];
    newVehicles[index] = { ...newVehicles[index], [field]: value };
    setVehicles(newVehicles);
  };

  const handleRemoveVehicle = (index: number) => {
    setVehicles(vehicles.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name || !destination || selectedRegions.length === 0) {
      showError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        budget_id: budgetId,
        name,
        destination,
        regions: selectedRegions,
        vehicles
      };

      if (editingRoute) {
        const { error } = await supabase
          .from('transportation_routes')
          .update(payload)
          .eq('id', editingRoute.id);
        if (error) throw error;
        showSuccess("Route updated successfully");
      } else {
        const { error } = await supabase
          .from('transportation_routes')
          .insert(payload);
        if (error) throw error;
        showSuccess("Route added successfully");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[500px] p-0 flex flex-col bg-white">
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-indigo-600 text-white rounded-md">
                <Truck className="h-4 w-4" />
              </div>
              <SheetTitle className="text-lg font-bold">
                {editingRoute ? 'Edit Route Configuration' : 'New Route Configuration'}
              </SheetTitle>
            </div>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Route Name *</Label>
              <Input 
                placeholder="e.g. Route 1: Northern Circuit" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="h-10 rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Destination (Msafara) *</Label>
              <Select value={destination} onValueChange={(val) => {
                setDestination(val);
                if (val && !selectedRegions.includes(val)) {
                  setSelectedRegions([...selectedRegions, val]);
                }
              }}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200">
                  <SelectValue placeholder="Select destination region" />
                </SelectTrigger>
                <SelectContent>
                  {availableRegions.map(reg => (
                    <SelectItem key={reg} value={reg}>{reg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Regions Selection */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Delivery Regions
            </Label>
            <div className="flex flex-wrap gap-2 p-3 border border-dashed border-slate-200 rounded-xl min-h-[60px] bg-slate-50/30">
              {selectedRegions.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">No regions selected yet...</p>
              ) : (
                selectedRegions.map(reg => (
                  <Badge key={reg} variant="secondary" className="bg-white border-slate-200 text-slate-700 font-bold py-1 pl-2 pr-1 flex items-center gap-1">
                    {reg}
                    <button onClick={() => handleRemoveRegion(reg)} className="hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
            <Select onValueChange={handleAddRegion}>
              <SelectTrigger className="h-9 rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="Add another region to this route..." />
              </SelectTrigger>
              <SelectContent>
                {availableRegions.filter(r => !selectedRegions.includes(r)).map(reg => (
                  <SelectItem key={reg} value={reg}>{reg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vehicles Configuration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Vehicle Configuration</Label>
              <Button variant="ghost" size="sm" onClick={handleAddVehicle} className="h-7 text-indigo-600 font-bold text-[10px] uppercase tracking-widest">
                <Plus className="w-3 h-3 mr-1" /> Add Vehicle
              </Button>
            </div>
            <div className="space-y-2">
              {vehicles.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="flex-1">
                    <Select value={v.type} onValueChange={(val) => handleUpdateVehicle(idx, 'type', val)}>
                      <SelectTrigger className="h-8 rounded-lg border-slate-200 text-[10px] font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map(vt => (
                          <SelectItem key={vt.value} value={vt.value}>
                            <div className="flex items-center gap-2">
                              {vt.icon}
                              <span>{vt.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <Input 
                      type="number" 
                      min="1" 
                      value={v.count} 
                      onChange={e => handleUpdateVehicle(idx, 'count', parseInt(e.target.value))}
                      className="h-8 rounded-lg border-slate-200 text-center text-xs font-bold"
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveVehicle(idx)} className="h-8 w-8 text-slate-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading} className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-10 rounded-xl font-black uppercase text-[10px] tracking-widest">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> {editingRoute ? 'Update Route' : 'Save Route'}</>}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RouteFormDrawer;