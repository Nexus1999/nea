"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, Plus, Globe, RefreshCw, MapPin, Edit2, Trash2, Filter
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
import { supabase } from "@/integrations/supabase/client";
import Spinner from "@/components/Spinner";
import { cn } from "@/lib/utils";
import { AddRegionDrawer, EditRegionDrawer } from "@/components/settings/RegionDrawers";
import { toast } from "sonner";

const Regions = () => {
  const [regions, setRegions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<any>(null);

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
        .order('name');
      if (error) throw error;
      setRegions(data || []);
    } catch (err) {
      toast.error("Failed to load regions");
    } finally {
      setLoading(false);
    }
  };

  const filteredRegions = regions.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Card className="w-full relative min-h-[500px] border-none shadow-sm">
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
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Manage high-level geographical divisions</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 rounded-xl border-slate-200 gap-2"
              onClick={fetchRegions}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button 
              size="sm" 
              className="h-9 rounded-xl gap-2 px-4"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Region
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search regions by name or code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl border-slate-200 focus:ring-slate-100"
              />
            </div>
            <Button variant="ghost" size="sm" className="text-slate-500 gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-b border-slate-200">
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Region Name</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Code</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Created At</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredRegions.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      No regions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRegions.map((region) => (
                    <TableRow key={region.id} className="hover:bg-slate-50/30 border-b border-slate-100 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-slate-500" />
                          </div>
                          <span className="font-bold text-slate-700">{region.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600">
                          {region.code || 'N/A'}
                        </code>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(region.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-8 p-0 rounded-lg border-slate-200 hover:border-slate-900 transition-all"
                            onClick={() => setEditingRegion(region)}
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddRegionDrawer 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        onSuccess={fetchRegions} 
      />
      
      <EditRegionDrawer 
        region={editingRegion} 
        open={!!editingRegion} 
        onOpenChange={(open) => !open && setEditingRegion(null)} 
        onSuccess={fetchRegions} 
      />
    </div>
  );
};

export default Regions;