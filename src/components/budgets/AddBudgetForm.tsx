"use client";

import React, { useState } from "react";
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

const budgetFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  year: z.coerce.number().min(2000).max(2100),
  type: z.enum(["TRANSPORT_EXAMS", "STATIONERY", "MONITORING"], {
    required_error: "Please select a budget type.",
  }),
});

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface AddBudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (values: BudgetFormValues) => void;
}

const AddBudgetForm: React.FC<AddBudgetFormProps> = ({ open, onOpenChange, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      title: "",
      year: new Date().getFullYear(),
      type: "TRANSPORT_EXAMS",
    },
  });

  const onSubmit = async (values: BudgetFormValues) => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    onSuccess(values);
    setLoading(false);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Calculator className="h-5 w-5 text-indigo-600" />
            Create New Budget
          </DialogTitle>
          <DialogDescription>
            Initialize a new budget plan for examination activities.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Budget Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. National Exam Transport 2024" {...field} className="h-11 rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Fiscal Year</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="h-11 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Budget Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="TRANSPORT_EXAMS">Transport of Exams</SelectItem>
                        <SelectItem value="STATIONERY">Stationery</SelectItem>
                        <SelectItem value="MONITORING">Monitoring</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Create Budget</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBudgetForm;