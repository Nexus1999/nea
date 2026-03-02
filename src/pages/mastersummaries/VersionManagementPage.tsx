"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GitBranch, Loader2, Eye, History, Trash2, CheckCircle, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { MasterSummary } from "@/types/mastersummaries";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showStyledSwal } from '@/utils/alerts';
import { Badge } from "@/components/ui/badge";
import UploadNewVersionModal from "@/components/mastersummaries/UploadNewVersionModal";
import DifferenceReportModal from "@/components/mastersummaries/DifferenceReportModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VersionManagementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const masterSummaryId = id;
  const navigate = useNavigate();

  const [masterSummary, setMasterSummary] = useState<MasterSummary | null>(null);
  const [allVersions, setAllVersions] = useState<MasterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploadFormOpen, setIsUploadFormOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportVersions, setReportVersions] = useState<{ current: MasterSummary; previous: MasterSummary } | null>(null);

  // New states for selecting versions for comparison
  const [selectedVersion1, setSelectedVersion1] = useState<MasterSummary | null>(null);
  const [selectedVersion2, setSelectedVersion2] = useState<MasterSummary | null>(null);

  const fetchVersions = useCallback(async () => {
    console.log("[VersionManagementPage] Starting fetchVersions for masterSummaryId:", masterSummaryId);
    setError(null);
    setLoading(true);
    setAllVersions([]);
    setMasterSummary(null);
    setSelectedVersion1(null); // Reset selected versions on fetch
    setSelectedVersion2(null);

    if (!masterSummaryId) {
      setError("Master summary ID is missing from the URL.");
      setLoading(false);
      console.log("[VersionManagementPage] masterSummaryId is missing.");
      return;
    }

    try {
      // 1. Fetch the main master summary entry to get its current latest version and other metadata
      const { data: mainSummary, error: mainSummaryError } = await supabase
        .from('mastersummaries')
        .select('*')
        .eq('id', masterSummaryId)
        .single();

      if (mainSummaryError) {
        console.error("[VersionManagementPage] Error fetching main master summary details:", mainSummaryError);
        setError(mainSummaryError.message || "Failed to fetch main master summary details.");
        setLoading(false);
        return;
      }
      setMasterSummary(mainSummary as MasterSummary);
      console.log("[VersionManagementPage] Fetched mainSummary:", mainSummary);

      // 2. Use the new RPC function to get distinct versions and their created_at
      const { data: distinctVersionsData, error: rpcError } = await supabase.rpc('get_distinct_mastersummary_versions', {
        p_mid: parseInt(masterSummaryId),
        p_code: mainSummary.Code,
      });

      if (rpcError) {
        console.error("[VersionManagementPage] Error calling RPC function get_distinct_mastersummary_versions:", rpcError);
        setError(rpcError.message || "Failed to fetch distinct versions.");
        setLoading(false);
        return;
      }
      console.log("[VersionManagementPage] Raw distinctVersionsData from RPC:", distinctVersionsData);

      const constructedVersions: MasterSummary[] = (distinctVersionsData || []).map(record => ({
        id: mainSummary.id,
        Examination: mainSummary.Examination,
        Code: mainSummary.Code,
        Year: mainSummary.Year,
        created_at: record.created_at,
        version: record.version,
        is_latest: record.version === mainSummary.version,
      }));

      const sortedConstructedVersions = constructedVersions.sort((a, b) => b.version - a.version); // Sort descending by version number for display
      setAllVersions(sortedConstructedVersions);
      console.log("[VersionManagementPage] Final constructed and sorted versions:", sortedConstructedVersions);

      // Pre-select the latest two versions if available
      if (sortedConstructedVersions.length >= 1) {
        setSelectedVersion1(sortedConstructedVersions[0]);
      }
      if (sortedConstructedVersions.length >= 2) {
        setSelectedVersion2(sortedConstructedVersions[1]);
      }

    } catch (err: any) {
      console.error("[VersionManagementPage] Unexpected error in fetchVersions:", err);
      setError(err.message || "An unexpected error occurred while fetching versions.");
      setMasterSummary(null);
      setAllVersions([]);
    } finally {
      setLoading(false);
      console.log("[VersionManagementPage] fetchVersions finished. Loading set to false.");
    }
  }, [masterSummaryId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Set dynamic document title
  useEffect(() => {
    if (masterSummary) {
      document.title = `Versions - ${masterSummary.Code} ${masterSummary.Year} | NEAS`;
    } else {
      document.title = "Version Management | NEAS";
    }
  }, [masterSummary]);

  const handleViewDetails = (summaryId: number) => {
    // When viewing details, we want to see the data associated with the specific masterSummaryId
    // The MasterSummaryDetailsPage already handles fetching data for a given masterSummaryId
    // and implicitly shows the latest version associated with it.
    // If we want to view a *specific historical version's* details, the MasterSummaryDetailsPage
    // would need to be updated to accept a version parameter. For now, it shows the latest.
    // For this context, we'll navigate to the main details page for the master summary.
    navigate(`/dashboard/mastersummaries/${summaryId}/details`);
  };

  const handleSetAsLatest = async (targetMasterSummaryId: number, targetVersionNumber: number) => {
    if (!masterSummary) return;

    showStyledSwal({
      title: 'Confirm Set as Latest',
      html: `Are you sure you want to set Version <b>${targetVersionNumber}</b> as the latest? This will mark all other versions for this examination as historical.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Set as Latest',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          let detailedTableName: string | null = null;
          if (["SFNA", "SSNA", "PSLE"].includes(masterSummary.Code)) {
            detailedTableName = 'primarymastersummary';
          } else if (["FTNA", "CSEE", "ACSEE"].includes(masterSummary.Code)) {
            detailedTableName = 'secondarymastersummaries';
          } else {
            throw new Error(`Unknown examination code: ${masterSummary.Code}`);
          }

          // 1. Mark all detailed data for this masterSummaryId as not latest
          const { error: updateOldDetailedError } = await supabase
            .from(detailedTableName)
            .update({ is_latest: false })
            .eq("mid", targetMasterSummaryId);

          if (updateOldDetailedError) {
            console.error("Error marking old detailed data as not latest:", updateOldDetailedError);
            throw new Error(updateOldDetailedError.message || "Failed to mark old detailed data as historical.");
          }

          // 2. Mark the target detailed data as latest
          const { error: updateTargetDetailedError } = await supabase
            .from(detailedTableName)
            .update({ is_latest: true })
            .eq("mid", targetMasterSummaryId)
            .eq("version", targetVersionNumber); // Use targetVersionNumber here

          if (updateTargetDetailedError) {
            console.error("Error marking target detailed data as latest:", updateTargetDetailedError);
            throw new Error(updateTargetDetailedError.message || "Failed to mark target detailed data as latest.");
          }

          // 3. Update the main mastersummaries entry to reflect the new latest version
          const { error: updateMasterSummaryError } = await supabase
            .from("mastersummaries")
            .update({ version: targetVersionNumber, created_at: new Date().toISOString() })
            .eq("id", targetMasterSummaryId);

          if (updateMasterSummaryError) {
            console.error("Error updating master summary entry:", updateMasterSummaryError);
            throw new Error(updateMasterSummaryError.message || "Failed to update master summary entry.");
          }

          showSuccess(`Version ${targetVersionNumber} is now the latest!`);
          fetchVersions();
        } catch (err: any) {
          showError(err.message || "Failed to set version as latest.");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeletePreviousVersions = async () => {
    if (!masterSummary) return;

    showStyledSwal({
      title: 'Confirm Deletion',
      html: `Are you sure you want to delete ALL previous versions (not marked as latest) for <b>${masterSummary.Examination} (${masterSummary.Code}) - ${masterSummary.Year}</b>? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete All',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          const oldVersions = allVersions.filter(v => !v.is_latest);

          if (oldVersions.length === 0) {
            showSuccess("No previous versions to delete.");
            setLoading(false);
            return;
          }

          let detailedTableName: string | null = null;
          if (["SFNA", "SSNA", "PSLE"].includes(masterSummary.Code)) {
            detailedTableName = 'primarymastersummary';
          } else if (["FTNA", "CSEE", "ACSEE"].includes(masterSummary.Code)) {
            detailedTableName = 'secondarymastersummaries';
          } else {
            throw new Error(`Unknown examination code: ${masterSummary.Code}`);
          }

          for (const oldVersion of oldVersions) {
            // Delete associated detailed data for each old version
            const { error: deleteDetailedError } = await supabase
              .from(detailedTableName)
              .delete()
              .eq('mid', masterSummaryId) // Use the main masterSummaryId
              .eq('version', oldVersion.version); // Delete specific version data

            if (deleteDetailedError) {
              console.error(`Error deleting detailed data for old version ${oldVersion.version}:`, deleteDetailedError);
              throw new Error(`Failed to delete detailed data for version ${oldVersion.version}.`);
            }
          }

          showSuccess(`All ${oldVersions.length} previous versions deleted successfully!`);
          fetchVersions(); // Re-fetch to update the list
        } catch (err: any) {
          showError(err.message || "An unexpected error occurred during deletion.");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleGenerateDifferenceReport = () => {
    if (!selectedVersion1 || !selectedVersion2) {
      showError("Please select two versions to compare.");
      return;
    }
    if (selectedVersion1.version === selectedVersion2.version) {
      showError("Please select two *different* versions to compare.");
      return;
    }

    // Ensure currentVersion is always the higher version number for consistent reporting
    const current = selectedVersion1.version > selectedVersion2.version ? selectedVersion1 : selectedVersion2;
    const previous = selectedVersion1.version < selectedVersion2.version ? selectedVersion1 : selectedVersion2;

    setReportVersions({ current, previous });
    setIsReportModalOpen(true);
  };

  const sortedVersions = useMemo(() => {
    return [...allVersions].sort((a, b) => b.version - a.version);
  }, [allVersions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-neas-green" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Version Management Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-red-500">{error}</p>
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Master Summaries
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!masterSummary) {
    return (
      <Card className="w-full max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Version Management</CardTitle>
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
          Version History for {masterSummary.Examination} ({masterSummary.Code}) - {masterSummary.Year}
        </h1>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Master Summaries
        </Button>
      </div>

      <Card className="shadow-lg rounded-xl overflow-hidden bg-white">
        <CardHeader className="border-b pb-4 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <GitBranch className="h-6 w-6 text-neas-green" /> All Versions
            </CardTitle>
            <CardDescription className="text-gray-600">
              Manage historical and current versions of this master summary.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={() => setIsUploadFormOpen(true)}
              disabled={loading}
              title="Upload a new version for this master summary"
            >
              <UploadCloud className="h-3.5 w-3.5 mr-1" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Upload New Version</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeletePreviousVersions}
              disabled={loading || allVersions.filter(v => !v.is_latest).length === 0}
              title="Delete all versions not marked as latest"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Delete Old Versions</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Version Comparison Section */}
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
            <span className="font-semibold text-gray-700">Compare:</span>
            <Select
              onValueChange={(value) => setSelectedVersion1(allVersions.find(v => v.version === parseInt(value)) || null)}
              value={selectedVersion1?.version?.toString() || ""}
              disabled={loading || allVersions.length < 2}
            >
              <SelectTrigger className="w-[180px]">
                {selectedVersion1 ? (
                  <SelectValue placeholder="Select Version 1" />
                ) : (
                  <span className="text-muted-foreground">Select Version 1</span>
                )}
              </SelectTrigger>
              <SelectContent>
                {allVersions.map((version) => (
                  <SelectItem key={`v1-${version.version}`} value={version.version.toString()}>
                    Version {version.version} {version.is_latest && "(Latest)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="font-semibold text-gray-700">with</span>
            <Select
              onValueChange={(value) => setSelectedVersion2(allVersions.find(v => v.version === parseInt(value)) || null)}
              value={selectedVersion2?.version?.toString() || ""}
              disabled={loading || allVersions.length < 2}
            >
              <SelectTrigger className="w-[180px]">
                {selectedVersion2 ? (
                  <SelectValue placeholder="Select Version 2" />
                ) : (
                  <span className="text-muted-foreground">Select Version 2</span>
                )}
              </SelectTrigger>
              <SelectContent>
                {allVersions.map((version) => (
                  <SelectItem key={`v2-${version.version}`} value={version.version.toString()}>
                    Version {version.version} {version.is_latest && "(Latest)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleGenerateDifferenceReport}
              disabled={loading || !selectedVersion1 || !selectedVersion2 || selectedVersion1.version === selectedVersion2.version}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" /> Generate Report
            </Button>
          </div>

          {sortedVersions.length > 0 ? (
            <div className="border rounded-lg overflow-auto max-h-[60vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="h-8 px-2 text-base">Version</TableHead>
                    <TableHead className="h-8 px-2 text-base">Status</TableHead>
                    {/* Removed Created At column */}
                    <TableHead className="h-8 px-2 text-base text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedVersions.map((versionEntry) => (
                    <TableRow key={versionEntry.version}>
                      <TableCell className="py-2 px-2 text-base font-medium">
                        Version {versionEntry.version}
                      </TableCell>
                      <TableCell className="py-2 px-2 text-base">
                        {versionEntry.is_latest ? (
                          <Badge className="bg-green-500 hover:bg-green-600 text-white">Latest</Badge>
                        ) : (
                          <Badge variant="secondary">Historical</Badge>
                        )}
                      </TableCell>
                      {/* Removed Created At cell */}
                      <TableCell className="py-2 px-2 text-base text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(versionEntry.id)}
                            disabled={loading}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!versionEntry.is_latest && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetAsLatest(versionEntry.id, versionEntry.version)}
                              disabled={loading}
                              title="Set as Latest"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-gray-500">No versions found for this master summary.</p>
          )}
        </CardContent>
      </Card>

      {masterSummary && (
        <UploadNewVersionModal
          open={isUploadFormOpen}
          onOpenChange={setIsUploadFormOpen}
          onSuccess={fetchVersions}
          masterSummaryData={masterSummary}
        />
      )}

      {reportVersions && (
        <DifferenceReportModal
          open={isReportModalOpen}
          onOpenChange={setIsReportModalOpen}
          currentVersion={reportVersions.current}
          previousVersion={reportVersions.previous}
        />
      )}
    </div>
  );
};

export default VersionManagementPage;