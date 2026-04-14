"use client";

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  MapPin, 
  Truck, 
  Calendar, 
  Package,
  ArrowRight,
  PlusCircle,
  Save,
  LayoutDashboard
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { showSuccess } from "@/utils/toast";

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
  regions: Region[];
}

const ActionPlanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [routes, setRoutes] = useState<Route[]>([
    { 
      id: '1', 
      name: 'Northern Route', 
      loadingDate: '2024-10-15', 
      startDate: '2024-10-16',
      regions: [
        { id: 'r1', name: 'Arusha', boxes: 45, deliveryDate: '2024-10-17', receivingPlace: 'Regional Office' }
      ]
    }
  ]);

  const addRoute = () => {
    const newRoute: Route = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      loadingDate: '',
      startDate: '',
      regions: []
    };
    setRoutes([...routes, newRoute]);
  };

  const updateRoute = (routeId: string, field: keyof Route, value: any) => {
    setRoutes(routes.map(r => r.id === routeId ? { ...r, [field]: value } : r));
  };

  const removeRoute = (routeId: string) => {
    setRoutes(routes.filter(r => r.id !== routeId));
  };

  const addRegion = (routeId: string) => {
    setRoutes(routes.map(r => {
      if (r.id === routeId) {
        return {
          ...r,
          regions: [...r.regions, {
            id: Math.random().toString(36).substr(2, 9),
            name: '',
            boxes: 0,
            deliveryDate: '',
            receivingPlace: ''
          }]
        };
      }
      return r;
    }));
  };

  const updateRegion = (routeId: string, regionId: string, field: keyof Region, value: any) => {
    setRoutes(routes.map(r => {
      if (r.id === routeId) {
        return {
          ...r,
          regions: r.regions.map(reg => reg.id === regionId ? { ...reg, [field]: value } : reg)
        };
      }
      return r;
    }));
  };

  const removeRegion = (routeId: string, regionId: string) => {
    setRoutes(routes.map(r => {
      if (r.id === routeId) {
        return { ...r, regions: r.regions.filter(reg => reg.id !== regionId) };
      }
      return r;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
            <span className="hover:text-indigo-600 cursor-pointer" onClick={() => navigate('/dashboard/budgets')}>Budgets</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900">Transportation Action Plan</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Action Plan Setup</h1>
        </div>

        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${step === 1 ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest">1. Routes</span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${step === 2 ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>
            <span className="text-[10px] font-black uppercase tracking-widest">2. Regions</span>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-2xl overflow-hidden min-h-[500px]">
        <CardContent className="pt-8 max-w-5xl mx-auto">
          {step === 1 ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  Transportation Routes
                </h2>
                <Button onClick={addRoute} variant="outline" size="sm" className="h-9 rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold uppercase text-[10px] tracking-widest">
                  <PlusCircle className="w-3.5 h-3.5 mr-2" /> Add Route
                </Button>
              </div>

              {routes.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                  <Truck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No routes added yet</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {routes.map((route, index) => (
                    <div key={route.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="bg-slate-50/50 px-6 py-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Badge className="bg-slate-900 text-white rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest">Route #{index + 1}</Badge>
                          <Input 
                            className="h-9 bg-transparent border-none font-black text-lg uppercase tracking-tight focus-visible:ring-0 p-0 placeholder:text-slate-300" 
                            placeholder="Enter Route Name..."
                            value={route.name}
                            onChange={(e) => updateRoute(route.id, 'name', e.target.value)}
                          />
                        </div>
                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={() => removeRoute(route.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Loading Date
                          </label>
                          <Input 
                            type="date" 
                            className="h-11 rounded-xl border-slate-200"
                            value={route.loadingDate}
                            onChange={(e) => updateRoute(route.id, 'loadingDate', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Start Date
                          </label>
                          <Input 
                            type="date" 
                            className="h-11 rounded-xl border-slate-200"
                            value={route.startDate}
                            onChange={(e) => updateRoute(route.id, 'startDate', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {routes.map((route) => (
                <div key={route.id} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-lg uppercase tracking-tight text-slate-900">{route.name || 'Unnamed Route'}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Starts: {route.startDate || 'Not set'}</p>
                    </div>
                    <Button onClick={() => addRegion(route.id)} variant="outline" size="sm" className="h-9 rounded-xl border-slate-200 font-bold uppercase text-[10px] tracking-widest">
                      <Plus className="w-3 h-3 mr-1.5" /> Add Region
                    </Button>
                  </div>

                  <div className="grid gap-3">
                    {route.regions.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No regions assigned to this route</p>
                      </div>
                    ) : (
                      route.regions.map((region) => (
                        <div key={region.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-6 items-end group hover:border-indigo-200 transition-colors">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Region Name</label>
                            <Input 
                              placeholder="e.g. Arusha" 
                              className="h-10 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white"
                              value={region.name}
                              onChange={(e) => updateRegion(route.id, region.id, 'name', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Boxes</label>
                            <div className="relative">
                              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <Input 
                                type="number" 
                                className="h-10 pl-9 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white"
                                value={region.boxes}
                                onChange={(e) => updateRegion(route.id, region.id, 'boxes', parseInt(e.target.value))}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Delivery Date</label>
                            <Input 
                              type="date" 
                              className="h-10 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white"
                              value={region.deliveryDate}
                              onChange={(e) => updateRegion(route.id, region.id, 'deliveryDate', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Receiving Place</label>
                            <Input 
                              placeholder="e.g. Police Station" 
                              className="h-10 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white"
                              value={region.receivingPlace}
                              onChange={(e) => updateRegion(route.id, region.id, 'receivingPlace', e.target.value)}
                            />
                          </div>
                          <div className="flex justify-end">
                            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl h-10 w-10" onClick={() => removeRegion(route.id, region.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center pt-12 mt-12 border-t border-slate-100">
            <Button 
              variant="ghost" 
              onClick={() => step === 1 ? navigate('/dashboard/budgets') : setStep(1)}
              className="text-slate-500 font-bold uppercase text-[10px] tracking-widest h-11 rounded-xl px-6"
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> {step === 1 ? 'Back to Budgets' : 'Previous Step'}
            </Button>
            
            <Button 
              onClick={() => step === 1 ? setStep(2) : navigate(`/dashboard/budgets/transportation/template/${id}`)}
              className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest h-11 rounded-xl px-8 shadow-lg shadow-slate-200"
            >
              {step === 1 ? 'Next: Assign Regions' : 'Generate Template'} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActionPlanPage;