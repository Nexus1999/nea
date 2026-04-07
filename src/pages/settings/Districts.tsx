"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, Edit, Trash2, ArrowUpDown, Eye, Map, AlertTriangle 
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import PaginationControls from "@/components/ui/pagination-controls";
import { AddDistrictDrawer, EditDistrictDrawer } from "@/components/settings/DistrictDrawers";

interface District {
  id: number;
  region_number: number;
  district_number: number;
  district_name: string;
  full_form?: string;
  created_at: string;
  regions?: {
    region_name: string;     // ← Important: Use region_name
  };
}

const Districts = () => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);

  const [viewingDistrict, setViewingDistrict] = useState<District | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [districtToDelete, setDistrictToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<keyof District>('district_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    document.title = "Settings - Districts | NEAS";
    fetchRegions();
    fetchDistricts();
  }, []);

  const fetchRegions = async () => {
    const { data } = await supabase
      .from('regions')
      .select('region_code, region_name')
      .order('region_name');
    setRegions(data || []);
  };

  const fetchDistricts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('districts')
        .select(`
          *,
          regions!region_number (region_name)
        `)
        .order('district_name', { ascending: true });

      if (error) throw error;
      setDistricts(data || []);
    } catch (err: any) {
      console.error(err);
      showError(`Failed to load districts: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewClick = (district: District) => {
    setViewingDistrict(district);
    setIsViewOpen(true);
  };

  const handleEditClick = (district: District) => {
    setEditingDistrict(district);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (id: number, name: string) => {
    setDistrictToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!districtToDelete) return;
    setDeleteLoading(true);

    try {
      const { error } = await supabase
        .from('districts')
        .delete()
        .eq('id', districtToDelete.id);

      if (error) throw error;

      showSuccess(`District "${districtToDelete.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setDistrictToDelete(null);
      await fetchDistricts();
    } catch (err: any) {
      showError(err.message || "Failed to delete district");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSort = (columnId: keyof District) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
    setCurrentPage(1);
  };

  const filteredAndSortedDistricts = useMemo(() => {
    let list = [...districts];
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(d =>
        d.district_name?.toLowerCase().includes(term) ||
        d.district_number?.toString().includes(term) ||
        d.regions?.region_name?.toLowerCase().includes(term)
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
  }, [districts, search, orderBy, order]);

  const totalPages = Math.ceil(filteredAndSortedDistricts.length / itemsPerPage);
  const currentDistricts = filteredAndSortedDistricts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="">
      <Card className="w-full relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-lg">
            <Spinner label="Loading districts..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Map className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Districts</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Manage local administrative districts</p>
            </div>
          </div>

          <Button 
            size="sm" 
            className="bg-black hover:bg-black/90 text-white gap-2"
            onClick={() => setIsAddOpen(true)}
            disabled={loading}
          >
            <PlusCircle className="h-4 w-4" />
            Add District
          </Button>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Search districts, numbers or regions..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="max-w-md"
              disabled={loading}
            />
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[50px]">SN</TableHead>
                  <TableHead onClick={() => handleSort('district_name')} className="cursor-pointer">
                    District Name <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead>Parent Region</TableHead>
                  <TableHead onClick={() => handleSort('district_number')} className="cursor-pointer">
                    District No. <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentDistricts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No districts found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentDistricts.map((district, idx) => (
                    <TableRow key={district.id}>
                      <TableCell className="text-muted-foreground">
                        {((currentPage - 1) * itemsPerPage) + idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">{district.district_name}</TableCell>
                      <TableCell>
                        <div className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                          {district.regions?.region_name || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-slate-100 px-3 py-1 rounded text-sm font-semibold text-slate-600">
                          {district.district_number}
                        </code>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleViewClick(district)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => handleEditClick(district)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDeleteClick(district.id, district.district_name)} disabled={deleteLoading}>
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

      <AddDistrictDrawer 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        regions={regions}
        onSuccess={fetchDistricts} 
      />

      <EditDistrictDrawer 
        district={editingDistrict} 
        open={isEditOpen} 
        onOpenChange={(open) => { 
          setIsEditOpen(open); 
          if (!open) setEditingDistrict(null); 
        }} 
        regions={regions}
        onSuccess={fetchDistricts} 
      />

      {/* View Drawer */}
      <Drawer open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-center border-b pb-6">
            <DrawerTitle className="text-3xl font-bold">{viewingDistrict?.district_name}</DrawerTitle>
            <DrawerDescription>District No: {viewingDistrict?.district_number}</DrawerDescription>
          </DrawerHeader>
          <div className="p-8 space-y-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Parent Region</p>
              <p className="text-2xl font-semibold text-blue-700">
                {viewingDistrict?.regions?.region_name || 'Unassigned'}
              </p>
            </div>
            {viewingDistrict?.full_form && (
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Full Form</p>
                <p className="text-lg font-medium">{viewingDistrict.full_form}</p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

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
              You are about to permanently delete <br />
              <strong>{districtToDelete?.name}</strong>.
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
              {deleteLoading ? "Deleting..." : "Delete District"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Districts;