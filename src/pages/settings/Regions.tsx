"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, ArrowUpDown, Globe, Search, MapPin } from "lucide-react";
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
import RegionForm, { RegionFormValues } from "@/components/settings/RegionForm";
import { showStyledSwal } from '@/utils/alerts';
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";

interface Region {
  id: number;
  region_name: string;
  region_code: number;
  created_at: string;
}

const Regions = () => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<RegionFormValues | undefined>(undefined);
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
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRegion = () => {
    setEditingRegion(undefined);
    setIsFormOpen(true);
  };

  const handleEditRegion = (region: Region) => {
    setEditingRegion(region);
    setIsFormOpen(true);
  };

  const handleDeleteRegion = async (id: number, name: string) => {
    const result = await showStyledSwal({
      title: 'Delete Region?',
      html: `Are you sure you want to delete <b>${name}</b>? This may affect associated districts and schools.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('regions')
          .delete()
          .eq('id', id);

        if (error) throw error;
        showSuccess(`Region ${name} deleted successfully.`);
        fetchRegions();
      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
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

    if (search) {
      const term = search.toLowerCase();
      list = list.filter(r =>
        r.region_name.toLowerCase().includes(term) ||
        r.region_code.toString().includes(term)
      );
    }

    list.sort((a, b) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return list;
  }, [regions, search, orderBy, order]);

  const totalPages = Math.ceil(filteredAndSortedRegions.length / itemsPerPage);
  const currentItems = filteredAndSortedRegions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Regions</h2>
          <p className="text-muted-foreground mt-1">Manage administrative regions and their codes.</p>
        </div>
        <Button onClick={handleAddRegion} className="bg-black hover:bg-gray-800 text-white gap-2 h-11 rounded-xl px-6">
          <PlusCircle className="h-4 w-4" />
          Add New Region
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden rounded-[1.5rem]">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search regions by name or code..." 
              className="pl-10 h-11 rounded-xl border-slate-200 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && regions.length === 0 ? (
            <div className="py-20 flex justify-center">
              <Spinner label="Loading regions..." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-[10px] uppercase tracking-widest px-6">SN</TableHead>
                    <TableHead onClick={() => handleSort('region_name')} className="cursor-pointer font-bold text-[10px] uppercase tracking-widest">
                      Region Name <ArrowUpDown className="ml-2 h-3 w-3 inline opacity-50" />
                    </TableHead>
                    <TableHead onClick={() => handleSort('region_code')} className="cursor-pointer font-bold text-[10px] uppercase tracking-widest">
                      Region Code <ArrowUpDown className="ml-2 h-3 w-3 inline opacity-50" />
                    </TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20 text-slate-400 font-medium">
                        No regions found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentItems.map((region, index) => (
                      <TableRow key={region.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                        <TableCell className="px-6 text-slate-400 font-mono text-xs">
                          {((currentPage - 1) * itemsPerPage) + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                              <Globe className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-slate-900 uppercase">{region.region_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-mono px-3 py-1 rounded-lg border-none">
                            {region.region_code.toString().padStart(2, '0')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-lg"
                              onClick={() => handleEditRegion(region)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-red-600 hover:bg-red-50 rounded-lg"
                              onClick={() => handleDeleteRegion(region.id, region.region_name)}
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
          )}
        </CardContent>
      </Card>

      {!loading && totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <RegionForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        region={editingRegion}
        onSuccess={fetchRegions}
      />
    </div>
  );
};

export default Regions;