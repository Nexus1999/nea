"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, Edit, Trash2, MapPin, Search, Layers
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
import { AddDistrictDrawer, EditDistrictDrawer } from "@/components/settings/DistrictDrawers";
import { logDataChange } from "@/utils/auditLogger";

const DistrictsPage = () => {
  const [districts, setDistricts] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<any>(null);

  useEffect(() => {
    document.title = "Districts Management | NEAS";
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: regData } = await supabase.from('regions').select('region_code, region_name');
    const { data: distData, error } = await supabase.from('districts').select('*').order('district_name');
    
    if (error) showError(error.message);
    else {
      setRegions(regData || []);
      setDistricts(distData || []);
    }
    setLoading(false);
  };

  const handleDelete = async (district: any) => {
    showStyledSwal({
      title: 'Delete District?',
      html: `Are you sure you want to delete <b>${district.district_name}</b>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { error } = await supabase.from('districts').delete().eq('id', district.id);
        if (error) showError(error.message);
        else {
          await logDataChange({
            table_name: 'districts',
            record_id: district.id,
            action_type: 'DELETE',
            old_data: district
          });
          showSuccess("District deleted successfully");
          fetchData();
        }
      }
    });
  };

  const filteredData = useMemo(() => {
    return districts.filter(d => 
      d.district_name.toLowerCase().includes(search.toLowerCase()) ||
      d.district_number.toString().includes(search)
    );
  }, [districts, search]);

  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const getRegionName = (code: number) => {
    return regions.find(r => r.region_code === code)?.region_name || 'Unknown';
  };

  return (
    <div className="p-6 space-y-4">
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b p-6 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Districts</CardTitle>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Local Government Authorities</p>
            </div>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl">
            <PlusCircle className="h-4 w-4 mr-2" /> Add New District
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search districts..." 
              className="pl-10 h-11 border-slate-200 rounded-xl focus:ring-slate-100"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 px-6">Dist. No</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">District Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Parent Region</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Full Form</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="h-40 text-center"><Spinner /></TableCell></TableRow>
                ) : paginatedData.map((dist) => (
                  <TableRow key={dist.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="px-6 font-mono text-xs font-bold text-slate-400">{dist.district_number}</TableCell>
                    <TableCell className="font-black text-slate-900 uppercase tracking-tight">{dist.district_name}</TableCell>
                    <TableCell>
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-600">
                        {getRegionName(dist.region_number)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-medium">{dist.full_form || '—'}</TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-blue-50 hover:text-blue-600" onClick={() => { setSelectedDistrict(dist); setIsEditOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(dist)}>
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

      <AddDistrictDrawer open={isAddOpen} onOpenChange={setIsAddOpen} regions={regions} onSuccess={fetchData} />
      <EditDistrictDrawer open={isEditOpen} onOpenChange={setIsEditOpen} district={selectedDistrict} regions={regions} onSuccess={fetchData} />
    </div>
  );
};

export default DistrictsPage;