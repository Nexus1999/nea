"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertTriangle, History } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { MasterSummary } from "@/types/mastersummaries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DifferenceReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVersion: MasterSummary;
  previousVersion: MasterSummary;
}

interface ReportSummary {
  totalSchoolsCurrent: number;
  totalSchoolsPrevious: number;
  totalNewSchools: number;
  totalRemovedSchools: number;
  totalChangedSchools: number;
}

interface SchoolChange {
  school: any;
  previousData: any;
  currentData: any;
  differences: { field: string; previous: any; current: any }[];
}

const DifferenceReportModal: React.FC<DifferenceReportModalProps> = ({
  open,
  onOpenChange,
  currentVersion,
  previousVersion,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{
    summary: ReportSummary;
    newSchools: any[];
    removedSchools: any[];
    changedSchools: SchoolChange[];
  } | null>(null);

  const fetchReportData = useCallback(async () => {
    if (!open) return;

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-difference-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mid: currentVersion.id,
            code: currentVersion.Code,
            currentVersion: currentVersion.version,
            previousVersion: previousVersion.version,
            format: 'json',  // Request JSON instead of PDF
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setReport(data);
      showSuccess("Difference report loaded");
    } catch (err: any) {
      console.error("Error fetching difference report:", err);
      setError(err.message || "Failed to load the difference report.");
      showError(err.message || "Failed to load difference report");
    } finally {
      setLoading(false);
    }
  }, [open, currentVersion, previousVersion]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleDownloadPdf = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-difference-report`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mid: currentVersion.id,
            code: currentVersion.Code,
            currentVersion: currentVersion.version,
            previousVersion: previousVersion.version,
            // No format → defaults to PDF
          }),
        }
      );

      if (!response.ok) throw new Error("PDF generation failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      showSuccess("PDF opened in new tab");
    } catch (err: any) {
      showError("Failed to generate PDF: " + (err.message || "Unknown error"));
    }
  };

  const abbreviateSchoolName = (name: string | null | undefined = ''): string => {
    if (!name) return '';
    let short = name
      .replace(/PRIMARY SCHOOL/gi, 'PS')
      .replace(/SECONDARY SCHOOL CENTRE/gi, 'SSC')
      .replace(/SECONDARY SCHOOL/gi, 'SS')
      .replace(/SEC\.? SCHOOL/gi, 'SS')
      .replace(/HIGH SCHOOL/gi, 'HS')
      .replace(/ISLAMIC SEMINARY/gi, 'ISL SEM')
      .replace(/SEMINARY/gi, 'SEM')
      .replace(/TEACHERS'? (TRAINING )?COLLEGE/gi, 'TC');
    return short.trim();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-3">
            <History className="h-6 w-6 text-green-600" />
            Difference Report
          </DialogTitle>
          <DialogDescription className="text-base mt-1">
            Version {previousVersion?.version} → Version {currentVersion?.version} • {currentVersion?.Code} {currentVersion?.Year}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4" />
              <p className="text-lg font-medium text-gray-700">Loading differences...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-red-600">
              <AlertTriangle className="h-16 w-16 mb-4" />
              <p className="text-xl font-semibold mb-2">Error Loading Report</p>
              <p className="text-center max-w-md mb-6">{error}</p>
              <Button onClick={fetchReportData}>Try Again</Button>
            </div>
          ) : report ? (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-center">
                  <div className="text-sm text-green-700 font-medium mb-1">New Schools</div>
                  <div className="text-4xl font-bold text-green-800">{report.summary.totalNewSchools}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-center">
                  <div className="text-sm text-red-700 font-medium mb-1">Removed Schools</div>
                  <div className="text-4xl font-bold text-red-800">{report.summary.totalRemovedSchools}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 text-center">
                  <div className="text-sm text-amber-700 font-medium mb-1">Changed Schools</div>
                  <div className="text-4xl font-bold text-amber-800">{report.summary.totalChangedSchools}</div>
                </div>
              </div>

              {/* New Schools */}
              {report.newSchools?.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-green-700 mb-3">New Schools Added</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {report.newSchools.map((school: any) => (
                      <div key={school.center_number} className="bg-green-50/50 border border-green-100 rounded p-3 text-sm">
                        <div className="font-medium">{school.center_number} – {abbreviateSchoolName(school.center_name)}</div>
                        <div className="text-gray-600 text-xs mt-1">
                          {school.region}, {school.district}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Removed Schools */}
              {report.removedSchools?.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-red-700 mb-3">Removed Schools</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {report.removedSchools.map((school: any) => (
                      <div key={school.center_number} className="bg-red-50/50 border border-red-100 rounded p-3 text-sm">
                        <div className="font-medium">{school.center_number} – {abbreviateSchoolName(school.center_name)}</div>
                        <div className="text-gray-600 text-xs mt-1">
                          {school.region}, {school.district}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Changed Schools */}
              {report.changedSchools?.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Schools with Changes</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-28">Center No.</TableHead>
                          <TableHead className="w-64">Center Name</TableHead>
                          <TableHead className="w-40">Field</TableHead>
                          <TableHead className="w-48">Previous Value</TableHead>
                          <TableHead className="w-48">Current Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.changedSchools.map((change) =>
                          change.differences.map((diff, diffIdx) => (
                            <TableRow key={`${change.school.center_number}-${diffIdx}`}>
                              {diffIdx === 0 && (
                                <>
                                  <TableCell rowSpan={change.differences.length} className="font-medium align-top">
                                    {change.school.center_number}
                                  </TableCell>
                                  <TableCell rowSpan={change.differences.length} className="align-top">
                                    {abbreviateSchoolName(change.school.center_name)}
                                  </TableCell>
                                </>
                              )}
                              <TableCell>{diff.field}</TableCell>
                              <TableCell className="text-orange-700">{String(diff.previous ?? '—')}</TableCell>
                              <TableCell className="text-orange-700 font-medium">{String(diff.current ?? '—')}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}

              {report.newSchools?.length === 0 &&
               report.removedSchools?.length === 0 &&
               report.changedSchools?.length === 0 && (
                <div className="text-center py-16 text-gray-600 italic bg-gray-50 rounded-lg">
                  No differences detected between Version {previousVersion.version} and Version {currentVersion.version}.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button 
            onClick={handleDownloadPdf}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Download PDF Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DifferenceReportModal;