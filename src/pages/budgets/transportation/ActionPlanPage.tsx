"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  AlertTriangle
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
        // Update existing route
        const { error: routeError } = await supabase
          .from('transportation_routes')
          .update({
            name: formData.name,
            loading_date: formData.loadingDate,
            start_date: formData.startDate
          })
          .eq('id', editingRoute.id);

        if (routeError) throw routeError;

        // Delete old regions and vehicles
        await supabase.from('transportation_route_regions').delete().eq('route_id', editingRoute.id);
        await supabase.from('transportation_route_vehicles').delete().eq('route_id', editingRoute.id);

        // Insert new regions
        const { error: regionsError } = await supabase
          .from('transportation_route_regions')
          .insert(formData.regions.map((r: any) => ({
            route_id: editingRoute.id,
            region: r.name,
            boxes: r.boxes,
            expected_delivery_date: r.deliveryDate,
            receiving_place: r.receivingPlace
          })));

        if (regionsError) throw regionsError;

        // Insert new vehicles
        const { error: vehiclesError } = await supabase
          .from('transportation_route_vehicles')
          .insert([
            { route_id: editingRoute.id, vehicle_type: `LORRY_${formData.lorryType}`, quantity: formData.lorryCount },
            { route_id: editingRoute.id, vehicle_type: `ESCORT_${formData.escortType}`, quantity: 1 }
          ]);

        if (vehiclesError) throw vehiclesError;

        showSuccess("Route updated successfully");
      } else {
        // Create new route
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

        // Insert regions
        const { error: regionsError } = await supabase
          .from('transportation_route_regions')
          .insert(formData.regions.map((r: any) => ({
            route_id: routeData.id,
            region: r.name,
            boxes: r.boxes,
            expected_delivery_date: r.deliveryDate,
            receiving_place: r.receivingPlace
          })));

        if (regionsError) throw regionsError;

        // Insert vehicles
        const { error: vehiclesError } = await supabase
          .from('transportation_route_vehicles')
          .insert([
            { route_id: routeData.id, vehicle_type: `LORRY_${formData.lorryType}`, quantity: formData.lorryCount },
            { route_id: routeData.id, vehicle_type: `ESCORT_${formData.escortType}`, quantity: 1 }
          ]);

        if (vehiclesError) throw vehiclesError;

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

  const calculateWeight = (boxes: number) => (boxes * 34) / 1000;

  return (
    <Card className="relative min-h-[600px] border-none shadow-sm rounded-2xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flexthink
The user wants me to continue the previous response exactly where it left off.

Looking at the previous response:
It ended with:
```tsx
<Card className="relative min-h-[600px] border-none shadow-sm rounded-2xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex
```

I need to complete the `ActionPlanPage.tsx` file and then provide the summary and chat summary.

Wait, I should check if I need to finish the `dyad-write` block for `src/pages/budgets/transportation/ActionPlanPage.tsx`.

The previous block was:
```tsx
<dyad-write path="src/pages/budgets/transportation/ActionPlanPage.tsx" description="Updating Action Plan page to handle database CRUD operations and match MasterSummaries UI.">
"use client";
...
  return (
    <Card className="relative min-h-[600px] border-none shadow-sm rounded-2xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex
```

I will continue from `items-center justify-center z-50 rounded-lg">`.

Actually, I should probably just rewrite the whole file in a new `dyad-write` block to be safe, but the instructions say "Continue exactly where you left off". However, `dyad-write` blocks must be complete. If I just output text, it won't be valid.

Wait, the system instructions say:
"IMPORTANT: Only use ONE <dyad-write> block per file that you write!"
"do NOT be lazy and ALWAYS write the entire file. It needs to be a complete file."

Since the previous response was cut off, I should provide the *entire* file `src/pages/budgets/transportation/ActionPlanPage.tsx` again, but the user said "Continue exactly where you left off".

If I continue exactly where I left off, I'd be outputting code outside of a tag or inside a broken tag.
The best approach is to provide the full file in a `dyad-write` block.

Let's look at the code I was writing.

```tsx
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-lg">
          <Spinner label="Loading routes..." size="lg" />
        </div>
      )}

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 bg-slate-50/50 border-b">
        <div>
          <CardTitle className="text-2xl font-bold">Transportation Action Plan</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Manage routes, regions, and vehicle assignments</p>
        </div>
        <Button size="sm" className="h-9 gap-1 bg-slate-900 hover:bg-slate-800" onClick={handleAddRoute} disabled={loading}>
          <PlusCircle className="h-4 w-4" />
          <span>Add New Route</span>
        </Button>
      </CardHeader>

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
    </Card>
  );
};

export default ActionPlanPage;
```

I will provide the full file.items-center justify-center z-50 rounded-lg">
          <Spinner label="Loading routes..." size="lg" />
        </div>
      )}

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 bg-slate-50/50 border-b">
        <div>
          <CardTitle className="text-2xl font-bold">Transportation Action Plan</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Manage routes, regions, and vehicle assignments</p>
        </div>
        <Button size="sm" className="h-9 gap-1 bg-slate-900 hover:bg-slate-800" onClick={handleAddRoute} disabled={loading}>
          <PlusCircle className="h-4 w-4" />
          <span>Add New Route</span>
        </Button>
      </CardHeader>

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
    </Card>
  );
};

export default ActionPlanPage;