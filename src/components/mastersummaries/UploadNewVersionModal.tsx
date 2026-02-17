"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, UploadCloud } from "lucide-react";
import * as XLSX from 'xlsx'; // Import xlsx library

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
import { showSuccess, showError } from "@/utils/toast";
import { MasterSummary } from "@/types/mastersummaries";

const uploadNewVersionSchema = z.object({
  file: z.any() // This will hold the FileList object temporarily
    .refine((file) => file?.length > 0, "File is required.")
    .refine((file) => file?.[0]?.size <= 10 * 1024 * 1024, `File size should be less than 10MB.`)
    .refine(
      (file) => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'].includes(file?.[0]?.type),
      "Only .xlsx and .csv files are allowed."
    ),
});

export type UploadNewVersionFormValues = z.infer<typeof uploadNewVersionSchema>;

interface UploadNewVersionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterSummaryData: MasterSummary | null; // The existing master summary data
  onSuccess: () => void;
}

const UploadNewVersionModal: React.FC<UploadNewVersionModalProps> = ({ open, onOpenChange, masterSummaryData, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [parsedFileData, setParsedFileData] = useState<string | null>(null); // State to hold parsed JSON data

  const form = useForm<UploadNewVersionFormValues>({
    resolver: zodResolver(uploadNewVersionSchema),
    defaultValues: {
      file: undefined,
    },
  });

  // Reset form when modal opens or masterSummaryData changes
  useEffect(() => {
    if (open) {
      form.reset({ file: undefined });
      setParsedFileData(null); // Clear parsed data
    }
  }, [open, masterSummaryData, form]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    form.setValue('file', files); // Set the FileList to the form field for validation

    if (!files || files.length === 0) {
      setParsedFileData(null);
      return;
    }

    const file = files[0];

    // Perform client-side file validation
    if (file.size > 10 * 1024 * 1024) {
      form.setError('file', { type: 'manual', message: 'File size should be less than 10MB.' });
      setParsedFileData(null);
      return;
    }
    if (!['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'].includes(file.type)) {
      form.setError('file', { type: 'manual', message: 'Only .xlsx and .csv files are allowed.' });
      setParsedFileData(null);
      return;
    }

    setLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        let workbook;
        let jsonData: any[] = [];

        if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        } else if (file.type === 'text/csv') {
          const csvText = new TextDecoder().decode(data as ArrayBuffer);
          jsonData = XLSX.utils.sheet_to_json(XLSX.read(csvText, { type: 'string' }).Sheets['Sheet1'], { defval: '' });
        }

        if (jsonData.length === 0) {
          form.setError('file', { type: 'manual', message: 'Uploaded file contains no data or invalid format.' });
          setParsedFileData(null);
          return;
        }

        setParsedFileData(JSON.stringify(jsonData));
        form.clearErrors('file'); // Clear any file-related errors if parsing is successful
      };
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      form.setError('file', { type: 'manual', message: `Error parsing file: ${error.message}` });
      setParsedFileData(null);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: UploadNewVersionFormValues) => {
    setLoading(true);

    if (!masterSummaryData) {
      showError("No master summary data provided for version upload.");
      setLoading(false);
      return;
    }

    if (!parsedFileData) {
      showError("No parsed data available. Please upload a valid file.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('existingMasterSummaryId', masterSummaryData.id.toString());
      formData.append('examination', masterSummaryData.Examination);
      formData.append('code', masterSummaryData.Code);
      formData.append('year', masterSummaryData.Year.toString());
      formData.append('data', parsedFileData); // Send the parsed JSON data as a string
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-mastersummary`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload new version of master summary.');
      }

      showSuccess(result.message || "New version uploaded successfully!");
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred during version upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
          <DialogDescription>
            Upload a new data file for {masterSummaryData?.Examination} ({masterSummaryData?.Code}) - {masterSummaryData?.Year}.
            This will create a new version and mark the current latest as historical.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Current Examination: <span className="font-semibold">{masterSummaryData?.Examination} ({masterSummaryData?.Code})</span></p>
              <p className="text-sm font-medium text-gray-700">Year: <span className="font-semibold">{masterSummaryData?.Year}</span></p>
            </div>
            <FormField
              control={form.control}
              name="file"
              render={({ field: { value, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel>Upload New Data File (.xlsx, .csv)</FormLabel>
                  <FormControl>
                    <Input
                      {...fieldProps}
                      type="file"
                      accept=".xlsx,.csv"
                      onChange={handleFileChange} // Use the new handler
                      disabled={loading}
                      className="file:text-neas-green file:font-semibold file:hover:bg-gray-100"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading || !masterSummaryData || !parsedFileData}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" /> Upload New Version
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

export default UploadNewVersionModal;