"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, UploadCloud, TriangleAlert, Download } from "lucide-react";
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

const addMasterSummaryFormSchema = z.object({
  examination: z.string().min(2, { message: "Examination name is required." }),
  code: z.enum(["SFNA", "SSNA", "PSLE", "FTNA", "CSEE", "ACSEE"], {
    required_error: "Examination code is required.",
  }),
  year: z.preprocess(
    (val) => Number(val),
    z.number().int().min(1900, { message: "Year must be a valid year." }).max(2100, { message: "Year must be a valid year." })
  ),
  file: z.any() // This will hold the FileList object temporarily
    .refine((file) => file?.length > 0, "File is required.")
    .refine((file) => file?.[0]?.size <= 10 * 1024 * 1024, `File size should be less than 10MB.`)
    .refine(
      (file) => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'].includes(file?.[0]?.type),
      "Only .xlsx and .csv files are allowed."
    ),
});

export type AddMasterSummaryFormValues = z.infer<typeof addMasterSummaryFormSchema>;

interface AddMasterSummaryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddMasterSummaryForm: React.FC<AddMasterSummaryFormProps> = ({ open, onOpenChange, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [examinations, setExaminations] = useState<ExaminationOption[]>([]);
  const [examinationsLoading, setExaminationsLoading] = useState(true);
  const [missingHeadersError, setMissingHeadersError] = useState<string | null>(null);
  const [expectedHeadersForTemplate, setExpectedHeadersForTemplate] = useState<string[]>([]);
  const [parsedFileData, setParsedFileData] = useState<string | null>(null); // State to hold parsed JSON data

  const form = useForm<AddMasterSummaryFormValues>({
    resolver: zodResolver(addMasterSummaryFormSchema),
    defaultValues: {
      examination: "",
      code: undefined,
      year: new Date().getFullYear(),
      file: undefined,
    },
  });

  // Fetch examinations when the dialog opens
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
      
      // Reset form for a new entry
      form.reset({
        examination: "",
        code: undefined,
        year: new Date().getFullYear(),
        file: undefined,
      });
      setMissingHeadersError(null); // Clear previous errors
      setExpectedHeadersForTemplate([]);
      setParsedFileData(null); // Clear parsed data
    }
  }, [open, form]);

  // Effect to update 'code' when 'examination' changes
  useEffect(() => {
    const selectedExaminationName = form.watch('examination');
    if (selectedExaminationName) {
      const selectedExam = examinations.find(
        (exam) => exam.examination === selectedExaminationName
      );
      if (selectedExam) {
        if (addMasterSummaryFormSchema.shape.code.options.includes(selectedExam.code as any)) {
          form.setValue('code', selectedExam.code as AddMasterSummaryFormValues['code'], { shouldValidate: true });
        } else {
          form.setError('code', { type: 'manual', message: `Invalid code '${selectedExam.code}' for master summary.` });
          form.setValue('code', undefined);
        }
      }
    } else {
      form.setValue('code', undefined);
    }
  }, [form.watch('examination'), examinations, form]);

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
    setMissingHeadersError(null);
    setExpectedHeadersForTemplate([]);

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

  const onSubmit = async (values: AddMasterSummaryFormValues) => {
    setLoading(true);
    setMissingHeadersError(null);
    setExpectedHeadersForTemplate([]);

    if (!parsedFileData) {
      showError("No parsed data available. Please upload a valid file.");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('examination', values.examination);
      formData.append('code', values.code);
      formData.append('year', values.year.toString());
      formData.append('data', parsedFileData); // Send the parsed JSON data as a string
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-mastersummary`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error && result.expectedHeaders) {
          setMissingHeadersError(result.error);
          setExpectedHeadersForTemplate(result.expectedHeaders);
        } else {
          showError(result.error || 'Failed to process master summary data.');
        }
        return; // Stop further processing
      }

      showSuccess(result.message || "Master summary and detailed data processed successfully!");
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || "An unexpected error occurred during master summary creation.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (expectedHeadersForTemplate.length === 0) {
      showError("No template headers available. Please select an examination first.");
      return;
    }

    const csvContent = expectedHeadersForTemplate.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // Feature detection for download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${form.getValues('code') || 'master_summary'}_template.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccess("Template downloaded successfully!");
    } else {
      showError("Your browser does not support downloading files directly. Please copy the headers manually.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Master Summary</DialogTitle>
          <DialogDescription>
            Upload an Excel/CSV file containing registration data for a specific examination.
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
                            <SelectItem key={exam.exam_id} value={exam.examination}>
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
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Examination Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Auto-filled"
                        {...field}
                        readOnly
                        disabled={true}
                        className="bg-gray-100 cursor-not-allowed"
                      />
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
                      <Input type="number" placeholder="e.g., 2023" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="file"
                render={({ field: { value, ...fieldProps } }) => (
                  <FormItem>
                    <FormLabel>Upload Data File (.xlsx, .csv)</FormLabel>
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
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading || examinationsLoading || !parsedFileData}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" /> Create Summary
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

export default AddMasterSummaryForm;