"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, ArrowUpDown, Eye, Accessibility, GitBranch, LayoutDashboard } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { showStyledSwal } from '@/utils/alerts';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination-controls";
import AddMasterSummaryForm from "@/components/mastersummaries/AddMasterSummaryForm";
import { MasterSummary } from "@/types/mastersummaries";
import { useNavigate } from 'react-router-dom';
import Spinner from "@/components/Spinner";

const MasterSummariesPage = () => {
  const [masterSummaries, setMasterSummaries] = useState<MasterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof MasterSummary>('Year');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    document.title = "Master Summaries | NEAS";
    fetchMasterSummaries();
  }, []);

  const fetchMasterSummaries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mastersummaries')
      .select('*')
      .order('Year', { ascending: false })
      .order('Examination', { ascending: true });

    if (error) {
      showError(error.message);
    } else {
      setMasterSummaries(data);
    }
    setLoading(false);
  };

  const handleAddMasterSummary = () => {
    setIsFormOpen(true);
  };

  const handleViewMasterSummaryDetails = (summaryId: number | string) => {
    navigate(`/dashboard/mastersummaries/${summaryId}/details`);
  };

  const handleViewMasterSummaryOverview = (summaryId: number | string) => {
    navigate(`/dashboard/mastersummaries/${summaryId}/overview`);
  };

  const handleManageSpecialNeeds = (summaryId: number | string) => {
    navigate(`/dashboard/mastersummaries/${summaryId}/special-needs`);
  };

  const handleManageVersions = (summaryId: number | string) => {
    navigate(`/dashboard/mastersummaries/${summaryId}/version`);
  };

  const handleDeleteMasterSummary = async (summaryId: number, examinationName: string, year: number) => {
    showStyledSwal({
      title: 'Are you sure?',
      html: `You are about to delete the master summary for <b>${examinationName} (${year})</b>. This action cannot be undone and will also delete associated detailed data.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel!',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          const { data: summaryData, error: fetchError } = await supabase
            .from('mastersummaries')
            .select('Code')
            .eq('id', summaryId)
            .single();

          if (fetchError) {
            throw new Error(fetchError.message || "Failed to fetch master summary code for deletion.");
          }

          const code = summaryData.Code;

          if (["SFNA", "SSNA", "PSLE"].includes(code)) {
            const { error: primaryDeleteError } = await supabase
              .from('primarymastersummary')
              .delete()
              .eq('mid', summaryId);
            if (primaryDeleteError) throw primaryDeleteError;
          } else if (["FTNA", "CSEE", "ACSEE"].includes(code)) {
            const { error: secondaryDeleteError } = await supabase
              .from('secondarymastersummaries')
              .delete()
              .eq('mid', summaryId);
            if (secondaryDeleteError) throw secondaryDeleteError;
          }

          const { error: masterDeleteError } = await supabase
            .from('mastersummaries')
            .delete()
            .eq('id', summaryId);

          if (masterDeleteError) throw masterDeleteError;

          showSuccess(`Master summary for ${examinationName} (${year}) and its associated data deleted successfully.`);
          fetchMasterSummaries();
        } catch (error: any) {
          showError(error.message || "An unexpected error occurred during deletion.");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSort = (columnId: keyof MasterSummary) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
    setCurrentPage(1);
  };

  const filteredAndSortedSummaries = useMemo(() => {
    let currentSummaries = [...masterSummaries];

    if (search) {
      currentSummaries = currentSummaries.filter(summary =>
        summary.Examination.toLowerCase().includes(search.toLowerCase()) ||
        summary.Code.toLowerCase().includes(search.toLowerCase()) ||
        summary.Year.toString().includes(search.toLowerCase())
      );
    }

    currentSummaries.sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });

    return currentSummaries;
  }, [masterSummaries, search, orderBy, order]);

  const totalPages = Math.ceil(filteredAndSortedSummaries.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSummaries = filteredAndSortedSummaries.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <Card className="relative min-h-[600px]">
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
          <Spinner label="Loading master summaries..." size="lg" />
        </div>
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Master Summaries</CardTitle>
        <Button size="sm" className="h-8 gap-1" onClick={handleAddMasterSummary} disabled={loading}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add Master Summary</span>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
          <Input
            type="text"
            placeholder="Search summaries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
            disabled={loading}
          />
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('Examination')}
                    className="px-0 hover:bg-transparent"
                  >
                    Examination
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'Examination' ? 'opacity-100' : 'opacity-50')} />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('Code')}
                    className="px-0 hover:bg-transparent"
                  >
                    Code
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'Code' ? 'opacity-100' : 'opacity-50')} />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('Year')}
                    className="px-0 hover:bg-transparent"
                  >
                    Year
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'Year' ? 'opacity-100' : 'opacity-50')} />
                  </Button>
                </TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentSummaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No master summaries found.
                  </TableCell>
                </TableRow>
              ) : (
                currentSummaries.map((summary) => (
                  <TableRow key={summary.id}>
                    <TableCell className="font-medium">{summary.Examination}</TableCell>
                    <TableCell>{summary.Code}</TableCell>
                    <TableCell>{summary.Year}</TableCell>
                    <TableCell>{format(new Date(summary.created_at), 'PPP')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMasterSummaryOverview(summary.id)}
                          disabled={loading}
                          title="View Overview"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMasterSummaryDetails(summary.id)}
                          disabled={loading}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageSpecialNeeds(summary.id)}
                          disabled={loading}
                          title="Manage Special Needs"
                        >
                          <Accessibility className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageVersions(summary.id)}
                          disabled={loading}
                          title="Manage Versions"
                        >
                          <GitBranch className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMasterSummary(summary.id, summary.Examination, summary.Year)}
                          disabled={loading}
                          title="Delete Summary"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {!loading && totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </CardContent>
      <AddMasterSummaryForm 
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={fetchMasterSummaries}
      />
    </Card>
  );
};

export default MasterSummariesPage;