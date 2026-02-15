"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Download, Loader2, FileSpreadsheet, FileText, 
  Hash, Landmark, CalendarCheck, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { showError, showSuccess } from "@/utils/toast";

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const exportSchema = z.object({
  docType: z.enum(["teachers_list", "requisition_letter", "attendance_sheet"]),
  folioNumber: z.string().optional(),
  includeBankDetails: z.boolean().default(false),
  includeSaturday: z.boolean().default(false),
  includeSunday: z.boolean().default(false),
});

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any[];
  jobDetails: { name: string; section: string; start_date?: string; end_date?: string };
}

export const AssignmentExportModal: React.FC<ExportModalProps> = ({ 
  open, 
  onOpenChange, 
  data, 
  jobDetails 
}) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const form = useForm<z.infer<typeof exportSchema>>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      docType: "teachers_list",
      folioNumber: "",
      includeBankDetails: false,
      includeSaturday: false,
      includeSunday: false,
    }
  });

  const selectedDoc = form.watch("docType");

  const exportToExcel = (values: z.infer<typeof exportSchema>) => {
    const processedData = data.map((item, index) => {
      const row: any = {
        "S/N": index + 1,
        "FULL NAME": item.fullname,
        "SEX": item.sex,
        "PHONE": item.phone,
        "WORKSTATION": item.workstation,
        "DISTRICT": item.district,
        "REGION": item.region,
      };

      if (values.includeBankDetails) {
        row["ACCOUNT NAME"] = item.account_name || "N/A";
        row["ACCOUNT NUMBER"] = item.account_number || "N/A";
        row["BANK NAME"] = item.bank_name || "N/A";
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(processedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teachers List");
    XLSX.writeFile(wb, `${jobDetails.name}_Teachers_List.xlsx`);
  };

  const exportToPDF = (values: z.infer<typeof exportSchema>) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.text("THE UNITED REPUBLIC OF TANZANIA", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(11);
    doc.text("PRESIDENT'S OFFICE - REGIONAL ADMINISTRATION AND LOCAL GOVERNMENT", pageWidth / 2, 27, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Folio No: ${values.folioNumber || "..........."}`, 15, 40);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 15, 40, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text(`RE: REQUISITION FOR ${jobDetails.name.toUpperCase()}`, 15, 50);
    doc.line(15, 52, 100, 52);

    doc.setFont("helvetica", "normal");
    doc.text(`Following the upcoming ${jobDetails.section} tasks, we hereby submit the list of ${data.length} selected teachers for official processing and deployment.`, 15, 60, { maxWidth: 180 });

    autoTable(doc, {
      startY: 75,
      head: [['S/N', 'Full Name', 'Workstation', 'Phone']],
      body: data.map((item, i) => [i + 1, item.fullname, item.workstation, item.phone]),
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      styles: { fontSize: 9 }
    });

    doc.save(`${jobDetails.name}_Requisition_Letter.pdf`);
  };

  const exportAttendance = (values: z.infer<typeof exportSchema>) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.text("ATTENDANCE SHEET", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(11);
    doc.text(`${jobDetails.name.toUpperCase()} - ${jobDetails.section}`, pageWidth / 2, 22, { align: "center" });

    const headers = ['S/N', 'Full Name', 'Workstation'];
    
    // Generate dates between start and end
    const dates: string[] = [];
    if (jobDetails.start_date && jobDetails.end_date) {
      let current = new Date(jobDetails.start_date);
      const end = new Date(jobDetails.end_date);
      while (current <= end) {
        const day = current.getDay();
        const isSat = day === 6;
        const isSun = day === 0;
        
        if ((isSat && values.includeSaturday) || (isSun && values.includeSunday) || (!isSat && !isSun)) {
          dates.push(current.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }));
        }
        current.setDate(current.getDate() + 1);
      }
    }

    const tableHeaders = [...headers, ...dates, 'Signature'];

    autoTable(doc, {
      startY: 30,
      head: [tableHeaders],
      body: data.map((item, i) => [
        i + 1, 
        item.fullname, 
        item.workstation,
        ...dates.map(() => ''),
        ''
      ]),
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35 }
      }
    });

    doc.save(`${jobDetails.name}_Attendance_Sheet.pdf`);
  };

  const onSubmit = async (values: z.infer<typeof exportSchema>) => {
    if (data.length === 0) {
      showError("No data available to export.");
      return;
    }

    setLoading(true);
    setProgress(30);

    setTimeout(() => {
      try {
        if (values.docType === "teachers_list") {
          exportToExcel(values);
        } else if (values.docType === "requisition_letter") {
          exportToPDF(values);
        } else {
          exportAttendance(values);
        }
        setProgress(100);
        showSuccess("Document generated successfully");
        onOpenChange(false);
      } catch (err: any) {
        showError("Export failed: " + err.message);
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Download className="h-5 w-5" /> Export Assignments
          </DialogTitle>
          <DialogDescription className="text-[11px] font-bold uppercase text-slate-500 italic">
            Job: {jobDetails.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="docType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-3 gap-3"
                  >
                    <Label
                      htmlFor="teachers_list"
                      className={cn(
                        "flex flex-col items-center justify-between rounded-xl border-2 p-3 cursor-pointer transition-all",
                        selectedDoc === "teachers_list" ? "border-slate-900 bg-slate-50" : "border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      <RadioGroupItem value="teachers_list" id="teachers_list" className="sr-only" />
                      <FileSpreadsheet className="mb-2 h-5 w-5 text-emerald-600" />
                      <span className="text-[9px] font-black uppercase">List</span>
                    </Label>

                    <Label
                      htmlFor="requisition_letter"
                      className={cn(
                        "flex flex-col items-center justify-between rounded-xl border-2 p-3 cursor-pointer transition-all",
                        selectedDoc === "requisition_letter" ? "border-slate-900 bg-slate-50" : "border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      <RadioGroupItem value="requisition_letter" id="requisition_letter" className="sr-only" />
                      <FileText className="mb-2 h-5 w-5 text-red-600" />
                      <span className="text-[9px] font-black uppercase">Letter</span>
                    </Label>

                    <Label
                      htmlFor="attendance_sheet"
                      className={cn(
                        "flex flex-col items-center justify-between rounded-xl border-2 p-3 cursor-pointer transition-all",
                        selectedDoc === "attendance_sheet" ? "border-slate-900 bg-slate-50" : "border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      <RadioGroupItem value="attendance_sheet" id="attendance_sheet" className="sr-only" />
                      <CalendarCheck className="mb-2 h-5 w-5 text-blue-600" />
                      <span className="text-[9px] font-black uppercase">Attendance</span>
                    </Label>
                  </RadioGroup>
                </FormItem>
              )}
            />

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              {selectedDoc === "teachers_list" && (
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="bankDetails" 
                    checked={form.watch("includeBankDetails")}
                    onCheckedChange={(v) => form.setValue("includeBankDetails", !!v)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="bankDetails" className="text-xs font-bold uppercase cursor-pointer flex items-center gap-2">
                      <Landmark className="h-3 w-3" /> Include Bank Columns
                    </Label>
                  </div>
                </div>
              )}

              {selectedDoc === "requisition_letter" && (
                <FormField
                  control={form.control}
                  name="folioNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-600 flex items-center gap-2">
                        <Hash className="h-3 w-3" /> Folio Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter folio e.g. PO-RALG/2024/01" className="bg-white border-slate-200 uppercase text-xs font-mono" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {selectedDoc === "attendance_sheet" && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Include Weekends</p>
                  <div className="flex gap-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="sat" 
                        checked={form.watch("includeSaturday")}
                        onCheckedChange={(v) => form.setValue("includeSaturday", !!v)}
                      />
                      <Label htmlFor="sat" className="text-[10px] font-bold uppercase cursor-pointer">Saturday</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="sun" 
                        checked={form.watch("includeSunday")}
                        onCheckedChange={(v) => form.setValue("includeSunday", !!v)}
                      />
                      <Label htmlFor="sun" className="text-[10px] font-bold uppercase cursor-pointer">Sunday</Label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {loading && (
              <Progress value={progress} className="h-1 indicator-black" />
            )}

            <DialogFooter>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-black font-black uppercase text-[10px] tracking-widest h-11 rounded-xl"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Generate Document
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};