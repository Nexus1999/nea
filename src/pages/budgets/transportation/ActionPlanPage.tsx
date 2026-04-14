"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  Trash2, 
  Edit2,
  Truck, 
  Shield,
  LayoutDashboard,
  MapPin,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Package,
  Weight,
  ArrowLeft
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import RouteFormDrawer from "@/components/budgets/transportation/RouteFormDrawer";
import Spinner from "@/components/Spinner";

const ActionPlanPage = () => {
  const { id: budgetId } = useParams();
  const navigate = useNavigate();
  
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [deleteConfig, setDeleteConfig] = useState<{ open: boolean; id: string | null; name: string }>({
    open: false,
    id: null,
    name: ''
  });

  const fetchRoutes = useCallback(async () => {
    if (!budgetId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transportation_routes')
        .select(`
          *,
          transportation_route_regions(*),
          transportation_route_vehicles(*)
        `)
        .eq('budget_id', budgetId)
        .order('created_at');

      if (error) throw error;
      setRoutes(data || []);
    } catch (err: any) {
      showError(err.message || "Failed to fetch routes");
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    document.title = "Action Plan | NEAS";
    fetchRoutes();
  }, [fetchRoutes]);

  const handleAddRoute = () => {
    setEditingRoute(null);
    setIsDrawerOpen(true);
  };

  const handleEditRoute = (route: any) => {
    setEditingRoute(route);
    setIsDrawerOpen(true);
  };

  const handleFormSubmit = async (formData: any) => {
    if (!budgetId) return;

    try {
      if (editingRoute) {
        const { error: routeError } = await supabase
          .from('transportation_routes')
          .update({
            name: formData.name,
            loading_date: formData.loadingDate,
            start_date: formData.startDate
          })
          .eq('id', editingRoute.id);

        if (routeError) throw routeError;

        await supabase.from('transportation_route_regions').delete().eq('route_id', editingRoute.id);
        await supabase.from('transportation_route_vehicles').delete().eq('route_id', editingRoute.id);

        await supabase.from('transportation_route_regions').insert(formData.regions.map((r: any) => ({
          route_id: editingRoute.id,
          region: r.name,
          boxes: r.boxes,
          expected_delivery_date: r.deliveryDate,
          receiving_place: r.receivingPlace
        })));

        await supabase.from('transportation_route_vehicles').insert([
          { route_id: editingRoute.id, vehicle_type: `LORRY_${formData.lorryType}`, quantity: formData.lorryCount },
          { route_id: editingRoute.id, vehicle_type: `ESCORT_${formData.escortType}`, quantity: 1 }
        ]);

        showSuccess("Route updated successfully");
      } else {
        const { data: routeData, error: routeError } = await supabase
          .from('transportation_routes')
          .insert({
            budget_id: parseInt(budgetId),
            name: formData.name,
            loading_date: formData.loadingDate,
            start_date: formData.startDate
          })
          .select()
          .single();

        if (routeError) throw routeError;

        await supabase.from('transportation_route_regions').insert(formData.regions.map((r: any) => ({
          route_id: routeData.id,
          region: r.name,
          boxes: r.boxes,
          expected_delivery_date: r.deliveryDate,
          receiving_place: r.receivingPlace
        })));

        await supabase.from('transportation_route_vehicles').insert([
          { route_id: routeData.id, vehicle_type: `LORRY_${formData.lorryType}`, quantity: formData.lorryCount },
          { route_id: routeData.id, vehicle_type: `ESCORT_${formData.escortType}`, quantity: 1 }
        ]);

        showSuccess("New route added successfully");
      }
      fetchRoutes();
    } catch (err: any) {
      showError(err.message || "Failed to save route");
      throw err;
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfig.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('transportation_routes')
        .delete()
        .eq('id', deleteConfig.id);

      if (error) throw error;
      showSuccess("Route deleted successfully");
      fetchRoutes();
    } catch (err: any) {
      showError(err.message || "Failed to delete route");
    } finally {
      setLoading(false);
      setDeleteConfig({ open: false, id: null, name: '' });
    }
  };

  const stats = useMemo(() => {
    let totalBoxes = 0;
    let totalLorries = 0;
    let totalEscorts = 0;
    
    routes.forEach(r => {
      totalBoxes += r.transportation_route_regions.reduce((sum: number, reg: any) => sum + reg.boxes, 0);
      totalLorries += r.transportation_route_vehicles.find((v: any) => v.vehicle_type.startsWith('LORRY'))?.quantity || 0;
      totalEscorts += 1;
    });

    return {
      routes: routes.length,
      boxes: totalBoxes,
      weight: (totalBoxes * 34) / 1000,
      lorries: totalLorries,
      escorts: totalEscorts
    };
  }, [routes]);

  const calculateWeight = (boxes: number) => (boxes * 34) / 1000;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/budgets')} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Transportation Action Plan</h1>
            <p className="text-sm text-slate-500">Manage distribution routes and logistics</p>
          </div>
        </div>
        <Button size="sm" className="h-9 gap-1 bg-slate-900 hover:bg-slate-800" onClick={handleAddRoute} disabled={loading}>
          <PlusCircle className="h-4 w-4" />
          <span>Add New Route</span>
        </Button>
      </div>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Routes</p>
              <p className="text-xl font-black text-slate-900">{stats.routes}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Package size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Boxes</p>
              <p className="text-xl font-black text-slate-900">{stats.boxes}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Weight size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Weight</p>
              <p className="text-xl font-black text-slate-900">{stats.weight.toFixed(2)} <span className="text-xs font-bold text-slate-400">Tons</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Truck size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lorries</p>
              <p className="text-xl font-black text-slate-900">{stats.lorries}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escorts</p>
              <p className="text-xl font-black text-slate-900">{stats.escorts}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="relative min-h-[400px] border-none shadow-sm rounded-2xl overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-lg">
            <Spinner label="Loading routes..." size="lg" />
          </div>
        )}

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent border-b border-slate-200">
                  <TableHead className="w-[60px] text-[10px] font-black uppercase tracking-widest text-slate-500 px-8 py-5">NA</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Msafara (Route)</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Regions</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Receiving Place</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Delivery Date</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Boxes</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Uzito (Tons)</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Lori</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Escort</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 px-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-300">
                        <Truck className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No routes defined in action plan</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  routes.map((route, routeIdx) => (
                    <React.Fragment key={route.id}>
                      {route.transportation_route_regions.map((region: any, regionIdx: number) => (
                        <TableRow key={region.id} className="hover:bg-slate-50/30 border-b border-slate-100 transition-colors">
                          <TableCell className="px-8 py-4 text-xs font-bold text-slate-400">
                            {routeIdx + 1}.{regionIdx + 1}
                          </TableCell>

                          {regionIdx === 0 && (
                            <TableCell rowSpan={route.transportation_route_regions.length} className="bg-white border-r border-slate-100 align-top pt-4">
                              <div className="space-y-1">
                                <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{route.name}</p>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                    <Calendar className="w-2.5 h-2.5" /> Load: {route.loading_date}
                                  </span>
                                  <span className="text-[9px] font-bold text-blue-600 uppercase flex items-center gap-1">
                                    <Truck className="w-2.5 h-2.5" /> Start: {route.start_date}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          )}

                          <TableCell className="font-bold text-slate-700 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-blue-400" />
                              {region.region}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 font-medium">{region.receiving_place}</TableCell>
                          <TableCell className="text-xs text-slate-500 font-medium">{region.expected_delivery_date}</TableCell>
                          
                          <TableCell className="text-center">
                            <Badge variant="outline" className="rounded-lg border-slate-200 font-black text-xs px-3 py-1">
                              {region.boxes}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-black text-slate-900">{calculateWeight(region.boxes).toFixed(2)}</span>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Tons</span>
                            </div>
                          </TableCell>

                          {regionIdx === 0 && (
                            <>
                              <TableCell rowSpan={route.transportation_route_regions.length} className="bg-white border-x border-slate-100 text-center align-middle">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mx-auto">
                                    <Truck className="w-4 h-4" />
                                  </div>
                                  <span className="text-lg font-black text-slate-900">
                                    {route.transportation_route_vehicles.find((v: any) => v.vehicle_type.startsWith('LORRY'))?.quantity || 0}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell rowSpan={route.transportation_route_regions.length} className="bg-white border-r border-slate-100 text-center align-middle">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center mx-auto">
                                    <Shield className="w-4 h-4" />
                                  </div>
                                  <span className="text-lg font-black text-slate-900">1</span>
                                </div>
                              </TableCell>
                              <TableCell rowSpan={route.transportation_route_regions.length} className="bg-white px-8 text-right align-middle">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditRoute(route)} className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => setDeleteConfig({ open: true, id: route.id, name: route.name })} className="h-9 w-9 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RouteFormDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingRoute}
        budgetId={budgetId || ""}
      />

      <AlertDialog
        open={deleteConfig.open}
        onOpenChange={(open) => setDeleteConfig(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent className="max-w-[420px] rounded-2xl border border-slate-200 shadow-2xl p-6">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-slate-900">
                Are you sure?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-slate-700 text-center font-medium leading-relaxed mt-3">
              Are you sure you want to delete the route{" "}
              <span className="font-bold text-red-700">
                "{deleteConfig.name}"
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-row items-center gap-3 mt-8">
            <AlertDialogCancel className="flex-1 h-11 font-bold uppercase text-xs tracking-wider rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loading}
              className="flex-[1.5] h-11 font-black uppercase text-xs tracking-wider rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Yes, Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActionPlanPage;