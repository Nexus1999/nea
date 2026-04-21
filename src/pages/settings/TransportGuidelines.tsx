"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MapPinned, 
  Truck, 
  Car, 
  ArrowUpDown,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import TransportGuidelineForm from "@/components/settings/TransportGuidelineForm";
import { showStyledSwal } from "@/utils/alerts";

const TransportGuidelines = () => {
  const [loading, setLoading] = useState(true);
  const [guidelines, setGuidelines] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGuideline, setSelectedGuideline] = useState<any>(null);

  const fetchGuidelines = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transportation_days_guideline')
        .select(`
          *,
          regions (region_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuidelines(data || []);
    } catch (err: any) {
      showError("Failed to load guidelines");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuidelines();
  }, [fetchGuidelines]);

  const handleDelete = async (id: number) => {
    showStyledSwal({
      title: "Are you sure?",
      text: "This guideline will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { error } = await supabase
          .from('transportation_days_guideline')
          .delete()
          .eq('id', id);
        
        if (error) {
          showError(error.message);
        } else {
          showSuccess("Guideline deleted successfully");
          fetchGuidelines();
        }
      }
    });
  };

  const filtered = guidelines.filter(g => 
    g.regions?.region_name?.toLowerCase().includes(search.toLowerCase()) ||
    g.via?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <MapPinned className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
              <span>Settings Module</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span>Logistics Config</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              Transport Guidelines
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search regions..." 
              className="pl-10 h-11 w-64 rounded-xl border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            onClick={() => {
              setSelectedGuideline(null);
              setIsFormOpen(true);
            }}
            className="rounded-xl h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest gap-2"
          >
            <Plus className="w-4 h-4" /> Add Guideline
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="pl-8 text-[9px] font-black uppercase tracking-widest">Region / Via</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest">Distance</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest">Light (Days/Staff)</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest">Truck (Days/Staff)</TableHead>
              <TableHead className="text-right pr-8 text-[9px] font-black uppercase tracking-widest">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <Spinner size="lg" label="Loading guidelines..." />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center gap-4 opacity-40">
                    <MapPinned className="w-12 h-12" />
                    <p className="font-bold uppercase text-xs tracking-widest">No guidelines found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((g) => (
                <TableRow key={g.id} className="hover:bg-slate-50/30 group">
                  <TableCell className="pl-8 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 uppercase text-xs tracking-tight">
                        {g.regions?.region_name}
                      </span>
                      {g.via && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          via {g.via}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold text-[10px]">
                      {g.distance_km} KM
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-900">{g.days_light} Days</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">P:{g.police_light} S:{g.security_light} E:{g.exam_officers_light}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-900">{g.days_truck} Days</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">P:{g.police_truck} S:{g.security_truck} E:{g.exam_officers_truck}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                        onClick={() => {
                          setSelectedGuideline(g);
                          setIsFormOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                        onClick={() => handleDelete(g.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <TransportGuidelineForm 
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        guideline={selectedGuideline}
        onSuccess={fetchGuidelines}
      />
    </div>
  );
};

export default TransportGuidelines;