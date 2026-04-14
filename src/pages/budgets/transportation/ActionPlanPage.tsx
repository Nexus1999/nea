"use client";

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit2,
  Truck, 
  Shield,
  ArrowRight,
  LayoutDashboard,
  Weight,
  Package,
  MapPin,
  Calendar
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
import { showSuccess } from "@/utils/toast";
import RouteFormDrawer from "@/components/budgets/transportation/RouteFormDrawer";

interface Region {
  id: string;
  name: string;
  boxes: number;
  deliveryDate: string;
  receivingPlace: string;
}

interface Route {
  id: string;
  name: string;
  loadingDate: string;
  startDate: string;
  lorryCount: number;
  escortCount: number;
  regions: Region[];
}

const ActionPlanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [routes, setRoutes] = useState<Route[]>([
    { 
      id: '1', 
      name: 'NORTHERN ROUTE', 
      loadingDate: '2024-10-15', 
      startDate: '2024-10-16',
      lorryCount: 1,
      escortCount: 1,
      regions: [
        { id: 'r1', name: 'Arusha', boxes: 45, deliveryDate: '2024-10-17', receivingPlace: 'Regional Office' },
        { id: 'r2', name: 'Kilimanjaro', boxes: 38, deliveryDate: '2024-10-18', receivingPlace: 'Police Station' }
      ]
    }
  ]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);

  const handleAddRoute = () => {
    setEditingRoute(null);
    setIsDrawerOpen(true);
  };

  const handleEditRoute = (route: Route) => {
    setEditingRoute(route);
    setIsDrawerOpen(true);
  };

  const handleFormSubmit = (data: any) => {
    if (editingRoute) {
      setRoutes(routes.map(r => r.id === editingRoute.id ? { ...data, id: r.id } : r));
      showSuccess("Route updated successfully");
    } else {
      setRoutes([...routes, { ...data, id: Math.random().toString(36).substr(2, 9) }]);
      showSuccess("New route added to action plan");
    }
    setIsDrawerOpen(false);
  };

  const handleDeleteRoute = (routeId: string) => {
    setRoutes(routes.filter(r => r.id !== routeId));
    showSuccess("Route removed");
  };

  // Calculate weight in tons (34kg per box)
  const calculateWeight = (boxes: number) => (boxes * 34) / 1000;

  return (
    <div className="space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
            <span className="hover:text-indigo-600 cursor-pointer" onClick={() => navigate('/dashboard/budgets')}>Budgets</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900">Transportation Action Plan</span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">Action Plan</h1>
        </div>

        <Button onClick={handleAddRoute} className="h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[11px] tracking-widest px-8 shadow-xl shadow-indigo-100">
          <Plus className="w-4 h-4 mr-2" /> Add New Route
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden ring-1 ring-slate-200/50">
        <CardHeader className="bg-slate-50/50 border-b px-10 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white text-slate-900 rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Route Distribution Matrix</CardTitle>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Defined routes and regional delivery schedules</p>
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Routes</p>
                <p className="text-2xl font-black text-slate-900">{routes.length}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Boxes</p>
                <p className="text-2xl font-black text-indigo-600">
                  {routes.reduce((sum, r) => sum + r.regions.reduce((s, reg) => s + reg.boxes, 0), 0)}
                </p>
              </div>
            </div>
          </div>
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
                      {route.regions.map((region, regionIdx) => (
                        <TableRow key={region.id} className="hover:bg-slate-50/30 border-b border-slate-100 transition-colors">
                          {/* NA Column */}
                          <TableCell className="px-8 py-4 text-xs font-bold text-slate-400">
                            {routeIdx + 1}.{regionIdx + 1}
                          </TableCell>

                          {/* MSAFARA Column (Merged Vertically) */}
                          {regionIdx === 0 && (
                            <TableCell rowSpan={route.regions.length} className="bg-white border-r border-slate-100 align-top pt-4">
                              <div className="space-y-1">
                                <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{route.name}</p>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                    <Calendar className="w-2.5 h-2.5" /> Load: {route.loadingDate}
                                  </span>
                                  <span className="text-[9px] font-bold text-indigo-600 uppercase flex items-center gap-1">
                                    <Truck className="w-2.5 h-2.5" /> Start: {route.startDate}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          )}

                          {/* Region Details */}
                          <TableCell className="font-bold text-slate-700 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-indigo-400" />
                              {region.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 font-medium">{region.receivingPlace}</TableCell>
                          <TableCell className="text-xs text-slate-500 font-medium">{region.deliveryDate}</TableCell>
                          
                          {/* Boxes & Weight */}
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

                          {/* Vehicles (Merged Vertically) */}
                          {regionIdx === 0 && (
                            <>
                              <TableCell rowSpan={route.regions.length} className="bg-white border-x border-slate-100 text-center align-middle">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mx-auto">
                                    <Truck className="w-4 h-4" />
                                  </div>
                                  <span className="text-lg font-black text-slate-900">{route.lorryCount}</span>
                                </div>
                              </TableCell>
                              <TableCell rowSpan={route.regions.length} className="bg-white border-r border-slate-100 text-center align-middle">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center mx-auto">
                                    <Shield className="w-4 h-4" />
                                  </div>
                                  <span className="text-lg font-black text-slate-900">{route.escortCount}</span>
                                </div>
                              </TableCell>
                              <TableCell rowSpan={route.regions.length} className="bg-white px-8 text-right align-middle">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditRoute(route)} className="h-9 w-9 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteRoute(route.id)} className="h-9 w-9 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50">
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

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-6 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard/budgets')}
            className="text-slate-500 font-bold uppercase text-[10px] tracking-widest h-12 rounded-2xl px-8"
          >
            Cancel Action Plan
          </Button>
          
          <Button 
            onClick={() => navigate(`/dashboard/budgets/transportation/template/${id}`)}
            className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[11px] tracking-widest h-12 rounded-2xl px-12 shadow-2xl shadow-slate-200"
            disabled={routes.length === 0}
          >
            Generate Budget Template <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <RouteFormDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingRoute}
      />
    </div>
  );
};

export default ActionPlanPage;