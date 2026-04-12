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
  CheckCircle2
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
import { toast } from "sonner";

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
  
  // Mock initial state based on a "generated" template
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

  const calculatePersonnelTotal = (p: PersonnelRow) => {
    return p.count * (p.days + p.transitDays) * p.rate;
  };

  const calculateCostTotal = (c: CostRow) => {
    return c.quantity * c.days * c.rate;
  };

  const routeTotals = useMemo(() => {
    return routes.map(r => {
      const pTotal = r.personnel.reduce((sum, p) => sum + calculatePersonnelTotal(p), 0);
      const cTotal = r.costs.reduce((sum, c) => sum + calculateCostTotal(c), 0);
      return pTotal + cTotal;
    });
  }, [routes]);

  const grandTotal = routeTotals.reduce((sum, t) => sum + t, 0);

  const handleSave = () => {
    toast.success("Budget template saved successfully!");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Budget Template</h1>
            <p className="text-sm text-slate-500">Review and adjust the generated budget draft.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Save className="w-4 h-4 mr-2" /> Save Changes
          </Button>
        </div>
      </div>

      {/* Grand Total Summary */}
      <Card className="bg-indigo-600 text-white border-none shadow-lg overflow-hidden">
        <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
              <Calculator className="w-8 h-8" />
            </div>
            <div>
              <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider">Estimated Grand Total</p>
              <h2 className="text-4xl font-black">TZS {grandTotal.toLocaleString()}</h2>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-indigo-100 text-xs">Routes</p>
              <p className="text-xl font-bold">{routes.length}</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-right">
              <p className="text-indigo-100 text-xs">Personnel</p>
              <p className="text-xl font-bold">{routes.reduce((sum, r) => sum + r.personnel.length, 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Routes Sections */}
      <div className="space-y-12">
        {routes.map((route, rIndex) => (
          <div key={route.id} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 text-white p-2 rounded-lg">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{route.name}</h3>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                Route Total: TZS {routeTotals[rIndex].toLocaleString()}
              </Badge>
            </div>

            {/* Personnel Table */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" /> Personnel Allowances
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 text-indigo-600" onClick={() => addPersonnel(route.id)}>
                  <Plus className="w-3 h-3 mr-1" /> Add Row
                </Button>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/30">
                    <TableHead className="w-[180px]">Role</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead className="w-[80px]">Count</TableHead>
                    <TableHead className="w-[80px]">Days</TableHead>
                    <TableHead className="w-[80px]">Transit</TableHead>
                    <TableHead className="w-[120px]">Rate (TZS)</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {route.personnel.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Input 
                          className="h-8 text-xs" 
                          value={p.role} 
                          onChange={(e) => updatePersonnel(route.id, p.id, 'role', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          className="h-8 text-xs" 
                          value={p.region} 
                          onChange={(e) => updatePersonnel(route.id, p.id, 'region', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="h-8 text-xs" 
                          value={p.count} 
                          onChange={(e) => updatePersonnel(route.id, p.id, 'count', parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="h-8 text-xs" 
                          value={p.days} 
                          onChange={(e) => updatePersonnel(route.id, p.id, 'days', parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="h-8 text-xs" 
                          value={p.transitDays} 
                          onChange={(e) => updatePersonnel(route.id, p.id, 'transitDays', parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="h-8 text-xs" 
                          value={p.rate} 
                          onChange={(e) => updatePersonnel(route.id, p.id, 'rate', parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {calculatePersonnelTotal(p).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => removePersonnel(route.id, p.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Other Costs Table */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" /> Other Operational Costs
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 text-indigo-600" onClick={() => addCost(route.id)}>
                  <Plus className="w-3 h-3 mr-1" /> Add Row
                </Button>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/30">
                    <TableHead>Item Name</TableHead>
                    <TableHead className="w-[100px]">Quantity</TableHead>
                    <TableHead className="w-[100px]">Days</TableHead>
                    <TableHead className="w-[150px]">Rate (TZS)</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {route.costs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Input 
                          className="h-8 text-xs" 
                          value={c.name} 
                          onChange={(e) => updateCost(route.id, c.id, 'name', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="h-8 text-xs" 
                          value={c.quantity} 
                          onChange={(e) => updateCost(route.id, c.id, 'quantity', parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="h-8 text-xs" 
                          value={c.days} 
                          onChange={(e) => updateCost(route.id, c.id, 'days', parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          className="h-8 text-xs" 
                          value={c.rate} 
                          onChange={(e) => updateCost(route.id, c.id, 'rate', parseInt(e.target.value))}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {calculateCostTotal(c).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => {
                          setRoutes(routes.map(r => r.id === route.id ? { ...r, costs: r.costs.filter(item => item.id !== c.id) } : r));
                        }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        ))}
      </div>

      {/* Final Action */}
      <div className="flex justify-center py-12">
        <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-12 rounded-full shadow-xl" onClick={() => {
          toast.success("Budget finalized and submitted for approval!");
          navigate('/dashboard/budgets');
        }}>
          <CheckCircle2 className="w-5 h-5 mr-2" /> Finalize & Submit Budget
        </Button>
      </div>
    </div>
  );
};

export default TemplatePage;