"use client";

import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Calculator, Save, Loader2 } from "lucide-react";

// Budget Types as requested
const BUDGET_TYPES = [
  { value: "TRANSPORT_EXAMS", label: "TRANSPORTATION OF EXAMINATIONS" },
  { value: "TRANSPORT_STATIONERY", label: "TRANSPORTATION OF EXAMINATION STATIONERIES" },
  { value: "TRANSPORT_CERTIFICATES", label: "TRANSPORTATION OF CERTIFICATES" },
  { value: "EXAM_ADMINISTRATION", label: "EXAMINATION ADMINISTRATION" },
  { value: "EXAM_MONITORING", label: "EXAMINATION MONITORING" },
  // PLACEHOLDER: ADD NEW BUDGET TYPES HERE
] as const;

const budgetFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  year: z.coerce.number().min(2000).max(2100),
  type: z.string({ required_error: "Please select a budget type." }),
});

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface AddBudgetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (values: BudgetFormValues) => void;
}

const AddBudgetDrawer = ({ isOpen, onClose, onSuccess }: AddBudgetDrawerProps) => {
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
    // Logic for Supabase Insert would go here
    await new Promise(resolve => setTimeout(resolve, 800)); 
    onSuccess(values);
    setLoading(false);
    onClose();
    form.reset();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[500px] p-0 flex flex-col bg-white overflow-hidden">
        {/* Header Section */}
        <div className="px-6 py-5 border-b bg-slate-50/50">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-lg">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold">Create New Budget</SheetTitle>
                <SheetDescription>Initialize a new financial plan for examination logistics.</SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Form Body */}
        <div className="flex-1 px-8 py-6 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-slate-500">Budget Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. National Exam Transport 2024" {...field} className="h-10" />
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
                      <FormLabel className="text-xs font-bold uppercase text-slate-500">Fiscal Year</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-10" />
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
                      <FormLabel className="text-xs font-bold uppercase text-slate-500">Budget Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BUDGET_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* PLACEHOLDER: ADD ADDITIONAL BUDGET FIELDS HERE 
                (e.g., Estimated Cost, Department, etc.)
              */}
            </form>
          </Form>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8" 
            disabled={loading}
            onClick={form.handleSubmit(onSubmit)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Budget</>}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AddBudgetDrawer;