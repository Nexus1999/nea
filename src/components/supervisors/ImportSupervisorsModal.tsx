"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, UploadCloud, Download, AlertTriangle, RefreshCw, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// --- Configuration Constants ---
const REQUIRED_HEADERS = ['region', 'district', 'first_name', 'last_name', 'center_no'];
const OPTIONAL_HEADERS = ['middle_name', 'nin', 'cheque_no', 'tsc_no', 'index_no', 'csee_year', 'phone', 'notes'];
const ALL_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];
const CHUNK_SIZE = 200;

// --- Sanitization Utilities ---

const sanitizePhone = (phoneInput: any) => {
  if (!phoneInput) return null;
  let phone = String(phoneInput).trim().replace(/\D/g, '');
  if (phone.startsWith('255')) phone = phone.slice(3);
  if (phone.startsWith('0')) phone = phone.slice(1);
  if (phone.length === 9 && (phone.startsWith('7') || phone.startsWith('6'))) {
    return `+255 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 9)}`;
  }
  return phone;
};

const sanitizeCenterNo = (centerInput: any) => {
  if (!centerInput) return null;
  // Standardize: S.0614 or s614 -> S0614
  let center = String(centerInput).trim().toUpperCase().replace(/O/g, '0').replace(/\./g, '');
  const match = center.match(/^([SP])(\d+)$/i);
  if (!match) return center;
  
  const prefix = match[1];
  const digits = match[2].padStart(4, '0');
  return `${prefix}${digits}`;
};

const sanitizeIndexNo = (indexInput: any) => {
  if (!indexInput) return null;
  // 1. Clean characters first
  let index = String(indexInput)
    .trim()
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/\./g, '')
    .replace(/[\s\/]+/g, '-');

  // 2. Extract Prefix and digits
  const match = index.match(/^([SP])(.*)$/i);
  if (!match) return index;

  const prefix = match[1];
  let parts = match[2].split('-').filter(p => p);
  
  // Pad center part and candidate part if they are 3 digits
  if (parts[0]) parts[0] = parts[0].length === 3 ? parts[0].padStart(4, '0') : parts[0];
  if (parts[1]) parts[1] = parts[1].length === 3 ? parts[1].padStart(4, '0') : parts[1];
  
  return parts[1] ? `${prefix}${parts[0]}-${parts[1]}` : `${prefix}${parts[0]}`;
};

const importSchema = z.object({
  file: z.any()
    .refine((files) => files?.length > 0, "Select a file")
    .refine((files) => {
      if (!files?.[0]) return false;
      const ext = files[0].name.split('.').pop()?.toLowerCase();
      return ext === 'xlsx' || ext === 'csv';
    }, "Only .xlsx and .csv allowed")
});

