"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, MapPinned, Save, Truck, Car, Shield, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const guidelineSchema = z.object({
  id: z.number().optional(),
  region_id: z.coerce.number().min(1, "Region is required"),
  via: z.string().optional().nullable(),
  distance_km: z.coerce.number().min(0),
  category: z.enum(["EXAMS", "NON_EXAMS"]),
  days_light: z.coerce.number().min(0),
  days_truck: z.coerce.number().min(0),
  drivers_light: z.coerce.number().min(0),
  drivers_truck: z.coerce.number().min(0),
  police_light: z.coerce.number().min(0),
  police_truck: z.coerce.number().min(0),
  security_light: z.coerce.number().min(0),
  security_truck: z.coerce.number().min(0),
  exam_officers_light: z.coerce.number().min(0),
  exam_officers_truck: z.coerce.number().min(0),
});

export type GuidelineFormValues = z.infer<typeof guidelineSchema>;

interface TransportGuidelineFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guideline?: GuidelineFormValues;
  onSuccess: () => void;
}

const TransportGuidelineForm: React.FC<TransportGuidelineFormProps> = ({ open, onOpenChange, guideline, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const isEditing = !!guideline?.id;

  const form = useForm<GuidelineFormValues>({
    resolver: zodResolver(guidelineSchema),
    defaultValues: {
      category: "EXAMS",
      distance_km: 0,
      days_light: 1,
      days_truck: 1,
      drivers_light: 1,
      drivers_truck: 1,
      police_light: 2,
      police_truck: 2,
      security_light: 1,
      security_truck: 1,
      exam_officers_light: 1,
      exam_officers_truck: 1,
      ...guideline,
    },
  });

  useEffect(() => {
    const fetchRegions = async () => {
      const { data } = await supabase.from('regions').select('id, region_name').order('region_name');
      setRegions(data || []);
    };
    fetchRegions();
  }, []);

  useEffect(() => {
    if (guideline) {
      form.reset(guideline);
    } else {
      form.reset({
        category: "EXAMS",
        distance_km: 0,
        days_light: 1,
        days_truck: 1,
        drivers_light: 1,
        drivers_truck: 1,
        police_light: 2,
        police_truck: 2,
        security_light: 1,
        security_truck: 1,
        exam_officers_light: 1,
        exam_officers_truck: 1,
      });
    }
  }, [guideline, form, open]);

  const onSubmit = async (values: GuidelineFormValues) => {
    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('transportation_days_guideline')
          .update(values)
          .eq('id', values.id);
        if (error) throw error;
        showSuccess("Guideline updated successfully!");
      } else {
        const { error } = await supabase
          .from('transportation_days_guideline')
          .insert(values);
        if (error) throw error;
        showSuccess("New guideline added successfully!");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <MapPinned className="h-5 w-5 text-indigo-600" />
            {isEditing ? "Edit Guideline" : "Add Transport Guideline"}
          </DialogTitle>
          <DialogDescription>
            Define travel days and personnel requirements for a specific region.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="region_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Region</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regions.map((r) => (
                          <SelectItem key={r.id} value={r.id.toString()}>{r.region_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="via"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Via (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Tanga" {...field} value={field.value || ""} className="h-11 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="distance_km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Distance (KM)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="h-11 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Tabs defaultValue="light" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl h-12 bg-slate-100 p-1">
                <TabsTrigger value="light" className="rounded-lg font-bold uppercase text-[10px] tracking-widest gap-2">
                  <Car className="w-4 h-4" /> Light Vehicles
                </TabsTrigger>
                <TabsTrigger value="truck" className="rounded-lg font-bold uppercase text-[10px] tracking-widest gap-2">
                  <Truck className="w-4 h-4" /> Heavy Trucks
                </TabsTrigger>
              </TabsList>

              <TabsContent value="light" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="days_light" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase text-slate-500">Travel Days</FormLabel><FormControl><Input type="number" {...field} className="h-10 rounded-lg" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="drivers_light" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase text-slate-500">Drivers</FormLabel><FormControl><Input type="number" {...field} className="h-10 rounded-lg" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="police_light" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase text-slate-500">Police</FormLabel><FormControl><Input type="number" {...field} className="h-10 rounded-lg" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="security_light" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase text-slate-500">Security</FormLabel><FormControl><Input type="number" {...field} className="h-10 rounded-lg" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="exam_officers_light" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase text-slate-500">Exam Officers</FormLabel><FormControl><Input type="number" {...field} className="h-10 rounded-lg" /></FormControl></FormItem>
                  )} />
                </div>
              </TabsContent>

              <TabsContent value="truck" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="days_truck" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase text-slate-500">Travel Days</FormLabel><FormControl><Input type="number" {...field} className="h-10 rounded-lg" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="drivers_truck" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase text-slate-500">Drivers</FormLabel><FormControl><Input type="number" {...field} className="h-10 rounded-lg" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="police_truck" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase text-slate-500">Police</FormLabel><FormControl><Input type="number" {...field} className="h-10 rounded-lg" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="security_truck" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase text-slate-500">Security</FormLabel><FormControl><Input type="number" {...field} className="h-10 rounded-lg" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="exam_officers_truck" render={({ field }) => (
                    <FormItem><FormLabel className="text-[10px] font-bold uppercase text-slate-500">Exam Officers</FormLabel><FormControl><Input type="number" {...field} className="h-10 rounded-lg" /></FormControl></FormItem>
                  )} />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> {isEditing ? "Save Changes" : "Create Guideline"}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default TransportGuidelineForm;