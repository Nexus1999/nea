"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, UploadCloud, TriangleAlert, Download } from "lucide-react";

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

const specialNeedsMasterSummaryFormSchema = z.object({
  mid: z.number(),
  examination: z.string(),
  code: z.string(),
  year: z.number(),
  special_need: z.enum(["HI", "BR", "LV", "PI"], {
    required_error: "Special need type is required.",
  }),
  file: z.any()
    .refine((file) => file?.length > 0, "File is required.")
    .refine((file) => file?.[0]?.size <= 10 * 1024 * 1024, `File size should be less than 10MB.`)
    .refine(
      (file) => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'].includes(file?.[0]?.type),
      "Only .xlsx and .csv files are allowed."
    ),
});

export type SpecialNeedsMasterSummaryFormValues = z.infer<typeof specialNeedsMasterSummaryFormSchema>;

interface SpecialNeedsMasterSummaryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterSummaryData: {
    id: number;
    examination: string;
    code: string;
    year: number;
  } | null;
  onSuccess: () => void;
}

const SpecialNeedsMasterSummaryForm: React.FC<SpecialNeedsMasterSummaryFormProps> = ({ open, onOpenChange, masterSummaryData, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [missingHeadersError, setMissingHeadersError] = useState<string | null>(null);
  const [expectedHeadersForTemplate, setExpectedHeadersForTemplate] = useState<string[]>([]);

  const form = useForm<SpecialNeedsMasterSummaryFormValues>({
    resolver: zodResolver(specialNeedsMasterSummaryFormSchema),
    defaultValues: {
      mid: masterSummaryData?.id,
      examination: masterSummaryData?.examination || "",
      code: masterSummaryData?.code || "",
      year: masterSummaryData?.year,
      special_need: undefined,
      file: undefined,
    },
  });

  useEffect(() => {
    if (open && masterSummaryData) {
      form.reset({
        mid: masterSummaryData.id,
        examination: masterSummaryData.examination,
        code: masterSummaryData.code,
        year: masterSummaryData.year,
        special_need: undefined,
        file: undefined,
      });
      setMissingHeadersError(null);
      setExpectedHeadersForTemplate([]);
    }
  }, [open, masterSummaryData, form]);

  const onSubmit = async (values: SpecialNeedsMasterSummaryFormValues) => {
    setLoading(true);
    setMissingHeadersError(null);
    setExpectedHeadersForTemplate([]);

    try {
      const formData = new FormData();
      formData.append('mid', values.mid.toString());
      formData.append('special_need', values.special_need);
      formData.append('code', values.code);
      
      const fileToUpload = values.file?.[0];
      if (fileToUpload) {
        formData.append('file', fileToUpload);
      } else {
        throw new Error("No file selected.");
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-specialneeds-mastersummary`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error && result.expectedHeaders) {
          setMissingHeadersError(result.error);
          setExpectedHeadersForTemplate(result.expectedHeaders);
        } else {
          showError(result.error || 'Failed to process special needs file.');
        }
        return;
      }

      showSuccess(result.message || "Special needs data processed successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (expectedHeadersForTemplate.length === 0) {
      showError("No template headers available.");
      return;
    }

    const csvContent = expectedHeadersForTemplate.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${masterSummaryData?.code || 'special_needs'}_${form.getValues('special_need') || 'template'}_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Template downloaded successfully!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Special Needs Master Summary</DialogTitle>
          <DialogDescription>
            Upload an Excel/CSV file containing special needs registration data.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {missingHeadersError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
                <p className="font-semibold mb-2 flex items-center"><TriangleAlert className="h-4 w-4 mr-2" /> {missingHeadersError}</p>
                {expectedHeadersForTemplate.length > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <p>Expected headers: <span className="font-mono text-xs bg-red-100 px-2 py-1 rounded">{expectedHeadersForTemplate.join(', ')}</span></p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadTemplate}
                      className="text-red-700 border-red-700 hover:bg-red-100"
                    >
                      <Download className="h-4 w-4 mr-2" /> Download Template
                    </Button>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="examination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Examination Name</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-gray-100 cursor-not-allowed" />
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
                    <FormLabel>Examination Code</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-gray-100 cursor-not-allowed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} readOnly className="bg-gray-100 cursor-not-allowed" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="special_need"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Need Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a special need type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="HI">HI - Hearing Impairment</SelectItem>
                        <SelectItem value="BR">BR - Braille</SelectItem>
                        <SelectItem value="LV">LV - Low Vision</SelectItem>
                        <SelectItem value="PI">PI - Physical Impairment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="file"
                render={({ field: { value, onChange, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Upload Data File (.xlsx, .csv)</FormLabel>
                    <FormControl>
                      <Input
                        {...fieldProps}
                        type="file"
                        accept=".xlsx,.csv"
                        onChange={(event) => {
                          onChange(event.target.files);
                        }}
                        disabled={loading}
                        className="file:text-primary file:font-semibold file:hover:bg-gray-100"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading || !masterSummaryData}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" /> Upload Data
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SpecialNeedsMasterSummaryForm;