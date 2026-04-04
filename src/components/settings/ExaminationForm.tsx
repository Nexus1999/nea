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
import { logChange } from "@/utils/audit";

const examinationFormSchema = z.object({
  exam_id: z.number().optional(),
  examination: z.string().min(2, { message: "Examination name must be at least 2 characters." }),
  code: z.string().min(2, { message: "Code must be at least 2 characters." }),
  level: z.enum(["Primary Education", "Secondary Education", "Teacher Education"], {
    required_error: "Level is required.",
  }),
  status: z.enum(["active", "inactive", "archived"], {
    required_error: "Status is required.",
  }),
});

export type ExaminationFormValues = z.infer<typeof examinationFormSchema>;

interface ExaminationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examination?: ExaminationFormValues;
  onSuccess: () => void;
}

const ExaminationForm: React.FC<ExaminationFormProps> = ({ open, onOpenChange, examination, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const isEditing = !!examination?.exam_id;

  const form = useForm<ExaminationFormValues>({
    resolver: zodResolver(examinationFormSchema),
    defaultValues: {
      examination: "",
      code: "",
      level: undefined,
      status: "active",
      ...examination,
    },
  });

  useEffect(() => {
    if (examination) {
      form.reset(examination);
    } else {
      form.reset({
        examination: "",
        code: "",
        level: undefined,
        status: "active",
      });
    }
  }, [examination, form]);

  const onSubmit = async (values: ExaminationFormValues) => {
    setLoading(true);

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('examinations')
          .update({
            examination: values.examination,
            code: values.code,
            level: values.level,
            status: values.status,
          })
          .eq('exam_id', values.exam_id);

        if (error) throw error;

        await logChange({
          tableName: 'examinations',
          recordId: values.exam_id!,
          actionType: 'UPDATE',
          oldData: examination,
          newData: values
        });

        showSuccess("Examination updated successfully!");
      } else {
        const { data, error } = await supabase
          .from('examinations')
          .insert({
            examination: values.examination,
            code: values.code,
            level: values.level,
            status: values.status,
          })
          .select()
          .single();

        if (error) throw error;

        await logChange({
          tableName: 'examinations',
          recordId: data.exam_id,
          actionType: 'INSERT',
          newData: values
        });

        showSuccess("New examination created successfully!");
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
          <DialogTitle>{isEditing ? "Edit Examination" : "Add New Examination"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Make changes to the examination details here." : "Create a new examination entry."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="examination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Examination Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Primary School Leaving Examination" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., PSLE" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an education level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Primary Education">Primary Education</SelectItem>
                        <SelectItem value="Secondary Education">Secondary Education</SelectItem>
                        <SelectItem value="Teacher Education">Teacher Education</SelectItem>
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
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  isEditing ? "Save Changes" : "Create Examination"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ExaminationForm;