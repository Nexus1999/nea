"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, Edit, Trash2, Map, Search, Mail, Phone, Globe
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { showStyledSwal } from '@/utils/alerts';
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";
import { AddRegionDrawer, EditRegionDrawer } from "@/components/settings/RegionDrawers";
import { logDataChange } from "@/utils/auditLogger";

const RegionsPage = () => {
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<any>(null);

  useEffect(() => {
    document.title = "Regions Management | NEAS";
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('regions').select('*').order('region_name');
    if (error) showError(error.message);
    else setRegions(data || []);
    setLoading(false);
  };

  const handleDelete = async (region: any) => {
    showStyledSwal({
      title: 'Delete Region?',
      html: `Are you sure you want to delete <b>${region.region_name}</b>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { error } = await supabase.from('regions').delete().eq('id', region.id);
        if (error) showError(error.message);
        else {
          await logDataChange({
            table_name: 'regions',
            record_id: region.id,
            action_type: 'DELETE',
            old_data: region
          });
          showSuccess("Region deleted successfully");
          fetchRegions();
        }
      }
    });
  };

  const filteredData = useMemo(() => {
    return regions.filter(r => 
      r.region_name.toLowerCase().includes(search.toLowerCase()) ||
      r.region_code.toString().includes(search) ||
      r.reo?.toLowerCase().includes(search.toLowerCase())
    );
  }, [regions, search]);

  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  return (
    <div className="p-6 space-y-4">
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b p-6 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Regions</CardTitle>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Geographic Administrative Units</p>
            </div>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl">
            <PlusCircle className="h-4 w-4 mr-2" /> Add New Region
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search regions..." 
              className="pl-10 h-11 border-slate-200 rounded-xl focus:ring-slate-100"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 px-6">Code</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Region Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">REO Details</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Location</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="h-40 text-center"><Spinner /></TableCell></TableRow>
                ) : paginatedData.map((region) => (
                  <TableRow key={region.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-6 font-mono text-xs font-bold text-slate-400">{region.region_code}</TableCell>
                    <TableCell className="font-black text-slate-900 uppercase tracking-tight">{region.region_name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-700">{region.reo || 'N/A'}</p>
                        <div className="flex gap-3">
                          {region.reo_email && <span className="flex items-center gap-1 text-[10px] text-slate-400"><Mail className="h-3 w-3" /> {region.reo_email}</span>}
                          {region.reo_phone && <span className="flex items-center gap-1 text-[10px] text-slate-400"><Phone className="h-3 w-3" /> {region.reo_phone}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-medium">{region.town}, {region.postal_address}</TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-blue-50 hover:text-blue-600" onClick={() => { setSelectedRegion(region); setIsEditOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(region)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-6 flex justify-center">
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </CardContent>
      </Card>

      <AddRegionDrawer open={isAddOpen} onOpenChange={setIsAddOpen} onSuccess={fetchRegions} />
      <EditRegionDrawer open={isEditOpen} onOpenChange={setIsEditOpen} region={selectedRegion} onSuccess={fetchRegions} />
    </div>
  );
};

export default RegionsPage;