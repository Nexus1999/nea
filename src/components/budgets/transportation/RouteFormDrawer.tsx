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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Truck,
  MapPin,
  Package,
  Calendar,
  Loader2,
  Navigation,
  ArrowRight,
  Sparkles,
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
import { SuggestedMsafara } from "@/utils/intelligentRoutePlanner";
import SmartRouteSuggester from "./SmartRouteSuggester";
import RegionalDemandsTable from "./RegionalDemandsTable";

const routeSchema = z.object({
  name: z.string().min(1, "Route name is required"),
  startingPoint: z.string().min(1, "Starting point is required"),
  loadingDate: z.string().min(1, "Loading date is required"),
  startDate: z.string().min(1, "Start date is required"),
  vehicles: z.array(
    z.object({
      type: z.string().min(1, "Vehicle type is required"),
      quantity: z.coerce.number().min(1, "At least 1 vehicle"),
    })
  ).min(1, "At least one vehicle is required"),
  regions: z.array(
    z.object({
      name: z.string().min(1, "Region name is required"),
      boxes: z.coerce.number().min(1, "Must be at least 1 box"),
      deliveryDate: z.string().min(1, "Delivery date is required"),
      receivingPlace: z.string().min(1, "Receiving place is required"),
    })
  ).min(1, "At least one region is required"),
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
  { value: "LORRY_HORSE",             label: "LORRY — SCANIA Horse (K)" },
  { value: "LORRY_HORSE_AND_TRAILER", label: "LORRY — SCANIA Horse + Trailer (KT)" },
  { value: "LORRY_ISUZU",            label: "LORRY — ISUZU (D)" },
  { value: "ESCORT_HARDTOP",         label: "ESCORT — Hardtop (GN)" },
  { value: "ESCORT_COASTER",         label: "ESCORT — Coaster (C)" },
];

const RouteFormDrawer: React.FC<RouteFormDrawerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  budgetId,
}) => {
  const [loading, setLoading] = useState(false);
  const [regionsList, setRegionsList] = useState<any[]>([]);
  const [showSuggester, setShowSuggester] = useState(false);
  const [showDemands, setShowDemands] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: "",
      startingPoint: "DAR ES SALAAM",
      loadingDate: "",
      startDate: "",
      vehicles: [{ type: "LORRY_HORSE_AND_TRAILER", quantity: 1 }],
      regions: [{ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" }],
    },
  });

  const { fields: regionFields, append: appendRegion, remove: removeRegion, replace: replaceRegions } =
    useFieldArray({ control, name: "regions" });

  const { fields: vehicleFields, append: appendVehicle, remove: removeVehicle, replace: replaceVehicles } =
    useFieldArray({ control, name: "vehicles" });

  useEffect(() => {
    const fetchRegions = async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('region_name');
      if (error) showError("Failed to load regions list");
      else setRegionsList(data || []);
    };
    fetchRegions();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      reset({
        name: initialData.name || "",
        startingPoint: initialData.starting_point || "DAR ES SALAAM",
        loadingDate: initialData.loading_date || "",
        startDate: initialData.start_date || "",
        vehicles: initialData.transportation_route_vehicles?.map((v: any) => ({
          type: v.vehicle_type,
          quantity: v.quantity,
        })) || [{ type: "LORRY_HORSE_AND_TRAILER", quantity: 1 }],
        regions: initialData.transportation_route_regions?.map((r: any) => ({
          name: r.region,
          boxes: r.boxes,
          deliveryDate: r.expected_delivery_date,
          receivingPlace: r.receiving_place,
        })) || [{ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" }],
      });
    } else {
      reset({
        name: "",
        startingPoint: "DAR ES SALAAM",
        loadingDate: "",
        startDate: "",
        vehicles: [{ type: "LORRY_HORSE_AND_TRAILER", quantity: 1 }],
        regions: [{ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" }],
      });
    }
  }, [initialData, reset, isOpen]);

  const handleUseSuggestion = (msafara: SuggestedMsafara) => {
    setValue("name", msafara.name);
    setValue("startingPoint", msafara.startingPoint);
    setValue("loadingDate", msafara.loadingDate);
    setValue("startDate", msafara.startDate);
    replaceRegions(
      msafara.regions.map((r) => ({
        name: r.name,
        boxes: r.boxes,
        deliveryDate: r.deliveryDate,
        receivingPlace: r.receivingPlace,
      }))
    );
    replaceVehicles(
      msafara.vehicles.map((v) => ({
        type: v.type,
        quantity: v.quantity,
      }))
    );
  };

  const handleRegionChange = (index: number, regionName: string) => {
    const regionData = regionsList.find((r) => r.region_name === regionName);
    setValue(`regions.${index}.name`, regionName);
    if (regionData) {
      setValue(`regions.${index}.receivingPlace`, regionData.town || "");
    }
  };

  const onFormSubmit = async (data: RouteFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const currentPath = watch("regions");
  const startPoint = watch("startingPoint");

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-[700px] p-0 flex flex-col bg-white border-none shadow-2xl">
          <div className="bg-slate-900 text-white p-6 shrink-0">
            <SheetHeader>
              <SheetTitle className="text-xl font-bold flex items-center gap-2 text-white">
                <Navigation className="h-5 w-5 text-blue-400" />
                {initialData ? "Edit Route" : "Plan New Route"}
              </SheetTitle>
              <SheetDescription className="text-slate-400">
                Define the stop sequence and logistics for this Msafara.
              </SheetDescription>
            </SheetHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowDemands(!showDemands)}
                variant="outline"
                className="flex-1 h-12 border-indigo-200 text-indigo-600 font-black uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2"
              >
                <Package className="h-4 w-4" />
                {showDemands ? "Hide Regional Demands" : "Manage Regional Demands"}
              </Button>
              {!initialData && (
                <Button
                  type="button"
                  onClick={() => setShowSuggester(true)}
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  AI Smart Route Suggester
                </Button>
              )}
            </div>

            {showDemands && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <RegionalDemandsTable budgetId={budgetId} />
              </div>
            )}

            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                  <Navigation className="w-3 h-3" /> Journey Sequence
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-white text-slate-600 border-slate-200">
                    {startPoint || "DAR ES SALAAM"}
                  </Badge>
                  <ArrowRight className="w-3 h-3 text-slate-300" />
                  {currentPath.map((r, idx) => (
                    <React.Fragment key={idx}>
                      {r.name && (
                        <>
                          <Badge className={idx === currentPath.length - 1 ? "bg-blue-600" : "bg-slate-800"}>
                            {r.name}
                          </Badge>
                          {idx < currentPath.length - 1 && currentPath[idx + 1]?.name && (
                            <ArrowRight className="w-3 h-3 text-slate-300" />
                          )}
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" /> Starting Point
                  </Label>
                  <Input {...register("startingPoint")} className="h-11 rounded-xl border-slate-200" />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-slate-400" /> Msafara Name
                  </Label>
                  <Input {...register("name")} className="h-11 rounded-xl border-slate-200" placeholder="e.g. Msafara 1 - Lake Zone" />
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

              <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600" /> Vehicles
                  </h3>
                  <Button type="button" variant="ghost" size="sm" onClick={() => appendVehicle({ type: "LORRY_HORSE_AND_TRAILER", quantity: 1 })} className="h-7 text-blue-600 font-bold uppercase text-[9px] tracking-widest">
                    <Plus className="w-3 h-3 mr-1" /> Add Vehicle
                  </Button>
                </div>
                <div className="space-y-3">
                  {vehicleFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-[9px] font-black uppercase text-slate-400">Type</Label>
                        <Select onValueChange={(val) => setValue(`vehicles.${index}.type`, val)} value={watch(`vehicles.${index}.type`)}>
                          <SelectTrigger className="h-9 rounded-lg border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VEHICLE_TYPES.map((t) => (
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

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" /> Path Stops
                </h3>
                <div className="space-y-4">
                  {regionFields.map((field, index) => (
                    <div key={field.id} className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-4 relative group">
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 text-white text-[10px] font-black flex items-center justify-center shadow-lg">
                        {index + 1}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-slate-400">Region</Label>
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
                          <Input type="number" {...register(`regions.${index}.boxes`)} className="h-9 rounded-lg border-slate-200" />
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
                <Button type="button" variant="outline" onClick={() => appendRegion({ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" })} className="w-full h-11 rounded-xl border-dashed border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 hover:text-blue-600 transition-all">
                  <Plus className="w-4 h-4 mr-2" /> Add Next Stop
                </Button>
              </div>
            </form>
          </div>

          <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={onClose} disabled={loading} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
            <Button onClick={handleSubmit(onFormSubmit)} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest px-8 rounded-xl h-11 min-w-[140px]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : initialData ? "Update Route" : "Save Route"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <SmartRouteSuggester
        isOpen={showSuggester}
        onClose={() => setShowSuggester(false)}
        onSelect={handleUseSuggestion}
        loadingDate={watch("loadingDate")}
      />
    </>
  );
};

export default RouteFormDrawer;