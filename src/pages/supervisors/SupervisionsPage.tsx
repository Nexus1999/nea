"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, ArrowUpDown, Eye, Users } from "lucide-react";
import { FileText, UserPlus, Download } from "lucide-react";
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

// Components
import Spinner from "@/components/Spinner";
import { AddSupervisionModal } from "./../../components/supervisors/AddSupervisionModal";

interface Supervision {
  id: string;
  mid: number;
  exam_name: string;
  exam_code: string;
  year: number;
  status: 'pending' | 'completed' | 'ongoing';
  created_at: string;
}

const SupervisionsPage = () => {
  const navigate = useNavigate();
  const [supervisions, setSupervisions] = useState<Supervision[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof Supervision>('year');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    document.title = "Supervisions | NEAS";
    fetchSupervisions();
  }, []);

  const fetchSupervisions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('supervisions')
      .select(`
        id,
        mid,
        status,
        created_at,
        mastersummaries (
          Examination,
          Code,
          Year
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      showError(error.message);
    } else {
      const formattedData = data.map((item: any) => ({
        id: item.id,
        mid: item.mid,
        status: item.status,
        exam_name: item.mastersummaries?.Examination || 'N/A',
        exam_code: item.mastersummaries?.Code || 'N/A',
        year: item.mastersummaries?.Year || 0,
        created_at: item.created_at
      }));
      setSupervisions(formattedData);
    }
    setLoading(false);
  };

  const handleDeleteSupervision = async (record: Supervision) => {
    showStyledSwal({
      title: 'Confirm Deletion',
      html: `Delete supervision for <b>${record.exam_code}</b>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#d32f2f',
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        const { error } = await supabase
          .from('supervisions')
          .delete()
          .eq('id', record.id);

        if (error) showError(error.message);
        else {
          showSuccess("Record deleted");
          fetchSupervisions();
        }
        setLoading(false);
      }
    });
  };

  const handleSort = (columnId: keyof Supervision) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
  };

  const filteredData = useMemo(() => {
    let result = supervisions.filter(item =>
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
  }, [supervisions, search, orderBy, order]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <Card className="w-full relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
            <Spinner label="Loading..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-2xl font-bold">Examination Supervisions</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dashboard/supervisors/supervisors-management')}
            >
              <Users className="h-4 w-4 mr-1" />
              Manage Supervisors
            </Button>
            <Button 
              size="sm" 
              className="bg-black hover:bg-gray-800"
              onClick={() => setIsAddModalOpen(true)}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Add Supervisions
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Search examinations..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="max-w-md"
            />
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[60px]">SN</TableHead>
                  <TableHead onClick={() => handleSort('exam_name')} className="cursor-pointer">
                    Examination <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead onClick={() => handleSort('exam_code')} className="cursor-pointer">
                    Code <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead onClick={() => handleSort('year')} className="cursor-pointer">
                    Year <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground font-medium">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </TableCell>
                      <TableCell className="font-semibold">{item.exam_name}</TableCell>
                      <TableCell className="font-mono text-xs">{item.exam_code}</TableCell>
                      <TableCell>{item.year}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] uppercase font-bold border",
                          item.status === 'completed' ? "bg-green-100 text-green-700 border-green-200" : 
                          item.status === 'ongoing' ? "bg-blue-100 text-blue-700 border-blue-200" :
                          "bg-amber-100 text-amber-700 border-amber-200"
                        )}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="View Summary"
                            onClick={() => navigate(`/supervisions/summary/${item.id}`)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            title="Manage Assignments"
                            onClick={() => navigate(`/dashboard/supervisors/supervisors-assignments/${item.id}`)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="View Supervisors Lists"
                            onClick={() => navigate(`/dashboard/supervisors/supervisors-lists/${item.id}`)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-red-50"
                            title="Delete Record"
                            onClick={() => handleDeleteSupervision(item)}
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
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <AddSupervisionModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
        onSuccess={fetchSupervisions} 
      />
    </>
  );
};

export default SupervisionsPage;