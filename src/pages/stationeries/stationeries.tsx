"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, ArrowUpDown, Eye, Settings, Calculator, FileText, GitBranch, Users, Box, DollarSign, Tags } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Stationery } from "@/types/stationeries";
import StationeryForm, { StationeryFormValues } from "@/components/stationeries/StationeryForm";
import { useNavigate } from 'react-router-dom';
import ReoDeoExtraModal from "@/components/stationeries/ReoDeoExtraModal";
import BoxLimitsModal from "@/components/stationeries/BoxLimitsModal";
import CenterMultipliersModal from "@/components/stationeries/CenterMultipliersModal";
import SubjectMultipliersModal from "@/components/settings/SubjectMultiplierModal";
import Spinner from "@/components/Spinner"; // Import Spinner component

const StationeriesPage = () => {
  const [stationeries, setStationeries] = useState<Stationery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStationery, setEditingStationery] = useState<StationeryFormValues | undefined>(undefined);
  
  // New Modal States
  const [isReoDeoModalOpen, setIsReoDeoModalOpen] = useState(false);
  const [isBoxLimitsModalOpen, setIsBoxLimitsModalOpen] = useState(false);
  const [isCenterMultipliersModalOpen, setIsCenterMultipliersModalOpen] = useState(false);
  const [isSubjectMultipliersModalOpen, setIsSubjectMultipliersModalOpen] = useState(false);
  const [selectedStationery, setSelectedStationery] = useState<Stationery | null>(null);

  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof Stationery>('created_at');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const navigate = useNavigate();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    document.title = "Stationeries | NEAS";
  }, []);

  const fetchStationeries = async () => {
    setLoading(true);
    // Fetch stationeries and join with mastersummaries and profiles
    const { data, error } = await supabase
      .from('stationeries')
      .select('*, mastersummaries(Examination, Code, Year), profiles(email)')
      .order('created_at', { ascending: false });

    if (error) {
      showError(error.message);
    } else {
      const formattedStationeries: Stationery[] = data.map((s: any) => ({
        ...s,
        examination_name: s.mastersummaries?.Examination || 'N/A',
        examination_code: s.mastersummaries?.Code || 'N/A',
        examination_year: s.mastersummaries?.Year || 'N/A',
        user_email: s.profiles?.email || 'N/A',
      }));
      setStationeries(formattedStationeries);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStationeries();
  }, []);

  const handleAddStationery = () => {
    setEditingStationery(undefined);
    setIsFormOpen(true);
  };

  const handleDeleteStationery = async (stationeryId: number, title: string) => {
    showStyledSwal({
      title: 'Are you sure?',
      html: `You are about to delete stationery entry <b>${title}</b>. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel!',
      reverseButtons: true,
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        const { error } = await supabase
          .from('stationeries')
          .delete()
          .eq('id', stationeryId);

        if (error) {
          showError(error.message);
        } else {
          showSuccess(`Stationery entry ${title} deleted successfully.`);
          fetchStationeries();
        }
        setLoading(false);
      }
    });
  };

  const handleAction = (action: string, stationery: Stationery) => {
    setSelectedStationery(stationery);
    switch (action) {
      case 'view':
        showError("Viewing details feature is not yet implemented.");
        break;
      case 'reo_deo_extra':
        setIsReoDeoModalOpen(true);
        break;
      case 'box_limits':
        setIsBoxLimitsModalOpen(true);
        break;
      case 'center_multipliers':
        setIsCenterMultipliersModalOpen(true);
        break;
      case 'subject_multipliers':
        // This action is removed from the UI but kept in the switch for safety if called elsewhere
        setIsSubjectMultipliersModalOpen(true);
        break;
      case 'reports':
        if (stationery.mid) {
          navigate(`/dashboard/stationeries/${stationery.mid}/reports`);
        } else {
          showError("Master Summary ID is missing for report generation.");
        }
        break;
      case 'labels': // New action
        if (stationery.mid) {
          navigate(`/dashboard/mastersummaries/${stationery.mid}/labels`);
        } else {
          showError("Master Summary ID is missing for label management.");
        }
        break;
      case 'summary':
        if (stationery.id) {
          navigate(`/dashboard/stationeries/${stationery.id}/summary`);
        } else {
          showError("Stationery ID is missing for summary view.");
        }
        break;
      default:
        break;
    }
  };

  const handleSort = (columnId: keyof Stationery) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
    setCurrentPage(1);
  };

  const filteredAndSortedStationeries = useMemo(() => {
    let currentStationeries = [...stationeries];

    // Filter
    if (search) {
      currentStationeries = currentStationeries.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.examination_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.examination_code?.toLowerCase().includes(search.toLowerCase()) ||
        s.examination_year?.toString().includes(search.toLowerCase()) ||
        s.status.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort
    currentStationeries.sort((a, b) => {
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

    return currentStationeries;
  }, [stationeries, search, orderBy, order]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedStationeries.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStationeries = filteredAndSortedStationeries.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Finalized':
        return 'default';
      case 'Draft':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="relative min-h-[600px]"> {/* Added relative and min-h */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
          <Spinner label="Loading stationeries..." size="lg" />
        </div>
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Stationeries Management</CardTitle>
        <Button size="sm" className="h-8 gap-1" onClick={handleAddStationery} disabled={loading}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add Stationery</span>
        </Button>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4">
          
        </CardDescription>

        <div className="mb-4 flex justify-between items-center flex-wrap gap-2">
          <Input
            type="text"
            placeholder="Search stationeries..."
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
                    onClick={() => handleSort('examination_name')}
                    className="px-0 hover:bg-transparent"
                  >
                    Examination
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'examination_name' ? 'opacity-100' : 'opacity-50')} />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('examination_year')}
                    className="px-0 hover:bg-transparent"
                  >
                    Year
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'examination_year' ? 'opacity-100' : 'opacity-50')} />
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
              {currentStationeries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No stationery entries found.
                  </TableCell>
                </TableRow>
              ) : (
                currentStationeries.map((stationery) => (
                  <TableRow key={stationery.id}>
                    <TableCell className="font-medium">
                      {stationery.examination_name}
                    </TableCell>
                    <TableCell>{stationery.examination_year}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(stationery.status)}>{stationery.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleAction('summary', stationery)} title="View Summary">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleAction('reo_deo_extra', stationery)} title="REO/DEO Extra Settings">
                          <Users className="h-4 w-4" />
                        </Button>                           
                        <Button variant="outline" size="sm" onClick={() => handleAction('center_multipliers', stationery)} title="Center Multipliers">
                          <Calculator className="h-4 w-4" />
                        </Button>
                        
                        <Button variant="outline" size="sm" onClick={() => handleAction('labels', stationery)} title="Labels Management">
                          <Tags className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleAction('reports', stationery)} title="Reports">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteStationery(stationery.id, stationery.title)} title="Delete Entry">
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
      <StationeryForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        stationery={editingStationery}
        onSuccess={fetchStationeries}
      />
      <ReoDeoExtraModal
        open={isReoDeoModalOpen}
        onOpenChange={setIsReoDeoModalOpen}
        stationery={selectedStationery}
        onSuccess={fetchStationeries}
      />
      <BoxLimitsModal
        open={isBoxLimitsModalOpen}
        onOpenChange={setIsBoxLimitsModalOpen}
        stationery={selectedStationery}
        onSuccess={fetchStationeries}
      />
      <CenterMultipliersModal
        open={isCenterMultipliersModalOpen}
        onOpenChange={setIsCenterMultipliersModalOpen}
        stationery={selectedStationery}
        onSuccess={fetchStationeries}
      />
      <SubjectMultipliersModal
        open={isSubjectMultipliersModalOpen}
        onOpenChange={setIsSubjectMultipliersModalOpen}
        stationery={selectedStationery}
        onSuccess={fetchStationeries}
      />
    </Card>
  );
};

export default StationeriesPage;