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
  const { masterSummaryId } = useParams<{ masterSummaryId: string }>();
  const navigate = useNavigate();

  const [masterSummary, setMasterSummary] = useState<MasterSummary | null>(null);
  const [specialNeedsSummary, setSpecialNeedsSummary] = useState<SpecialNeedsSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchSpecialNeedsData = useCallback(async () => {
    if (!masterSummaryId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setSpecialNeedsSummary([]);

    try {
      // 1. Fetch top-level Master Summary to get examination code
      const { data: summaryData, error: summaryError } = await supabase
        .from('mastersummaries')
        .select('*')
        .eq('id', masterSummaryId)
        .single();

      if (summaryError) {
        showError(summaryError.message || "Failed to fetch master summary details.");
        setMasterSummary(null);
        setLoading(false);
        return;
      }
      setMasterSummary(summaryData as MasterSummary);

      const code = summaryData.Code;
      let tableName: string | null = null;

      if (["SFNA", "SSNA", "PSLE"].includes(code)) {
        tableName = 'primarymastersummary_specialneeds';
      } else if (["FTNA", "CSEE", "ACSEE"].includes(code)) {
        tableName = 'secondarymastersummaries_specialneeds';
      } else {
        showError(`Unknown examination code: ${code}`);
        setLoading(false);
        return;
      }

      // 2. Fetch all special needs data for this master summary
      const { data: rawDetails, error: detailsError } = await supabase
        .from(tableName)
        .select('special_need, center_name') // Only select necessary columns for aggregation
        .eq('mid', masterSummaryId);

      if (detailsError) {
        showError(detailsError.message || "Failed to fetch special needs data.");
        setLoading(false);
        return;
      }

      // 3. Aggregate data client-side: count unique schools per special_need type
      const aggregationMap = new Map<SpecialNeedType, Set<string>>();

      rawDetails.forEach((detail: { special_need: SpecialNeedType; center_name: string }) => {
        if (!aggregationMap.has(detail.special_need)) {
          aggregationMap.set(detail.special_need, new Set<string>());
        }
        aggregationMap.get(detail.special_need)?.add(detail.center_name);
      });

      const aggregatedSummary: SpecialNeedsSummaryRow[] = Array.from(aggregationMap.entries()).map(([special_need, schoolsSet]) => ({
        special_need,
        schools_registered: schoolsSet.size,
      })).sort((a, b) => a.special_need.localeCompare(b.special_need)); // Sort alphabetically by special_need

      setSpecialNeedsSummary(aggregatedSummary);

    } catch (error: any) {
      showError(error.message || "An unexpected error occurred while fetching data.");
      setMasterSummary(null);
      setSpecialNeedsSummary([]);
    } finally {
      setLoading(false);
    }
  }, [masterSummaryId]);

  useEffect(() => {
    fetchSpecialNeedsData();
  }, [fetchSpecialNeedsData]);

  // Set dynamic document title
  useEffect(() => {
    if (masterSummary) {
      document.title = `Special Needs - ${masterSummary.Code} ${masterSummary.Year} | NEAS`;
    } else {
      document.title = "Special Needs Overview | NEAS";
    }
  }, [masterSummary]);

  const handleViewSpecialNeedDetails = (specialNeedType: SpecialNeedType) => {
    navigate(`/dashboard/mastersummaries/${masterSummaryId}/special-needs/${specialNeedType}/details`);
  };

  const handleDeleteSpecialNeedType = async (specialNeedType: SpecialNeedType) => {
    showStyledSwal({
      title: 'Are you sure?',
      html: `You are about to delete ALL <b>${specialNeedType}</b> special needs data for this master summary. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel!',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          if (!masterSummary) {
            throw new Error("Master summary data not available.");
          }

          let tableName: string | null = null;
          const code = masterSummary.Code;

          if (["SFNA", "SSNA", "PSLE"].includes(code)) {
            tableName = 'primarymastersummary_specialneeds';
          } else if (["FTNA", "CSEE", "ACSEE"].includes(code)) {
            tableName = 'secondarymastersummaries_specialneeds';
          } else {
            throw new Error(`Unknown examination code: ${code}`);
          }

          const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('mid', masterSummaryId)
            .eq('special_need', specialNeedType);

          if (error) {
            throw error;
          }

          showSuccess(`All ${specialNeedType} special needs data deleted successfully.`);
          fetchSpecialNeedsData(); // Refresh the summary
        } catch (error: any) {
          showError(error.message || "An unexpected error occurred during deletion.");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  if (loading && !masterSummary) {
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
          <p className="text-center text-gray-500">No master summary found for ID: {masterSummaryId}.</p>
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Master Summaries
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
          Special Needs for {masterSummary.Code} - {masterSummary.Year}
        </h1>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Master Summaries
        </Button>
      </div>

      <Card className="shadow-lg rounded-xl overflow-hidden bg-white">
        <CardHeader className="border-b pb-4 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Accessibility className="h-6 w-6 text-neas-green" /> Special Needs Data Summary
            </CardTitle>
            <CardDescription className="text-gray-600">
              Aggregated special needs registration data for {masterSummary.Code} - {masterSummary.Year}.
            </CardDescription>
          </div>
          <Button size="sm" className="h-8 gap-1" onClick={() => setIsFormOpen(true)} disabled={loading}>
            <UploadCloud className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Upload Special Needs Data</span>
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-neas-green" />
            </div>
          ) : specialNeedsSummary.length > 0 ? (
            <div className="border rounded-lg overflow-auto max-h-[60vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="h-8 px-2 text-base">Special Need</TableHead>
                    <TableHead className="h-8 px-2 text-base">Schools Registered</TableHead>
                    <TableHead className="h-8 px-2 text-base text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {specialNeedsSummary.map((summaryRow, index) => (
                    <TableRow key={index}>
                      <TableCell className="py-2 px-2 text-base">{summaryRow.special_need}</TableCell>
                      <TableCell className="py-2 px-2 text-base">{summaryRow.schools_registered}</TableCell>
                      <TableCell className="py-2 px-2 text-base text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSpecialNeedDetails(summaryRow.special_need)}
                            disabled={loading}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSpecialNeedType(summaryRow.special_need)}
                            disabled={loading}
                            title="Delete All Data for this Special Need"
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
            <p className="text-center text-gray-500">No special needs data found for this master summary.</p>
          )}
        </CardContent>
      </Card>

      <SpecialNeedsMasterSummaryForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        masterSummaryData={masterSummary ? {
          id: masterSummary.id,
          examination: masterSummary.Examination,
          code: masterSummary.Code,
          year: masterSummary.Year,
        } : null}
        onSuccess={fetchSpecialNeedsData}
      />
    </div>
  );
};

export default SpecialNeedsPage;