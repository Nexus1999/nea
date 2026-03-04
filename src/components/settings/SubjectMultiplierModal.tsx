"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Calculator, Save } from "lucide-react";

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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────
// Schema
// ────────────────────────────────────────────────

const multiplierSchema = z.object({
  id: z.number(),
  normal_booklet_multiplier: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: "Must be 0 or higher" })
  ),
  graph_booklet_multiplier: z.preprocess(
    (val) => Number(val),
    z.number().min(0, { message: "Must be 0 or higher" })
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

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────

const SubjectMultiplierModal: React.FC<SubjectMultiplierModalProps> = ({
  open,
  onOpenChange,
  subject,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<MultiplierFormValues | null>(null);

  const form = useForm<MultiplierFormValues>({
    resolver: zodResolver(multiplierSchema),
    defaultValues: {
      id: 0,
      normal_booklet_multiplier: 0.0,
      graph_booklet_multiplier: 0.0,
    },
  });

  useEffect(() => {
    if (subject && open) {
      form.reset({
        id: subject.id,
        normal_booklet_multiplier: Number(subject.normal_booklet_multiplier ?? 0),
        graph_booklet_multiplier: Number(subject.graph_booklet_multiplier ?? 0),
      });
    }
  }, [subject, open, form]);

  if (!subject) return null;

  const handleSubmit = form.handleSubmit((values) => {
    setPendingValues(values);
    setConfirmOpen(true);
  });

  const handleConfirm = async () => {
    if (!pendingValues) return;
    setConfirmOpen(false);
    setLoading(true);

    try {
      const payload = {
        normal_booklet_multiplier: pendingValues.normal_booklet_multiplier,
        graph_booklet_multiplier: pendingValues.graph_booklet_multiplier,
      };

      const { error } = await supabase
        .from("subjects")
        .update(payload)
        .eq("id", pendingValues.id);

      if (error) throw error;

      showSuccess(`Multipliers updated for ${subject.subject_name}`);
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || "";

      if (msg.includes("constraint") || msg.includes("validation")) {
        showError("Invalid multiplier values. Please check the numbers.");
      } else if (msg.includes("not found") || msg.includes("does not exist")) {
        showError("Subject record not found. It may have been deleted.");
      } else {
        showError("Failed to save multipliers. Please try again.");
      }

      console.error("Multiplier update error:", err);
    } finally {
      setLoading(false);
      setPendingValues(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Calculator className="h-5 w-5 text-primary" />
              Edit Multipliers
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Stationery Multipliers for:{" "}
              <span className="font-semibold text-slate-800">
                {subject.subject_name} ({subject.subject_code})
              </span>
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                          min="0"
                          placeholder="1.0"
                          disabled={loading}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
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
                          min="0"
                          placeholder="0.5"
                          disabled={loading}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={loading}
                  className="min-w-[160px] bg-black hover:bg-black/90 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Multipliers
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-[420px] rounded-2xl border border-slate-200 shadow-2xl p-6">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Calculator className="h-7 w-7" />
              </div>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-slate-900">
                Confirm Changes
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
              You are about to update the stationery multipliers for
              <br />
              <strong>{subject.subject_name} ({subject.subject_code})</strong>.
              <br />
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-row items-center gap-3 mt-6">
            <AlertDialogCancel className="flex-1 h-11 font-bold uppercase text-[10px] tracking-widest rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              className="flex-[1.5] h-11 font-black uppercase text-[10px] tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Update Multipliers"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SubjectMultiplierModal;