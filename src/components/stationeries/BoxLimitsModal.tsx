"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, Box } from "lucide-react";

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
import { fetchBoxLimitsSettings, saveBoxLimitsSettings } from "@/integrations/supabase/stationery-settings-api";
import { Stationery } from "@/types/stationeries";

// --- Schemas and Definitions ---

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

const ALL_BOX_LIMITS_FIELDS: (keyof BoxLimitsFormValues)[] = [
  'normalbooklets', 'graphbooklets', 'normalloosesheets', 'graphloosesheets', 'bkm', 'fbm1', 'fbm2', 'tr', 'twm'
];

const FIELD_DISPLAY_NAMES: Record<keyof BoxLimitsFormValues, string> = {
  fbm1: 'FBM1 Limit', fbm2: 'FBM2 Limit', tr: 'TR Limit', twm: 'TWM Limit', bkm: 'BKM Limit',
  normalbooklets: 'Normal Booklets Limit', graphbooklets: 'Graph Booklets Limit',
  normalloosesheets: 'Normal Loose Sheets Limit', graphloosesheets: 'Graph Loose Sheets Limit',
};

const defaultBoxLimitsValues: BoxLimitsFormValues = {
  normalbooklets: 0, graphbooklets: 0, normalloosesheets: 0, graphloosesheets: 0,
  bkm: 0, fbm1: 0, fbm2: 0, tr: 0, twm: 0,
};

// --- Component ---

interface BoxLimitsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationery: Stationery | null;
  onSuccess: () => void;
  examCode: string;
}

const BoxLimitsModal: React.FC<BoxLimitsModalProps> = ({ open, onOpenChange, stationery, onSuccess, examCode }) => {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingId, setExistingId] = useState<number | undefined>(undefined);

  const form = useForm<BoxLimitsFormValues>({
    resolver: zodResolver(boxLimitsSchema),
    defaultValues: defaultBoxLimitsValues,
  });

  const isPrimaryExam = ['PSLE', 'SSNA', 'SFNA'].includes(examCode);

  // Define field groups for rendering based on examCode
  const fieldsToRender = useMemo(() => {
    if (!examCode) return [];
    if (['ACSEE', 'CSEE'].includes(examCode)) {
      return ['normalbooklets', 'graphbooklets', 'normalloosesheets', 'graphloosesheets', 'bkm'] as (keyof BoxLimitsFormValues)[];
    } else if (examCode === 'FTNA') {
      return ['tr', 'twm', 'bkm'] as (keyof BoxLimitsFormValues)[];
    } else if (isPrimaryExam) { // PSLE, SSNA, SFNA
      return ['fbm1', 'fbm2', 'tr', 'twm', 'bkm'] as (keyof BoxLimitsFormValues)[];
    }
    return [];
  }, [examCode, isPrimaryExam]);


  const loadData = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const boxLimitsData = await fetchBoxLimitsSettings(id);
      
      if (boxLimitsData) {
        setExistingId(boxLimitsData.id);
        // Ensure numeric fields are correctly parsed
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
      form.reset(defaultBoxLimitsValues);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    if (open && stationery?.id) {
      loadData(stationery.id);
    } else if (!open) {
      // Reset state when closing
      setExistingId(undefined);
      form.reset(defaultBoxLimitsValues);
    }
  }, [open, stationery, loadData, form]);

  const onSubmit = async (values: BoxLimitsFormValues) => {
    if (!stationery?.id) return;

    setIsSaving(true);
    try {
      // Filter values to only include fields relevant to the current exam type
      const relevantFields = fieldsToRender;

      const relevantValues = relevantFields.reduce((acc, key) => {
        acc[key] = values[key];
        return acc;
      }, {} as Partial<BoxLimitsFormValues>);

      // Ensure all fields in the schema are present in the payload, even if 0, to prevent DB errors on update/insert
      const payload = { ...defaultBoxLimitsValues, ...relevantValues };

      const result = await saveBoxLimitsSettings(stationery.id, payload, existingId);
      if (result) {
        setExistingId(result.id);
        showSuccess("Box Limits settings saved successfully!");
        onSuccess();
        onOpenChange(false);
      }
    } catch (error: any) {
      showError(error.message || "Failed to save Box Limits settings.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to render a field
  const renderField = (fieldName: keyof BoxLimitsFormValues) => (
    <FormField
      key={fieldName}
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{FIELD_DISPLAY_NAMES[fieldName]}</FormLabel>
          <FormControl>
            <Input
              type="number"
              step="1"
              placeholder={`Enter ${FIELD_DISPLAY_NAMES[fieldName]} Limit`}
              value={field.value === undefined || field.value === null ? '' : String(field.value)}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              disabled={isSaving}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-6 w-6 text-neas-green" /> Box Limits Parameters
          </DialogTitle>
          <DialogDescription>
            Define the maximum quantity limits for packing various stationery items into boxes/envelopes.
            <p className="mt-1 text-xs text-gray-500">Linked to: {stationery?.title}</p>
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center min-h-[200px] p-6">
            <Loader2 className="h-8 w-8 animate-spin text-neas-green" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
              
              {/* Scrollable Content Area */}
              <div className="px-6 py-4 overflow-y-auto scrollbar-hidden space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fieldsToRender.map(renderField)}
                </div>
              </div>

              <DialogFooter className="pt-4 flex-shrink-0 p-6 border-t">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Box Limits
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BoxLimitsModal;