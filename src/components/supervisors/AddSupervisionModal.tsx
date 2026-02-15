"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

const supervisionSchema = z.object({
  mid: z.coerce.number().min(1, "Please select an examination"),
  status: z.enum(["pending", "ongoing", "completed"], { 
    required_error: "Status is required" 
  }),
});

export const AddSupervisionModal = ({ open, onOpenChange, onSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  const [fetchingMasters, setFetchingMasters] = useState(false);
  const [masterSummaries, setMasterSummaries] = useState<any[]>([]);

  const form = useForm<z.infer<typeof supervisionSchema>>({
    resolver: zodResolver(supervisionSchema),
    defaultValues: {
      status: "pending",
    },
  });

  // Fetch Master Summaries to populate the dropdown
  useEffect(() => {
    const fetchMasters = async () => {
      setFetchingMasters(true);
      const { data, error } = await supabase
        .from("mastersummaries")
        .select("id, Examination, Code, Year")
        .eq("is_latest", true) // Only show current versions
        .order("Year", { ascending: false });

      if (error) {
        showError("Could not load examinations");
      } else {
        setMasterSummaries(data || []);
      }
      setFetchingMasters(false);
    };

    if (open) fetchMasters();
  }, [open]);

  const onSubmit = async (values: z.infer<typeof supervisionSchema>) => {
    setLoading(true);
    
    // Insert into supervisions table
    const { error } = await supabase
      .from("supervisions")
      .insert({
        mid: values.mid,
        status: values.status,
      });

    if (error) {
      if (error.code === '23505') {
        showError("This examination already has a supervision record.");
      } else {
        showError(error.message);
      }
    } else {
      showSuccess("Supervision initialized successfully");
      onSuccess(); // Refresh the parent table
      onOpenChange(false);
      form.reset();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Initialize Supervision
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            
            {/* Master Summary Selection */}
            <FormField
              control={form.control}
              name="mid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Examination</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value?.toString()}
                    disabled={fetchingMasters}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={fetchingMasters ? "Loading exams..." : "Choose an examination"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {masterSummaries.map((exam) => (
                        <SelectItem key={exam.id} value={exam.id.toString()}>
                          {exam.Examination} ({exam.Code}) - {exam.Year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status Selection */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4 border-t gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="px-8 bg-black hover:bg-gray-800"
                disabled={loading || fetchingMasters}
              >
                {loading ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Create Record</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};