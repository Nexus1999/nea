"use client";

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
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
  ChevronRight
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
import { showSuccess } from "@/utils/toast";

interface PersonnelRow {
  id: string;
  role: string;
  region: string;
  count: number;
  days: number;
  transitDays: number;
  rate: number;
}

interface CostRow {
  id: string;
  name: string;
  quantity: number;
  days: number;
  rate: number;
}

interface RouteBudget {
  id: string;
  name: string;
  personnel: PersonnelRow[];
  costs: CostRow[];
}

const TemplatePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [routes, setRoutes] = useState<RouteBudget[]>([
    {
      id: '1',
      name: 'Northern Route',
      personnel: [
        { id: 'p1', role: 'POLICE', region: 'All', count: 2, days: 5, transitDays: 2, rate: 50000 },
        { id: 'p2', role: 'SECURITY', region: 'All', count: 1, days: 5, transitDays: 2, rate: 40000 },
        { id: 'p3', role: 'DRIVER', region: 'All', count: 1, days: 5, transitDays: 2, rate: 45000 },
        { id: 'p4', role: 'EXAM_OFFICER', region: 'Arusha', count: 1, days: 3, transitDays: 1, rate: 60000 },
      ],
      costs: [
        { id: 'c1', name: 'LOADING/UNLOADING', quantity: 1, days: 2, rate: 100000 },
        { id: 'c2', name: 'PADLOCKS', quantity: 10, days: 1, rate: 5000 },
      ]
    }
  ]);

  const updatePersonnel = (routeId: string, rowId: string, field: keyof PersonnelRow, value: any) => {
    setRoutes(routes.map(r => {
      if (r.id === routeId) {
        return {
          ...r,
          personnel: r.personnel.map(p => p.id === rowId ? { ...p, [field]: value } : p)
        };
      }
      return r;
    }));
  };

  const addPersonnel = (routeId: string) => {
    setRoutes(routes.map(r => {
      if (r.id === routeId) {
        return {
          ...r,
          personnel: [...r.personnel, {
            id: Math.random().toString(36).substr(2, 9),
            role: 'NEW_ROLE',
            region: 'All',
            count: 1,
            days: 1,
            transitDays: 0,
            rate: 0
          }]
        };
      }
      return r;
    }));
  };

  const removePersonnel = (routeId: string, rowId: string) => {
    setRoutes(routes.map(r => {
      if (r.id === routeId) {
        return { ...r, personnel: r.personnel.filter(p => p.id !== rowId) };
      }
      return r;
    }));
  };

  const updateCost = (routeId: string, rowId: string, field: keyof CostRow, value: any) => {
    setRoutes(routes.map(r => {
      if (r.id === routeId) {
        return {
          ...r,
          costs: r.costs.map(c => c.id === rowId ? { ...c, [field]: value } : c)
        };
      }
      return r;
    }));
  };

  const addCost = (routeId: string) => {
    setRoutes(routes.map(r => {
      if (r.id === routeId) {
        return {
          ...r,
          costs: [...r.costs, {
            id: Math.random().toString(36).substr(2, 9),
            name: 'New Item',
            quantity: 1,
            days: 1,
            rate: 0
          }]
        };
      }
      return r;
    }));
  };

  const calculatePersonnelTotal = (p: PersonnelRow) => p.count * (p.days + p.transitDays) * p.rate;
  const calculateCostTotal = (c: CostRow) => c.quantity * c.days * c.rate;

  const routeTotals = useMemo(() => {
    return routes.map(r => {
      const pTotal = r.personnel.reduce((sum, p) => sum + calculatePersonnelTotal(p), 0);
      const cTotal = r.costs.reduce((sum, c) => sum + calculateCostTotal(c), 0);
      return pTotal + cTotal;
    });
  }, [routes]);

  const grandTotal = routeTotals.reduce((sum, t) => sum + t, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
            <span className="hover:text-indigo-600 cursor-pointer" onClick={() => navigate('/dashboard/budgets')}>Budgets</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900">Budget Template</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Transportation Budget</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-10 rounded-xl border-slate-200 font-bold uppercase text-[10px] tracking-widest">
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" className="h-10 rounded-xl border-slate-200 font-bold uppercase text-[10px] tracking-widest">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button onClick={() => showSuccess("Changes saved")} className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest px-6">
            <Save className="w-4 h-4 mr-2" /> Save Changes
          </Button>
        </div>
      </div>

      {/* Grand Total Summary */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl shadow-slate-200">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
            <Calculator className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Estimated Grand Total</p>
            <h2 className="text-4xl font-black tracking-tighter">TZS {grandTotal.toLocaleString()}</h2>
          </div>
        </div>
        <div className="flex gap-12">
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Routes</p>
            <p className="text-2xl font-black">{routes.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Personnel</p>
            <p className="text-2xl font-black">{routes.reduce((sum, r) => sum + r.personnel.length, 0)}</p>
          </div>
        </div>
      </div>

      {/* Routes Sections */}
      <div className="space-y-16">
        {routes.map((route, rIndex) => (
          <Card key={route.id} className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white text-slate-900 rounded-xl flex items-center justify-center shadow-sm">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">{route.name}</h3>
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Route Total: TZS {routeTotals[rIndex].toLocaleString()}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              {/* Personnel Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> Personnel Allowances
                  </h4>
                  <Button variant="ghost" size="sm" className="h-7 text-indigo-600 font-bold uppercase text-[9px] tracking-widest" onClick={() => addPersonnel(route.id)}>
                    <Plus className="w-3 h-3 mr-1" /> Add Row
                  </Button>
                </div>
                <div className="border rounded-2xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Role</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Region</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Count</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Days</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Transit</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Rate (TZS)</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase tracking-widest">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {route.personnel.map((p) => (
                        <TableRow key={p.id} className="hover:bg-slate-50/30">
                          <TableCell><Input className="h-8 text-xs rounded-lg border-slate-100" value={p.role} onChange={(e) => updatePersonnel(route.id, p.id, 'role', e.target.value)} /></TableCell>
                          <TableCell><Input className="h-8 text-xs rounded-lg border-slate-100" value={p.region} onChange={(e) => updatePersonnel(route.id, p.id, 'region', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" className="h-8 text-xs rounded-lg border-slate-100" value={p.count} onChange={(e) => updatePersonnel(route.id, p.id, 'count', parseInt(e.target.value))} /></TableCell>
                          <TableCell><Input type="number" className="h-8 text-xs rounded-lg border-slate-100" value={p.days} onChange={(e) => updatePersonnel(route.id, p.id, 'days', parseInt(e.target.value))} /></TableCell>
                          <TableCell><Input type="number" className="h-8 text-xs rounded-lg border-slate-100" value={p.transitDays} onChange={(e) => updatePersonnel(route.id, p.id, 'transitDays', parseInt(e.target.value))} /></TableCell>
                          <TableCell><Input type="number" className="h-8 text-xs rounded-lg border-slate-100" value={p.rate} onChange={(e) => updatePersonnel(route.id, p.id, 'rate', parseInt(e.target.value))} /></TableCell>
                          <TableCell className="text-right font-bold text-slate-900 text-xs">{calculatePersonnelTotal(p).toLocaleString()}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-600 rounded-lg" onClick={() => removePersonnel(route.id, p.id)}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Other Costs Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5" /> Operational Costs
                  </h4>
                  <Button variant="ghost" size="sm" className="h-7 text-indigo-600 font-bold uppercase text-[9px] tracking-widest" onClick={() => addCost(route.id)}>
                    <Plus className="w-3 h-3 mr-1" /> Add Row
                  </Button>
                </div>
                <div className="border rounded-2xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Item Name</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Quantity</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Days</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Rate (TZS)</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase tracking-widest">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {route.costs.map((c) => (
                        <TableRow key={c.id} className="hover:bg-slate-50/30">
                          <TableCell><Input className="h-8 text-xs rounded-lg border-slate-100" value={c.name} onChange={(e) => updateCost(route.id, c.id, 'name', e.target.value)} /></TableCell>
                          <TableCell><Input type="number" className="h-8 text-xs rounded-lg border-slate-100" value={c.quantity} onChange={(e) => updateCost(route.id, c.id, 'quantity', parseInt(e.target.value))} /></TableCell>
                          <TableCell><Input type="number" className="h-8 text-xs rounded-lg border-slate-100" value={c.days} onChange={(e) => updateCost(route.id, c.id, 'days', parseInt(e.target.value))} /></TableCell>
                          <TableCell><Input type="number" className="h-8 text-xs rounded-lg border-slate-100" value={c.rate} onChange={(e) => updateCost(route.id, c.id, 'rate', parseInt(e.target.value))} /></TableCell>
                          <TableCell className="text-right font-bold text-slate-900 text-xs">{calculateCostTotal(c).toLocaleString()}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-600 rounded-lg" onClick={() => {
                            setRoutes(routes.map(r => r.id === route.id ? { ...r, costs: r.costs.filter(item => item.id !== c.id) } : r));
                          }}><Trash2 className="w-3.5 h-3.5" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center py-12 border-t border-slate-100">
        <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-12 rounded-2xl shadow-xl shadow-green-100 font-black uppercase text-xs tracking-widest h-14" onClick={() => {
          showSuccess("Budget finalized and submitted for approval!");
          navigate('/dashboard/budgets');
        }}>
          <CheckCircle2 className="w-5 h-5 mr-2" /> Finalize & Submit Budget
        </Button>
      </div>
    </div>
  );
};

export default TemplatePage;