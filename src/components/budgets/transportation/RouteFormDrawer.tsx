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
  Hash,
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
  lorryType: z.enum(["HORSE", "HORSE AND TRAILER"]),
  lorryCount: z.coerce.number().min(1).max(3),
  escortType: z.enum(["HARDTOP", "COASTER"]),
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

const RouteFormDrawer = ({ isOpen, onClose, onSubmit, initialData }: RouteFormDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [regionsList, setRegionsList] = useState<any[]>([]);

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: "",
      loadingDate: "",
      startDate: "",
      lorryType: "HORSE",
      lorryCount: 1,
      escortType: "HARDTOP",
      regions: [{ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "regions"
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
      // Map DB structure to form structure
      const lorries = initialData.transportation_route_vehicles?.find((v: any) => v.vehicle_type.startsWith('LORRY'));
      const escort = initialData.transportation_route_vehicles?.find((v: any) => v.vehicle_type.startsWith('ESCORT'));
      
      reset({
        name: initialData.name,
        loadingDate: initialData.loading_date,
        startDate: initialData.start_date,
        lorryType: lorries?.vehicle_type.replace('LORRY_', '') as any || "HORSE",
        lorryCount: lorries?.quantity || 1,
        escortType: escort?.vehicle_type.replace('ESCORT_', '') as any || "HARDTOP",
        regions: initialData.transportation_route_regions?.map((r: any) => ({
          name: r.region,
          boxes: r.boxes,
          deliveryDate: r.expected_delivery_date,
          receivingPlace: r.receiving_place
        })) || [{ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" }]
      });
    } else {
      reset({
        name: "",
        loadingDate: "",
        startDate: "",
        lorryType: "HORSE",
        lorryCount: 1,
        escortType: "HARDTOP",
        regions: [{ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" }]
      });
    }
  }, [initialData, reset, isOpen]);

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
              <Select onValueChange={(val) => setValue("name", val)} value={watch("name")}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue placeholder="Select destination region" />
                </SelectTrigger>
                <SelectContent>
                  {regionsList.map((r) => (
                    <SelectItem key={r.id} value={r.region_name}>{r.region_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.name && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.name.message}</p>}
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
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" /> Vehicle Specification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Lorry Type</Label>
                <Select onValueChange={(val: any) => setValue("lorryType", val)} value={watch("lorryType")}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HORSE">HORSE</SelectItem>
                    <SelectItem value="HORSE AND TRAILER">HORSE AND TRAILER</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Lorry Count</Label>
                <Select onValueChange={(val) => setValue("lorryCount", parseInt(val))} value={watch("lorryCount").toString()}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Lorry</SelectItem>
                    <SelectItem value="2">2 Lorries</SelectItem>
                    <SelectItem value="3">3 Lorries</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Escort Type</Label>
                <Select onValueChange={(val: any) => setValue("escortType", val)} value={watch("escortType")}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HARDTOP">HARDTOP</SelectItem>
                    <SelectItem value="COASTER">COASTER</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Escort Count</Label>
                <Input value="1" disabled className="h-11 rounded-xl bg-slate-100 border-slate-200 font-bold" />
              </div>
            </div>
          </div>

          {/* Regions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" /> Regions & Delivery
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" })} className="h-8 rounded-lg border-slate-200 text-slate-600 font-bold uppercase text-[9px] tracking-widest">
                <Plus className="w-3 h-3 mr-1" /> Add Region
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
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
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white border border-slate-100 text-slate-300 hover:text-red-600 shadow-sm">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
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