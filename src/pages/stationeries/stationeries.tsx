"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Trash2, 
  ArrowUpDown, 
  Eye, 
  Users, 
  Calculator, 
  FileText, 
  Tags,
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
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";
import StationeryFormDrawer, { StationeryFormValues } from "@/components/stationeries/StationeryFormDrawer";
import ReoDeoExtraDrawer from "@/components/stationeries/ReoDeoExtraDrawer";
import CenterMultipliersDrawer from "@/components/stationeries/CenterMultipliersDrawer";
import { Stationery } from "@/types/stationeries";

const StationeriesPage = () => {
  const [stationeries, setStationeries] = useState<Stationery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStationery, setEditingStationery] = useState<StationeryFormValues | undefined>(undefined);
  
  const [isReoDeoDrawerOpen, setIsReoDeoDrawerOpen] = useState(false);
  const [isCenterMultipliersDrawerOpen, setIsCenterMultipliersDrawerOpen] = useState(false);
  const [selectedStationery, setSelectedStationery] = useState<Stationery | null>(null);

  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof Stationery>('created_at');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [deleteConfig, setDeleteConfig] = useState<{
    open: boolean;
    id: number | null;
    title: string;
  }>({
    open: false,
    id: null,
    title: '',
  });

  const fetchStationeries = async () => {
    setLoading(true);
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
    document.title = "Stationeries | NEAS";
    fetchStationeries();
  }, []);

  const handleSort = (columnId: keyof Stationery) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
    setCurrentPage(1);
  };

  const filteredStationeries = useMemo(() => {
    if (!search.trim()) return stationeries;
    const term = search.toLowerCase();
    return stationeries.filter(s =>
      s.title.toLowerCase().includes(term) ||
      s.examination_name?.toLowerCase().includes(term) ||
      s.examination_code?.toLowerCase().includes(term) ||
      s.examination_year?.toString().includes(term)
    );
  }, [stationeries, search]);

  const totalPages = Math.ceil(filteredStationeries.length / itemsPerPage);
  const currentItems = filteredStationeries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const confirmDelete = async () => {
    if (!deleteConfig.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('stationeries').delete().eq('id', deleteConfig.id);
      if (error) throw error;
      showSuccess("Stationery entry deleted successfully");
      fetchStationeries();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
      setDeleteConfig({ open: false, id: null, title: '' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-medium px-2 py-0 h-5">DRAFT</Badge>;
      case 'Finalized':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-medium px-2 py-0 h-5">FINALIZED</Badge>;
      default:
        return <Badge variant="outline" className="font-medium px-2 py-0 h-5">{status}</Badge>;
    }
  };

  return (
    <Card className="relative min-h-[600px]">
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-lg">
          <Spinner label="Loading stationeries..." size="lg" />
        </div>
      )}

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Stationeries</CardTitle>
        <Button size="sm" className="h-8 gap-1" onClick={() => { setEditingStationery(undefined); setIsFormOpen(true); }} disabled={loading}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add Stationery</span>
        </Button>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <Input
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
                <TableHead className="w-[60px]">S/N</TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('examination_name')} className="px-0 hover:bg-transparent">
                    Examination
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'examination_name' ? 'opacity-100' : 'opacity-50')} />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('examination_year')} className="px-0 hover:bg-transparent">
                    Year
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'examination_year' ? 'opacity-100' : 'opacity-50')} />
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No stationery records found.
                  </TableCell>
                </TableRow>
              ) : (
                currentItems.map((s, index) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs font-medium text-slate-400">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{s.examination_name}</TableCell>
                    <TableCell>{s.examination_year}</TableCell>
                    <TableCell>{getStatusBadge(s.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(s.created_at), 'PPP')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="View Summary" onClick={() => navigate(`/dashboard/stationeries/summary/${s.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="REO/DEO Extra" onClick={() => { setSelectedStationery(s); setIsReoDeoDrawerOpen(true); }}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          title="Center Multipliers" onClick={() => { setSelectedStationery(s); setIsCenterMultipliersDrawerOpen(true); }}
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="Labels Management" onClick={() => navigate(`/dashboard/mastersummaries/${s.mid}/labels`)}
                        >
                          <Tags className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          title="Reports" onClick={() => navigate(`/dashboard/stationeries/reports/${s.mid}`)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-red-700 hover:bg-red-50"
                          title="Delete" onClick={() => setDeleteConfig({ open: true, id: s.id, title: s.title })}
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
            onPageChange={setCurrentPage}
          />
        )}
      </CardContent>

      <StationeryFormDrawer
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        stationery={editingStationery}
        onSuccess={fetchStationeries}
      />

      <ReoDeoExtraDrawer
        open={isReoDeoDrawerOpen}
        onOpenChange={setIsReoDeoDrawerOpen}
        stationery={selectedStationery}
        onSuccess={fetchStationeries}
      />

      <CenterMultipliersDrawer
        open={isCenterMultipliersDrawerOpen}
        onOpenChange={setIsCenterMultipliersDrawerOpen}
        stationery={selectedStationery}
        onSuccess={fetchStationeries}
      />

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
              Delete stationery entry <span className="font-bold text-red-700">"{deleteConfig.title}"</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row items-center gap-3 mt-8">
            <AlertDialogCancel className="flex-1 h-11 font-bold uppercase text-xs tracking-wider rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loading}
              className="flex-[1.5] h-11 font-black uppercase text-xs tracking-wider rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default StationeriesPage;