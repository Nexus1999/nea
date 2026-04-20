"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import { 
  ArrowLeft, 
  MapPin, 
  Truck, 
  Package, 
  Calculator, 
  Layers, 
  Sparkles, 
  MapPinned, 
  Settings2,
  ChevronRight,
  UserCheck,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const CountUp = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    const totalDuration = 1000;
    const increment = end / (totalDuration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
};

const BudgetOverviewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<any>(null);
  const [demands, setDemands] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.title = "Budget Overview | NEAS";
    fetchBudgetData();
  }, [id]);

  const fetchBudgetData = async () => {
    setLoading(true);
    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (budgetError) throw budgetError;
      setBudget(budgetData);

      const { data: demandsData, error: demandsError } = await supabase
        .from('transportation_region_boxes')
        .select('*')
        .eq('budget_id', id);

      if (demandsError) throw demandsError;
      setDemands(demandsData || []);
    } catch (e: any) {
      showError(e.message || "Failed to load budget data");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalBoxes = demands.reduce((sum, d) => sum + (d.boxes_count || 0), 0);
    return {
      regions: demands.length,
      totalBoxes,
      totalTons: Math.round((totalBoxes * 34) / 1000 * 100) / 100,
      routes: 0, 
    };
  }, [demands]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Spinner size="lg" label="Loading overview..." /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 space-y-10 max-w-[1700px] mx-auto pb-32">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/dashboard/budgets')}>Budgets</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900">Action Plan</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {budget?.title} — {budget?.year}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="rounded-xl h-11 px-6 border-slate-200 font-bold uppercase text-[10px] tracking-widest gap-2"
            onClick={() => navigate(`/dashboard/budgets/participants`)}
          >
            <Users className="w-4 h-4" /> HR Registry
          </Button>
          <Button 
            className="rounded-xl h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-emerald-100"
            onClick={() => navigate(`/dashboard/budgets/assignments/${id}`)}
          >
            <UserCheck className="w-4 h-4" /> Manage Assignments
          </Button>
        </div>
      </div>

      {/* TOP KPI DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 grid grid-rows-2 gap-4">
          <Card className="border-none shadow-sm bg-blue-600 text-white rounded-[1.5rem] overflow-hidden relative group">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1">Total Regions</p>
                <h3 className="text-3xl font-black"><CountUp value={stats.regions} /></h3>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform">
                <MapPinned size={24} />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-slate-900 text-white rounded-[1.5rem] overflow-hidden relative group">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Planned Routes</p>
                <h3 className="text-3xl font-black"><CountUp value={stats.routes} /></h3>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform">
                <Truck size={24} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-5 border-none bg-white shadow-xl shadow-blue-900/5 rounded-[2rem] overflow-hidden ring-1 ring-slate-200/50">
          <CardContent className="p-0 flex flex-col sm:flex-row h-full">
            <div className="w-full p-8 flex flex-col justify-between bg-gradient-to-br from-emerald-600 to-emerald-700 text-white relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Package size={120} /></div>
              <div>
                <Badge className="bg-white/20 hover:bg-white/20 border-none text-white mb-4">Total Box Count</Badge>
                <h2 className="text-6xl font-black tracking-tighter"><CountUp value={stats.totalBoxes} /></h2>
              </div>
              <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest">Estimated Weight: {stats.totalTons} Tons</p>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-4 grid grid-cols-2 gap-4 h-full">
          <Card className="border-none shadow-sm bg-white rounded-[2rem] p-8 flex flex-col justify-between hover:shadow-xl transition-all border border-slate-100 group" onClick={() => navigate(`/dashboard/budgets/template/${id}`)}>
            <div className="p-4 bg-blue-500 text-white w-fit rounded-2xl shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
              <Calculator size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">Financial Template</p>
              <h3 className="text-2xl font-[1000] text-slate-900 tracking-tighter leading-none">
                VIEW COSTS
              </h3>
            </div>
          </Card>
          <Card className="border-none shadow-sm bg-white rounded-[2rem] p-8 flex flex-col justify-between hover:shadow-xl transition-all border border-slate-100 group" onClick={() => navigate(`/dashboard/budgets/assignments/${id}`)}>
            <div className="p-4 bg-purple-600 text-white w-fit rounded-2xl shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
              <UserCheck size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">Assignments</p>
              <h3 className="text-3xl font-[1000] text-slate-900 tracking-tighter leading-none">
                EXECUTE
              </h3>
            </div>
          </Card>
        </div>
      </div>

      {/* REGIONAL DEMANDS BREAKDOWN */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <div className="h-1 w-6 bg-emerald-600 rounded-full" /> Regional Demands
          </h2>
          <div className="relative">
            <Input 
              className="w-full md:w-72 bg-white border-slate-200 h-10 rounded-xl pl-10 focus:ring-2 focus:ring-emerald-500 transition-all" 
              placeholder="Filter regions..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
            />
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {demands
            .filter(d => d.region_name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((demand) => (
              <Card key={demand.id} className="border-none shadow-sm bg-white rounded-2xl p-5 hover:shadow-md transition-all border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black text-slate-900 uppercase text-xs tracking-tight">{demand.region_name}</span>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none font-bold">
                    {demand.boxes_count} BOXES
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Weight</span>
                  <span className="text-slate-600">{Math.round((demand.boxes_count * 34) / 1000 * 100) / 100} Tons</span>
                </div>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
};

export default BudgetOverviewPage;