"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

// Define a type for the examination options fetched from Supabase
interface ExaminationOption {
  exam_id: number;
  examination: string;
  code: string;
  level: string;
  status: string;
}

const subjectFormSchema = z.object({
  id: z.number().optional(), // Only present for editing
  subject_code: z.string().min(2, { message: "Subject code must be at least 2 characters." }).max(10, { message: "Subject code cannot exceed 10 characters." }),
  subject_name: z.string().min(2, { message: "Subject name must be at least 2 characters." }).max(100, { message: "Subject name cannot exceed 100 characters." }),
  exam_code: z.string().min(1, { message: "Examination code is required." }),
  status: z.enum(["Active", "Discontinued", "Inactive"], {
    required_error: "Status is required.",
  }),
});

export type SubjectFormValues = z.infer<typeof subjectFormSchema>;

interface SubjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: SubjectFormValues & {
    normal_booklet_multiplier?: number;
    graph_booklet_multiplier?: number;
  }; // Optional subject object for editing
  onSuccess: () => void;
}

const SubjectForm: React.FC<SubjectFormProps> = ({ open, onOpenChange, subject, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [examinations, setExaminations] = useState<ExaminationOption[]>([]);
  const [examinationsLoading, setExaminationsLoading] = useState(true);
  const isEditing = !!subject?.id;

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      subject_code: "",
      subject_name: "",
      exam_code: "",
      status: "Active",
      ...subject,
    },
  });

  // Fetch active examinations when the dialog opens
  useEffect(() => {
    if (open) {
      const fetchExaminations = async () => {
        setExaminationsLoading(true);
        const { data, error } = await supabase
          .from('examinations')
          .select('exam_id, examination, code, level, status')
          .eq('status', 'active') // Only fetch active examinations
          .order('examination', { ascending: true });

        if (error) {
          showError(error.message);
          setExaminations([]);
        } else {
          setExaminations(data || []);
        }
        setExaminationsLoading(false);
      };
      fetchExaminations();
    }
  }, [open]);

  useEffect(() => {
    if (subject) {
      // Reset form with subject data, excluding multipliers
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

  const onSubmit = async (values: SubjectFormValues) => {
    setLoading(true);

    try {
      const payload = {
        subject_code: values.subject_code,
        subject_name: values.subject_name,
        exam_code: values.exam_code,
        status: values.status,
        // Multipliers are handled separately
      };

      if (isEditing) {
        if (!values.id) {
          throw new Error("Subject ID is missing for update operation.");
        }
        const { error } = await supabase
          .from('subjects')
          .update(payload)
          .eq('id', values.id);

        if (error) throw error;
        showSuccess("Subject details updated successfully!");
      } else {
        // When creating a new subject, multipliers default to 0.0 in the DB
        const { error } = await supabase
          .from('subjects')
          .insert(payload);

        if (error) throw error;
        showSuccess("New subject created successfully!");
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Subject Details" : "Add New Subject"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Make changes to the core subject details here." : "Create a new subject for the system."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subject_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 011" {...field} disabled={loading} />
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
                      <Input placeholder="e.g., Basic Mathematics" {...field} disabled={loading} />
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
                          {field.value ? (
                            <SelectValue placeholder="Select an examination" />
                          ) : (
                            <span className="text-muted-foreground">Select an examination</span>
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {examinationsLoading ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin text-neas-green" />
                          </div>
                        ) : examinations.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">No active examinations found.</div>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Discontinued">Discontinued</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading || examinationsLoading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  isEditing ? "Save Changes" : "Create Subject"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SubjectForm;