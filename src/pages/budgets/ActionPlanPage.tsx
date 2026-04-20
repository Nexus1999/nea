"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  UserPlus, 
  Link as LinkIcon, 
  Download, 
  RotateCcw,
  MapPinned,
  Plus,
  Truck,
  Trash2,
  Edit
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const ActionPlanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);

  const fetchPlanData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: budgetData } = await supabase.from('budgets').select('*').eq('id', id).single();
      setBudget(budgetData);

      const { data: routesData } = await supabase
        .from('transportation_routes')
        .select(`
          *,
          transportation_route_vehicles (*),
          transportation_route_stops (*)
        `)
        .eq('budget_id', id)
        .order('created_at', { ascending: true });

      setRoutes(routesData || []);
    } catch (err: any) {
      showError("Failed to load action plan");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPlanData();
  }, [fetchPlanData]);

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await supabase.from('transportation_routes').delete().eq('id', routeId);
      showSuccess("Route deleted");
      fetchPlanData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/budgets')} className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Transportation Action Plan</h1>
            <p className="text-sm text-slate-500 font-medium">{budget?.title} • FY {budget?.year}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="default" 
            size="sm" 
            className="bg-slate-900 hover:bg-black text-[10px] font-black uppercase tracking-wider rounded-lg h-9" 
            onClick={() => {}}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Auto-Assign
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="border-2 border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 text-[10px] font-black uppercase tracking-wider rounded-lg h-9 px-4 transition-all" 
            onClick={() => {}}
          >
            <LinkIcon className="h-3.5 w-3.5 mr-1.5" /> Accounts Link
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="border-2 border-slate-200 text-slate-600 hover:border-emerald-600 hover:text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-lg h-9 px-4 transition-all" 
            onClick={() => {}}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="border-2 border-slate-200 text-slate-600 hover:border-red-600 hover:text-red-600 text-[10px] font-black uppercase tracking-wider rounded-lg h-9 px-4 transition-all" 
            onClick={() => {}}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
          </Button>

          <Button 
            variant="outline"
            onClick={() => navigate(`/dashboard/budgets/transportation/route-planner/${id}`)}
            className="border-2 border-slate-200 text-slate-600 hover:border-blue-600 hover:text-blue-600 text-[10px] font-black uppercase tracking-wider rounded-lg h-9 px-4 transition-all"
          >
            <MapPinned className="w-3.5 h-3.5 mr-1.5" /> Manual Planner
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px] text-[10px] font-black uppercase tracking-widest">SN</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Msafara</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Mkoa</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Mahali pa Kupokelea</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Tarehe ya Kupokea</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Makasha</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Uzito (T)</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Lori</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest">Escort</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Truck className="h-12 w-12 text-slate-200" />
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No routes planned yet</p>
                      <Button 
                        onClick={() => navigate(`/dashboard/budgets/transportation/route-planner/${id}`)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest h-9 px-6 rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" /> Create First Route
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                routes.map((route, rIdx) => {
                  const stops = route.transportation_route_stops?.sort((a: any, b: any) => a.sequence_order - b.sequence_order) || [];
                  const vehicles = route.transportation_route_vehicles || [];
                  const truckLabel = vehicles.find((v: any) => v.vehicle_type.includes('TRUCK'))?.vehicle_type === 'TRUCK_AND_TRAILER' ? 'TT' : 'T';
                  const escortLabel = vehicles.find((v: any) => v.vehicle_type === 'ESCORT_VEHICLE') ? 'HT' : 'C';

                  return stops.map((stop: any, sIdx: number) => (
                    <TableRow key={stop.id} className="hover:bg-slate-50/50">
                      {sIdx === 0 && (
                        <>
                          <TableCell rowSpan={stops.length} className="font-bold text-slate-400 text-xs border-r">
                            {rIdx + 1}
                          </TableCell>
                          <TableCell rowSpan={stops.length} className="font-black text-slate-900 text-xs border-r bg-slate-50/30">
                            {route.name}
                          </TableCell>
                        </>
                      )}
                      <TableCell className="font-bold text-slate-700 text-xs">{stop.region_name}</TableCell>
                      <TableCell className="text-xs text-slate-500">{stop.receiving_place || stop.region_name}</TableCell>
                      <TableCell className="text-xs text-slate-500">{stop.delivery_date}</TableCell>
                      <TableCell className="font-bold text-xs">{stop.boxes_count}</TableCell>
                      <TableCell className="text-xs text-slate-500">{((stop.boxes_count * 34) / 1000).toFixed(2)}</TableCell>
                      {sIdx === 0 && (
                        <>
                          <TableCell rowSpan={stops.length} className="text-center border-l">
                            <Badge variant="outline" className="font-black text-[10px]">{truckLabel}</Badge>
                          </TableCell>
                          <TableCell rowSpan={stops.length} className="text-center border-l">
                            <Badge variant="outline" className="font-black text-[10px]">{escortLabel}</Badge>
                          </TableCell>
                          <TableCell rowSpan={stops.length} className="text-right border-l">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600" onClick={() => navigate(`/dashboard/budgets/transportation/route-planner/${id}?edit=${route.id}`)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => handleDeleteRoute(route.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ));
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActionPlanPage;