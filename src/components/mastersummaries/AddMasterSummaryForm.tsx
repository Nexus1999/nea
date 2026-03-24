"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Loader2, 
  UploadCloud, 
  TriangleAlert, 
  Download, 
  FileSpreadsheet, 
  Calendar, 
  Hash,
  CheckCircle2,
  X
} from "lucide-react";
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
import { cn } from "@/lib/utils";

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
  examination: z.string().min(1, { message: "Examination is required." }),
  code: z.string().min(1, { message: "Code is required." }),
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
  const [missingHeadersError, setMissingHeadersError] = useState<string | null>(null);
  const [expectedHeadersForTemplate, setExpectedHeadersForTemplate] = useState<string[]>([]);
  const [parsedFileData, setParsedFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<AddMasterSummaryFormValues>({
    resolver: zodResolver(addMasterSummaryFormSchema),
    defaultValues: { examination: "", code: "", year: new Date().getFullYear(), file: undefined },
  });

  const watchedCode = useWatch({ control: form.control, name: 'code' });

  useEffect(() => {
    if (open) {
      const fetchExaminations = async () => {
        const { data, error } = await supabase.from('examinations').select('*').eq('status', 'active').order('code');
        if (!error) setExaminations(data || []);
      };
      fetchExaminations();
      form.reset();
      setMissingHeadersError(null);
      setParsedFileData(null);
      setFileName(null);
    }
  }, [open, form]);

  const handleCodeChange = (code: string) => {
    const selectedExam = examinations.find(e => e.code === code);
    if (selectedExam) {
      form.setValue('code', code, { shouldValidate: true });
      form.setValue('examination', selectedExam.examination, { shouldValidate: true });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const selectedCode = form.getValues('code');

    if (!selectedCode) {
      showError("Please select an examination code first.");
      event.target.value = '';
      return;
    }

    setLoading(true);
    setMissingHeadersError(null);
    setFileName(file.name);

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
          setMissingHeadersError(errorMsg);
          setParsedFileData(null);
          setFileName(null);
          event.target.value = '';
        } else {
          setParsedFileData(JSON.stringify(jsonData));
          form.setValue('file', files, { shouldValidate: true });
        }
      } catch (err: any) {
        showError(err.message);
        setFileName(null);
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

      showSuccess("Master summary created successfully!");
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
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="bg-slate-900 text-white p-6">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-400" />
            Add Master Summary
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Upload and process examination data for the master records.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-semibold flex items-center gap-2">
                    <Hash className="h-4 w-4 text-slate-400" /> Exam Code
                  </FormLabel>
                  <Select onValueChange={handleCodeChange} value={field.value} disabled={loading}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl border-slate-200 focus:ring-blue-500">
                        <SelectValue placeholder="Select code" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl">
                      {examinations.map((exam) => (
                        <SelectItem key={exam.exam_id} value={exam.code} className="rounded-lg">
                          <span className="font-bold">{exam.code}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="year" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" /> Academic Year
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      disabled={loading} 
                      className="h-11 rounded-xl border-slate-200 focus:ring-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="space-y-4">
              {missingHeadersError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold mb-1">Validation Error</p>
                      <p className="opacity-90">{missingHeadersError}</p>
                      {expectedHeadersForTemplate.length > 0 && (
                        <Button type="button" variant="link" size="sm" className="p-0 h-auto text-red-700 font-bold mt-2 hover:no-underline" onClick={() => {}}>
                          <Download className="h-3.5 w-3.5 mr-1" /> Download Template
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <FormField control={form.control} name="file" render={() => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-semibold">Data Source</FormLabel>
                  <FormControl>
                    <div 
                      onClick={() => !loading && watchedCode && fileInputRef.current?.click()}
                      className={cn(
                        "relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center gap-3",
                        !watchedCode ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed" : "bg-blue-50/30 border-blue-200 hover:border-blue-400 hover:bg-blue-50/50",
                        fileName && "border-green-200 bg-green-50/30",
                        missingHeadersError && "border-red-200 bg-red-50/30"
                      )}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept=".xlsx,.csv" 
                        onChange={handleFileChange} 
                        disabled={loading || !watchedCode} 
                      />
                      
                      {fileName ? (
                        <>
                          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-900 truncate max-w-[300px]">{fileName}</p>
                            <p className="text-xs text-slate-500 mt-1">File ready for processing</p>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 h-8 w-8 rounded-full hover:bg-red-50 hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFileName(null);
                              setParsedFileData(null);
                              setMissingHeadersError(null);
                              form.setValue('file', undefined);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <UploadCloud className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-900">
                              {watchedCode ? "Click to upload spreadsheet" : "Select exam code first"}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Supports .xlsx and .csv files</p>
                          </div>
                        </>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !parsedFileData}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 px-8 min-w-[140px]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>Process Data</>
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