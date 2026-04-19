"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Truck, 
  Search, 
  X, 
  ChevronRight,
  Package,
  ArrowUpDown
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";

const RoutePlannerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        const { data, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setBudget(data);
      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBudget();
  }, [id]);

  if (loading) return <div className="flex h-[400px] items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-4 p-4">
      <Card className="w-full relative min-h-[600px] border-none shadow-sm">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 pb-6 border-b mb-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/dashboard/budgets')}>Budgets</span>
              <ChevronRight className="w-3 h-3" />
              <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate(`/dashboard/budgets/overview/${id}`)}>Action Plan</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-900">Route Planner</span>
            </div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
              Transportation Route Planner
            </CardTitle>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">
                {budget?.title}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl h-10 px-6 border-slate-200 font-bold uppercase text-[10px] tracking-widest gap-2">
              <Plus className="w-4 h-4" /> Add New Route
            </Button>
            <Button className="rounded-xl h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest gap-2">
              <Save className="w-4 h-4" /> Save Configuration
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search routes or regions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-sm border-slate-200 focus:ring-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-b border-slate-200">
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Route Name</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Regions</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase text-slate-500">Total Boxes</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 px-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-slate-50/30 border-b border-slate-100 transition-colors">
                      <TableCell className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600" /> Route 1: Northern
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-[9px]">ARUSHA</Badge>
                          <Badge variant="secondary" className="text-[9px]">KILIMANJARO</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold">270</TableCell>
                      <TableCell className="text-right px-6">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" /> Unassigned Regions
                </h3>
                <div className="space-y-2">
                  {['MANYARA', 'TANGA', 'MWANZA', 'SHINYANGA'].map(region => (
                    <div key={region} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-400 cursor-move transition-all flex items-center justify-between group">
                      <span className="text-xs font-black text-slate-700">{region}</span>
                      <Badge variant="outline" className="text-[9px] font-bold">120 BOXES</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoutePlannerPage;