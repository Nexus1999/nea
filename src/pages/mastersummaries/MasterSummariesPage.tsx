"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Trash2, 
  ArrowUpDown, 
  Eye, 
  Accessibility, 
  GitBranch, 
  LayoutDashboard, 
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
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

  // Delete confirmation dialog state
  const [deleteConfig, setDeleteConfig] = useState<{
    open: boolean;
    id: number | null;
    code: string;
    year: number;
  }>({
    open: false,
    id: null,
    code: '',
    year: 0,
  });

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
      setMasterSummaries(data ?? []);
    }
    setLoading(false);
  };

  const handleAddMasterSummary = () => setIsFormOpen(true);

  const handleViewMasterSummaryOverview = (id: number | string) =>
    navigate(`/dashboard/mastersummaries/overview/${id}`);

  const handleViewMasterSummaryDetails = (id: number | string) =>
    navigate(`/dashboard/mastersummaries/details/${id}`);

  const handleManageSpecialNeeds = (id: number | string) =>
    navigate(`/dashboard/mastersummaries/special-needs/${id}`);

  const handleManageVersions = (id: number | string) =>
    navigate(`/dashboard/mastersummaries/version/${id}`);

  const requestDelete = (id: number, code: string, year: number) => {
    setDeleteConfig({
      open: true,
      id,
      code,
      year,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfig.id) return;

    const id = deleteConfig.id;
    const code = deleteConfig.code;
    const year = deleteConfig.year;

    setLoading(true);
    setDeleteConfig(prev => ({ ...prev, open: false }));

    try {
      // Get code (already have it, but keeping fetch for safety/consistency)
      const { data: summary, error: fetchError } = await supabase
        .from('mastersummaries')
        .select('Code')
        .eq('id', id)
        .single();

      if (fetchError || !summary) {
        throw new Error(fetchError?.message || "Could not fetch summary code");
      }

      // Clean child tables
      if (["SFNA", "SSNA", "PSLE"].includes(code)) {
        const { error } = await supabase
          .from('primarymastersummary')
          .delete()
          .eq('mid', id);
        if (error) throw error;
      } else if (["FTNA", "CSEE", "ACSEE"].includes(code)) {
        const { error } = await supabase
          .from('secondarymastersummaries')
          .delete()
          .eq('mid', id);
        if (error) throw error;
      }

      // Delete master record
      const { error: masterError } = await supabase
        .from('mastersummaries')
        .delete()
        .eq('id', id);

      if (masterError) throw masterError;

      showSuccess(`Master summary for ${code} (${year}) deleted successfully.`);
      fetchMasterSummaries();
    } catch (err: any) {
      showError(err.message || "Deletion failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (columnId: keyof MasterSummary) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
    setCurrentPage(1);
  };

  const filteredAndSortedSummaries = useMemo(() => {
    let list = [...masterSummaries];

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(s =>
        s.Examination.toLowerCase().includes(term) ||
        s.Code.toLowerCase().includes(term) ||
        String(s.Year).includes(term)
      );
    }

    list.sort((a, b) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return list;
  }, [masterSummaries, search, orderBy, order]);

  const totalPages = Math.ceil(filteredAndSortedSummaries.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedSummaries.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page: number) => setCurrentPage(page);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <Card className="relative min-h-[600px]">
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-lg">
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
        <div className="mb-4">
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
                  <Button variant="ghost" onClick={() => handleSort('Examination')} className="px-0 hover:bg-transparent">
                    Examination
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'Examination' ? 'opacity-100' : 'opacity-50')} />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('Code')} className="px-0 hover:bg-transparent">
                    Code
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'Code' ? 'opacity-100' : 'opacity-50')} />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('Year')} className="px-0 hover:bg-transparent">
                    Year
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'Year' ? 'opacity-100' : 'opacity-50')} />
                  </Button>
                </TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No master summaries found.
                  </TableCell>
                </TableRow>
              ) : (
                currentItems.map(summary => (
                  <TableRow key={summary.id}>
                    <TableCell className="font-medium">{summary.Examination}</TableCell>
                    <TableCell>{summary.Code}</TableCell>
                    <TableCell>{summary.Year}</TableCell>
                    <TableCell>{format(new Date(summary.created_at), 'PPP')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="View Overview"
                          onClick={() => handleViewMasterSummaryOverview(summary.id)}
                          disabled={loading}
                        >
                          <LayoutDashboard className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="View Details"
                          onClick={() => handleViewMasterSummaryDetails(summary.id)}
                          disabled={loading}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                          title="Manage Special Needs"
                          onClick={() => handleManageSpecialNeeds(summary.id)}
                          disabled={loading}
                        >
                          <Accessibility className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Manage Versions"
                          onClick={() => handleManageVersions(summary.id)}
                          disabled={loading}
                        >
                          <GitBranch className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-red-700 hover:bg-red-50"
                          title="Delete Summary"
                          onClick={() => requestDelete(summary.id, summary.Code, summary.Year)}
                          disabled={loading}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfig.open}
        onOpenChange={(open) => setDeleteConfig(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent className="max-w-[420px] rounded-2xl border border-slate-200 shadow-2xl p-6">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-slate-900">
                Are you sure?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-slate-700 text-center font-medium leading-relaxed mt-3">
              Are you sure you want to delete the master summary for{" "}
              <span className="font-bold text-red-700">
                {deleteConfig.code}-{deleteConfig.year}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-row items-center gap-3 mt-8">
            <AlertDialogCancel className="flex-1 h-11 font-bold uppercase text-xs tracking-wider rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loading}
              className="flex-[1.5] h-11 font-black uppercase text-xs tracking-wider rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Yes, Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default MasterSummariesPage;