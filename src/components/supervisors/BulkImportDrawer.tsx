"use client";

import React, { useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Upload, CheckCircle2, RefreshCw } from "lucide-react";

interface BulkImportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function BulkImportDrawer({
  open,
  onOpenChange,
  onSuccess,
}: BulkImportDrawerProps) {
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

        // Simple CSV parser
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          toast.error("CSV file is empty or lacks data rows");
          return;
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const expectedHeaders = ["first_name", "last_name", "index_no", "csee_year"];

        // Check required headers
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

        // Fetch all existing supervisors' index_no & csee_year once
        const { data: existingData, error: fetchError } = await supabase
          .from("supervisors")
          .select("index_no,csee_year");

        if (fetchError) throw fetchError;

        // Create O(1) Lookup Set of "index_no-csee_year"
        const existingSet = new Set(
          (existingData || []).map(
            (r) => `${String(r.index_no).trim().toLowerCase()}-${r.csee_year}`
          )
        );

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Split properly accounting for potential quoted commas
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

        toast.success(`Parsed ${items.length} new records successfully.`);
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
      // Chunk insertions if data is extremely large
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Bulk Import Supervisors</SheetTitle>
          <SheetDescription>
            Upload a CSV containing your supervisors list. Ensure the columns:{" "}
            <code className="text-primary font-bold">first_name, last_name, index_no, csee_year</code>{" "}
            are present.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="csvFile">CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                ref={fileInputRef}
                disabled={loading}
              />
            </div>
          </div>

          {validationStats.total > 0 && (
            <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm space-y-3">
              <h4 className="font-semibold text-sm">Validation Result</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between border-b pb-1">
                  <span>Total Rows:</span>
                  <span className="font-mono">{validationStats.total}</span>
                </div>
                <div className="flex justify-between border-b pb-1 text-green-600">
                  <span>New Valid:</span>
                  <span className="font-mono">{validationStats.valid}</span>
                </div>
                <div className="flex justify-between border-b pb-1 text-amber-600">
                  <span>Already Exists:</span>
                  <span className="font-mono">{validationStats.duplicate}</span>
                </div>
                <div className="flex justify-between border-b pb-1 text-red-600">
                  <span>Invalid Row Format:</span>
                  <span className="font-mono">{validationStats.invalid}</span>
                </div>
              </div>

              {validationStats.duplicate > 0 && (
                <Alert variant="default" className="bg-amber-50 text-amber-900 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-xs font-bold text-amber-800">Duplicate Alert</AlertTitle>
                  <AlertDescription className="text-xs text-amber-700">
                    {validationStats.duplicate} teachers already exist in database and will be skipped automatically.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <SheetFooter className="pt-4 gap-2">
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
            <Button
              onClick={handleImport}
              disabled={loading || parsedData.length === 0}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import {parsedData.length} Records
                </>
              )}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}