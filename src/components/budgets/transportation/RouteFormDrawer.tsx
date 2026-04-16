"use client";

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Trash2, 
  Truck, 
  Shield, 
  MapPin, 
  Package, 
  Calendar,
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
import { showError } from "@/utils/toast";

const routeSchema = z.object({
  name: z.string().min(1, "Required"),
  loadingDate: z.string().min(1, "Required"),
  startDate: z.string().min(1, "Required"),
  vehicles: z.array(z.object({
    type: z.string().min(1, "Required"),
    quantity: z.coerce.number().min(1)
  })).min(1, "At least one vehicle required"),
  regions: z.array(z.object({
    name: z.string().min(1, "Required"),
    boxes: z.coerce.number().min(1),
    deliveryDate: z.string().min(1, "Required"),
    receivingPlace: z.string().min(1, "Required"),
  })).min(1, "At least one region required")
});

type RouteFormValues = z.infer<typeof routeSchema>;

interface RouteFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RouteFormValues) => Promise<void>;
  initialData?: any;
  budgetId: string;
}

const VEHICLE_TYPES = [
  { value: "LORRY_HORSE", label: "LORRY (HORSE)" },
  { value: "LORRY_HORSE_AND_TRAILER", label: "LORRY (HORSE AND TRAILER)" },
  { value: "ESCORT_HARDTOP", label: "ESCORT (HARDTOP)" },
  { value: "ESCORT_COASTER", label: "ESCORT (COASTER)" },
];

