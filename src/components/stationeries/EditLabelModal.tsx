"use client";

import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import { Loader2, Save, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

const labelSchema = z.object({
  id: z.number(),
  region: z.string().min(1, "Region is required"),
  district: z.string().nullable().optional(),
  center_name: z.string().nullable().optional(),
  center_number: z.string().nullable().optional(),
  normal_booklets: z.coerce.number().min(0).default(0),
  graph_booklets: z.coerce.number().min(0).default(0),
  normal_loosesheets: z.coerce.number().min(0).default(0),
  graph_loosesheets: z.coerce.number().min(0).default(0),
  bkm: z.coerce.number().min(0).default(0),
  bkm_red: z.coerce.number().min(0).default(0),
  bkm_pink: z.coerce.number().min(0).default(0),
  container_number: z.string().min(1, "Container number is required"),
  total_containers: z.coerce.number().min(1).default(1),
  quantity: z.coerce.number().min(0).default(0),
});

type LabelFormValues = z.infer<typeof labelSchema>;

interface EditLabelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: any | null;
  onSuccess: () => void;
}

const EditLabelModal: React.FC<EditLabelModalProps> = ({
  open,
  onOpenChange,
  label,
  onSuccess,
}) => {
  const form = useForm<LabelFormValues>({
    resolver: zodResolver(labelSchema),
    defaultValues: {
      id: 0,
      region: "",
      district: "",
      center_name: "",
      center_number: "",
      normal_booklets: 0,
      graph_booklets: 0,
      normal_loosesheets: 0,
      graph_loosesheets: 0,
      bkm: 0,
      bkm_red: 0,
      bkm_pink: 0,
      container_number: "",
      total_containers: 1,
      quantity: 0,
    },
  });

  useEffect(() => {
    if (label) {
      form.reset({
        id: label.id,
        region: label.region || "",
        district: label.district || "",
        center_name: label.center_name || "",
        center_number: label.center_number || "",
        normal_booklets: label.normal_booklets || 0,
        graph_booklets: label.graph_booklets || 0,
        normal_loosesheets: label.normal_loosesheets || 0,
        graph_loosesheets: label.graph_loosesheets || 0,
        bkm: label.bkm || 0,
        bkm_red: label.bkm_red || 0,
        bkm_pink: label.bkm_pink || 0,
        container_number: label.container_number || "",
        total_containers: label.total_containers || 1,
        quantity: label.quantity || 0,
      });
    }
  }, [label, form]);

  const onSubmit = async (values: LabelFormValues) => {
    try {
      const { error } = await supabase
        .from("labels")
        .update(values)
        .eq("id", values.id);

      if (error) throw error;

      showSuccess("Label updated successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      showError(err.message || "Failed to update label.");
    }
  };

  // Determine which fields to show based on category and item
  const visibleFields = useMemo(() => {
    if (!label) return [];
    const cat = (label.category || "").toLowerCase();
    const item = (label.item || "").toUpperCase();

    const fields: string[] = [];

    if (cat.includes("stationeries") && !cat.includes("braille") && !cat.includes("district")) {
      fields.push("normal_booklets", "graph_booklets", "normal_loosesheets", "graph_loosesheets", "bkm");
    } else if (cat.includes("braille")) {
      fields.push("quantity", "bkm"); // Sheets (stored in quantity) and BKM
    } else if (cat === "bkm") {
      fields.push("bkm");
    } else if (cat.includes("district") || cat.includes("supervisors")) {
      if (item === "BKM") {
        fields.push("bkm_red", "bkm_pink", "quantity");
      } else {
        fields.push("quantity");
      }
    } else if (cat.includes("ict") || cat.includes("arabic") || cat.includes("fine_arts") || cat.includes("timetables") || cat.includes("kitbags")) {
      fields.push("quantity");
      if (cat.includes("fine_arts")) fields.push("bkm");
    }

    return fields;
  }, [label]);

  if (!label) return null;

  const category = (label.category || "").toUpperCase();
  const itemName = (label.item || "").toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl border-none shadow-2xl">
        <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <Edit className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">Edit Label</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                   {category}
                 </span>
                 {itemName && itemName !== category && (
                   <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                     {itemName}
                   </span>
                 )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Common Location/Center Fields */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Info className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">General Information</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Region</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10 rounded-xl border-slate-200" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">District</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} className="h-10 rounded-xl border-slate-200" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {label.center_number && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="center_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Center No.</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="h-10 rounded-xl border-slate-200" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="center_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Center Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} className="h-10 rounded-xl border-slate-200" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Dynamic Content Fields */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-400">
                <Package className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Label Contents</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {visibleFields.includes("normal_booklets") && (
                  <FormField
                    control={form.control}
                    name="normal_booklets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Normal Booklets</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-10 rounded-xl border-slate-200" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                {visibleFields.includes("graph_booklets") && (
                  <FormField
                    control={form.control}
                    name="graph_booklets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Graph Booklets</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-10 rounded-xl border-slate-200" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                {visibleFields.includes("normal_loosesheets") && (
                  <FormField
                    control={form.control}
                    name="normal_loosesheets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Normal Sheets</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-10 rounded-xl border-slate-200" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                {visibleFields.includes("graph_loosesheets") && (
                  <FormField
                    control={form.control}
                    name="graph_loosesheets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Graph Sheets</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-10 rounded-xl border-slate-200" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                {visibleFields.includes("bkm") && (
                  <FormField
                    control={form.control}
                    name="bkm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">BKM</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-10 rounded-xl border-slate-200" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                {visibleFields.includes("bkm_red") && (
                  <FormField
                    control={form.control}
                    name="bkm_red"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-red-500 tracking-wider">BKM Red</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-10 rounded-xl border-red-100 bg-red-50/30" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                {visibleFields.includes("bkm_pink") && (
                  <FormField
                    control={form.control}
                    name="bkm_pink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-pink-500 tracking-wider">BKM Pink</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-10 rounded-xl border-pink-100 bg-pink-50/30" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                {visibleFields.includes("quantity") && (
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                          {label.category?.includes("braille") ? "Braille Sheets" : "Quantity"}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-10 rounded-xl border-slate-200 font-bold" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Container Info */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
               <div className="flex items-center gap-2 text-slate-400">
                <Boxes className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Container Management</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="container_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Box Number</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10 rounded-xl border-slate-200 text-center font-black" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="total_containers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Total Boxes</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-10 rounded-xl border-slate-200 text-center font-black" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold text-xs uppercase tracking-widest">
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={form.formState.isSubmitting}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white gap-2 px-8 shadow-lg shadow-slate-200 font-bold text-xs uppercase tracking-widest"
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditLabelModal;