"use client";

import React, { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, UploadCloud, TriangleAlert, Download } from "lucide-react";
import * as XLSX from 'xlsx';

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

const CSEE_FTNA_SUBJECT_CODES = ['011','012','013','014','015','016','017','018','019','021','022','023','024','025','026','031','032','033','034','035','036','041','042','050','051','052','061','062','071','072','073','074','080','081','082','083','087','088','090','091'];
const ACSEE_SUBJECT_CODES = ['111','112','113','114','115','116','118','121','122','123','125','126','131','132','133','134','136','137','141','142','151','152','153','155','161'];
const UALIMU_SUBJECT_CODES = ['513','514','520','521','522-E','531','532','541','542','551','552','553','554','566','567','585','586','587','588','589','595','596','597','598','599','610','611','520-E','616','522','516','521-E','517','580','590','710','711','712','713','715','716','717','719','721','722','724','725','731','732','733','735','736','737','738','740','750','751','752','753','761','762','763','764','612','613','614','615','621','622','624','631','632','633','634','635','636','638','640','641','650','651','652','654','680','682','683','684','686','687','689','691','510','560','561','562','563','564','565','571','572','573','574','581','582','583','584','661','664','665','669','670','672','673','674','675','676','679','692','693','694','695','696'];

interface ExaminationOption {
  exam_id: number;
  examination: string;
  code: string;
  level: string;
  status: string;
}

const addMasterSummaryFormSchema = z.object({
  examination: z.string().min(2, { message: "Examination name is required." }),
  code: z.enum(["SFNA", "SSNA", "PSLE", "FTNA", "CSEE", "ACSEE", "DSEE", "GATCE", "GATSCCE", "DPEE", "DSPEE", "DPPEE"], {
    required_error: "Examination code is required.",
  }),
  year: z.preprocess(
    (val) => Number(val),
    z.number().int().min(1900).max(2100)
  ),
  file: z.any().refine((file) => file?.length > 0, "File is required."),
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
  const [parsedFileData, setParsedFileData] = useState<string | null>(null);

  const form = useForm<AddMasterSummaryFormValues>({
    resolver: zodResolver(addMasterSummaryFormSchema),
    defaultValues: { examination: "", code: undefined, year: new Date().getFullYear(), file: undefined },
  });

  const watchedExamination = useWatch({ control: form.control, name: 'examination' });
  const watchedCode = useWatch({ control: form.control, name: 'code' });

  useEffect(() => {
    if (open) {
      const fetchExaminations = async () => {
        setExaminationsLoading(true);
        const { data, error } = await supabase.from('examinations').select('*').eq('status', 'active').order('examination');
        if (!error) setExaminations(data || []);
        setExaminationsLoading(false);
      };
      fetchExaminations();
      form.reset();
      setMissingHeadersError(null);
      setParsedFileData(null);
    }
  }, [open, form]);

  useEffect(() => {
    if (watchedExamination) {
      const selectedExam = examinations.find(e => e.examination === watchedExamination);
      if (selectedExam) form.setValue('code', selectedExam.code as any, { shouldValidate: true });
    }
  }, [watchedExamination, examinations, form]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const selectedCode = form.getValues('code');

    if (!selectedCode) {
      showError("Please select an examination first.");
      event.target.value = '';
      return;
    }

    setLoading(true);
    setMissingHeadersError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });

        if (jsonData.length === 0) throw new Error("File is empty.");

        const headers = Object.keys(jsonData[0] as object).map(h => h.toLowerCase());
        let isValid = true;
        let errorMsg = "";

        if (["SFNA", "SSNA", "PSLE"].includes(selectedCode)) {
          if (!headers.includes('subjects') || !headers.includes('medium')) {
            isValid = false;
            errorMsg = "File is missing primary examination columns (subjects, medium).";
          }
        } else if (selectedCode === "ACSEE") {
          const hasACSEE = ACSEE_SUBJECT_CODES.some(c => headers.includes(c.toLowerCase()));
          if (!hasACSEE) {
            isValid = false;
            errorMsg = "File does not contain ACSEE subject columns.";
          }
        } else if (["FTNA", "CSEE"].includes(selectedCode)) {
          const hasCSEE = CSEE_FTNA_SUBJECT_CODES.some(c => headers.includes(c.toLowerCase()));
          if (!hasCSEE) {
            isValid = false;
            errorMsg = "File does not contain CSEE/FTNA subject columns.";
          }
        } else if (['DSEE', 'GATCE', 'GATSCCE', 'DPEE', 'DSPEE', 'DPPEE'].includes(selectedCode)) {
          const hasUalimu = UALIMU_SUBJECT_CODES.some(c => headers.includes(c.toLowerCase()));
          if (!hasUalimu) {
            isValid = false;
            errorMsg = "File does not contain Ualimu subject columns.";
          }
        }

        if (!isValid) {
          showError(errorMsg);
          setParsedFileData(null);
          event.target.value = '';
        } else {
          setParsedFileData(JSON.stringify(jsonData));
          form.setValue('file', files, { shouldValidate: true });
        }
      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onSubmit = async (values: AddMasterSummaryFormValues) => {
    if (!parsedFileData) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('examination', values.examination);
      formData.append('code', values.code);
      formData.append('year', values.year.toString());
      formData.append('data', parsedFileData);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-mastersummary`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.expectedHeaders) {
          setMissingHeadersError(result.error);
          setExpectedHeadersForTemplate(result.expectedHeaders);
        } else {
          showError(result.error || 'Failed to process.');
        }
        return;
      }

      showSuccess("Processed successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Master Summary</DialogTitle>
          <DialogDescription>Upload data for the selected examination.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {missingHeadersError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
                <p className="font-semibold flex items-center"><TriangleAlert className="h-4 w-4 mr-2" /> {missingHeadersError}</p>
                {expectedHeadersForTemplate.length > 0 && (
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => {}}>
                    <Download className="h-4 w-4 mr-2" /> Download Template
                  </Button>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="examination" render={({ field }) => (
                <FormItem>
                  <FormLabel>Examination Name</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {examinations.map((exam) => (
                        <SelectItem key={exam.exam_id} value={exam.examination}>{exam.examination} ({exam.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl><Input {...field} readOnly className="bg-gray-100" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl><Input type="number" {...field} disabled={loading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="file" render={() => (
                <FormItem>
                  <FormLabel>File (.xlsx, .csv)</FormLabel>
                  <FormControl><Input type="file" accept=".xlsx,.csv" onChange={handleFileChange} disabled={loading || !watchedCode} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading || !parsedFileData}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><UploadCloud className="mr-2 h-4 w-4" /> Create Summary</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMasterSummaryForm;