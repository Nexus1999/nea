"use client";

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  FileUp, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  FileSpreadsheet,
  X
} from "lucide-react";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

interface ImportTeachersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ImportTeachersModal = ({ open, onOpenChange, onSuccess }: ImportTeachersModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{ type: 'error' | 'success' | 'info', message: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (type: 'error' | 'success' | 'info', message: string) => {
    setLogs(prev => [...prev, { type, message }]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(csv|xlsx|xls)$/)) {
        showError("Please upload an Excel or CSV file.");
        return;
      }
      setFile(selectedFile);
      setLogs([]);
      addLog('info', `Selected file: ${selectedFile.name}`);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "teacher_name", "sex", "check_number", "phone", 
      "region_code", "district_number", "workstation", 
      "experience_years_base", "experience_base_year", 
      "index_no", "csee_year"
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "teacher_import_template.xlsx");
  };

  const processImport = async () => {
    if (!file) return;

    setLoading(true);
    setProgress(10);
    setLogs([]);
    addLog('info', 'Starting import process...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            addLog('error', 'The file is empty.');
            setLoading(false);
            return;
          }

          addLog('info', `Found ${jsonData.length} records. Validating...`);
          setProgress(30);

          // Basic validation and formatting
          const formattedData = jsonData.map((row: any, index) => {
            if (!row.teacher_name || !row.check_number || !row.region_code || !row.district_number) {
              throw new Error(`Row ${index + 2}: Missing required fields (name, check number, region, or district).`);
            }
            return {
              teacher_name: String(row.teacher_name).toUpperCase(),
              sex: String(row.sex || 'M').toUpperCase(),
              check_number: String(row.check_number),
              phone: row.phone ? String(row.phone).replace(/\s/g, '') : null,
              region_code: parseInt(row.region_code),
              district_number: parseInt(row.district_number),
              workstation: String(row.workstation || 'N/A'),
              experience_years_base: parseInt(row.experience_years_base || 1),
              experience_base_year: parseInt(row.experience_base_year || new Date().getFullYear()),
              index_no: row.index_no ? String(row.index_no).toUpperCase() : null,
              csee_year: row.csee_year ? parseInt(row.csee_year) : null,
              status: 'active'
            };
          });

          setProgress(50);
          addLog('info', 'Uploading to database...');

          // Bulk insert in chunks of 100 to avoid payload limits
          const chunkSize = 100;
          for (let i = 0; i < formattedData.length; i += chunkSize) {
            const chunk = formattedData.slice(i, i + chunkSize);
            const { error } = await supabase.from('primaryteachers').insert(chunk);
            
            if (error) {
              addLog('error', `Batch ${Math.floor(i/chunkSize) + 1} failed: ${error.message}`);
              throw error;
            }
            
            const currentProgress = 50 + Math.round(((i + chunk.length) / formattedData.length) * 50);
            setProgress(currentProgress);
          }

          addLog('success', `Successfully imported ${formattedData.length} teachers.`);
          showSuccess(`Imported ${formattedData.length} records successfully.`);
          onSuccess();
          setTimeout(() => onOpenChange(false), 2000);
        } catch (err: any) {
          addLog('error', err.message);
          showError(err.message);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      addLog('error', err.message);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 bg-slate-900 text-white">
          <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
            <FileUp className="h-5 w-5" /> Import Teachers
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div 
            onClick={() => !loading && fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
              file ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 hover:border-slate-400 bg-slate-50/50",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv,.xlsx,.xls" 
              onChange={handleFileChange} 
            />
            {file ? (
              <div className="space-y-2">
                <FileSpreadsheet className="h-10 w-10 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">{file.name}</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-[10px] font-black uppercase text-red-500 hover:underline"
                >
                  Remove File
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-2">
                  <FileUp className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-600">Click to upload or drag and drop</p>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Excel or CSV only</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Download className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-blue-900">Need a template?</p>
                <p className="text-[9px] text-blue-600 font-bold">Download the standard format</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={downloadTemplate}
              className="text-[10px] font-black uppercase text-blue-700 hover:bg-blue-100"
            >
              Download
            </Button>
          </div>

          {logs.length > 0 && (
            <div className="bg-slate-900 rounded-xl p-4 max-h-[150px] overflow-y-auto font-mono text-[10px] space-y-1">
              {logs.map((log, i) => (
                <div key={i} className={cn(
                  "flex gap-2",
                  log.type === 'error' ? "text-red-400" : log.type === 'success' ? "text-emerald-400" : "text-slate-400"
                )}>
                  <span>[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="text-[10px] font-black uppercase tracking-widest h-10 rounded-xl"
          >
            Cancel
          </Button>
          <Button 
            onClick={processImport}
            disabled={!file || loading}
            className="bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest h-10 rounded-xl px-8"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Start Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};