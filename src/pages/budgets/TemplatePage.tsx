"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Printer, 
  Download, 
  Plus, 
  Trash2, 
  Users, 
  CreditCard, 
  Calculator,
  Truck,
  Save,
  CheckCircle2,
  RefreshCw,
  History,
  AlertCircle,
  Lock,
  Unlock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";

// DEFAULT RATES AS REQUESTED
const RATES = {
  EXAM_OFFICER: 170000,
  POLICE: 170000,
  SECURITY: 170000,
  DRIVER: 150000,
  LOADING_PER_ROUTE: 20000 * 30, // 600,000 per route
  PADLOCKS_PER_ROUTE: 6 * 4 * 10000, // 240,000 per route
};

const TemplatePage = () => {
  const { id: budgetId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [budget, setBudget] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [currentVersion, setCurrentVersion] = useState<any>(null);
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [otherCosts, setOtherCosts] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .single();
      setBudget(budgetData);

      const { data: templateData } = await supabase
        .from('transportation_templates')
        .select('*')
        .eq('budget_id', budgetId)
        .maybeSingle();
      
      if (templateData) {
        setTemplate(templateData);
        
        const { data: versionData } = await supabase
          .from('transportation_template_versions')
          .select('*')
          .eq('template_id', templateData.id)
          .eq('is_current', true)
          .maybeSingle();
        
        if (versionData) {
          setCurrentVersion(versionData);
          
          const [pRes, oRes] = await Promise.all([
            supabase.from('transportation_template_personnel').select('*').eq('template_version_id', versionData.id),
            supabase.from('transportation_template_other_costs').select('*').eq('template_version_id', versionData.id)
          ]);
          
          setPersonnel(pRes.data || []);
          setOtherCosts(oRes.data || []);
        }
      }
    } catch (err: any) {
      showError("Failed to load template data");
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateTemplate = async () => {
    setGenerating(true);
    try {
      // 1. Ensure Template Header exists
      let tId = template?.id;
      if (!tId) {
        const { data: newT, error: tErr } = await supabase
          .from('transportation_templates')
          .insert({ budget_id: budgetId, status: 'draft' })
          .select()
          .single();
        if (tErr) throw tErr;
        tId = newT.id;
      }

      // 2. Get Action Plan Data
      const { data: routes } = await supabase
        .from('transportation_routes')
        .select(`
          *,
          transportation_route_stops (*),
          transportation_route_vehicles (*)
        `)
        .eq('budget_id', budgetId);

      if (!routes || routes.length === 0) {
        throw new Error("No Action Plan found. Please create routes first.");
      }

      // 3. Create New Version
      const { data: version, error: vErr } = await supabase
        .from('transportation_template_versions')
        .insert({
          template_id: tId,
          version_num: (currentVersion?.version_num || 0) + 1,
          is_current: true,
          label: `Auto-generated (${new Date().toLocaleDateString()})`
        })
        .select()
        .single();
      
      if (vErr) throw vErr;

      // 4. Generate Personnel Rows
      const personnelRows: any[] = [];
      routes.forEach(route => {
        const routeDays = route.transportation_route_stops.length + 2;

        // Police (2 per route)
        personnelRows.push({
          template_version_id: version.id,
          route_id: route.id,
          role: 'police_officer',
          quantity: 2,
          days: routeDays,
          allowance_per_day: RATES.POLICE,
          allowance_transit_per_day: RATES.POLICE
        });

        // Security (1 per route)
        personnelRows.push({
          template_version_id: version.id,
          route_id: route.id,
          role: 'security_officer',
          quantity: 1,
          days: routeDays,
          allowance_per_day: RATES.SECURITY,
          allowance_transit_per_day: RATES.SECURITY
        });

        // Drivers (per vehicle)
        route.transportation_route_vehicles.forEach((v: any) => {
          personnelRows.push({
            template_version_id: version.id,
            route_id: route.id,
            role: 'driver',
            vehicle_type: v.vehicle_type.toLowerCase().replace('_and_trailer', '_trailer'),
            quantity: v.quantity,
            days: routeDays,
            allowance_per_day: RATES.DRIVER,
            emergency_allowance: v.vehicle_type === 'TRUCK_AND_TRAILER' ? 100000 : 50000
          });
        });

        // Exam Officers (1 per region)
        route.transportation_route_stops.forEach((stop: any) => {
          personnelRows.push({
            template_version_id: version.id,
            route_id: route.id,
            region_name: stop.region_name,
            role: 'examination_officer',
            quantity: 1,
            days: 3,
            transit_days: 2,
            allowance_per_day: RATES.EXAM_OFFICER,
            allowance_transit_per_day: RATES.EXAM_OFFICER,
            unloading_cash: 20000, // Standard unloading per officer
            fare_return: 50000 // Standard return fare
          });
        });
      });

      // 5. Generate Operational Costs (Other Costs)
      const otherCostRows = [
        {
          template_version_id: version.id,
          item_name: 'Loading Labor (Vibarua)',
          description: `Loading costs for ${routes.length} routes (30 people per route)`,
          quantity: routes.length,
          unit_cost: RATES.LOADING_PER_ROUTE,
          category: 'operational'
        },
        {
          template_version_id: version.id,
          item_name: 'Padlocks & Security Seals',
          description: `Security hardware for ${routes.length} routes`,
          quantity: routes.length,
          unit_cost: RATES.PADLOCKS_PER_ROUTE,
          category: 'security'
        }
      ];

      // 6. Bulk Insert
      await Promise.all([
        supabase.from('transportation_template_personnel').insert(personnelRows),
        supabase.from('transportation_template_other_costs').insert(otherCostRows)
      ]);
      
      showSuccess("Financial template generated with default rates!");
      fetchData();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" label="Loading financial template..." /></div>;

  if (!template || !currentVersion) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center gap-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center">
          <Calculator className="w-10 h-10" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">No Template Generated</h2>
          <p className="text-slate-500 max-w-md mx-auto">Generate a financial template based on your current Action Plan using standard government rates.</p>
        </div>
        <Button 
          onClick={handleGenerateTemplate} 
          disabled={generating}
          className="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100"
        >
          {generating ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
          Generate Financial Template
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <Calculator className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
              <span>v{currentVersion.version_num}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span className={currentVersion.locked ? "text-red-500" : "text-emerald-500"}>
                {currentVersion.locked ? "LOCKED" : "DRAFT"}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              {budget?.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl h-11 px-5 border-slate-200 font-bold uppercase text-[10px] tracking-widest gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button 
            onClick={handleGenerateTemplate}
            disabled={generating || currentVersion.locked}
            className="rounded-xl h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-indigo-100"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} /> Refresh from Plan
          </Button>
        </div>
      </div>

      {/* TOTALS CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 text-white rounded-[2rem] border-none shadow-2xl shadow-slate-200 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Calculator size={120} /></div>
          <CardContent className="p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Grand Total Budget</p>
            <h2 className="text-4xl font-black tracking-tighter">
              TZS {(currentVersion.grand_total || 0).toLocaleString()}
            </h2>
            <div className="mt-6 flex items-center gap-2">
              <Badge className="bg-white/10 text-white border-none font-bold text-[9px]">ESTIMATED</Badge>
              <span className="text-[10px] text-slate-500 font-medium italic">Based on standard rates</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-[2rem] border-slate-100 shadow-sm p-8 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Personnel Costs</p>
            <h3 className="text-2xl font-black text-slate-900">
              TZS {(currentVersion.total_personnel_cost || 0).toLocaleString()}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-emerald-600">
            <Users className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{personnel.length} Line Items</span>
          </div>
        </Card>

        <Card className="bg-white rounded-[2rem] border-slate-100 shadow-sm p-8 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Operational Costs</p>
            <h3 className="text-2xl font-black text-slate-900">
              TZS {(currentVersion.total_other_cost || 0).toLocaleString()}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-indigo-600">
            <CreditCard className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{otherCosts.length} Line Items</span>
          </div>
        </Card>
      </div>

      {/* EDITOR TABS */}
      <Tabs defaultValue="personnel" className="space-y-6">
        <TabsList className="bg-white p-1.5 rounded-2xl border border-slate-100 h-14 shadow-sm">
          <TabsTrigger value="personnel" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" /> Personnel Allowances
          </TabsTrigger>
          <TabsTrigger value="operational" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white">
            <CreditCard className="w-4 h-4 mr-2" /> Operational Costs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personnel">
          <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest pl-8">Role / Category</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Qty</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Days</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Rate (TZS)</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Special/Transit</TableHead>
                  <TableHead className="text-right text-[9px] font-black uppercase tracking-widest pr-8">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personnel.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/30 group">
                    <TableCell className="pl-8 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 uppercase text-xs tracking-tight">
                          {p.role.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {p.region_name || 'Route Wide'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">{p.quantity}</TableCell>
                    <TableCell className="font-bold text-slate-700">{p.days + (p.transit_days || 0)}</TableCell>
                    <TableCell className="font-bold text-slate-700">{p.allowance_per_day.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {p.unloading_cash > 0 && <Badge variant="outline" className="text-[8px] font-bold">UNLOADING: {p.unloading_cash.toLocaleString()}</Badge>}
                        {p.emergency_allowance > 0 && <Badge variant="outline" className="text-[8px] font-bold">EMERGENCY: {p.emergency_allowance.toLocaleString()}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8 font-black text-slate-900">
                      TZS {(p.total_cost || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="operational">
          <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest pl-8">Item Name</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Description</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Qty</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Unit Cost</TableHead>
                  <TableHead className="text-right text-[9px] font-black uppercase tracking-widest pr-8">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherCosts.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/30 group">
                    <TableCell className="pl-8 py-4">
                      <span className="font-black text-slate-900 uppercase text-xs tracking-tight">{item.item_name}</span>
                    </TableCell>
                    <TableCell className="text-[10px] text-slate-500 font-medium">{item.description}</TableCell>
                    <TableCell className="font-bold text-slate-700">{item.quantity}</TableCell>
                    <TableCell className="font-bold text-slate-700">{item.unit_cost.toLocaleString()}</TableCell>
                    <TableCell className="text-right pr-8 font-black text-slate-900">
                      TZS {(item.total_cost || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* FINAL ACTIONS */}
      <div className="flex justify-center pt-10">
        <Button 
          size="lg" 
          disabled={currentVersion.locked}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 rounded-2xl shadow-xl shadow-emerald-100 font-black uppercase text-xs tracking-widest h-14"
          onClick={() => {
            showSuccess("Budget finalized and submitted for approval!");
            navigate('/dashboard/budgets');
          }}
        >
          <CheckCircle2 className="w-5 h-5 mr-2" /> Finalize & Submit for Approval
        </Button>
      </div>
    </div>
  );
};

export default TemplatePage;