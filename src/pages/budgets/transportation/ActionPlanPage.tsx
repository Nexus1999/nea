"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Plus, 
  Truck, 
  Calendar, 
  MapPin, 
  Package,
  Edit,
  Trash2,
  ArrowRight,
  Navigation,
  AlertCircle,
  Loader2,
  Save
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import RouteFormDrawer from "@/components/budgets/transportation/RouteFormDrawer";

const ActionPlanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  const fetchPlanData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Budget Info
      const { data: budgetData, error: bError } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', id)
        .single();

      if (bError) throw bError;
      setBudget(budgetData);

      // 2. Fetch Routes with Vehicles and STOPS (using the correct relationship)
      const { data: routesData, error: rError } = await supabase
        .from('transportation_routes')
        .select(`
          *,
          transportation_route_vehicles (*),
          transportation_route_stops (*)
        `)
        .eq('budget_id', id)
        .order('created_at', { ascending: true });

      if (rError) throw rError;
      setRoutes(routesData || []);
    } catch (err: any) {
      showError(err.message || "Failed to load action plan");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPlanData();
  }, [fetchPlanData]);

  const handleAddRoute = () => {
    setEditingRoute(null);
    setIsDrawerOpen(true);
  };

  const handleEditRoute = (route: any) => {
    setEditingRoute(route);
    setIsDrawerOpen(true);
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm("Are you sure you want to delete this route?")) return;
    
    try {
      const { error } = await supabase
        .from('transportation_routes')
        .delete()
        .eq('id', routeId);

      if (error) throw error;
      showSuccess("Route deleted");
      fetchPlanData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSaveRoute = async (formData: any) => {
    try {
      const routePayload = {
        budget_id: id,
        name: formData.name,
        starting_point: formData.startingPoint,
        loading_date: formData.loadingDate,
        start_date: formData.startDate,
        total_boxes: formData.regions.reduce((sum: number, r: any) => sum + Number(r.boxes), 0),
        total_tons: (formData.regions.reduce((sum: number, r: any) => sum + Number(r.boxes), 0) * 34) / 1000,
      };

      let routeId = editingRoute?.id;

      if (editingRoute) {
        const { error } = await supabase
          .from('transportation_routes')
          .update(routePayload)
          .eq('id', editingRoute.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('transportation_routes')
          .insert(routePayload)
          .select()
          .single();
        if (error) throw error;
        routeId = data.id;
      }

      // Clear existing vehicles and stops if editing
      if (editingRoute) {
        await supabase.from('transportation_route_vehicles').delete().eq('route_id', routeId);
        await supabase.from('transportation_route_stops').delete().eq('route_id', routeId);
      }

      // Insert Vehicles
      const vehiclePayload = formData.vehicles.map((v: any) => ({
        route_id: routeId,
        vehicle_type: v.type,
        quantity: v.quantity
      }));
      await supabase.from('transportation_route_vehicles').insert(vehiclePayload);

      // Insert Stops
      const stopPayload = formData.regions.map((r: any, idx: number) => ({
        route_id: routeId,
        region_name: r.name,
        receiving_place: r.receivingPlace,
        boxes_count: r.boxes,
        delivery_date: r.deliveryDate,
        sequence_order: idx
      }));
      await supabase.from('transportation_route_stops').insert(stopPayload);

      showSuccess("Route saved successfully");
      fetchPlanData();
    } catch (err: any) {
      showError(err.message);
      throw err;
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/budgets')} className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Transportation Action Plan</h1>
            <p className="text-sm text-slate-500 font-medium">{budget?.title} • FY {budget?.year}</p>
          </div>
        </div>
        <Button onClick={handleAddRoute} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest h-11 px-6 rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Plan New Route
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {routes.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                <Navigation className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No Routes Planned Yet</h3>
              <p className="text-slate-500 max-w-xs mt-2">Start by planning your first transportation route for this budget.</p>
              <Button onClick={handleAddRoute} variant="outline" className="mt-6 rounded-xl font-bold uppercase text-[10px] tracking-widest">
                Create First Route
              </Button>
            </CardContent>
          </Card>
        ) : (
          routes.map((route) => (
            <Card key={route.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="bg-slate-50/50 border-b py-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                    <Truck className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight">{route.name}</CardTitle>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Starts: {route.start_date}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> From: {route.starting_point}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditRoute(route)} className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteRoute(route.id)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Route Sequence</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-bold px-3 py-1">
                          {route.starting_point}
                        </Badge>
                        {route.transportation_route_stops?.sort((a: any, b: any) => a.sequence_order - b.sequence_order).map((stop: any, idx: number) => (
                          <React.Fragment key={stop.id}>
                            <ArrowRight className="w-3 h-3 text-slate-300" />
                            <div className="flex flex-col items-center">
                              <Badge className="bg-indigo-600 text-white font-bold px-3 py-1">
                                {stop.region_name}
                              </Badge>
                              <span className="text-[8px] font-bold text-slate-400 mt-1">{stop.delivery_date}</span>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {route.transportation_route_vehicles?.map((v: any) => (
                        <div key={v.id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100">
                          <Truck className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{v.quantity}x {v.vehicle_type.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-center">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Load</p>
                        <div className="flex items-baseline gap-2">
                          <h4 className="text-3xl font-black tracking-tighter">{route.total_boxes}</h4>
                          <span className="text-xs font-bold text-slate-400 uppercase">Boxes</span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Estimated Weight</p>
                        <h4 className="text-xl font-black tracking-tight">{route.total_tons} Tons</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <RouteFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleSaveRoute}
        initialData={editingRoute}
        budgetId={id!}
      />
    </div>
  );
};

export default ActionPlanPage;