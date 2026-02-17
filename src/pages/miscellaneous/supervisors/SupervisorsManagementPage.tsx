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

// Components
import Spinner from "@/components/Spinner";
import AddSupervisorDrawer from "@/components/supervisors/AddSupervisorDrawer";
import EditSupervisorDrawer from "@/components/supervisors/EditSupervisorDrawer"; 
import { ImportSupervisorsModal } from "@/components/supervisors/ImportSupervisorsModal";
import { SupervisorDetailsDrawer } from "@/components/supervisors/SupervisorsProfile";

interface Supervisor {
  id: number;
  region: string;
  district: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name?: string; 
  index_no: string;
  center_no: string;
  center_type: 'government' | 'private' | 'public';
  phone: string;
  status: 'ACTIVE' | 'BLOCKED';
  year_imported: string;
}

const SupervisorsManagementPage = () => {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof Supervisor>('first_name');
  const [order, setOrder] = useState<'desc' | 'asc'>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Drawer States
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false); // NEW STATE
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Supervisor Management | NEAS";
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('supervisors')
      .select('*')
      .eq('is_latest', 1)
      .order('first_name', { ascending: true });

    if (error) {
      showError(error.message);
    } else {
      const formatted = data.map((s: Supervisor) => ({
        ...s,
        full_name: `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.trim()
      }));
      setSupervisors(formatted);
    }
    setLoading(false);
  };

  // --- ACTION HANDLERS ---
  const handleViewDetails = (id: number) => {
    setSelectedSupervisorId(id);
    setIsDetailsDrawerOpen(true);
  };

  const handleEdit = (id: number) => {
    setSelectedSupervisorId(id);
    setIsEditDrawerOpen(true);
  };

  const handleDeleteAll = async () => {
    showStyledSwal({
      title: 'Are you absolutely sure?',
      html: "This will delete <b>ALL</b> supervisor records. This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete All',
      confirmButtonColor: '#d32f2f',
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        const { error } = await supabase.from('supervisors').delete().neq('id', 0);
        if (error) showError(error.message);
        else {
          showSuccess("All supervisor records cleared.");
          fetchSupervisors();
        }
        setLoading(false);
      }
    });
  };

  const handleDeleteOne = async (record: Supervisor) => {
    showStyledSwal({
      title: 'Confirm Deletion',
      html: `You are about to delete <b>${record.first_name} ${record.last_name}</b>.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#d32f2f',
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        const { error } = await supabase.from('supervisors').delete().eq('id', record.id);
        if (error) showError(error.message);
        else {
          showSuccess("Supervisor deleted successfully");
          fetchSupervisors();
        }
        setLoading(false);
      }
    });
  };

  const handleSort = (columnId: keyof Supervisor) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
  };

  const filteredData = useMemo(() => {
    let result = supervisors.filter(item =>
      Object.values(item).some(val =>
        val?.toString().toLowerCase().includes(search.toLowerCase())
      )
    );
    result.sort((a, b) => {
      const aVal = a[orderBy] ?? '';
      const bVal = b[orderBy] ?? '';
      return order === 'asc'
        ? aVal.toString().localeCompare(bVal.toString())
        : bVal.toString().localeCompare(aVal.toString());
    });
    return result;
  }, [supervisors, search, orderBy, order]);

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
          <CardTitle className="text-2xl font-bold text-gray-800">Supervisors Management</CardTitle>
          <div className="flex gap-2">
             <Button size="sm" className="bg-black hover:bg-gray-800" onClick={() => setIsAddDrawerOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1" /> Add Supervisor
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
              placeholder="Search by name, index no, or school..."
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
                  <TableHead onClick={() => handleSort('region')} className="cursor-pointer">Region</TableHead>
                  <TableHead onClick={() => handleSort('district')} className="cursor-pointer">District</TableHead>
                  <TableHead onClick={() => handleSort('first_name')} className="cursor-pointer">Full Name</TableHead>
                  <TableHead>Index No</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Ownership</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((item, index) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/50">
                    <TableCell className="text-muted-foreground text-xs">
                      {((currentPage - 1) * itemsPerPage) + index + 1}
                    </TableCell>
                    <TableCell>{item.region}</TableCell>
                    <TableCell>{item.district}</TableCell>
                    <TableCell className="font-semibold text-blue-900">{item.full_name}</TableCell>
                    <TableCell className="font-mono text-xs">{item.index_no}</TableCell>
                    <TableCell className="text-sm">{item.center_no}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] uppercase font-bold border",
                        item.center_type === 'government' ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-orange-50 text-orange-700 border-orange-100"
                      )}>
                        {item.center_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{item.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        item.status === 'ACTIVE' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                      )}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-gray-500" 
                          onClick={() => handleViewDetails(item.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600"
                          onClick={() => handleEdit(item.id)} // LINKED EDIT HANDLER
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                          onClick={() => handleDeleteOne(item)}
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

          {!loading && totalPages > 1 && (
            <div className="mt-4">
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- DRAWERS & MODALS --- */}
      
      {/* View Profile */}
      <SupervisorDetailsDrawer 
        open={isDetailsDrawerOpen} 
        onOpenChange={setIsDetailsDrawerOpen} 
        supervisorId={selectedSupervisorId?.toString() || null} 
      />

      {/* Edit Supervisor */}
      <EditSupervisorDrawer 
        isOpen={isEditDrawerOpen} 
        onClose={() => setIsEditDrawerOpen(false)} 
        onRefresh={fetchSupervisors} 
        supervisorId={selectedSupervisorId?.toString() || null} 
      />

      {/* Add Supervisor */}
      <AddSupervisorDrawer 
        isOpen={isAddDrawerOpen} 
        onClose={() => setIsAddDrawerOpen(false)} 
        onRefresh={fetchSupervisors} 
      />

      {/* Import Modal */}
      <ImportSupervisorsModal 
        open={isImportModalOpen} 
        onOpenChange={setIsImportModalOpen} 
        onSuccess={fetchSupervisors} 
      />
    </div>
  );
};

export default SupervisorsManagementPage;