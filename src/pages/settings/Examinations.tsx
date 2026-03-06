"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, ArrowUpDown, Eye } from "lucide-react";
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
import ExaminationForm, { ExaminationFormValues } from "@/components/settings/ExaminationForm";
import ExaminationDetailsDrawer from "@/components/settings/ExaminationDetailsDrawer";
import { showStyledSwal } from '@/utils/alerts';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination-controls";

interface Examination {
  exam_id: number;
  examination: string;
  code: string;
  level: string;
  status: string;
  created_at: string;
}

const Examinations = () => {
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExamination, setEditingExamination] = useState<ExaminationFormValues | undefined>(undefined);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewingExamination, setViewingExamination] = useState<Examination | undefined>(undefined);
  const [isViewingDetailsLoading, setIsViewingDetailsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof Examination>('examination');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    document.title = "Settings - Examinations | NEAS";
  }, []);

  const fetchExaminations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('examinations')
      .select('*');

    if (error) {
      showError(error.message);
    } else {
      setExaminations(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExaminations();
  }, []);

  const handleAddExamination = () => {
    setEditingExamination(undefined);
    setIsFormOpen(true);
  };

  const handleEditExamination = (examination: Examination) => {
    setEditingExamination(examination);
    setIsFormOpen(true);
  };

  const handleViewExamination = (examination: Examination) => {
    setViewingExamination(examination);
    setIsDrawerOpen(true);
    setIsViewingDetailsLoading(false); // No async data for this drawer, so set false immediately
  };

  const handleDeleteExamination = async (examId: number, examinationName: string) => {
    showStyledSwal({
      title: 'Are you sure?',
      html: `You are about to delete examination <b>${examinationName}</b>. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel!',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        const { error } = await supabase
          .from('examinations')
          .delete()
          .eq('exam_id', examId);

        if (error) {
          showError(error.message);
        } else {
          showSuccess(`Examination ${examinationName} deleted successfully.`);
          fetchExaminations();
        }
        setLoading(false);
      }
    });
  };

  const handleSort = (columnId: keyof Examination) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
    setCurrentPage(1); // Reset to first page on sort
  };

  const filteredAndSortedExaminations = useMemo(() => {
    let currentExaminations = [...examinations];

    // Filter
    if (search) {
      currentExaminations = currentExaminations.filter(examination =>
        examination.examination.toLowerCase().includes(search.toLowerCase()) ||
        examination.code.toLowerCase().includes(search.toLowerCase()) ||
        examination.level.toLowerCase().includes(search.toLowerCase()) ||
        examination.status.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort
    currentExaminations.sort((a, b) => {
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

    return currentExaminations;
  }, [examinations, search, orderBy, order]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedExaminations.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentExaminations = filteredAndSortedExaminations.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Reset page to 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Examinations Management</CardTitle>
        <Button size="sm" className="h-8 gap-1" onClick={handleAddExamination} disabled={loading}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add Examination</span>
        </Button>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4">
          Configure examination types and details.
        </CardDescription>

        <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
          <Input
            type="text"
            placeholder="Search examinations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
            disabled={loading}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-neas-green" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('examination')}
                      className="px-0 hover:bg-transparent"
                    >
                      Examination
                      <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'examination' ? 'opacity-100' : 'opacity-50')} />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('code')}
                      className="px-0 hover:bg-transparent"
                    >
                      Code
                      <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'code' ? 'opacity-100' : 'opacity-50')} />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('level')}
                      className="px-0 hover:bg-transparent"
                    >
                      Level
                      <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'level' ? 'opacity-100' : 'opacity-50')} />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('status')}
                      className="px-0 hover:bg-transparent"
                    >
                      Status
                      <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'status' ? 'opacity-100' : 'opacity-50')} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentExaminations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No examinations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentExaminations.map((examination) => (
                    <TableRow key={examination.exam_id}>
                      <TableCell className="font-medium">{examination.examination}</TableCell>
                      <TableCell>{examination.code}</TableCell>
                      <TableCell>{examination.level}</TableCell>
                      <TableCell>{examination.status}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewExamination(examination)}
                            disabled={loading}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditExamination(examination)}
                            disabled={loading}
                            title="Edit Examination"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteExamination(examination.exam_id, examination.examination)}
                            disabled={loading}
                            title="Delete Examination"
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
        )}
        {!loading && totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </CardContent>
      <ExaminationForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        examination={editingExamination}
        onSuccess={fetchExaminations}
      />
      <ExaminationDetailsDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        examination={viewingExamination}
        loading={isViewingDetailsLoading}
      />
    </Card>
  );
};

export default Examinations;