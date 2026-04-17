"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Truck,
  Save,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Navigation,
  Calculator,
  AlertCircle
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
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import Spinner from "@/components/Spinner";
import { 
  ALL_TANZANIAN_REGIONS, 
  PREDEFINED_ROUTES, 
  calculateRouteDistance,
  getDistance
} from "@/utils/intelligentRoutePlanner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RouteStop {
  id: string;
  region: string;
  distanceFromPrevious: number;
}

interface Route {
  id: string;
  name: string;
  stops: RouteStop[];
  totalDistance: number;
}

const ActionPlanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<any>(null);
  const [routes, setRoutes] = useState<Route[]>([]);

  useEffect(() => {
    const fetchBudgetData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setBudget(data);
        
        // Initialize with some default routes if none exist
        // In a real app, we'd fetch these from a 'budget_routes' table
        setRoutes([
          {
            id: 'r1',
            name: 'Route 1',
            stops: [
              { id: 's1', region: 'DAR ES SALAAM', distanceFromPrevious: 0 },
              { id: 's2', region: 'MOROGORO', distanceFromPrevious: 193 },
              { id: 's3', region: 'DODOMA', distanceFromPrevious: 259 },
            ],
            totalDistance: 452
          }
        ]);
      } catch (err: any) {
        showError(err.message || "Failed to load budget");
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetData();
  }, [id]);

  const addRoute = () => {
    const newRoute: Route = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Route ${routes.length + 1}`,
      stops: [{ id: 'start', region: 'DAR ES SALAAM', distanceFromPrevious: 0 }],
      totalDistance: 0
    };
    setRoutes([...routes, newRoute]);
  };

  const removeRoute = (routeId: string) => {
    setRoutes(routes.filter(r => r.id !== routeId));
  };

  const addStop = (routeId: string) => {
    setRoutes(routes.map(r => {
      if (r.id === routeId) {
        const lastStop = r.stops[r.stops.length - 1];
        const newStop: RouteStop = {
          id: Math.random().toString(36).substr(2, 9),
          region: 'SELECT REGION',
          distanceFromPrevious: 0
        };
        return { ...r, stops: [...r.stops, newStop] };
      }
      return r;
    }));
  };

  const updateStop = (routeId: string, stopId: string, region: string) => {
    setRoutes(routes.map(r => {
      if (r.id === routeId) {
        const newStops = r.stops.map((s, idx) => {
          if (s.id === stopId) {
            const prevRegion = r.stops[idx - 1]?.region;
            const distance = prevRegion ? getDistance(prevRegion, region) : 0;
            return { ...s, region, distanceFromPrevious: distance };
          }
          // Update subsequent stop distance if this one changed
          if (idx > 0 && r.stops[idx-1].id === stopId) {
             const dist = getDistance(region, s.region);
             return { ...s, distanceFromPrevious: dist };
          }
          return s;
        });
        
        const total = newStops.reduce((sum, s) => sum + s.distanceFromPrevious, 0);
        return { ...r, stops: newStops, totalDistance: total };
      }
      return r;
    }));
  };

  const removeStop = (routeId: string, stopId: string) => {
    setRoutes(routes.map(r => {
      if (r.id === routeId) {
        const newStops = r.stops.filter(s => s.id !== stopId);
        // Recalculate distances
        const recalculatedStops = newStops.map((s, idx) => {
          if (idx === 0) return { ...s, distanceFromPrevious: 0 };
          const dist = getDistance(newStops[idx-1].region, s.region);
          return { ...s, distanceFromPrevious: dist };
        });
        const total = recalculatedStops.reduce((sum, s) => sum + s.distanceFromPrevious, 0);
        return { ...r, stops: recalculatedStops, totalDistance: total };
      }
      return r;
    }));
  };

  const applyPredefinedRoute = (routeId: string, regions: string[]) => {
    setRoutes(routes.map(r => {
      if (r.id === routeId) {
        const newStops = regions.map((region, idx) => ({
          id: Math.random().toString(36).substr(2, 9),
          region,
          distanceFromPrevious: idx === 0 ? 0 : getDistance(regions[idx-1], region)
        }));
        return {
          ...r,
          stops: newStops,
          totalDistance: calculateRouteDistance(regions)
        };
      }
      return r;
    }));
  };

  const grandTotalDistance = useMemo(() => {
    return routes.reduce((sum, r) => sum + r.totalDistance, 0);
  }, [routes]);

  if (loading) return <div className="flex h-96 items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 bg-slate-50/50 border-b">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
              <span className="hover:text-indigo-600 cursor-pointer" onClick={() => navigate('/dashboard/budgets')}>Budgets</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-900">Action Plan</span>
            </div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight">
              {budget?.title} <Badge className="ml-2 bg-indigo-100 text-indigo-700 border-none">{budget?.year}</Badge>
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-10 rounded-xl border-slate-200 font-bold uppercase text-[10px] tracking-widest" onClick={addRoute}>
              <Plus className="w-4 h-4 mr-2" /> Add Route
            </Button>
            <Button onClick={() => showSuccess("Action plan saved")} className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest px-6">
              <Save className="w-4 h-4 mr-2" /> Save Plan
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-8 space-y-10">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                  <Navigation className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Distance</p>
                  <h2 className="text-2xl font-black">{grandTotalDistance.toLocaleString()} KM</h2>
                </div>
              </div>
            </div>
            <div className="bg-white border rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Active Routes</p>
                  <h2 className="text-2xl font-black">{routes.length}</h2>
                </div>
              </div>
            </div>
            <div className="bg-white border rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Stops</p>
                  <h2 className="text-2xl font-black">{routes.reduce((sum, r) => sum + r.stops.length, 0)}</h2>
                </div>
              </div>
            </div>
          </div>

          {/* Routes List */}
          <div className="space-y-12">
            {routes.map((route) => (
              <div key={route.id} className="space-y-4">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Truck className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase text-sm tracking-tight">{route.name}</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {route.totalDistance} KM • {route.stops.length} Stops
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(val) => applyPredefinedRoute(route.id, JSON.parse(val))}>
                      <SelectTrigger className="h-9 w-[200px] text-[10px] font-bold uppercase tracking-widest rounded-xl">
                        <SelectValue placeholder="PREDEFINED ROUTES" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREDEFINED_ROUTES.map((pr, idx) => (
                          <SelectItem key={idx} value={JSON.stringify(pr)} className="text-[10px] font-bold uppercase">
                            {pr[0]} → {pr[pr.length-1]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={() => removeRoute(route.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="border rounded-2xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="w-[60px] text-[9px] font-black uppercase tracking-widest">Stop</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Region</TableHead>
                        <TableHead className="text-[9px] font-black uppercase tracking-widest">Distance (KM)</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase tracking-widest">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {route.stops.map((stop, idx) => (
                        <TableRow key={stop.id} className="hover:bg-slate-50/30">
                          <TableCell className="font-bold text-slate-400 text-xs">#{idx + 1}</TableCell>
                          <TableCell>
                            <Select value={stop.region} onValueChange={(val) => updateStop(route.id, stop.id, val)}>
                              <SelectTrigger className="h-8 text-xs font-bold rounded-lg border-slate-100">
                                <SelectValue placeholder="Select Region" />
                              </SelectTrigger>
                              <SelectContent>
                                {ALL_TANZANIAN_REGIONS.map(r => (
                                  <SelectItem key={r} value={r} className="text-xs font-bold">{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">{stop.distanceFromPrevious} KM</span>
                              {idx > 0 && stop.distanceFromPrevious === 0 && (
                                <Badge variant="outline" className="text-[8px] border-amber-200 text-amber-600 bg-amber-50">NO DISTANCE DATA</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-600 rounded-lg" onClick={() => removeStop(route.id, stop.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={4} className="p-0">
                          <Button variant="ghost" className="w-full h-10 text-indigo-600 font-bold uppercase text-[9px] tracking-widest hover:bg-indigo-50/50 rounded-none" onClick={() => addStop(route.id)}>
                            <Plus className="w-3 h-3 mr-2" /> Add Stop to {route.name}
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center py-12 border-t border-slate-100">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-12 rounded-2xl shadow-xl shadow-green-100 font-black uppercase text-xs tracking-widest h-14" onClick={() => {
              showSuccess("Action plan finalized!");
              navigate('/dashboard/budgets');
            }}>
              <CheckCircle2 className="w-5 h-5 mr-2" /> Finalize Action Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActionPlanPage;