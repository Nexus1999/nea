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
import { useAuth } from "@/providers/AuthProvider";
import { MasterSummaryOption, Stationery } from "@/types/stationeries";

const stationeryFormSchema = z.object({
  id: z.number().optional(), // Only present for editing
  mid: z.preprocess(
    (val) => Number(val),
    z.number().int().positive({ message: "Master Summary is required." })
  ),
  // Removed title field
  status: z.enum(["Draft", "Finalized"], {
    required_error: "Status is required.",
  }),
});

export type StationeryFormValues = z.infer<typeof stationeryFormSchema>;

interface StationeryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationery?: StationeryFormValues; // Optional stationery object for editing
  onSuccess: () => void;
}

const StationeryForm: React.FC<StationeryFormProps> = ({ open, onOpenChange, stationery, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [masterSummaries, setMasterSummaries] = useState<MasterSummaryOption[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);
  const { user } = useAuth();
  const isEditing = !!stationery?.id;

  const form = useForm<StationeryFormValues>({
    resolver: zodResolver(stationeryFormSchema),
    defaultValues: {
      mid: undefined,
      // title: "", // Removed
      status: "Draft",
      ...stationery,
    },
  });

  // Fetch active master summaries when the dialog opens
  useEffect(() => {
    if (open) {
      const fetchMasterSummaries = async () => {
        setSummariesLoading(true);
        // Fetch only the latest version of each unique examination summary
        const { data, error } = await supabase
          .from('mastersummaries')
          .select('id, Examination, Code, Year')
          .eq('is_latest', true)
          .order('Year', { ascending: false });

        if (error) {
          showError(error.message);
          setMasterSummaries([]);
        } else {
          setMasterSummaries(data || []);
        }
        setSummariesLoading(false);
      };
      fetchMasterSummaries();
    }
  }, [open]);

  useEffect(() => {
    if (stationery) {
      form.reset(stationery);
    } else {
      form.reset({
        mid: undefined,
        // title: "", // Removed
        status: "Draft",
      });
    }
  }, [stationery, form]);

  const onSubmit = async (values: StationeryFormValues) => {
    setLoading(true);

    if (!user) {
      showError("User session not found. Please log in.");
      setLoading(false);
      return;
    }

    // Find the selected master summary to use its details as the title
    const selectedSummary = masterSummaries.find(s => s.id === values.mid);
    const generatedTitle = selectedSummary 
      ? `Stationery for ${selectedSummary.Examination} (${selectedSummary.Code}) - ${selectedSummary.Year}`
      : `Stationery Entry MID ${values.mid}`;

    try {
      const payload = {
        mid: values.mid,
        user_id: user.id,
        title: generatedTitle, // Automatically generate title based on MID
        status: values.status,
      };

      if (isEditing) {
        if (!values.id) {
          throw new Error("Stationery ID is missing for update operation.");
        }
        // When editing, we only update status and mid (if allowed, but mid is disabled)
        // We keep the title update logic simple here, assuming title is derived from MID
        const { error } = await supabase
          .from('stationeries')
          .update({
            mid: values.mid,
            status: values.status,
            // Note: We don't update title here unless we fetch the summary again, 
            // but since MID is disabled for editing, the title should remain consistent.
          })
          .eq('id', values.id);

        if (error) throw error;
        showSuccess("Stationery entry updated successfully!");
      } else {
        const { error } = await supabase
          .from('stationeries')
          .insert(payload);

        if (error) throw error;
        showSuccess("New stationery entry created successfully!");
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
          <DialogTitle>{isEditing ? "Edit Stationery Entry" : "Add New Stationery Entry"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Make changes to the stationery details here." : "Link a new stationery entry to a master summary."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Master Summary</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value ? String(field.value) : ""}
                      disabled={loading || summariesLoading || isEditing} // Cannot change MID after creation
                    >
                      <FormControl>
                        <SelectTrigger>
                          {field.value ? (
                            <SelectValue placeholder="Select a master summary" />
                          ) : (
                            <span className="text-muted-foreground">Select a master summary</span>
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {summariesLoading ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin text-neas-green" />
                          </div>
                        ) : masterSummaries.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">No active master summaries found.</div>
                        ) : (
                          masterSummaries.map((summary) => (
                            <SelectItem key={summary.id} value={String(summary.id)}>
                              {summary.Examination} ({summary.Code}) - {summary.Year}
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
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Finalized">Finalized</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading || summariesLoading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  isEditing ? "Save Changes" : "Create Entry"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default StationeryForm;