const RouteFormDrawer = ({ isOpen, onClose, onSubmit, initialData }: RouteFormDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [regionsList, setRegionsList] = useState<any[]>([]);

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: "",
      loadingDate: "",
      startDate: "",
      vehicles: [{ type: "LORRY_HORSE", quantity: 1 }],
      regions: [{ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" }]
    }
  });

  const { fields: regionFields, append: appendRegion, remove: removeRegion } = useFieldArray({
    control,
    name: "regions"
  });

  const { fields: vehicleFields, append: appendVehicle, remove: removeVehicle } = useFieldArray({
    control,
    name: "vehicles"
  });

  useEffect(() => {
    const fetchRegions = async () => {
      const { data, error } = await supabase.from('regions').select('*').order('region_name');
      if (error) showError("Failed to load regions");
      else setRegionsList(data || []);
    };
    fetchRegions();
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        loadingDate: initialData.loading_date,
        startDate: initialData.start_date,
        vehicles: initialData.transportation_route_vehicles?.map((v: any) => ({
          type: v.vehicle_type,
          quantity: v.quantity
        })) || [{ type: "LORRY_HORSE", quantity: 1 }],
        regions: initialData.transportation_route_regions?.map((r: any) => ({
          name: r.region,
          boxes: r.boxes,
          deliveryDate: r.expected_delivery_date,
          receiving_place: r.receiving_place
        })) || [{ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" }]
      });
    } else {
      reset({
        name: "",
        loadingDate: "",
        startDate: "",
        vehicles: [{ type: "LORRY_HORSE", quantity: 1 }],
        regions: [{ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" }]
      });
    }
  }, [initialData, reset, isOpen]);

  const handleMsafaraChange = (regionName: string) => {
    setValue("name", regionName);
    const regionData = regionsList.find(r => r.region_name === regionName);
    
    // Auto-add to regions list if not already there
    const currentRegions = watch("regions");
    const exists = currentRegions.some(r => r.name === regionName);
    
    if (!exists && regionData) {
      // If the first region is empty, replace it, otherwise append
      if (currentRegions.length === 1 && !currentRegions[0].name) {
        setValue(`regions.0.name`, regionName);
        setValue(`regions.0.receivingPlace`, regionData.town || "");
      } else {
        appendRegion({
          name: regionName,
          boxes: 0,
          deliveryDate: watch("startDate") || "",
          receivingPlace: regionData.town || ""
        });
      }
    }
  };

  const handleRegionChange = (index: number, regionName: string) => {
    const regionData = regionsList.find(r => r.region_name === regionName);
    if (regionData) {
      setValue(`regions.${index}.name`, regionName);
      setValue(`regions.${index}.receivingPlace`, regionData.town || "");
    }
  };

  const onFormSubmit = async (data: RouteFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
      onClose();
    } catch (err) {
      // Error handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[650px] p-0 flex flex-col bg-white border-none shadow-2xl">
        <div className="bg-slate-900 text-white p-6">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Truck className="h-5 w-5 text-blue-400" />
              {initialData ? 'Edit Route' : 'Add New Route'}
            </SheetTitle>
            <SheetDescription className="text-slate-400">
              Define the route destination, schedule, and vehicle requirements.
            </SheetDescription>
          </SheetHeader>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Route Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-slate-700 font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" /> Msafara (Destination Region)
              </Label>
              <Select onValueChange={handleMsafaraChange} value={watch("name")}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue placeholder="Select destination region" />
                </SelectTrigger>
                <SelectContent>
                  {regionsList.map((r) => (
                    <SelectItem key={r.id} value={r.region_name}>{r.region_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" /> Loading Date
              </Label>
              <Input type="date" {...register("loadingDate")} className="h-11 rounded-xl border-slate-200" />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" /> Start Date
              </Label>
              <Input type="date" {...register("startDate")} className="h-11 rounded-xl border-slate-200" />
            </div>
          </div>

          {/* Vehicles Section */}
          <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" /> Vehicle Specification
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => appendVehicle({ type: "LORRY_HORSE", quantity: 1 })} className="h-7 text-blue-600 font-bold uppercase text-[9px] tracking-widest">
                <Plus className="w-3 h-3 mr-1" /> Add Vehicle
              </Button>
            </div>
            
            <div className="space-y-3">
              {vehicleFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Vehicle Type</Label>
                    <Select onValueChange={(val) => setValue(`vehicles.${index}.type`, val)} value={watch(`vehicles.${index}.type`)}>
                      <SelectTrigger className="h-9 rounded-lg border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Count</Label>
                    <Input type="number" {...register(`vehicles.${index}.quantity`)} className="h-9 rounded-lg border-slate-200" />
                  </div>
                  {vehicleFields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeVehicle(index)} className="h-9 w-9 text-slate-300 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Regions Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" /> Regions & Delivery
            </h3>

            <div className="space-y-4">
              {regionFields.map((field, index) => (
                <div key={field.id} className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4 relative group">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Region Name</Label>
                      <Select onValueChange={(val) => handleRegionChange(index, val)} value={watch(`regions.${index}.name`)}>
                        <SelectTrigger className="h-9 rounded-lg border-slate-200">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {regionsList.map((r) => (
                            <SelectItem key={r.id} value={r.region_name}>{r.region_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Boxes</Label>
                      <div className="relative">
                        <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input type="number" {...register(`regions.${index}.boxes`)} className="h-9 pl-8 rounded-lg border-slate-200" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Delivery Date</Label>
                      <Input type="date" {...register(`regions.${index}.deliveryDate`)} className="h-9 rounded-lg border-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Receiving Place</Label>
                      <Input {...register(`regions.${index}.receivingPlace`)} className="h-9 rounded-lg border-slate-200" />
                    </div>
                  </div>
                  {regionFields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRegion(index)} className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white border border-slate-100 text-slate-300 hover:text-red-600 shadow-sm">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={() => appendRegion({ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" })} className="w-full h-11 rounded-xl border-dashed border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all">
              <Plus className="w-4 h-4 mr-2" /> Add Another Region
            </Button>
          </div>
        </form>

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
          <Button onClick={handleSubmit(onFormSubmit)} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest px-8 rounded-xl h-11 min-w-[140px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? 'Update Route' : 'Save Route')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RouteFormDrawer;