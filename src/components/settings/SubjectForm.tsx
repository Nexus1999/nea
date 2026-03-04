"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, AlertTriangle, Save, PlusCircle } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────
// Schema
// ────────────────────────────────────────────────

const subjectFormSchema = z.object({
  id: z.number().optional(),
  subject_code: z.string().min(2, "Subject code must be at least 2 characters").max(10),
  subject_name: z.string().min(2).max(100),
  exam_code: z.string().min(1, "Please select an examination"),
  status: z.enum(["Active", "Discontinued", "Inactive"]),
});

export type SubjectFormValues = z.infer<typeof subjectFormSchema>;

interface ExaminationOption {
  exam_id: number;
  examination: string;
  code: string;
  level: string;
  status: string;
}

interface SubjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: SubjectFormValues & {
    normal_booklet_multiplier?: number;
    graph_booklet_multiplier?: number;
  };
  onSuccess: () => void;
}

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────

const SubjectForm: React.FC<SubjectFormProps> = ({ open, onOpenChange, subject, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [examinations, setExaminations] = useState<ExaminationOption[]>([]);
  const [examinationsLoading, setExaminationsLoading] = useState(true);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<SubjectFormValues | null>(null);

  const isEditing = !!subject?.id;

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      subject_code: "",
      subject_name: "",
      exam_code: "",
      status: "Active",
    },
  });

  // Fetch examinations
  useEffect(() => {
    if (!open) return;

    const fetchExaminations = async () => {
      setExaminationsLoading(true);
      const { data, error } = await supabase
        .from("examinations")
        .select("exam_id, examination, code, level, status")
        .eq("status", "active")
        .order("examination", { ascending: true });

      if (error) {
        showError("Failed to load examinations");
        setExaminations([]);
      } else {
        setExaminations(data || []);
      }
      setExaminationsLoading(false);
    };

    fetchExaminations();
  }, [open]);

  // Reset form
  useEffect(() => {
    if (subject) {
      form.reset({
        id: subject.id,
        subject_code: subject.subject_code,
        subject_name: subject.subject_name,
        exam_code: subject.exam_code,
        status: subject.status,
      });
    } else {
      form.reset({
        subject_code: "",
        subject_name: "",
        exam_code: "",
        status: "Active",
      });
    }
  }, [subject, form]);

  const handleSubmit = form.handleSubmit((values) => {
    setPendingValues(values);
    setConfirmOpen(true);
  });

  const getFriendlyErrorMessage = (error: any): string => {
    const msg = error?.message || "";

    if (msg.includes("duplicate key value violates unique constraint")) {
      if (msg.includes("unique_subject_per_exam") || msg.includes("unique_subject_code_per_exam")) {
        return "This subject code is already used for this examination. Please choose a different code or select a different exam.";
      }
      if (msg.includes("subjects_subject_code_key")) {
        return "This subject code already exists in the system. Subject codes must be unique per examination.";
      }
      return "A subject with this code already exists for the selected examination.";
    }

    if (msg.includes("foreign key constraint")) {
      return "The selected examination code is invalid or no longer exists.";
    }

    if (msg.includes("not null")) {
      return "Some required fields are missing.";
    }

    return msg || "An unexpected error occurred. Please try again.";
  };

  const handleConfirm = async () => {
    if (!pendingValues) return;
    setConfirmOpen(false);
    setLoading(true);

    try {
      const payload = {
        subject_code: pendingValues.subject_code.trim(),
        subject_name: pendingValues.subject_name.trim(),
        exam_code: pendingValues.exam_code,
        status: pendingValues.status,
      };

      let error: any = null;

      if (isEditing) {
        if (!pendingValues.id) throw new Error("Missing subject ID for update.");
        const res = await supabase
          .from("subjects")
          .update(payload)
          .eq("id", pendingValues.id);
        error = res.error;
      } else {
        const res = await supabase.from("subjects").insert(payload);
        error = res.error;
      }

      if (error) throw error;

      showSuccess(isEditing ? "Subject updated successfully" : "Subject created successfully");
      onSuccess();
      onOpenChange(false);
      form.reset();
    } catch (err: any) {
      const friendlyMsg = getFriendlyErrorMessage(err);
      showError(friendlyMsg);
      console.error("Subject save error:", err);
    } finally {
      setLoading(false);
      setPendingValues(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isEditing ? "Edit Subject" : "Add New Subject"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {isEditing
                ? "Update the core details of this subject."
                : "Enter details for a new subject."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-5 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="subject_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 011" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Basic Mathematics" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="exam_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Examination</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loading || examinationsLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select examination" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {examinationsLoading ? (
                            <div className="flex justify-center p-6">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          ) : examinations.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No active examinations found
                            </div>
                          ) : (
                            examinations.map((exam) => (
                              <SelectItem key={exam.exam_id} value={exam.code}>
                                {exam.examination} ({exam.code})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Discontinued">Discontinued</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={loading || examinationsLoading}
                  className={cn(
                    "min-w-[140px] bg-black hover:bg-black/90 text-white",
                    loading && "opacity-80"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isEditing ? (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create Subject
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
              <div
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center mb-4",
                  isEditing ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
                )}
              >
                {isEditing ? <Save className="h-7 w-7" /> : <PlusCircle className="h-7 w-7" />}
              </div>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-slate-900">
                {isEditing ? "Confirm Update" : "Confirm Creation"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
              {isEditing
                ? "You are about to update this subject’s core details."
                : "You are about to create a new subject in the system."}
              <br />
              This action cannot be undone after confirmation.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-row items-center gap-3 mt-6">
            <AlertDialogCancel className="flex-1 h-11 font-bold uppercase text-[10px] tracking-widest rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              className={cn(
                "flex-[1.5] h-11 font-black uppercase text-[10px] tracking-widest text-white rounded-xl",
                isEditing ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isEditing ? (
                "Confirm Update"
              ) : (
                "Confirm Create"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SubjectForm;