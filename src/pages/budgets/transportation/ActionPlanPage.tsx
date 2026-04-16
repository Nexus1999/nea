"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Plus, 
  Truck, 
  Bus, 
  Car, 
  Container,
  Settings2,
  Trash2,
  MapPin,
  Calculator,
  FileText,
  ArrowRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import RouteFormDrawer from "@/components/budgets/transportation/RouteFormDrawer";
import Spinner from "@/components/Spinner";

const VEHICLE_ICONS: Record<string, React.ReactNode> = {
  'HORSE': <Truck className="w-3.5 h-3.5" />,
  'HORSE_TRAILER': <Container className="w-3.5 h-3.5" />,
  'HARDTOP': <Car className="w-3.5 h-3.5" />,
  'COASTER': <Bus className="w-3.5 h-3.5" />,
};

const VEHICLE_LABELS: Record<string, string> = {
  'HORSE': 'Horse',
  'HORSE_TRAILER': 'Horse & Trailer',
  'HARDTOP': 'Hardtop (LC)',
  'COASTER': 'Coaster',
};

const ActionPlanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', id)
        .single();

      if (budgetError) throw budgetError;
      setBudget(budgetData);

      const { data: routesData, error: routesError } = await supabase
        .from('transportation_routes')
        .select('*')
        .eq('budget_id', id)
        .order('id', { ascending: true });

      if (routesError) throw routesError;
      setRoutes(routesData || []);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteRoute = async (routeId: string) => {
    try {
      const { error } = await supabase
        .from('transportation_routes')
        .delete()
        .eq('id', routeId);

      if (error) throw error;
      showSuccess("Route removed");
      fetchData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  if (loading && !budget) return <div className="flex h-[400px] items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/budgets')} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">{budget?.title}</h1>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Transportation Action Plan • {budget?.year}</p>
          </div>
        </div>
        <Button onClick={() => { setEditingRoute(null); setIsDrawerOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest h-10 rounded-xl px-6">
          <Plus className="w-4 h-4 mr-2" /> Add New Route
        </Button>
      </div>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-slate-900 text-white rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-xl"><MapPin className="w-6 h-6 text-indigo-400" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Routes</p>
                <p className="text-2xl font-black">{routes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 rounded-xl"><Truck className="w-6 h-6 text-slate-600" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicles</p>
                <p className="text-2xl font-black">
                  {routes.reduce((acc, r) => acc + (r.vehicles?.reduce((vAcc: number, v: any) => vAcc + v.count, 0) || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Add more summary cards as needed */}
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b py-4">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" /> Route Distribution Matrix
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[60px] text-[10px] font-black uppercase text-center border-r">NA</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Route Name</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Destination (Msafara)</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Delivery Regions</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Lorry / Escort</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-medium italic">
                    No routes defined for this action plan yet.
                  </TableCell>
                </TableRow>
              ) : (
                routes.map((route, idx) => (
                  <TableRow key={route.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-center font-black text-slate-400 text-xs border-r">{idx + 1}</TableCell>
                    <TableCell className="font-bold text-slate-900">{route.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold">
                          {route.destination}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {route.regions?.map((reg: string, rIdx: number) => (
                          <div key={rIdx} className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600">
                            <span className="text-[8px] text-slate-400">{rIdx + 1}.</span> {reg}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {route.vehicles?.map((v: any, vIdx: number) => (
                          <div key={vIdx} className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                            <div className="p-1 bg-slate-100 rounded text-slate-500">
                              {VEHICLE_ICONS[v.type] || <Truck className="w-3.5 h-3.5" />}
                            </div>
                            <span>{v.count}x {VEHICLE_LABELS[v.type] || v.type}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600 hover:bg-indigo-50" onClick={() => { setEditingRoute(route); setIsDrawerOpen(true); }}>
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDeleteRoute(route.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RouteFormDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        onSuccess={fetchData}
        budgetId={id!}
        editingRoute={editingRoute}
        existingRoutes={routes}
      />
    </div>
  );
};

export default ActionPlanPage;