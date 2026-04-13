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
import { Calculator, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const BUDGET_TYPES = [
  { value: "TRANSPORT_EXAMS", label: "TRANSPORTATION OF EXAMINATIONS" },
  { value: "TRANSPORT_STATIONERY", label: "TRANSPORTATION OF EXAMINATION STATIONERIES" },
  { value: "TRANSPORT_CERTIFICATES", label: "TRANSPORTATION OF CERTIFICATES" },
  { value: "EXAM_ADMINISTRATION", label: "EXAMINATION ADMINISTRATION" },
  { value: "EXAM_MONITORING", label: "EXAMINATION MONITORING" },
] as const;

const budgetFormSchema = z.object({
  title: z.string().min(5, { message: "Required (min 5 chars)" }),
  year: z.coerce.number().min(2000).max(2100),
  type: z.string({ required_error: "Required" }),
});

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface AddBudgetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddBudgetDrawer = ({ isOpen, onClose, onSuccess }: AddBudgetDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      title: "",
      year: new Date().getFullYear(),
      type: "TRANSPORT_EXAMS",
    },
  });

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const onSubmit = async (values: BudgetFormValues) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create a budget");
      }

      const { error } = await supabase
        .from('budgets')
        .insert({
          title: values.title,
          year: values.year,
          type: values.type,
          user_id: user.id,
          status: 'DRAFT'
        });

      if (error) throw error;

      toast.success('Budget plan created successfully');
      onSuccess();
      onClose();
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to create budget");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const onError = () => {
    triggerShake();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[550px] p-0 flex flex-col bg-white overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-black text-white rounded-md">
                <Calculator className="h-4 w-4" />
              </div>
              <SheetTitle className="text-lg font-bold">Create New Budget Plan</SheetTitle>
            </div>
          </SheetHeader>
        </div>

        <form 
          onSubmit={form.handleSubmit(onSubmit, onError)} 
          className={`flex-1 px-8 py-6 space-y-5 overflow-y-auto transition-transform ${shake ? 'animate-shake' : ''}`}
        >
          <div className="space-y-1.5">
            <Label className={`text-xs ${form.formState.errors.title ? "text-red-500" : ""}`}>
              Budget Title *
            </Label>
            <Input 
              {...form.register("title")}
              className={`h-9 ${form.formState.errors.title ? "border-red-500" : ""}`} 
              placeholder="e.g. Primary Education Exams Transport"
            />
            {form.formState.errors.title && (
              <p className="text-[9px] text-red-500 font-bold uppercase leading-tight">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4">
            <div className="space-y-1.5">
              <Label className={`text-xs ${form.formState.errors.year ? "text-red-500" : ""}`}>
                Fiscal Year *
              </Label>
              <Input 
                type="number"
                {...form.register("year")}
                className={`h-9 ${form.formState.errors.year ? "border-red-500" : ""}`} 
              />
              {form.formState.errors.year && (
                <p className="text-[9px] text-red-500 font-bold uppercase leading-tight">
                  {form.formState.errors.year.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className={`text-xs ${form.formState.errors.type ? "text-red-500" : ""}`}>
                Budget Category *
              </Label>
              <Select 
                onValueChange={(val) => form.setValue("type", val)} 
                defaultValue={form.getValues("type")}
              >
                <SelectTrigger className={`h-9 ${form.formState.errors.type ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-[9px] text-red-500 font-bold uppercase leading-tight">
                  {form.formState.errors.type.message}
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-dashed border-slate-200">
             <p className="text-[10px] text-slate-400 font-medium italic">
               Configuration actions will appear here based on category selection...
             </p>
          </div>
        </form>

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button 
            type="button"
            variant="ghost" 
            size="sm"
            onClick={onClose} 
            disabled={loading}
            className="text-slate-500 hover:text-slate-700"
          >
            Cancel
          </Button>
          <Button 
            size="sm" 
            className="bg-black text-white hover:bg-slate-800 px-6" 
            disabled={loading}
            onClick={form.handleSubmit(onSubmit, onError)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Budget Plan</>}
          </Button>
        </div>

        <style jsx global>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-6px); }
            40%, 80% { transform: translateX(6px); }
          }
          .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        `}</style>
      </SheetContent>
    </Sheet>
  );
};

export default AddBudgetDrawer;