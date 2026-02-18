"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Accessibility, Loader2, UploadCloud, Eye, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { MasterSummary, SpecialNeedType } from "@/types/mastersummaries";
import SpecialNeedsMasterSummaryForm from "@/components/mastersummaries/SpecialNeedsMasterSummaryForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showStyledSwal } from '@/utils/alerts';

interface SpecialNeedsSummaryRow {
  special_need: SpecialNeedType;
  schools_registered: number;
}

const SpecialNeedsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [masterSummary, setMasterSummary] = useState<MasterSummary | null>(null);
  const [specialNeedsSummary, setSpecialNeedsSummary] = useState<SpecialNeedsSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Guard for missing ID
  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <Card className="max-w-md w-full text-center p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-slate-600 mb-6">
            Master summary ID is missing from the URL.
          </p>
          <Button 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Master Summaries
          </Button>
        </Card>
      </div>
    );
  }

  const fetchSpecialNeedsData = useCallback(async () => {
    setLoading(true);
    setSpecialNeedsSummary([]);

    try {
      // 1. Fetch main master summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('mastersummaries')
        .select('*')
        .eq('id', id)
        .single();

      if (summaryError || !summaryData) {
        throw new Error(summaryError?.message || "Failed to fetch master summary");
      }

      setMasterSummary(summaryData as MasterSummary);

      const code = summaryData.Code;
      let tableName: string;

      if (["SFNA", "SSNA", "PSLE"].includes(code)) {
        tableName = 'primarymastersummary_specialneeds';
      } else if (["FTNA", "CSEE", "ACSEE"].includes(code)) {
        tableName = 'secondarymastersummaries_specialneeds';
      } else {
        throw new Error(`Unsupported examination code: ${code}`);
      }

      // 2. Fetch special needs data
      const { data: rawDetails, error: detailsError } = await supabase
        .from(tableName)
        .select('special_need, center_name')
        .eq('mid', id);

      if (detailsError) {
        throw new Error(detailsError.message || "Failed to fetch special needs records");
      }

      // 3. Aggregate: count unique schools per special_need
      const aggregationMap = new Map<SpecialNeedType, Set<string>>();

      rawDetails.forEach((detail: { special_need: SpecialNeedType; center_name: string }) => {
        if (!aggregationMap.has(detail.special_need)) {
          aggregationMap.set(detail.special_need, new Set());
        }
        aggregationMap.get(detail.special_need)!.add(detail.center_name);
      });

      const aggregated: SpecialNeedsSummaryRow[] = Array.from(aggregationMap.entries())
        .map(([special_need, schoolsSet]) => ({
          special_need,
          schools_registered: schoolsSet.size,
        }))
        .sort((a, b) => a.special_need.localeCompare(b.special_need));

      setSpecialNeedsSummary(aggregated);
    } catch (err: any) {
      showError(err.message || "Failed to load special needs data");
      console.error(err);
      setMasterSummary(null);
      setSpecialNeedsSummary([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSpecialNeedsData();
  }, [fetchSpecialNeedsData]);

  useEffect(() => {
    if (masterSummary) {
      document.title = `Special Needs - ${masterSummary.Code} ${masterSummary.Year} | NEAS`;
    } else {
      document.title = "Special Needs | NEAS";
    }
  }, [masterSummary]);

  const handleViewSpecialNeedDetails = (specialNeedType: SpecialNeedType) => {
    navigate(`/dashboard/mastersummaries/special-needs/${id}/${specialNeedType}/details`);
  };

  const handleDeleteSpecialNeedType = async (specialNeedType: SpecialNeedType) => {
    const result = await showStyledSwal({
      title: 'Are you sure?',
      html: `You are about to delete ALL <b>${specialNeedType}</b> special needs data for this master summary.<br>This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel!',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      if (!masterSummary) throw new Error("Master summary not loaded");

      const tableName = ["SFNA", "SSNA", "PSLE"].includes(masterSummary.Code)
        ? 'primarymastersummary_specialneeds'
        : 'secondarymastersummaries_specialneeds';

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('mid', id)
        .eq('special_need', specialNeedType);

      if (error) throw error;

      showSuccess(`All ${specialNeedType} data deleted successfully`);
      fetchSpecialNeedsData();
    } catch (err: any) {
      showError(err.message || "Deletion failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-neas-green" />
      </div>
    );
  }

  if (!masterSummary) {
    return (
      <Card className="w-full max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Special Needs Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            No master summary found for this ID.
          </p>
          <div className="text-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Special Needs – {masterSummary.Code} {masterSummary.Year}
        </h1>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      <Card className="shadow-lg rounded-xl overflow-hidden bg-white">
        <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Accessibility className="h-6 w-6 text-neas-green" />
              Special Needs Summary
            </CardTitle>
            <CardDescription className="text-gray-600 mt-1">
              Aggregated registration by special need type for {masterSummary.Code} – {masterSummary.Year}
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="h-8 gap-1"
            onClick={() => setIsFormOpen(true)}
            disabled={loading}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Upload Special Needs Data
            </span>
          </Button>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {specialNeedsSummary.length > 0 ? (
            <div className="border rounded-lg overflow-auto max-h-[60vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="h-8 px-3 text-base">Special Need</TableHead>
                    <TableHead className="h-8 px-3 text-base">Schools Registered</TableHead>
                    <TableHead className="h-8 px-3 text-base text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialNeedsSummary.map((row) => (
                    <TableRow key={row.special_need}>
                      <TableCell className="py-3 px-3 font-medium">{row.special_need}</TableCell>
                      <TableCell className="py-3 px-3">{row.schools_registered}</TableCell>
                      <TableCell className="py-3 px-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSpecialNeedDetails(row.special_need)}
                            disabled={loading}
                            title="View detailed records"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSpecialNeedType(row.special_need)}
                            disabled={loading}
                            title="Delete all records for this type"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No special needs data has been uploaded yet for this master summary.
            </div>
          )}
        </CardContent>
      </Card>

      <SpecialNeedsMasterSummaryForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        masterSummaryData={
          masterSummary
            ? {
                id: masterSummary.id,
                examination: masterSummary.Examination,
                code: masterSummary.Code,
                year: masterSummary.Year,
              }
            : null
        }
        onSuccess={fetchSpecialNeedsData}
      />
    </div>
  );
};

export default SpecialNeedsPage;