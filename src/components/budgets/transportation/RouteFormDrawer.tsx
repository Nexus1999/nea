"use client";

import React, { useState, useEffect } from 'react';
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
  Truck, 
  Plus, 
  Trash2, 
  MapPin, 
  Calendar,
  Save,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface RouteFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  budgetId: string;
}

const RouteFormDrawer = ({ isOpen, onClose, onSubmit, initialData, budgetId }: RouteFormDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    startingPoint: 'DAR ES SALAAM',
    loadingDate: '',
    startDate: '',
    vehicles: [{ type: 'TRUCK_AND_TRAILER', quantity: 1 }],
    regions: [] as any[]
  });

  useEffect(() => {
    if (isOpen) {
      fetchRegions();
      if (initialData) {
        setFormData({
          name: initialData.name,
          startingPoint: initialData.starting_point,
          loadingDate: initialData.loading_date,
          startDate: initialData.start_date,
          vehicles: initialData.transportation_route_vehicles.map((v: any) => ({
            type: v.vehicle_type,
            quantity: v.quantity
          })),
          regions: initialData.transportation_route_stops.map((s: any) => ({
            name: s.region_name,
            receivingPlace: s.receiving_place,
            boxes: s.boxes_count,
            deliveryDate: s.delivery_date
          }))
        });
      } else {
        setFormData({
          name: '',
          startingPoint: 'DAR ES SALAAM',
          loadingDate: '',
          startDate: '',
          vehicles: [{ type: 'TRUCK_AND_TRAILER', quantity: 1 }],
          regions: []
        });
      }
    }
  }, [isOpen, initialData]);

  const fetchRegions = async () => {
    const { data } = await supabase.from('regional_demands').select('*').eq('budget_id', budgetId);
    setRegions(data || []);
  };

  const handleAddVehicle = () => {
    setFormData({
      ...formData,
      vehicles: [...formData.vehicles, { type: 'ESCORT_VEHICLE', quantity: 1 }]
    });
  };

  const handleRemoveVehicle = (index: number) => {
    setFormData({
      ...formData,
      vehicles: formData.vehicles.filter((_, i) => i !== index)
    });
  };

  const handleAddRegion = () => {
    setFormData({
      ...formData,
      regions: [...formData.regions, { name: '', receivingPlace: '', boxes: 0, deliveryDate: '' }]
    });
  };

  const handleRemoveRegion = (index: number) => {
    setFormData({
      ...formData,
      regions: formData.regions.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      console.error(err);
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
              <div className="p-1.5 bg-indigo-600 text-white rounded-md">
                <Truck className="h-4 w-4" />
              </div>
              <SheetTitle className="text-lg font-bold">
                {initialData ? 'Edit Route Configuration' : 'Plan New Transportation Route'}
              </SheetTitle>
            </div>
          </SheetHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-8 py-6 space-y-6 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Route Name</Label>
              <Input 
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Northern Corridor Route A"
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Starting Point</Label>
                <Input 
                  required
                  value={formData.startingPoint}
                  onChange={(e) => setFormData({...formData, startingPoint: e.target.value})}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Start Date</Label>
                <Input 
                  required
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Vehicles & Escorts</Label>
              <Button type="button" variant="ghost" size="sm" onClick={handleAddVehicle} className="h-7 text-indigo-600 font-bold text-[10px] uppercase tracking-widest">
                <Plus className="w-3 h-3 mr-1" /> Add Vehicle
              </Button>
            </div>
            <div className="space-y-2">
              {formData.vehicles.map((v, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Select 
                    value={v.type} 
                    onValueChange={(val) => {
                      const newVehicles = [...formData.vehicles];
                      newVehicles[idx].type = val;
                      setFormData({...formData, vehicles: newVehicles});
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRUCK_AND_TRAILER">Truck & Trailer</SelectItem>
                      <SelectItem value="STANDARD_TRUCK">Standard Truck</SelectItem>
                      <SelectItem value="ESCORT_VEHICLE">Escort Vehicle</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    value={v.quantity}
                    onChange={(e) => {
                      const newVehicles = [...formData.vehicles];
                      newVehicles[idx].quantity = parseInt(e.target.value);
                      setFormData({...formData, vehicles: newVehicles});
                    }}
                    className="w-20 h-10 rounded-xl"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveVehicle(idx)} className="text-slate-300 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Delivery Stops (Sequence)</Label>
              <Button type="button" variant="ghost" size="sm" onClick={handleAddRegion} className="h-7 text-indigo-600 font-bold text-[10px] uppercase tracking-widest">
                <Plus className="w-3 h-3 mr-1" /> Add Stop
              </Button>
            </div>
            <div className="space-y-4">
              {formData.regions.map((r, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 relative">
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveRegion(idx)} className="absolute top-2 right-2 h-7 w-7 text-slate-300 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold uppercase text-slate-400">Region</Label>
                      <Select 
                        value={r.name} 
                        onValueChange={(val) => {
                          const newRegions = [...formData.regions];
                          const regData = regions.find(reg => reg.region === val);
                          newRegions[idx].name = val;
                          newRegions[idx].boxes = regData?.boxes || 0;
                          setFormData({...formData, regions: newRegions});
                        }}
                      >
                        <SelectTrigger className="h-9 rounded-lg bg-white">
                          <SelectValue placeholder="Select Region" />
                        </SelectTrigger>
                        <SelectContent>
                          {regions.map(reg => (
                            <SelectItem key={reg.id} value={reg.region}>{reg.region}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold uppercase text-slate-400">Delivery Date</Label>
                      <Input 
                        type="date"
                        value={r.deliveryDate}
                        onChange={(e) => {
                          const newRegions = [...formData.regions];
                          newRegions[idx].deliveryDate = e.target.value;
                          setFormData({...formData, regions: newRegions});
                        }}
                        className="h-9 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-8 h-11">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Route</>}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RouteFormDrawer;