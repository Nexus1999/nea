"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Edit, 
  Trash2, 
  Eye, 
  FileUp, 
  UserPlus, 
  AlertTriangle 
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
import { showStyledSwal } from '@/utils/alerts';
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";

// Components
import AddTeacherDrawer from "@/components/miscellaneous/AddTeacherDrawer";
import EditTeacherDrawer from "@/components/miscellaneous/EditTeacherDrawer"; 
import { ImportTeachersModal } from "@/components/miscellaneous/ImportTeachersModal";
import { TeacherDetailsDrawer } from "@/components/miscellaneous/TeacherDetailsDrawer";

interface PrimaryTeacher {
  id: number;
  region_code: number;
  district_number: number;
  teacher_name: string;
  sex: 'M' | 'F';
  check_number: string;
  index_no: string | null;
  workstation: string;
  phone: string | null;
  regions?: { region_name: string };
  districts?: { district_name: string };
}

const PrimaryTeachersManagementPage = () => {
  const [teachers, setTeachers] = useState<PrimaryTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof PrimaryTeacher>('teacher_name');
  const [order, setOrder] = useState<'desc' | 'asc'>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Primary Teachers Management | NEAS";
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('primaryteachers')
        .select(`
          *,
          regions:region_code (region_name),
          districts:district_number (district_name)
        `)
        .order('teacher_name', { ascending: true });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (id: number) => {
    setSelectedTeacherId(id.toString());
    setIsDetailsDrawerOpen(true);
  };

  const handleEdit = (id: number) => {
    setSelectedTeacherId(id.toString());
    setIsEditDrawerOpen(true);
  };

  const handleDeleteAll = async () => {
    showStyledSwal({
      title: 'Are you absolutely sure?',
      html: "This will delete <b>ALL</b> teacher records. This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete All',
      confirmButtonColor: '#d32f2f',
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        const { error } = await supabase.from('primaryteachers').delete().neq('id', 0);
        if (error) showError(error.message);
        else {
          showSuccess("All teacher records cleared.");
          fetchTeachers();
        }
        setLoading(false);
      }
    });
  };

  const handleDeleteOne = async (record: PrimaryTeacher) => {
    showStyledSwal({
      title: 'Confirm Deletion',
      html: `You are about to delete <b>${record.teacher_name}</b>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#d32f2f',
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        const { error } = await supabase.from('primaryteachers').delete().eq('id', record.id);
        if (error) showError(error.message);
        else {
          showSuccess("Teacher deleted successfully");
          fetchTeachers();
        }
        setLoading(false);
      }
    });
  };

  const handleSort = (columnId: keyof PrimaryTeacher) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
  };

  const filteredData = useMemo(() => {
    let result = teachers.filter(item => {
      const searchStr = search.toLowerCase();
      return (
        item.teacher_name.toLowerCase().includes(searchStr) ||
        item.workstation.toLowerCase().includes(searchStr) ||
        item.districts?.district_name.toLowerCase().includes(searchStr)
      );
    });

    result.sort((a, b) => {
      const aVal = a[orderBy] ?? '';
      const bVal = b[orderBy] ?? '';
      return order === 'asc'
        ? aVal.toString().localeCompare(bVal.toString())
        : bVal.toString().localeCompare(aVal.toString());
    });
    return result;
  }, [teachers, search, orderBy, order]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      <Card className="w-full relative min-h-[600px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
            <Spinner label="Syncing database..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-2xl font-bold text-gray-800">Primary Teachers Management</CardTitle>
          <div className="flex gap-2">
             <Button size="sm" className="bg-black hover:bg-gray-800" onClick={() => setIsAddDrawerOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Add Teacher
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
              <FileUp className="h-4 w-4 mr-1" /> Import CSV
            </Button>
             <Button variant="destructive" size="sm" onClick={handleDeleteAll}>
              <AlertTriangle className="h-4 w-4 mr-1" /> Delete All
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6 text-slate-500">
            <Input
              placeholder="Search by name, district, or workstation..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="max-w-md h-10"
            />
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[50px]">SN</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead onClick={() => handleSort('teacher_name')} className="cursor-pointer">Full Name</TableHead>
                  <TableHead>Sex</TableHead>
                  <TableHead>Workstation</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((item, index) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-muted-foreground text-xs">
                      {((currentPage - 1) * itemsPerPage) + index + 1}
                    </TableCell>
                    <TableCell>{item.districts?.district_name || 'N/A'}</TableCell>
                    <TableCell className="font-semibold text-blue-900 uppercase">
                      {item.teacher_name}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] uppercase font-bold border",
                        item.sex === 'M' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-pink-50 text-pink-700 border-pink-100"
                      )}>
                        {item.sex}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{item.workstation}</TableCell>
                    <TableCell className="text-sm">{item.phone || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500" onClick={() => handleViewDetails(item.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleEdit(item.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteOne(item)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!loading && totalPages > 1 && (
            <div className="mt-4">
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </CardContent>
      </Card>

      <TeacherDetailsDrawer 
        open={isDetailsDrawerOpen} 
        onOpenChange={setIsDetailsDrawerOpen} 
        teacherId={selectedTeacherId} 
      />

      <EditTeacherDrawer 
        isOpen={isEditDrawerOpen} 
        onClose={() => setIsEditDrawerOpen(false)} 
        onRefresh={fetchTeachers} 
        teacherId={selectedTeacherId} 
      />

      <AddTeacherDrawer 
        isOpen={isAddDrawerOpen} 
        onClose={() => setIsAddDrawerOpen(false)} 
        onRefresh={fetchTeachers} 
      />

      <ImportTeachersModal 
        open={isImportModalOpen} 
        onOpenChange={setIsImportModalOpen} 
        onSuccess={fetchTeachers} 
      />
    </div>
  );
};

export default PrimaryTeachersManagementPage;