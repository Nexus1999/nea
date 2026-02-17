"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter, // Added DialogFooter for the close button
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertTriangle, History } from "lucide-react"; // Added History icon
import { showSuccess, showError } from "@/utils/toast";
import { MasterSummary } from "@/types/mastersummaries";

interface DifferenceReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVersion: MasterSummary;
  previousVersion: MasterSummary;
}

const DifferenceReportModal: React.FC<DifferenceReportModalProps> = ({ open, onOpenChange, currentVersion, previousVersion }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportGenerated, setReportGenerated] = useState(false); // New state to track if report was successfully generated

  const generateAndOpenPdfReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReportGenerated(false);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-difference-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mid: currentVersion.id,
          code: currentVersion.Code,
          currentVersion: currentVersion.version,
          previousVersion: previousVersion.version,
        }),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.error || 'Failed to generate difference report.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank'); // Open PDF in new tab
      showSuccess("Difference report generated successfully!");
      setReportGenerated(true);
    } catch (err: any) {
      console.error("Error generating PDF report:", err);
      setError(err.message || "An unexpected error occurred while generating the PDF report.");
      showError(err.message || "Failed to generate difference report.");
      setReportGenerated(false);
    } finally {
      setLoading(false);
    }
  }, [currentVersion, previousVersion]);

  useEffect(() => {
    if (open) {
      generateAndOpenPdfReport();
    }
  }, [open, generateAndOpenPdfReport]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <History className="h-6 w-6 text-neas-green" /> Generating Difference Report
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Please wait while the PDF report is being generated. It will open in a new tab.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col items-center justify-center py-8">
          {loading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-neas-green mb-4" />
              <span className="text-lg text-gray-600">Generating report...</span>
            </>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-red-500">
              <AlertTriangle className="h-10 w-10 mb-2" />
              <p className="text-lg font-semibold">Error generating report:</p>
              <p className="text-sm text-center">{error}</p>
              <Button onClick={generateAndOpenPdfReport} className="mt-4">Retry</Button>
            </div>
          ) : reportGenerated ? (
            <div className="flex flex-col items-center justify-center text-green-600">
              <CheckCircle className="h-10 w-10 mb-4" />
              <p className="text-lg font-semibold">Report generated!</p>
              <p className="text-sm text-center">Check your new tab for the PDF.</p>
            </div>
          ) : null /* Should not happen if logic is correct, but for safety */ }
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DifferenceReportModal;