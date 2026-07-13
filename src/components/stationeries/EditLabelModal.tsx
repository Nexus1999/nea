"use client";

import React, { useEffect } from "react";
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
import { Loader2, Save } from "lucide-react";
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
  bkm_red: z.coerce.number().min(0).optional(),
  bkm_pink: z.coerce.number().min(0).optional(),
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

  const category = label?.category?.toLowerCase() || "";
  const isStationery = category.includes("stationeries");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-2xl">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50/50">
          <DialogTitle className="text-lg font-bold">Edit Label Information</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-slate-500">Region</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-9 rounded-lg" />
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
                    <FormLabel className="text-xs font-bold uppercase text-slate-500">District</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="h-9 rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="center_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-slate-500">Center No.</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="h-9 rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="center_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-slate-500">Center Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} className="h-9 rounded-lg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isStationery && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <FormField
                  control={form.control}
                  name="normal_booklets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase text-slate-500">Normal Booklets</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-9 rounded-lg" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="graph_booklets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase text-slate-500">Graph Booklets</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-9 rounded-lg" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="normal_loosesheets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase text-slate-500">Normal Sheets</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-9 rounded-lg" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="graph_loosesheets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase text-slate-500">Graph Sheets</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-9 rounded-lg" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="bkm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-slate-500">BKM</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="h-9 rounded-lg" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="container_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-slate-500">Box No.</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-9 rounded-lg" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_containers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-slate-500">Total Boxes</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="h-9 rounded-lg" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {!isStationery && (
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-slate-500">Item Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="h-9 rounded-lg" />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={form.formState.isSubmitting}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white gap-2"
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