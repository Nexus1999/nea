"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calculator, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

  // Fallback: allow all fields
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

interface CenterMultipliersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationery: Stationery | null;
  onSuccess: () => void;
}

const CenterMultipliersModal: React.FC<CenterMultipliersModalProps> = ({
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
  const [existing, setExisting] = useState<StationeryCenterMultiplier | null>(null);

  const schema = useMemo(() => buildSchema(group), [group]);
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {} as FormValues,
  });

  const title = "Center Multipliers";
   

  useEffect(() => {
    if (!open || !stationery?.id) return;

    setLoading(true);
    fetchCenterMultipliers(stationery.id)
      .then((row) => {
        setExisting(row);
        // Build defaults based on exam group
        const defaults: Partial<CenterMultipliersFormValues> = {
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

        const groupDefaults: any =
          group === "secondary"
            ? {
                bookletsnormal_center_percentage: defaults.bookletsnormal_center_percentage,
                bookletsgraph_center_percentage: defaults.bookletsgraph_center_percentage,
                loose_sheet_normal_percentage: defaults.loose_sheet_normal_percentage,
                loose_sheets_graph_percentage: defaults.loose_sheets_graph_percentage,
                ict_covers_percentage: defaults.ict_covers_percentage,
                arabic_booklets_percentage: defaults.arabic_booklets_percentage,
                fine_arts_booklets_percentage: defaults.fine_arts_booklets_percentage,
                bkm_percentage: defaults.bkm_percentage,
                braillesheets: defaults.braillesheets,
                students_in_a_stream: defaults.students_in_a_stream,
              }
            : group === "primary"
            ? {
                bkm_percentage: defaults.bkm_percentage,
                students_in_a_stream: defaults.students_in_a_stream,
                braillesheets: defaults.braillesheets,
              }
            : group === "ftna"
            ? {
                braillesheets: defaults.braillesheets,
                students_in_a_stream: defaults.students_in_a_stream,
                ict_covers_percentage: defaults.ict_covers_percentage,
                fine_arts_booklets_percentage: defaults.fine_arts_booklets_percentage,
                bkm_percentage: defaults.bkm_percentage,
              }
            : defaults;

        form.reset(groupDefaults);
      })
      .catch((err: any) => {
        showError(err.message || "Failed to load center multipliers.");
      })
      .finally(() => setLoading(false));
    // Reset on close
  }, [open, stationery?.id, group, form]);

  const buildFullPayload = (values: FormValues): CenterMultipliersFormValues => {
    // Always send all required columns to satisfy NOT NULL constraints
    return {
      bookletsnormal_center_percentage:
        (values as any).bookletsnormal_center_percentage ?? existing?.bookletsnormal_center_percentage ?? 0,
      bookletsgraph_center_percentage:
        (values as any).bookletsgraph_center_percentage ?? existing?.bookletsgraph_center_percentage ?? 0,
      loose_sheet_normal_percentage:
        (values as any).loose_sheet_normal_percentage ?? existing?.loose_sheet_normal_percentage ?? 0,
      loose_sheets_graph_percentage:
        (values as any).loose_sheets_graph_percentage ?? existing?.loose_sheets_graph_percentage ?? 0,
      ict_covers_percentage:
        (values as any).ict_covers_percentage ?? existing?.ict_covers_percentage ?? 0,
      arabic_booklets_percentage:
        (values as any).arabic_booklets_percentage ?? existing?.arabic_booklets_percentage ?? 0,
      fine_arts_booklets_percentage:
        (values as any).fine_arts_booklets_percentage ?? existing?.fine_arts_booklets_percentage ?? 0,
      bkm_percentage:
        (values as any).bkm_percentage ?? existing?.bkm_percentage ?? 0,
      braillesheets:
        (values as any).braillesheets ?? existing?.braillesheets ?? 0,
      students_in_a_stream:
        (values as any).students_in_a_stream ?? existing?.students_in_a_stream ?? 30,
    };
  };

  const onSubmit = async (values: FormValues) => {
    if (!stationery?.id) return;
    const payload = buildFullPayload(values);
    try {
      const saved = await saveCenterMultipliers(stationery.id, payload, existing?.id);
      setExisting(saved);
      showSuccess("Center multipliers saved successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      showError(err.message || "Failed to save center multipliers.");
    }
  };

  const Field = ({ name, label, step = 0.01 }: { name: keyof CenterMultipliersFormValues; label: string; step?: number }) => (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              step={step}
              value={String(field.value ?? "")}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              disabled={loading}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-neas-green" /> {title}
          </DialogTitle>
         </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center min-h-[180px]">
            <Loader2 className="h-8 w-8 animate-spin text-neas-green" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {group === "secondary" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field name="bookletsnormal_center_percentage" label="Normal Booklets %" />
                  <Field name="bookletsgraph_center_percentage" label="Graph Booklets %" />
                  <Field name="loose_sheet_normal_percentage" label="Loose Sheets (Normal) %" />
                  <Field name="loose_sheets_graph_percentage" label="Loose Sheets (Graph) %" />
                  <Field name="ict_covers_percentage" label="ICT Covers %" />
                  <Field name="arabic_booklets_percentage" label="Arabic Booklets %" />
                  <Field name="fine_arts_booklets_percentage" label="Fine Arts Booklets %" />
                  <Field name="bkm_percentage" label="BKM %" />
                  <Field name="braillesheets" label="Braille Sheets Multiplier" step={1} />
                  <Field name="students_in_a_stream" label="Students per Stream" step={1} />
                </div>
              )}

              {group === "primary" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field name="bkm_percentage" label="BKM %" />
                  <Field name="braillesheets" label="Braille Sheets Multiplier" step={1} />
                  <Field name="students_in_a_stream" label="Students per Stream" step={1} />
                </div>
              )}

              {group === "ftna" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field name="braillesheets" label="Braille Sheets Multiplier" step={1} />
                  <Field name="students_in_a_stream" label="Students per Stream" step={1} />
                  <Field name="ict_covers_percentage" label="ICT Covers %" />
                  <Field name="fine_arts_booklets_percentage" label="Fine Arts Booklets %" />
                  <Field name="bkm_percentage" label="BKM %" />
                </div>
              )}

              {group === "unknown" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field name="bookletsnormal_center_percentage" label="Normal Booklets %" />
                  <Field name="bookletsgraph_center_percentage" label="Graph Booklets %" />
                  <Field name="loose_sheet_normal_percentage" label="Loose Sheets (Normal) %" />
                  <Field name="loose_sheets_graph_percentage" label="Loose Sheets (Graph) %" />
                  <Field name="ict_covers_percentage" label="ICT Covers %" />
                  <Field name="arabic_booklets_percentage" label="Arabic Booklets %" />
                  <Field name="fine_arts_booklets_percentage" label="Fine Arts Booklets %" />
                  <Field name="bkm_percentage" label="BKM %" />
                  <Field name="braillesheets" label="Braille Sheets Multiplier" step={1} />
                  <Field name="students_in_a_stream" label="Students per Stream" step={1} />
                </div>
              )}

              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Center Multipliers
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CenterMultipliersModal;