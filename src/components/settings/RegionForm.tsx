"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Globe, Save } from "lucide-react";

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
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

const regionFormSchema = z.object({
  id: z.number().optional(),
  region_name: z.string().min(2, { message: "Region name is required." }),
  region_code: z.coerce.number().min(1, { message: "Region code is required." }),
});

export type RegionFormValues = z.infer<typeof regionFormSchema>;

interface RegionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region?: RegionFormValues;
  onSuccess: () => void;
}

const RegionForm: React.FC<RegionFormProps> = ({ open, onOpenChange, region, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const isEditing = !!region?.id;

  const form = useForm<RegionFormValues>({
    resolver: zodResolver(regionFormSchema),
    defaultValues: {
      region_name: "",
      region_code: 0,
      ...region,
    },
  });

  useEffect(() => {
    if (region) {
      form.reset(region);
    } else {
      form.reset({
        region_name: "",
        region_code: 0,
      });
    }
  }, [region, form]);

  const onSubmit = async (values: RegionFormValues) => {
    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('regions')
          .update({
            region_name: values.region_name.toUpperCase(),
            region_code: values.region_code,
          })
          .eq('id', values.id);

        if (error) throw error;
        showSuccess("Region updated successfully!");
      } else {
        const { error } = await supabase
          .from('regions')
          .insert({
            region_name: values.region_name.toUpperCase(),
            region_code: values.region_code,
          });

        if (error) throw error;
        showSuccess("New region added successfully!");
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
      <DialogContent className="sm:max-w-[450px] rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            {isEditing ? "Edit Region" : "Add New Region"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the details for this administrative region." : "Register a new administrative region in the system."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
            <FormField
              control={form.control}
              name="region_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-xs uppercase tracking-wider text-slate-500">Region Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. DAR ES SALAAM" {...field} disabled={loading} className="h-11 rounded-xl uppercase" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="region_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold text-xs uppercase tracking-wider text-slate-500">Region Code</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 02" {...field} disabled={loading} className="h-11 rounded-xl" />
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
                  <><Save className="mr-2 h-4 w-4" /> {isEditing ? "Save Changes" : "Create Region"}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RegionForm;