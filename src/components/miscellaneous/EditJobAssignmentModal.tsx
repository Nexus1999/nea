"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

const assignmentSchema = z.object({
  name: z.string().min(2, "Assignment name is required"),
  section: z.string().min(1, "Please select a section"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  total_required: z.coerce.number().min(1, "Teachers required count is needed"),
  status: z.enum(["pending", "active", "completed"]),
}).refine((data) => {
  return new Date(data.end_date) >= new Date(data.start_date);
}, {
  message: "End date cannot be earlier than start date",
  path: ["end_date"],
});

export const EditJobAssignmentModal = ({ open, onOpenChange, onSuccess, assignment }: any) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof assignmentSchema>>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      name: "",
      section: "",
      start_date: "",
      end_date: "",
      total_required: 0,
      status: "pending",
    },
  });

  useEffect(() => {
    if (open && assignment) {
      form.reset({
        name: assignment.name,
        section: assignment.section,
        start_date: assignment.start_date,
        end_date: assignment.end_date,
        total_required: assignment.total_required,
        status: assignment.status,
      });
    }
  }, [open, assignment, form]);

  const onSubmit = async (values: z.infer<typeof assignmentSchema>) => {
    setLoading(true);
    const { error } = await supabase
      .from("jobassignments")
      .update(values)
      .eq('id', assignment.id);

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Assignment updated successfully");
      onSuccess(); 
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Edit3 className="h-5 w-5 text-blue-600" />
            Edit Assignment
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 pb-6 space-y-4">
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Assignment Name</FormLabel>
                  <FormControl><Input className="h-9" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Section</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="MEA">MEA</SelectItem>
                        <SelectItem value="MCV">MCV</SelectItem>
                        <SelectItem value="MRC">MRC</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_required"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Teachers Required</FormLabel>
                    <FormControl><Input type="number" className="h-9" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="start_date" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs uppercase font-bold text-muted-foreground italic">Start Date</FormLabel>
                  <FormControl><Input type="date" className="h-9 text-xs" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="end_date" render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs uppercase font-bold text-muted-foreground italic">End Date</FormLabel>
                  <FormControl><Input type="date" className="h-9 text-xs" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end pt-2 gap-3">
              <Button type="button" variant="outline" className="h-9 px-4" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="h-9 px-6 bg-black hover:bg-gray-800 text-white" disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><Save className="mr-2 h-4 w-4" /> Update</>}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};