export const ImportSupervisorsModal = ({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (o: boolean) => void, onSuccess: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [errorFile, setErrorFile] = useState<{data: any[], name: string} | null>(null);

  const form = useForm<z.infer<typeof importSchema>>({
    resolver: zodResolver(importSchema)
  });

  const fileSelected = form.watch("file");

  useEffect(() => {
    if (!open) {
      form.reset();
      setHeaderError(null);
      setErrorFile(null);
      setProgress(0);
      setLoading(false);
    }
  }, [open, form]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([Object.fromEntries(ALL_HEADERS.map(h => [h, ""]))]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "supervisors_template.xlsx");
  };

  const handleDownloadErrors = () => {
    if (!errorFile) return;
    const ws = XLSX.utils.json_to_sheet(errorFile.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Errors");
    XLSX.writeFile(wb, errorFile.name);
  };

  const batchCheckDuplicates = async (rows: any[]) => {
    const phones = new Set<string>();
    const nins = new Set<string>();
    const chequeNos = new Set<string>();
    const indexYearPairs = new Set<string>();
    const nameCenterPairs = new Set<string>();
    
    rows.forEach(({ row, sanitizedPhone, sanitizedIndex, sanitizedCenter }) => {
      if (sanitizedPhone) phones.add(sanitizedPhone);
      if (row.nin) nins.add(row.nin);
      if (row.cheque_no) chequeNos.add(row.cheque_no);
      if (sanitizedIndex && row.csee_year) indexYearPairs.add(`${sanitizedIndex}|${row.csee_year}`);
      nameCenterPairs.add(`${row.first_name}|${row.last_name}|${sanitizedCenter}`);
    });

    const [phoneResults, ninResults, chequeResults, indexResults, nameResults] = await Promise.all([
      phones.size > 0 ? supabase.from('supervisors').select('phone').in('phone', Array.from(phones)) : Promise.resolve({ data: [] }),
      nins.size > 0 ? supabase.from('supervisors').select('nin').in('nin', Array.from(nins)) : Promise.resolve({ data: [] }),
      chequeNos.size > 0 ? supabase.from('supervisors').select('cheque_no').in('cheque_no', Array.from(chequeNos)) : Promise.resolve({ data: [] }),
      indexYearPairs.size > 0 ? supabase.from('supervisors').select('index_no, csee_year').or(
        Array.from(indexYearPairs).map(pair => {
          const [idx, year] = pair.split('|');
          return `and(index_no.eq.${idx},csee_year.eq.${year})`;
        }).join(',')
      ) : Promise.resolve({ data: [] }),
      supabase.from('supervisors').select('first_name, last_name, center_no')
    ]);

    const existingPhones = new Set(phoneResults.data?.map(r => r.phone) || []);
    const existingNins = new Set(ninResults.data?.map(r => r.nin) || []);
    const existingCheques = new Set(chequeResults.data?.map(r => r.cheque_no) || []);
    const existingIndexYears = new Set(indexResults.data?.map(r => `${r.index_no}|${r.csee_year}`) || []);
    const existingNameCenters = new Set(nameResults.data?.map(r => `${r.first_name}|${r.last_name}|${r.center_no}`) || []);

    return ({ row, sanitizedPhone, sanitizedIndex, sanitizedCenter }: any) => {
      if (sanitizedPhone && existingPhones.has(sanitizedPhone)) return true;
      if (row.nin && existingNins.has(row.nin)) return true;
      if (row.cheque_no && existingCheques.has(row.cheque_no)) return true;
      if (sanitizedIndex && row.csee_year && existingIndexYears.has(`${sanitizedIndex}|${row.csee_year}`)) return true;
      if (existingNameCenters.has(`${row.first_name}|${row.last_name}|${sanitizedCenter}`)) return true;
      return false;
    };
  };

  const onSubmit = async (values: z.infer<typeof importSchema>) => {
    setLoading(true);
    setProgress(0);
    setErrorFile(null);
    setHeaderError(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const rawData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });

        if (!rawData.length) {
          setHeaderError("File is empty");
          setLoading(false);
          return;
        }

        const headers = Object.keys(rawData[0]).map(h => h.trim().toLowerCase());
        const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h));
        if (missing.length) {
          setHeaderError(`Missing required columns: ${missing.join(", ")}`);
          setLoading(false);
          return;
        }

        // Pre-sanitize center numbers for batch fetching
        const sanitizedData = rawData.map(row => ({
            ...row,
            sanitizedCenter: sanitizeCenterNo(row.center_no)
        }));

        const uniqueCenterNos = [...new Set(sanitizedData.map(row => row.sanitizedCenter).filter(Boolean))];
        setProgress(5);

        const centerCache = new Map();
        
        const { data: secSchools } = await supabase
          .from('secondaryschools')
          .select('center_no, region, district, center_type')
          .in('center_no', uniqueCenterNos)
          .eq('status', 'active');
        
        secSchools?.forEach(center => {
          centerCache.set(center.center_no, center);
        });

        const notFoundCenters = uniqueCenterNos.filter(cn => !centerCache.has(cn));
        if (notFoundCenters.length > 0) {
          const { data: tcSchools } = await supabase
            .from('teacherscolleges')
            .select('center_no, region, district')
            .in('center_no', notFoundCenters)
            .eq('status', 'active');
          
          tcSchools?.forEach(center => {
            centerCache.set(center.center_no, { ...center, center_type: 'public' });
          });
        }
        setProgress(15);

        const toInsert: any[] = [];
        const localErrors: any[] = [];
        const year_imported = new Date().getFullYear().toString();

        const processedRows = [];
        for (let i = 0; i < sanitizedData.length; i++) {
          const rowData = sanitizedData[i];
          const { sanitizedCenter } = rowData;

          if (i % 10 === 0) {
            setProgress(15 + Math.round((i / sanitizedData.length) * 20));
          }

          const hasMissing = REQUIRED_HEADERS.some(h => !String(rowData[h] || "").trim());
          if (hasMissing) {
            localErrors.push({ ...rowData, error_message: "Missing required fields" });
            continue;
          }

          const centerInfo = centerCache.get(sanitizedCenter);

          if (!centerInfo) {
            localErrors.push({ ...rowData, error_message: `Center ${sanitizedCenter} not found/inactive` });
            continue;
          }

          const type = centerInfo.center_type?.toLowerCase() || 'public';
          if (type === 'private' || type === 'seminary') {
            localErrors.push({ ...rowData, error_message: `Center ${sanitizedCenter} is Private/Seminary (Not allowed)` });
            continue;
          }

          const dbRegion = centerInfo.region.trim().toLowerCase();
          const dbDistrict = centerInfo.district.trim().toLowerCase();
          const rowRegion = rowData.region.trim().toLowerCase();
          const rowDistrict = rowData.district.trim().toLowerCase();
          
          if (dbRegion !== rowRegion || dbDistrict !== rowDistrict) {
            localErrors.push({ 
              ...rowData, 
              error_message: `Location mismatch: Excel has ${rowData.region}/${rowData.district} but DB has ${centerInfo.region}/${centerInfo.district}` 
            });
            continue;
          }

          const sanitizedPhone = sanitizePhone(rowData.phone);
          const sanitizedIndex = sanitizeIndexNo(rowData.index_no);

          processedRows.push({ row: rowData, sanitizedPhone, sanitizedIndex, sanitizedCenter, type, centerInfo });
        }

        setProgress(35);

        const isDuplicateChecker = await batchCheckDuplicates(processedRows);
        setProgress(50);

        for (let i = 0; i < processedRows.length; i++) {
          const { row, sanitizedPhone, sanitizedIndex, sanitizedCenter, type, centerInfo } = processedRows[i];

          if (i % 10 === 0) {
            setProgress(50 + Math.round((i / processedRows.length) * 25));
          }

          if (isDuplicateChecker({ row, sanitizedPhone, sanitizedIndex, sanitizedCenter })) {
            localErrors.push({ ...row, error_message: "Duplicate supervisor found" });
            continue;
          }

          toInsert.push({
            first_name: row.first_name,
            middle_name: row.middle_name || null,
            last_name: row.last_name,
            nin: row.nin || null,
            phone: sanitizedPhone,
            tsc_no: row.tsc_no || null,
            cheque_no: row.cheque_no || null,
            region: centerInfo.region,
            district: centerInfo.district,
            center_no: sanitizedCenter, // Storing standardized center_no
            center_type: type,
            index_no: sanitizedIndex,
            csee_year: row.csee_year ? String(row.csee_year) : null,
            year_imported,
            added_by: localStorage.getItem('username') || 'system'
          });
        }

        setProgress(75);

        if (toInsert.length > 0) {
          for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
            const chunk = toInsert.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from('supervisors').insert(chunk);
            if (error) throw error;
            setProgress(75 + Math.round(((i + chunk.length) / toInsert.length) * 25));
          }
        }

        setProgress(100);

        if (localErrors.length > 0) {
          setErrorFile({ data: localErrors, name: "supervisor_import_errors.xlsx" });
          toast.warning(`Imported ${toInsert.length} supervisors, but ${localErrors.length} had errors.`);
        } else {
          toast.success(`Successfully imported ${toInsert.length} supervisors`);
          onOpenChange(false);
        }
        onSuccess();
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(values.file[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
            Import Supervisors
          </DialogTitle>
          <DialogDescription>Upload Excel or CSV file format.</DialogDescription>
        </DialogHeader>

        {headerError && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 py-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-red-800">{headerError}</span>
              <Button size="sm" variant="outline" className="h-8 text-xs bg-white w-fit" onClick={downloadTemplate}>
                <Download className="mr-1 h-3 w-3" /> Download Template
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {errorFile && (
          <Alert variant="destructive" className="bg-red-50 border-red-200 py-2">
            <AlertDescription className="flex justify-between items-center">
              <span className="text-xs font-semibold text-red-800">{errorFile.data.length} rows have errors</span>
              <Button size="sm" variant="outline" className="h-7 text-[10px] bg-white" onClick={handleDownloadErrors}>
                <Download className="mr-1 h-3 w-3" /> Download Error Log
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormControl>
                    <div className={cn(
                      "group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer",
                      fileSelected?.length > 0 ? "border-black bg-slate-50" : "border-muted-foreground/25 hover:bg-slate-50"
                    )}>
                      <FileSpreadsheet className={cn("h-10 w-10 mb-2", fileSelected?.length > 0 ? "text-black" : "text-muted-foreground")} />
                      <p className="text-sm font-medium">{fileSelected?.length > 0 ? fileSelected[0].name : "Select Supervisor File"}</p>
                      <Input 
                        type="file" 
                        accept=".xlsx,.csv" 
                        disabled={loading} 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                        onChange={(e) => onChange(e.target.files)} 
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {loading && (
              <div className="space-y-2">
                <Progress value={progress} className="h-1.5" />
                <p className="text-xs text-center text-muted-foreground">{progress}% complete</p>
              </div>
            )}

            <DialogFooter>
              <Button 
                type="button" 
                onClick={form.handleSubmit(onSubmit)} 
                disabled={loading || !fileSelected}
                className="w-full sm:w-auto"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Import"}
              </Button>
            </DialogFooter>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};