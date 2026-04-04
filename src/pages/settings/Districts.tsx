"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Loader2, ArrowUpDown, MapPin, Search, Filter, Globe } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import DistrictForm, { DistrictFormValues } from "@/components/settings/DistrictForm";
import { showStyledSwal } from '@/utils/alerts';
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";

interface District {
  id: number;
  district_name: string;
  district_number: number;
  region_number: number;
  created_at: string;
  regions?: { region_name: string };
}

interface RegionOption {
  region_code: number;
  region_name: string;
}

const Districts = () => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<DistrictFormValues | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [orderBy, setOrderBy] = useState<keyof District>('district_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    document.title = "Settings - Districts | NEAS";
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [districtsRes, regionsRes] = await Promise.all([
        supabase.from('districts').select('*, regions(region_name)').order('district_name', { ascending: true }),
        supabase.from('regions').select('region_code, region_name').order('region_name', { ascending: true })
      ]);

      if (districtsRes.error) throw districtsRes.error;
      if (regionsRes.error) throw regionsRes.error;

      setDistricts(districtsRes.data || []);
      setRegions(regionsRes.data || []);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDistrict = () => {
    setEditingDistrict(undefined);
    setIsFormOpen(true);
  };

  const handleEditDistrict = (district: District) => {
    setEditingDistrict({
      id: district.id,
      district_name: district.district_name,
      district_number: district.district_number,
      region_number: district.region_number,
    });
    setIsFormOpen(true);
  };

  const handleDeleteDistrict = async (id: number, name: string) => {
    const result = await showStyledSwal({
      title: 'Delete District?',
      html: `Are you sure you want to delete <b>${name}</b>? This action cannot be undone.`,
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
          .from('districts')
          .delete()
          .eq('id', id);

        if (error) throw error;
        showSuccess(`District ${name} deleted successfully.`);
        fetchInitialData();
      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
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

    if (regionFilter !== 'all') {
      list = list.filter(d => d.region_number.toString() === regionFilter);
    }

    if (search) {
      const term = search.toLowerCase();
      list = list.filter(d =>
        d.district_name.toLowerCase().includes(term) ||
        d.district_number.toString().includes(term) ||
        d.regions?.region_name.toLowerCase().includes(term)
      );
    }

    list.sort((a, b) => {
      let aVal: any = a[orderBy];
      let bVal: any = b[orderBy];

      if (orderBy === 'regions') {
        aVal = a.regions?.region_name || '';
        bVal = b.regions?.region_name || '';
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return list;
  }, [districts, search, regionFilter, orderBy, order]);

  const totalPages = Math.ceil(filteredAndSortedDistricts.length / itemsPerPage);
  const currentItems = filteredAndSortedDistricts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Districts</h2>
          <p className="text-muted-foreground mt-1">Manage administrative districts and their parent regions.</p>
        </div>
        <Button onClick={handleAddDistrict} className="bg-black hover:bg-gray-800 text-white gap-2 h-11 rounded-xl px-6">
          <PlusCircle className="h-4 w-4" />
          Add New District
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden rounded-[1.5rem]">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search districts..." 
                className="pl-10 h-11 rounded-xl border-slate-200 bg-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[200px] h-11 rounded-xl border-slate-200 bg-white">
                  <SelectValue placeholder="Filter by Region" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map(r => (
                    <SelectItem key={r.region_code} value={r.region_code.toString()}>
                      {r.region_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && districts.length === 0 ? (
            <div className="py-20 flex justify-center">
              <Spinner label="Loading districts..." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-[10px] uppercase tracking-widest px-6">SN</TableHead>
                    <TableHead onClick={() => handleSort('regions' as any)} className="cursor-pointer font-bold text-[10px] uppercase tracking-widest">
                      Region <ArrowUpDown className="ml-2 h-3 w-3 inline opacity-50" />
                    </TableHead>
                    <TableHead onClick={() => handleSort('district_name')} className="cursor-pointer font-bold text-[10px] uppercase tracking-widest">
                      District Name <ArrowUpDown className="ml-2 h-3 w-3 inline opacity-50" />
                    </TableHead>
                    <TableHead onClick={() => handleSort('district_number')} className="cursor-pointer font-bold text-[10px] uppercase tracking-widest">
                      District Code <ArrowUpDown className="ml-2 h-3 w-3 inline opacity-50" />
                    </TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium">
                        No districts found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentItems.map((district, index) => (
                      <TableRow key={district.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                        <TableCell className="px-6 text-slate-400 font-mono text-xs">
                          {((currentPage - 1) * itemsPerPage) + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3 text-slate-400" />
                            <span className="text-sm font-medium text-slate-600 uppercase">{district.regions?.region_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-slate-900 uppercase">{district.district_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-mono px-3 py-1 rounded-lg border-none">
                            {district.district_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-lg"
                              onClick={() => handleEditDistrict(district)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-red-600 hover:bg-red-50 rounded-lg"
                              onClick={() => handleDeleteDistrict(district.id, district.district_name)}
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

      <DistrictForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        district={editingDistrict}
        onSuccess={fetchInitialData}
      />
    </div>
  );
};

export default Districts;