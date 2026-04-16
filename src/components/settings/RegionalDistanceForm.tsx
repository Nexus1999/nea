"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Navigation, Save } from "lucide-react";

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

const distanceFormSchema = z.object({
  id: z.number().optional(),
  from_region_name: z.string().min(1, "Required"),
  to_region_name: z.string().min(1, "Required"),
  distance_km: z.coerce.number().min(0, "Must be positive"),
  via: z.string().optional().nullable(),
});

export type DistanceFormValues = z.infer<typeof distanceFormSchema>;

interface RegionalDistanceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  distance?: DistanceFormValues;
  onSuccess: () => void;
}

const RegionalDistanceForm: React.FC<RegionalDistanceFormProps> = ({ open, onOpenChange, distance, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const isEditing = !!distance?.id;

  const form = useForm<DistanceFormValues>({
    resolver: zodResolver(distanceFormSchema),
    defaultValues: {
      from_region_name: "Dar es Salaam",
      to_region_name: "",
      distance_km: 0,
      via: null,
      ...distance,
    },
  });

  useEffect(() => {
    const fetchRegions = async () => {
      const { data } = await supabase.from('regions').select('region_name').order('region_name');
      setRegions(data || []);
    };
    fetchRegions();
  }, []);

  useEffect(() => {
    if (distance) {
      form.reset(distance);
    } else {
      form.reset({
        from_region_name: "Dar es Salaam",
        to_region_name: "",
        distance_km: 0,
        via: null,
      });
    }
  }, [distance, form, open]);

  const onSubmit = async (values: DistanceFormValues) => {
    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('region_distances')
          .update({
            from_region_name: values.from_region_name,
            to_region_name: values.to_region_name,
            distance_km: values.distance_km,
            via: values.via || null,
          })
          .eq('id', values.id);

        if (error) throw error;
        showSuccess("Distance updated successfully!");
      } else {
        const { error } = await supabase
          .from('region_distances')
          .insert({
            from_region_name: values.from_region_name,
            to_region_name: values.to_region_name,
            distance_km: values.distance_km,
            via: values.via || null,
          });

        if (error) throw error;
        showSuccess("New distance added successfully!");
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
            <Navigation className="h-5 w-5 text-blue-600" />
            {isEditing ? "Edit Distance" : "Add New Distance"}
          </DialogTitle>
          <DialogDescription>
            Define the distance between two administrative regions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="from_region_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-xs uppercase tracking-wider text-slate-500">From</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regions.map((r) => (
                          <SelectItem key={r.region_name} value={r.region_name}>{r.region_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="to_region_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-xs uppercase tracking-wider text-slate-500">To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {regions.map((r) => (
                          <SelectItem key={r.region_name} value={r.region_name}>{r.region_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="via"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-xs uppercase tracking-wider text-slate-500">Via (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "none"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Direct route" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Direct Route</SelectItem>
                      {regions.map((r) => (
                        <SelectItem key={r.region_name} value={r.region_name}>{r.region_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="distance_km"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-xs uppercase tracking-wider text-slate-500">Distance (KM)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 450" {...field} disabled={loading} className="h-11 rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 bg-black hover:bg-slate-800 text-white font-bold rounded-xl transition-all"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> {isEditing ? "Save Changes" : "Create Distance"}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RegionalDistanceForm;