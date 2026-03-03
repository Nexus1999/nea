"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, ArrowUpDown, Eye, Calculator } from "lucide-react";
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
import SubjectForm, { SubjectFormValues } from "@/components/settings/SubjectForm";
import SubjectDetailsDrawer from "@/components/settings/SubjectDetailsDrawer";
import SubjectMultiplierModal from "@/components/settings/SubjectMultiplierModal";
import { showStyledSwal } from '@/utils/alerts';
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination-controls";
import { Badge } from "@/components/ui/badge";

interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
  exam_code: string;
  status: string;
  created_at: string;
  examination_name?: string;
  normal_booklet_multiplier: number;
  graph_booklet_multiplier: number;
}

const SubjectsTab = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectFormValues | undefined>(undefined);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewingSubject, setViewingSubject] = useState<Subject | undefined>(undefined);
  const [isViewingDetailsLoading, setIsViewingDetailsLoading] = useState(false);
  
  const [isMultiplierModalOpen, setIsMultiplierModalOpen] = useState(false);
  const [subjectToEditMultipliers, setSubjectToEditMultipliers] = useState<Subject | undefined>(undefined);

  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof Subject>('subject_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    document.title = "Settings - Subjects | NEAS";
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subjects')
      .select('*, examinations(examination)')
      .order('subject_name', { ascending: true });

    if (error) {
      showError(error.message);
    } else {
      const formattedSubjects: Subject[] = data.map((sub: any) => ({
        ...sub,
        examination_name: sub.examinations?.examination || 'N/A',
        normal_booklet_multiplier: parseFloat(String(sub.normal_booklet_multiplier || 0)),
        graph_booklet_multiplier: parseFloat(String(sub.graph_booklet_multiplier || 0)),
      }));
      setSubjects(formattedSubjects);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleAddSubject = () => {
    setEditingSubject(undefined);
    setIsFormOpen(true);
  };

  const handleEditSubject = (subject: Subject) => {
    const coreSubject: SubjectFormValues = {
        id: subject.id,
        subject_code: subject.subject_code,
        subject_name: subject.subject_name,
        exam_code: subject.exam_code,
        status: subject.status as SubjectFormValues['status'],
    };
    setEditingSubject(coreSubject);
    setIsFormOpen(true);
  };

  const handleEditMultipliers = (subject: Subject) => {
    setSubjectToEditMultipliers(subject);
    setIsMultiplierModalOpen(true);
  };

  const handleViewSubject = async (subject: Subject) => {
    setIsViewingDetailsLoading(true);
    setViewingSubject(subject);
    setIsDrawerOpen(true); 
    setIsViewingDetailsLoading(false);
  };

  const handleDeleteSubject = async (subjectId: number, subjectName: string) => {
    showStyledSwal({
      title: 'Are you sure?',
      html: `You are about to delete subject <b>${subjectName}</b>. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel!',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        const { error } = await supabase
          .from('subjects')
          .delete()
          .eq('id', subjectId);

        if (error) {
          showError(error.message);
        } else {
          showSuccess(`Subject ${subjectName} deleted successfully.`);
          fetchSubjects();
        }
        setLoading(false);
      }
    });
  };

  const handleSort = (columnId: keyof Subject) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
    setCurrentPage(1);
  };

  const filteredAndSortedSubjects = useMemo(() => {
    let currentSubjects = [...subjects];

    if (search) {
      currentSubjects = currentSubjects.filter(subject =>
        subject.subject_code.toLowerCase().includes(search.toLowerCase()) ||
        subject.subject_name.toLowerCase().includes(search.toLowerCase()) ||
        subject.exam_code.toLowerCase().includes(search.toLowerCase()) ||
        (subject.examination_name && subject.examination_name.toLowerCase().includes(search.toLowerCase())) ||
        subject.status.toLowerCase().includes(search.toLowerCase())
      );
    }

    currentSubjects.sort((a, b) => {
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

    return currentSubjects;
  }, [subjects, search, orderBy, order]);

  const totalPages = Math.ceil(filteredAndSortedSubjects.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSubjects = filteredAndSortedSubjects.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Discontinued':
        return 'destructive';
      case 'Inactive':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Subjects Management</CardTitle>
        <Button size="sm" className="h-8 gap-1" onClick={handleAddSubject} disabled={loading}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add Subject</span>
        </Button>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4">
          Manage subjects offered in examinations, including default stationery multipliers.
        </CardDescription>

        <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
          <Input
            type="text"
            placeholder="Search subjects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
            disabled={loading}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S/N</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('subject_code')}
                      className="px-0 hover:bg-transparent"
                    >
                      Code
                      <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'subject_code' ? 'opacity-100' : 'opacity-50')} />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('subject_name')}
                      className="px-0 hover:bg-transparent"
                    >
                      Name
                      <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'subject_name' ? 'opacity-100' : 'opacity-50')} />
                    </Button>
                  </TableHead>
                  <TableHead>Exam Code</TableHead>
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
                {currentSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No subjects found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentSubjects.map((subject, index) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{indexOfFirstItem + index + 1}</TableCell>
                      <TableCell>{subject.subject_code}</TableCell>
                      <TableCell>{subject.subject_name}</TableCell>
                      <TableCell>{subject.exam_code}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(subject.status)}>{subject.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSubject(subject)}
                            disabled={loading}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSubject(subject)}
                            disabled={loading}
                            title="Edit Subject Details"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditMultipliers(subject)}
                            disabled={loading}
                            title="Edit Multipliers"
                          >
                            <Calculator className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSubject(subject.id, subject.subject_name)}
                            disabled={loading}
                            title="Delete Subject"
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
      <SubjectForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        subject={editingSubject}
        onSuccess={fetchSubjects}
      />
      <SubjectDetailsDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        subject={viewingSubject}
        loading={isViewingDetailsLoading}
      />
      <SubjectMultiplierModal
        open={isMultiplierModalOpen}
        onOpenChange={setIsMultiplierModalOpen}
        subject={subjectToEditMultipliers}
        onSuccess={fetchSubjects}
      />
    </Card>
  );
};

export default SubjectsTab;