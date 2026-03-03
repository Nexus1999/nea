"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, Edit, Trash2, ArrowUpDown, Eye, Calculator 
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
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import SubjectForm, { SubjectFormValues } from "@/components/settings/SubjectForm";
import SubjectDetailsDrawer from "@/components/settings/SubjectDetailsDrawer";
import SubjectMultiplierModal from "@/components/settings/SubjectMultiplierModal";
import { showStyledSwal } from '@/utils/alerts';
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";           // ← assuming you have this component

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

const Subjects = () => {
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
    fetchSubjects();
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
      const formatted = data?.map((sub: any) => ({
        ...sub,
        examination_name: sub.examinations?.examination || 'N/A',
        normal_booklet_multiplier: parseFloat(String(sub.normal_booklet_multiplier)),
        graph_booklet_multiplier: parseFloat(String(sub.graph_booklet_multiplier)),
      })) ?? [];
      setSubjects(formatted);
    }
    setLoading(false);
  };

  const handleAddSubject = () => {
    setEditingSubject(undefined);
    setIsFormOpen(true);
  };

  const handleEditSubject = (subject: Subject) => {
    const core: SubjectFormValues = {
      id: subject.id,
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      exam_code: subject.exam_code,
      status: subject.status as SubjectFormValues['status'],
    };
    setEditingSubject(core);
    setIsFormOpen(true);
  };

  const handleEditMultipliers = (subject: Subject) => {
    setSubjectToEditMultipliers(subject);
    setIsMultiplierModalOpen(true);
  };

  const handleViewSubject = (subject: Subject) => {
    setViewingSubject(subject);
    setIsDrawerOpen(true);
  };

  const handleDeleteSubject = async (subjectId: number, subjectName: string) => {
    showStyledSwal({
      title: 'Are you sure?',
      html: `Delete subject <b>${subjectName}</b>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#d32f2f',
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
        if (error) showError(error.message);
        else {
          showSuccess(`Subject ${subjectName} deleted`);
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
    let list = [...subjects];

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(s =>
        s.subject_code.toLowerCase().includes(term) ||
        s.subject_name.toLowerCase().includes(term) ||
        s.exam_code.toLowerCase().includes(term) ||
        s.examination_name?.toLowerCase().includes(term) ||
        s.status.toLowerCase().includes(term)
      );
    }

    list.sort((a, b) => {
      const aVal = a[orderBy] ?? '';
      const bVal = b[orderBy] ?? '';
      return order === 'asc'
        ? aVal.toString().localeCompare(bVal.toString(), undefined, { numeric: true })
        : bVal.toString().localeCompare(aVal.toString(), undefined, { numeric: true });
    });

    return list;
  }, [subjects, search, orderBy, order]);

  const totalPages = Math.ceil(filteredAndSortedSubjects.length / itemsPerPage);
  const currentSubjects = filteredAndSortedSubjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':      return "bg-green-100 text-green-700";
      case 'inactive':    return "bg-gray-100 text-gray-700";
      case 'discontinued': return "bg-red-100 text-red-700";
      default:            return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="">
      <Card className="w-full relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-lg">
            <Spinner label="Loading subjects..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Subjects Management</CardTitle>
          </div>

          <Button 
            size="sm" 
            className="bg-black hover:bg-gray-800 text-white gap-1"
            onClick={handleAddSubject}
            disabled={loading}
          >
            <PlusCircle className="h-4 w-4" />
            Add Subject
          </Button>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Search subjects..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="max-w-md"
              disabled={loading}
            />
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[50px]">SN</TableHead>
                  <TableHead 
                    onClick={() => handleSort('subject_code')} 
                    className="cursor-pointer"
                  >
                    Code <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead 
                    onClick={() => handleSort('subject_name')} 
                    className="cursor-pointer"
                  >
                    Name <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead>Exam Code</TableHead>
                  <TableHead 
                    onClick={() => handleSort('status')} 
                    className="cursor-pointer"
                  >
                    Status <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No subjects found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentSubjects.map((subject, idx) => (
                    <TableRow key={subject.id}>
                      <TableCell className="text-muted-foreground">
                        {((currentPage - 1) * itemsPerPage) + idx + 1}
                      </TableCell>
                      <TableCell className="font-semibold">{subject.subject_code}</TableCell>
                      <TableCell>{subject.subject_name}</TableCell>
                      <TableCell>{subject.exam_code}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs uppercase font-semibold",
                            getStatusStyle(subject.status)
                          )}
                        >
                          {subject.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="View Details"
                            onClick={() => handleViewSubject(subject)}
                            disabled={loading}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            title="Edit Subject"
                            onClick={() => handleEditSubject(subject)}
                            disabled={loading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            title="Edit Multipliers"
                            onClick={() => handleEditMultipliers(subject)}
                            disabled={loading}
                          >
                            <Calculator className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-red-50"
                            title="Delete Subject"
                            onClick={() => handleDeleteSubject(subject.id, subject.subject_name)}
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
            <div className="mt-5">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
};

export default Subjects;