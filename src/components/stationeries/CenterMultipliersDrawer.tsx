"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Stationery } from "@/types/stationeries";
import { showError, showSuccess } from "@/utils/toast";
import { fetchCenterMultipliers, saveCenterMultipliers } from "@/integrations/supabase/stationery-settings-api";
import { StationeryCenterMultiplier, CenterMultipliersFormValues } from "@/types/stationeries";

type ExamGroup = "secondary" | "primary" | "ftna" | "unknown";

const buildSchema = (group: ExamGroup) => {
  const numberField = z.preprocess((v) => Number(v), z.number().min(0, "Must be >= 0"));
  const intField = z.preprocess((v) => Number(v), z.number().int().min(1, "Must be >= 1"));

  if (group === "secondary") {
    return z.object({
      bookletsnormal_center_percentage: numberField,
      bookletsgraph_center_percentage: numberField,
      loose_sheet_normal_percentage: numberField,
      loose_sheets_graph_percentage: numberField,
      ict_covers_percentage: numberField,
      arabic_booklets_percentage: numberField,
      fine_arts_booklets_percentage: numberField,
      bkm_percentage: numberField,
      braillesheets: numberField,
      students_in_a_stream: intField,
    });
  }

  if (group === "primary") {
    return z.object({
      bkm_percentage: numberField,
      students_in_a_stream: intField,
      braillesheets: numberField,
    });
  }

  if (group === "ftna") {
    return z.object({
      braillesheets: numberField,
      students_in_a_stream: intField,
      ict_covers_percentage: numberField,
      fine_arts_booklets_percentage: numberField,
      bkm_percentage: numberField,
    });
  }

  return z.object({
    bookletsnormal_center_percentage: numberField.optional(),
    bookletsgraph_center_percentage: numberField.optional(),
    loose_sheet_normal_percentage: numberField.optional(),
    loose_sheets_graph_percentage: numberField.optional(),
    ict_covers_percentage: numberField.optional(),
    arabic_booklets_percentage: numberField.optional(),
    fine_arts_booklets_percentage: numberField.optional(),
    bkm_percentage: numberField.optional(),
    braillesheets: numberField.optional(),
    students_in_a_stream: intField.optional(),
  });
};

interface CenterMultipliersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationery: Stationery | null;
  onSuccess: () => void;
}

const CenterMultipliersDrawer: React.FC<CenterMultipliersDrawerProps> = ({
  open,
  onOpenChange,
  stationery,
  onSuccess,
}) => {
  const examCode = stationery?.examination_code || "";
  const group: ExamGroup = useMemo(() => {
    if (["CSEE", "ACSEE"].includes(examCode)) return "secondary";
    if (["PSLE", "SSNA", "SFNA"].includes(examCode)) return "primary";
    if (examCode === "FTNA") return "ftna";
    return "unknown";
  }, [examCode]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<StationeryCenterMultiplier | null>(null);

  const schema = useMemo(() => buildSchema(group), [group]);
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {} as FormValues,
  });

  useEffect(() => {
    if (open && stationery?.id) {
      setLoading(true);
      fetchCenterMultipliers(stationery.id)
        .then((row) => {
          setExisting(row);
          const defaults = {
            bookletsnormal_center_percentage: row?.bookletsnormal_center_percentage ?? 0,
            bookletsgraph_center_percentage: row?.bookletsgraph_center_percentage ?? 0,
            loose_sheet_normal_percentage: row?.loose_sheet_normal_percentage ?? 0,
            loose_sheets_graph_percentage: row?.loose_sheets_graph_percentage ?? 0,
            ict_covers_percentage: row?.ict_covers_percentage ?? 0,
            arabic_booklets_percentage: row?.arabic_booklets_percentage ?? 0,
            fine_arts_booklets_percentage: row?.fine_arts_booklets_percentage ?? 0,
            bkm_percentage: row?.bkm_percentage ?? 0,
            braillesheets: row?.braillesheets ?? 0,
            students_in_a_stream: row?.students_in_a_stream ?? 30,
          };
          form.reset(defaults);
        })
        .finally(() => setLoading(false));
    }
  }, [open, stationery?.id, form]);

  const onSubmit = async (values: FormValues) => {
    if (!stationery?.id) return;
    setSaving(true);
    try {
      const payload = { ...existing, ...values } as CenterMultipliersFormValues;
      await saveCenterMultipliers(stationery.id, payload, existing?.id);
      showSuccess("Center multipliers saved successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      showError(err.message || "Failed to save center multipliers.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[550px] p-0 flex flex-col bg-white overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-black text-white rounded-md">
                <Calculator className="h-4 w-4" />
              </div>
              <SheetTitle className="text-lg font-bold">Center Multipliers</SheetTitle>
            </div>
            <SheetDescription className="text-xs">
              Configure multipliers for {stationery?.title}
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
              <div className="grid grid-cols-1 gap-4">
                {Object.keys(schema.shape).map((key) => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={key as any}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          {key.replace(/_/g, ' ')}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
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
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" className="bg-black text-white hover:bg-slate-800 px-6" disabled={saving} onClick={form.handleSubmit(onSubmit)}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Multipliers</>}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CenterMultipliersDrawer;