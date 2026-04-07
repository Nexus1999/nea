"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, Edit, Trash2, ArrowUpDown, Eye, Globe, AlertTriangle 
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
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination-controls";
import { AddRegionDrawer, EditRegionDrawer } from "@/components/settings/RegionDrawers";

interface Region {
  id: number;
  region_code: number;
  region_name: string;
  postal_address?: string;
  town?: string;
  reo?: string;
  reo_email?: string;
  reo_phone?: string;
  created_at: string;
}

const Regions = () => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [regionToDelete, setRegionToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof Region>('region_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    document.title = "Settings - Regions | NEAS";
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('region_name', { ascending: true });

      if (error) throw error;
      setRegions(data || []);
    } catch (err: any) {
      showError(`Failed to load regions: ${err.message}`);
      setRegions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (region: Region) => {
    setEditingRegion(region);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (id: number, name: string) => {
    setRegionToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!regionToDelete) return;
    setDeleteLoading(true);

    try {
      const { error } = await supabase
        .from('regions')
        .delete()
        .eq('id', regionToDelete.id);

      if (error) throw error;

      showSuccess(`Region "${regionToDelete.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setRegionToDelete(null);
      await fetchRegions();
    } catch (err: any) {
      showError(err.message || "Failed to delete region");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSort = (columnId: keyof Region) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
    setCurrentPage(1);
  };

  const filteredAndSortedRegions = useMemo(() => {
    let list = [...regions];

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(r =>
        r.region_name?.toLowerCase().includes(term) ||
        r.region_code?.toString().includes(term) ||
        r.town?.toLowerCase().includes(term) ||
        r.reo?.toLowerCase().includes(term) ||
        r.reo_email?.toLowerCase().includes(term)
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
  }, [regions, search, orderBy, order]);

  const totalPages = Math.ceil(filteredAndSortedRegions.length / itemsPerPage);
  const currentRegions = filteredAndSortedRegions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="">
      <Card className="w-full relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-lg">
            <Spinner label="Loading regions..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Administrative Regions</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Manage high-level geographical divisions</p>
            </div>
          </div>

          <Button 
            size="sm" 
            className="bg-black hover:bg-black/90 text-white gap-2"
            onClick={() => setIsAddOpen(true)}
            disabled={loading}
          >
            <PlusCircle className="h-4 w-4" />
            Add Region
          </Button>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Search by region name, code, town or REO..."
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
                  <TableHead onClick={() => handleSort('region_code')} className="cursor-pointer">
                    Code <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead onClick={() => handleSort('region_name')} className="cursor-pointer">
                    Region Name <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead>Town</TableHead>
                  <TableHead>REO Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentRegions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No regions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentRegions.map((region, idx) => (
                    <TableRow key={region.id}>
                      <TableCell className="text-muted-foreground">
                        {((currentPage - 1) * itemsPerPage) + idx + 1}
                      </TableCell>
                      <TableCell className="font-semibold">{region.region_code}</TableCell>
                      <TableCell className="font-medium">{region.region_name}</TableCell>
                      <TableCell>{region.town || '—'}</TableCell>

                      {/* REO Details as Chips/Pills */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {region.reo && (
                            <div className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">
                              {region.reo}
                            </div>
                          )}
                          {region.reo_phone && (
                            <div className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium">
                              📞 {region.reo_phone}
                            </div>
                          )}
                          {region.reo_email && (
                            <div className="bg-purple-50 text-purple-700 text-xs px-2.5 py-1 rounded-full font-medium">
                              ✉️ {region.reo_email}
                            </div>
                          )}
                          {!region.reo && !region.reo_phone && !region.reo_email && (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            title="Edit Region"
                            onClick={() => handleEditClick(region)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Region"
                            onClick={() => handleDeleteClick(region.id, region.region_name)}
                            disabled={deleteLoading}
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

      {/* Add Drawer */}
      <AddRegionDrawer 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        onSuccess={fetchRegions} 
      />

      {/* Edit Drawer */}
      <EditRegionDrawer 
        region={editingRegion} 
        open={isEditOpen} 
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingRegion(null);
        }} 
        onSuccess={fetchRegions} 
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!deleteLoading) setDeleteDialogOpen(open);
      }}>
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
              You are about to permanently delete <br />
              <strong>{regionToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-row items-center gap-3 mt-6">
            <AlertDialogCancel 
              disabled={deleteLoading}
              className="flex-1 h-11 font-bold uppercase text-[10px] tracking-widest rounded-xl"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="flex-[1.5] h-11 font-black uppercase text-[10px] tracking-widest text-white bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {deleteLoading ? "Deleting..." : "Delete Region"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Regions;