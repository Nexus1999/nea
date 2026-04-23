"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Package, Save } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/providers/AuthProvider";
import { MasterSummaryOption } from "@/types/stationeries";

const stationeryFormSchema = z.object({
  id: z.number().optional(),
  mid: z.preprocess(
    (val) => Number(val),
    z.number().int().positive({ message: "Master Summary is required." })
  ),
  status: z.enum(["Draft", "Finalized"], {
    required_error: "Status is required.",
  }),
});

export type StationeryFormValues = z.infer<typeof stationeryFormSchema>;

interface StationeryFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationery?: StationeryFormValues;
  onSuccess: () => void;
}

const StationeryFormDrawer: React.FC<StationeryFormDrawerProps> = ({ open, onOpenChange, stationery, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [masterSummaries, setMasterSummaries] = useState<MasterSummaryOption[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);
  const { user } = useAuth();
  const isEditing = !!stationery?.id;

  const form = useForm<StationeryFormValues>({
    resolver: zodResolver(stationeryFormSchema),
    defaultValues: {
      mid: undefined,
      status: "Draft",
      ...stationery,
    },
  });

  useEffect(() => {
    if (open) {
      const fetchMasterSummaries = async () => {
        setSummariesLoading(true);
        const { data, error } = await supabase
          .from('mastersummaries')
          .select('id, Examination, Code, Year')
          .eq('is_latest', true)
          .order('Year', { ascending: false });

        if (error) {
          showError(error.message);
          setMasterSummaries([]);
        } else {
          setMasterSummaries(data || []);
        }
        setSummariesLoading(false);
      };
      fetchMasterSummaries();
    }
  }, [open]);

  useEffect(() => {
    if (stationery) {
      form.reset(stationery);
    } else {
      form.reset({
        mid: undefined,
        status: "Draft",
      });
    }
  }, [stationery, form]);

  const onSubmit = async (values: StationeryFormValues) => {
    setLoading(true);
    if (!user) {
      showError("User session not found.");
      setLoading(false);
      return;
    }

    const selectedSummary = masterSummaries.find(s => s.id === values.mid);
    const generatedTitle = selectedSummary 
      ? `Stationery for ${selectedSummary.Examination} (${selectedSummary.Code}) - ${selectedSummary.Year}`
      : `Stationery Entry MID ${values.mid}`;

    try {
      const payload = {
        mid: values.mid,
        user_id: user.id,
        title: generatedTitle,
        status: values.status,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('stationeries')
          .update({ mid: values.mid, status: values.status })
          .eq('id', values.id);
        if (error) throw error;
        showSuccess("Stationery entry updated successfully!");
      } else {
        const { error } = await supabase.from('stationeries').insert(payload);
        if (error) throw error;
        showSuccess("New stationery entry created successfully!");
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[550px] p-0 flex flex-col bg-white overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-black text-white rounded-md">
                <Package className="h-4 w-4" />
              </div>
              <SheetTitle className="text-lg font-bold">
                {isEditing ? "Edit Stationery Entry" : "Create New Stationery Entry"}
              </SheetTitle>
            </div>
          </SheetHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 px-8 py-6 space-y-5 overflow-y-auto">
            <FormField
              control={form.control}
              name="mid"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-slate-400">Master Summary *</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value ? String(field.value) : ""}
                    disabled={loading || summariesLoading || isEditing}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9 rounded-xl">
                        <SelectValue placeholder="Select a master summary" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {summariesLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-neas-green" />
                        </div>
                      ) : (
                        masterSummaries.map((summary) => (
                          <SelectItem key={summary.id} value={String(summary.id)}>
                            {summary.Examination} ({summary.Code}) - {summary.Year}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[9px] font-bold uppercase" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-slate-400">Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                    <FormControl>
                      <SelectTrigger className="h-9 rounded-xl">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Finalized">Finalized</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[9px] font-bold uppercase" />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button 
            type="button"
            variant="ghost" 
            size="sm"
            onClick={() => onOpenChange(false)} 
            disabled={loading}
            className="text-slate-500 hover:text-slate-700"
          >
            Cancel
          </Button>
          <Button 
            size="sm" 
            className="bg-black text-white hover:bg-slate-800 px-6" 
            disabled={loading}
            onClick={form.handleSubmit(onSubmit)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Entry</>}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default StationeryFormDrawer;