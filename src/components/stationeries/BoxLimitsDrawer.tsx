"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, Box } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { fetchBoxLimitsSettings, saveBoxLimitsSettings } from "@/integrations/supabase/stationery-settings-api";
import { Stationery } from "@/types/stationeries";

const boxLimitsSchema = z.object({
  normalbooklets: z.preprocess((val) => Number(val), z.number().int().min(0).default(0)),
  graphbooklets: z.preprocess((val) => Number(val), z.number().int().min(0).default(0)),
  normalloosesheets: z.preprocess((val) => Number(val), z.number().int().min(0).default(0)),
  graphloosesheets: z.preprocess((val) => Number(val), z.number().int().min(0).default(0)),
  bkm: z.preprocess((val) => Number(val), z.number().int().min(0).default(0)),
  fbm1: z.preprocess((val) => Number(val), z.number().int().min(0).default(0)),
  fbm2: z.preprocess((val) => Number(val), z.number().int().min(0).default(0)),
  tr: z.preprocess((val) => Number(val), z.number().int().min(0).default(0)),
  twm: z.preprocess((val) => Number(val), z.number().int().min(0).default(0)),
});

type BoxLimitsFormValues = z.infer<typeof boxLimitsSchema>;

const FIELD_DISPLAY_NAMES: Record<keyof BoxLimitsFormValues, string> = {
  fbm1: 'FBM1 Limit', fbm2: 'FBM2 Limit', tr: 'TR Limit', twm: 'TWM Limit', bkm: 'BKM Limit',
  normalbooklets: 'Normal Booklets', graphbooklets: 'Graph Booklets',
  normalloosesheets: 'Normal Loose Sheets', graphloosesheets: 'Graph Loose Sheets',
};

const defaultBoxLimitsValues: BoxLimitsFormValues = {
  normalbooklets: 0, graphbooklets: 0, normalloosesheets: 0, graphloosesheets: 0,
  bkm: 0, fbm1: 0, fbm2: 0, tr: 0, twm: 0,
};

interface BoxLimitsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationery: Stationery | null;
  onSuccess: () => void;
  examCode: string;
}

const BoxLimitsDrawer: React.FC<BoxLimitsDrawerProps> = ({ open, onOpenChange, stationery, onSuccess, examCode }) => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingId, setExistingId] = useState<number | undefined>(undefined);

  const form = useForm<BoxLimitsFormValues>({
    resolver: zodResolver(boxLimitsSchema),
    defaultValues: defaultBoxLimitsValues,
  });

  const fieldsToRender = useMemo(() => {
    if (!examCode) return [];
    if (['ACSEE', 'CSEE'].includes(examCode)) {
      return ['normalbooklets', 'graphbooklets', 'normalloosesheets', 'graphloosesheets', 'bkm'] as (keyof BoxLimitsFormValues)[];
    } else if (examCode === 'FTNA') {
      return ['tr', 'twm', 'bkm'] as (keyof BoxLimitsFormValues)[];
    } else if (['PSLE', 'SSNA', 'SFNA'].includes(examCode)) {
      return ['fbm1', 'fbm2', 'tr', 'twm', 'bkm'] as (keyof BoxLimitsFormValues)[];
    }
    return [];
  }, [examCode]);

  const loadData = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const boxLimitsData = await fetchBoxLimitsSettings(id);
      if (boxLimitsData) {
        setExistingId(boxLimitsData.id);
        const parsedData = Object.fromEntries(
            Object.entries(boxLimitsData).map(([key, value]) => [key, typeof value === 'string' ? parseFloat(value) : value])
        ) as BoxLimitsFormValues;
        form.reset({ ...defaultBoxLimitsValues, ...parsedData });
      } else {
        setExistingId(undefined);
        form.reset(defaultBoxLimitsValues);
      }
    } catch (error) {
      showError("Failed to load existing settings.");
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    if (open && stationery?.id) {
      loadData(stationery.id);
    }
  }, [open, stationery, loadData]);

  const onSubmit = async (values: BoxLimitsFormValues) => {
    if (!stationery?.id) return;
    setIsSaving(true);
    try {
      const payload = { ...defaultBoxLimitsValues, ...values };
      const result = await saveBoxLimitsSettings(stationery.id, payload, existingId);
      if (result) {
        showSuccess("Box Limits saved successfully!");
        onSuccess();
        onOpenChange(false);
      }
    } catch (error: any) {
      showError(error.message || "Failed to save Box Limits.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[550px] p-0 flex flex-col bg-white overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-black text-white rounded-md">
                <Box className="h-4 w-4" />
              </div>
              <SheetTitle className="text-lg font-bold">Box Limits Parameters</SheetTitle>
            </div>
            <SheetDescription className="text-xs">
              Define maximum quantity limits for {stationery?.title}
            </SheetDescription>
          </SheetHeader>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 px-8 py-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {fieldsToRender.map((fieldName) => (
                  <FormField
                    key={fieldName}
                    control={form.control}
                    name={fieldName}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {FIELD_DISPLAY_NAMES[fieldName]}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="h-9 rounded-xl"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage className="text-[9px] font-bold uppercase" />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </form>
          </Form>
        )}

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" className="bg-black text-white hover:bg-slate-800 px-6" disabled={isSaving} onClick={form.handleSubmit(onSubmit)}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Limits</>}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BoxLimitsDrawer;