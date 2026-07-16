"use client";

import React, { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Upload, Loader2 } from "lucide-react";

interface ImportSupervisorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ImportSupervisorsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportSupervisorsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationStats, setValidationStats] = useState({
    total: 0,
    valid: 0,
    duplicate: 0,
    invalid: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          toast.error("CSV file is empty or lacks data rows");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const expectedHeaders = ["first_name", "last_name", "index_no", "csee_year"];

        const missing = expectedHeaders.filter((h) => !headers.includes(h));
        if (missing.length > 0) {
          toast.error(`Missing required columns: ${missing.join(", ")}`);
          return;
        }

        const first_name_idx = headers.indexOf("first_name");
        const last_name_idx = headers.indexOf("last_name");
        const index_no_idx = headers.indexOf("index_no");
        const csee_year_idx = headers.indexOf("csee_year");
        const phone_no_idx = headers.indexOf("phone_no");
        const email_idx = headers.indexOf("email");
        const bank_name_idx = headers.indexOf("bank_name");
        const account_no_idx = headers.indexOf("account_no");

        const items: any[] = [];
        let duplicateCount = 0;
        let invalidCount = 0;

        setLoading(true);

        // Fetch all existing supervisors once
        const { data: existingData, error: fetchError } = await supabase
          .from("supervisors")
          .select("index_no,csee_year");

        if (fetchError) throw fetchError;

        const existingSet = new Set(
          (existingData || []).map(
            (r) => `${String(r.index_no).trim().toLowerCase()}-${r.csee_year}`
          )
        );

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) =>
            c.replace(/^"|"$/g, "").trim()
          );

          if (columns.length < expectedHeaders.length) {
            invalidCount++;
            continue;
          }

          const first_name = columns[first_name_idx] || "";
          const last_name = columns[last_name_idx] || "";
          const index_no = columns[index_no_idx] || "";
          const csee_year = parseInt(columns[csee_year_idx], 10);

          if (!first_name || !last_name || !index_no || isNaN(csee_year)) {
            invalidCount++;
            continue;
          }

          const lookupKey = `${index_no.toLowerCase()}-${csee_year}`;

          if (existingSet.has(lookupKey)) {
            duplicateCount++;
          } else {
            items.push({
              first_name,
              last_name,
              index_no,
              csee_year,
              phone_no: phone_no_idx !== -1 ? columns[phone_no_idx] || null : null,
              email: email_idx !== -1 ? columns[email_idx] || null : null,
              bank_name: bank_name_idx !== -1 ? columns[bank_name_idx] || null : null,
              account_no: account_no_idx !== -1 ? columns[account_no_idx] || null : null,
              status: "Active",
            });
          }
        }

        setParsedData(items);
        setValidationStats({
          total: lines.length - 1,
          valid: items.length,
          duplicate: duplicateCount,
          invalid: invalidCount,
        });

        toast.success(`Successfully parsed ${items.length} new records.`);
      } catch (err: any) {
        toast.error(err.message || "Error reading/parsing CSV file");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);

    try {
      const chunkSize = 100;
      for (let i = 0; i < parsedData.length; i += chunkSize) {
        const chunk = parsedData.slice(i, i + chunkSize);
        const { error } = await supabase.from("supervisors").insert(chunk);
        if (error) throw error;
      }

      toast.success("Supervisors imported successfully");
      onSuccess();
      onOpenChange(false);
      setParsedData([]);
      setValidationStats({ total: 0, valid: 0, duplicate: 0, invalid: 0 });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      toast.error(error.message || "Failed to import supervisors");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Import Supervisors</DialogTitle>
          <DialogDescription>
            Upload a CSV file with headers:{" "}
            <code className="text-primary font-mono font-bold">first_name, last_name, index_no, csee_year</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dialogCsvFile">Select CSV File</Label>
            <Input
              id="dialogCsvFile"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              ref={fileInputRef}
              disabled={loading}
            />
          </div>

          {validationStats.total > 0 && (
            <div className="rounded-lg border bg-card p-4 space-y-3 text-sm">
              <h4 className="font-semibold">Validation Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>Total Rows: {validationStats.total}</div>
                <div className="text-green-600">Valid to Add: {validationStats.valid}</div>
                <div className="text-amber-600">Duplicates: {validationStats.duplicate}</div>
                <div className="text-red-600">Invalid: {validationStats.invalid}</div>
              </div>

              {validationStats.duplicate > 0 && (
                <Alert className="bg-amber-50 text-amber-900 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-xs font-bold text-amber-800">Duplicate Entries</AlertTitle>
                  <AlertDescription className="text-xs text-amber-700">
                    {validationStats.duplicate} existing supervisors found. They will be ignored.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setParsedData([]);
              setValidationStats({ total: 0, valid: 0, duplicate: 0, invalid: 0 });
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={loading || parsedData.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import {parsedData.length} Records
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}