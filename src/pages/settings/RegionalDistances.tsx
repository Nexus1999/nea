"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, Edit, Trash2, ArrowUpDown, Navigation, AlertTriangle, Search, ArrowRight
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
import Spinner from "@/components/Spinner";
import PaginationControls from "@/components/ui/pagination-controls";
import RegionalDistanceForm, { DistanceFormValues } from "@/components/settings/RegionalDistanceForm";
import { cn } from "@/lib/utils";

interface RegionalDistance {
  id: number;
  from_region_name: string;
  to_region_name: string;
  distance_km: number;
  via?: string;
  created_at: string;
}

const RegionalDistances = () => {
  const [distances, setDistances] = useState<RegionalDistance[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDistance, setEditingDistance] = useState<DistanceFormValues | undefined>(undefined);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [distanceToDelete, setDistanceToDelete] = useState<{ id: number; label: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof RegionalDistance>('from_region_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    document.title = "Settings - Regional Distances | NEAS";
    fetchDistances();
  }, []);

  const fetchDistances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('region_distances')
        .select('*')
        .order('from_region_name', { ascending: true });

      if (error) throw error;
      setDistances(data || []);
    } catch (err: any) {
      showError(`Failed to load distances: ${err.message}`);
      setDistances([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingDistance(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (distance: RegionalDistance) => {
    setEditingDistance({
      id: distance.id,
      from_region_name: distance.from_region_name,
      to_region_name: distance.to_region_name,
      distance_km: distance.distance_km,
      via: distance.via,
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: number, from: string, to: string) => {
    setDistanceToDelete({ id, label: `${from} to ${to}` });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!distanceToDelete) return;
    setDeleteLoading(true);

    try {
      const { error } = await supabase
        .from('region_distances')
        .delete()
        .eq('id', distanceToDelete.id);

      if (error) throw error;

      showSuccess(`Distance record deleted successfully`);
      setDeleteDialogOpen(false);
      setDistanceToDelete(null);
      await fetchDistances();
    } catch (err: any) {
      showError(err.message || "Failed to delete distance record");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSort = (columnId: keyof RegionalDistance) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
    setCurrentPage(1);
  };

  const filteredAndSortedDistricts = useMemo(() => {
    let list = [...distances];
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(d =>
        d.from_region_name.toLowerCase().includes(term) ||
        d.to_region_name.toLowerCase().includes(term) ||
        d.via?.toLowerCase().includes(term)
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
  }, [distances, search, orderBy, order]);

  const totalPages = Math.ceil(filteredAndSortedDistricts.length / itemsPerPage);
  const currentDistances = filteredAndSortedDistricts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="">
      <Card className="w-full relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-lg">
            <Spinner label="Loading distances..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Navigation className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Regional Distances</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Manage inter-region travel distances</p>
            </div>
          </div>

          <Button 
            size="sm" 
            className="bg-black hover:bg-black/90 text-white gap-2"
            onClick={handleAddClick}
            disabled={loading}
          >
            <PlusCircle className="h-4 w-4" />
            Add Distance
          </Button>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by region or transit route..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[50px]">SN</TableHead>
                  <TableHead onClick={() => handleSort('from_region_name')} className="cursor-pointer">
                    From <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead onClick={() => handleSort('to_region_name')} className="cursor-pointer">
                    To <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead>Transit (Via)</TableHead>
                  <TableHead onClick={() => handleSort('distance_km')} className="cursor-pointer text-center">
                    Distance (KM) <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentDistances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No distance records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentDistances.map((dist, idx) => (
                    <TableRow key={dist.id}>
                      <TableCell className="text-muted-foreground">
                        {((currentPage - 1) * itemsPerPage) + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">{dist.from_region_name}</TableCell>
                      <TableCell className="font-medium">{dist.to_region_name}</TableCell>
                      <TableCell>
                        {dist.via ? (
                          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full w-fit">
                            <span>{dist.from_region_name}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{dist.via}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{dist.to_region_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Direct Route</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <code className="bg-slate-100 px-3 py-1 rounded text-sm font-black text-slate-700">
                          {dist.distance_km} KM
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => handleEditClick(dist)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDeleteClick(dist.id, dist.from_region_name, dist.to_region_name)} disabled={deleteLoading}>
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
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </CardContent>
      </Card>

      <RegionalDistanceForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        distance={editingDistance}
        onSuccess={fetchDistances} 
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => !deleteLoading && setDeleteDialogOpen(open)}>
        <AlertDialogContent className="max-w-[420px] rounded-2xl border border-slate-200 shadow-2xl p-6">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-slate-900">
                Confirm Deletion
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
              You are about to permanently delete the distance record for <br />
              <strong>{distanceToDelete?.label}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex gap-3 mt-6">
            <AlertDialogCancel disabled={deleteLoading} className="flex-1 h-11 font-bold uppercase text-[10px] tracking-widest rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="flex-[1.5] h-11 font-black uppercase text-[10px] tracking-widest text-white bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {deleteLoading ? "Deleting..." : "Delete Record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RegionalDistances;