"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Calculator } from "lucide-react";

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

const multiplierSchema = z.object({
  id: z.number(),
  normal_booklet_multiplier: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: "Multiplier must be non-negative." })
  ),
  graph_booklet_multiplier: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: "Multiplier must be non-negative." })
  ),
});

export type MultiplierFormValues = z.infer<typeof multiplierSchema>;

interface SubjectMultiplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: {
    id: number;
    subject_name: string;
    subject_code: string;
    normal_booklet_multiplier: number;
    graph_booklet_multiplier: number;
  };
  onSuccess: () => void;
}

const SubjectMultiplierModal: React.FC<SubjectMultiplierModalProps> = ({ open, onOpenChange, subject, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<MultiplierFormValues>({
    resolver: zodResolver(multiplierSchema),
    defaultValues: {
      id: subject?.id || 0,
      normal_booklet_multiplier: 0.0,
      graph_booklet_multiplier: 0.0,
    },
  });

  useEffect(() => {
    if (subject) {
      form.reset({
        id: subject.id,
        normal_booklet_multiplier: parseFloat(String(subject.normal_booklet_multiplier)),
        graph_booklet_multiplier: parseFloat(String(subject.graph_booklet_multiplier)),
      });
    } else {
      form.reset({
        id: 0,
        normal_booklet_multiplier: 0.0,
        graph_booklet_multiplier: 0.0,
      });
    }
  }, [subject, form]);

  const onSubmit = async (values: MultiplierFormValues) => {
    setLoading(true);

    try {
      const payload = {
        normal_booklet_multiplier: values.normal_booklet_multiplier,
        graph_booklet_multiplier: values.graph_booklet_multiplier,
      };

      const { error } = await supabase
        .from('subjects')
        .update(payload)
        .eq('id', values.id);

      if (error) throw error;
      showSuccess(`Multipliers for ${subject?.subject_name} updated successfully!`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred while updating multipliers.");
    } finally {
      setLoading(false);
    }
  };

  if (!subject) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" /> Edit Multipliers
          </DialogTitle>
          <DialogDescription>
            Adjust the stationery multipliers for subject: 
            <span className="font-semibold text-gray-800 ml-1">{subject.subject_name} ({subject.subject_code})</span>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="normal_booklet_multiplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Normal Booklet Multiplier</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="e.g., 1.0" 
                      {...field} 
                      value={field.value === undefined || field.value === null ? '' : String(field.value)}
                      onChange={(e) => field.onChange(e.target.value)}
                      disabled={loading} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="graph_booklet_multiplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Graph Booklet Multiplier</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="e.g., 0.5" 
                      {...field} 
                      value={field.value === undefined || field.value === null ? '' : String(field.value)}
                      onChange={(e) => field.onChange(e.target.value)}
                      disabled={loading} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Save Multipliers"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SubjectMultiplierModal;