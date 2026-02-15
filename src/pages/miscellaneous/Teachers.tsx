"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, Edit, Trash2, ArrowUpDown, Users, Briefcase, 
  FileText, UserPlus, Download 
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
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";
import { AddJobAssignmentModal } from "@/components/miscellaneous/AddJobAssignmentModal";
import { EditJobAssignmentModal } from "@/components/miscellaneous/EditJobAssignmentModal";
import { cn } from "@/lib/utils";

interface JobAssignment {
  id: string;
  name: string;
  section: string;
  start_date: string;
  end_date: string;
  total_required: number;
  status: 'pending' | 'active' | 'completed';
  created_at: string;
}

const PrimaryTeacherAssignments = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<JobAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof JobAssignment>('created_at');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<JobAssignment | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    document.title = "Primary Teacher Assignments | NEAS";
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobassignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showError(error.message);
    } else {
      setAssignments(data || []);
    }
    setLoading(false);
  };

  const handleEditClick = (assignment: JobAssignment) => {
    setSelectedAssignment(assignment);
    setIsEditModalOpen(true);
  };

  const handleDeleteAssignment = async (record: JobAssignment) => {
    showStyledSwal({
      title: 'Confirm Deletion',
      html: `Delete assignment <b>\${record.name}</b>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#d32f2f',
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        const { error } = await supabase
          .from('jobassignments')
          .delete()
          .eq('id', record.id);

        if (error) showError(error.message);
        else {
          showSuccess("Assignment deleted");
          fetchAssignments();
        }
        setLoading(false);
      }
    });
  };

  const handleExportCSV = (item: JobAssignment) => {
    const headers = ["Name", "Section", "Total Required", "Start Date", "End Date", "Status"];
    const row = [item.name, item.section, item.total_required, item.start_date, item.end_date, item.status];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\\n" + row.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `\${item.name}_assignment.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (columnId: keyof JobAssignment) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
  };

  const filteredData = useMemo(() => {
    let result = assignments.filter(item =>
      Object.values(item).some(val =>
        val?.toString().toLowerCase().includes(search.toLowerCase())
      )
    );
    result.sort((a, b) => {
      const aVal = a[orderBy] ?? '';
      const bVal = b[orderBy] ?? '';
      return order === 'asc'
        ? aVal.toString().localeCompare(bVal.toString(), undefined, { numeric: true })
        : bVal.toString().localeCompare(aVal.toString(), undefined, { numeric: true });
    });
    return result;
  }, [assignments, search, orderBy, order]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="p-6">
      <Card className="w-full relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
            <Spinner label="Processing..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b mb-4">
          <div className="flex items-center gap-3">
             <div className="bg-primary/10 p-2 rounded-lg">
                <Briefcase className="h-6 w-6 text-primary" />
             </div>
             <CardTitle className="text-2xl font-bold">Primary Teachers Assignments</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/miscellaneous/jobs/teachers-management')}>
              <Users className="h-4 w-4 mr-1" /> Manage Teachers
            </Button>
            <Button size="sm" className="bg-black hover:bg-gray-800 text-white" onClick={() => setIsAddModalOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-1" /> Add Assignment
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Search by name or section..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="max-w-md"
            />
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[50px]">SN</TableHead>
                  <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                    Name <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead onClick={() => handleSort('section')} className="cursor-pointer">
                    Section <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead onClick={() => handleSort('total_required')} className="cursor-pointer text-center font-bold">
                    Total Required <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead onClick={() => handleSort('start_date')} className="cursor-pointer">
                    Timeline <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10">No records found.</TableCell></TableRow>
                ) : (
                  currentData.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{((currentPage - 1) * itemsPerPage) + index + 1}</TableCell>
                      <TableCell className="font-semibold">{item.name}</TableCell>
                      <TableCell>{item.section}</TableCell>
                      <TableCell className="text-center font-bold">{item.total_required}</TableCell>
                      <TableCell className="text-xs">
                        {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] uppercase font-bold",
                          item.status === 'active' ? "bg-green-100 text-green-700" : 
                          item.status === 'completed' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                        )}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="View Summary" onClick={() => navigate(`/supervisions/summary/\${item.id}`)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>

                          <Button 
                            variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            title="Manage Assignments" onClick={() => navigate(`/dashboard/miscellaneous/jobs/assignments/\${item.id}`)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>

                          <Button 
                            variant="ghost" size="icon" className="h-8 w-8 text-amber-500 hover:bg-amber-50"
                            title="Edit Record" onClick={() => handleEditClick(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button 
                            variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Export Data" onClick={() => handleExportCSV(item)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          <Button 
                            variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50"
                            title="Delete Record" onClick={() => handleDeleteAssignment(item)}
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
            <div className="mt-4">
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </CardContent>
      </Card>

      <AddJobAssignmentModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} onSuccess={fetchAssignments} />
      {selectedAssignment && (
        <EditJobAssignmentModal 
          open={isEditModalOpen} onOpenChange={setIsEditModalOpen} 
          onSuccess={fetchAssignments} assignment={selectedAssignment} 
        />
      )}
    </div>
  );
};

export default PrimaryTeacherAssignments;