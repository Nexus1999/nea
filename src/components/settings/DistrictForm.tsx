"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, MapPin, Save } from "lucide-react";

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

const districtFormSchema = z.object({
  id: z.number().optional(),
  district_name: z.string().min(2, { message: "District name is required." }),
  district_number: z.coerce.number().min(1, { message: "District number is required." }),
  region_number: z.coerce.number().min(1, { message: "Region is required." }),
});

export type DistrictFormValues = z.infer<typeof districtFormSchema>;

interface RegionOption {
  region_code: number;
  region_name: string;
}

interface DistrictFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  district?: DistrictFormValues;
  onSuccess: () => void;
}

const DistrictForm: React.FC<DistrictFormProps> = ({ open, onOpenChange, district, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const isEditing = !!district?.id;

  const form = useForm<DistrictFormValues>({
    resolver: zodResolver(districtFormSchema),
    defaultValues: {
      district_name: "",
      district_number: 0,
      region_number: 0,
      ...district,
    },
  });

  useEffect(() => {
    if (open) {
      fetchRegions();
      if (district) {
        form.reset(district);
      } else {
        form.reset({
          district_name: "",
          district_number: 0,
          region_number: 0,
        });
      }
    }
  }, [open, district, form]);

  const fetchRegions = async () => {
    const { data, error } = await supabase
      .from('regions')
      .select('region_code, region_name')
      .order('region_name', { ascending: true });
    
    if (!error && data) {
      setRegions(data);
    }
  };

  const onSubmit = async (values: DistrictFormValues) => {
    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('districts')
          .update({
            district_name: values.district_name.toUpperCase(),
            district_number: values.district_number,
            region_number: values.region_number,
          })
          .eq('id', values.id);

        if (error) throw error;
        showSuccess("District updated successfully!");
      } else {
        const { error } = await supabase
          .from('districts')
          .insert({
            district_name: values.district_name.toUpperCase(),
            district_number: values.district_number,
            region_number: values.region_number,
          });

        if (error) throw error;
        showSuccess("New district added successfully!");
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
      <DialogContent className="sm:max-w-[500px] rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-600" />
            {isEditing ? "Edit District" : "Add New District"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details for this administrative district." : "Register a new administrative district in the system."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
            <FormField
              control={form.control}
              name="region_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-xs uppercase tracking-wider text-slate-500">Parent Region</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(parseInt(val))} 
                    value={field.value?.toString()}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl">
                      {regions.map((region) => (
                        <SelectItem key={region.region_code} value={region.region_code.toString()}>
                          {region.region_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="district_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-xs uppercase tracking-wider text-slate-500">District Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. ILALA" {...field} disabled={loading} className="h-11 rounded-xl uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="district_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-xs uppercase tracking-wider text-slate-500">District Code</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 201" {...field} disabled={loading} className="h-11 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 bg-black hover:bg-slate-800 text-white font-bold rounded-xl transition-all"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> {isEditing ? "Save Changes" : "Create District"}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DistrictForm;