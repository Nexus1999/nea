"use client";

import React, { useEffect } from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Truck, Shield, MapPin, Package } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const routeSchema = z.object({
  name: z.string().min(2, "Required"),
  loadingDate: z.string().min(1, "Required"),
  startDate: z.string().min(1, "Required"),
  lorryCount: z.coerce.number().min(1),
  escortCount: z.coerce.number().min(1),
  regions: z.array(z.object({
    name: z.string().min(2, "Required"),
    boxes: z.coerce.number().min(1),
    deliveryDate: z.string().min(1, "Required"),
    receivingPlace: z.string().min(2, "Required"),
  })).min(1, "At least one region required")
});

type RouteFormValues = z.infer<typeof routeSchema>;

interface RouteFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RouteFormValues) => void;
  initialData?: any;
}

const RouteFormDrawer = ({ isOpen, onClose, onSubmit, initialData }: RouteFormDrawerProps) => {
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: "",
      loadingDate: "",
      startDate: "",
      lorryCount: 1,
      escortCount: 1,
      regions: [{ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "regions"
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    } else {
      reset({
        name: "",
        loadingDate: "",
        startDate: "",
        lorryCount: 1,
        escortCount: 1,
        regions: [{ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" }]
      });
    }
  }, [initialData, reset, isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[650px] p-0 flex flex-col bg-white">
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <SheetHeader>
            <SheetTitle className="text-xl font-black uppercase tracking-tight">
              {initialData ? 'Edit Route' : 'Add New Route'}
            </SheetTitle>
          </SheetHeader>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Msafara / Route Name</Label>
              <Input {...register("name")} placeholder="e.g. NORTHERN ROUTE" className="h-11 rounded-xl font-bold" />
              {errors.name && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Date</Label>
              <Input type="date" {...register("loadingDate")} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Date</Label>
              <Input type="date" {...register("startDate")} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lorry Count</Label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type="number" {...register("lorryCount")} className="h-11 pl-10 rounded-xl font-bold" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escort Count</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type="number" {...register("escortCount")} className="h-11 pl-10 rounded-xl font-bold" />
              </div>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* Regions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" /> Regions & Delivery
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", boxes: 0, deliveryDate: "", receivingPlace: "" })} className="h-8 rounded-lg border-indigo-100 text-indigo-600 font-bold uppercase text-[9px] tracking-widest">
                <Plus className="w-3 h-3 mr-1" /> Add Region
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/30 space-y-4 relative group">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Region Name</Label>
                      <Input {...register(`regions.${index}.name`)} placeholder="e.g. Arusha" className="h-9 rounded-lg bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Boxes</Label>
                      <div className="relative">
                        <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input type="number" {...register(`regions.${index}.boxes`)} className="h-9 pl-8 rounded-lg bg-white" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Delivery Date</Label>
                      <Input type="date" {...register(`regions.${index}.deliveryDate`)} className="h-9 rounded-lg bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Receiving Place</Label>
                      <Input {...register(`regions.${index}.receivingPlace`)} placeholder="e.g. Police Station" className="h-9 rounded-lg bg-white" />
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
          <Button variant="ghost" onClick={onClose} className="font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest px-8 rounded-xl h-11">
            {initialData ? 'Update Route' : 'Save Route'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RouteFormDrawer;