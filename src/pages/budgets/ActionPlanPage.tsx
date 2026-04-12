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
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header & Stepper */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span className="hover:text-indigo-600 cursor-pointer" onClick={() => navigate('/dashboard/budgets')}>Budgets</span>
            <ChevronRight className="w-4 h-4" />
            <span className="font-medium text-slate-900">Action Plan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Budget Action Plan</h1>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${step === 1 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
            <span className="font-medium">Routes</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${step === 2 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
            <span className="font-medium">Regions</span>
          </div>
        </div>
      </div>

      {/* Step 1: Routes */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              Define Transportation Routes
            </h2>
            <Button onClick={addRoute} variant="outline" size="sm" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50">
              <Plus className="w-4 h-4 mr-2" /> Add Route
            </Button>
          </div>

          {routes.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Truck className="w-6 h-6 text-slate-300" />
              </div>
              <h3 className="text-slate-900 font-medium">No routes added yet</h3>
              <p className="text-slate-500 text-sm mt-1 mb-6">Start by adding the transportation routes for this budget.</p>
              <Button onClick={addRoute}>Add Your First Route</Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {routes.map((route, index) => (
                <Card key={route.id} className="border-slate-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 py-4 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-white">Route #{index + 1}</Badge>
                      <Input 
                        className="h-8 w-64 bg-transparent border-none font-semibold text-lg focus-visible:ring-0 p-0" 
                        placeholder="Enter Route Name..."
                        value={route.name}
                        onChange={(e) => updateRoute(route.id, 'name', e.target.value)}
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={() => removeRoute(route.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" /> Loading Date
                        </label>
                        <Input 
                          type="date" 
                          value={route.loadingDate}
                          onChange={(e) => updateRoute(route.id, 'loadingDate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" /> Start Date
                        </label>
                        <Input 
                          type="date" 
                          value={route.startDate}
                          onChange={(e) => updateRoute(route.id, 'startDate', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Regions per Route */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              Assign Regions to Routes
            </h2>
          </div>

          <div className="space-y-8">
            {routes.map((route) => (
              <div key={route.id} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 text-white p-2 rounded-lg">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{route.name || 'Unnamed Route'}</h3>
                    <p className="text-xs text-slate-500">Starts: {route.startDate || 'Not set'}</p>
                  </div>
                  <Separator className="flex-1" />
                  <Button onClick={() => addRegion(route.id)} variant="outline" size="sm" className="h-8">
                    <Plus className="w-3 h-3 mr-1" /> Add Region
                  </Button>
                </div>

                <div className="grid gap-4">
                  {route.regions.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-500 text-sm">
                      No regions assigned to this route yet.
                    </div>
                  ) : (
                    route.regions.map((region) => (
                      <div key={region.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Region Name</label>
                          <Input 
                            placeholder="e.g. Kilimanjaro" 
                            className="h-9"
                            value={region.name}
                            onChange={(e) => updateRegion(route.id, region.id, 'name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Boxes</label>
                          <div className="relative">
                            <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input 
                              type="number" 
                              className="h-9 pl-9"
                              value={region.boxes}
                              onChange={(e) => updateRegion(route.id, region.id, 'boxes', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Delivery Date</label>
                          <Input 
                            type="date" 
                            className="h-9"
                            value={region.deliveryDate}
                            onChange={(e) => updateRegion(route.id, region.id, 'deliveryDate', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Receiving Place</label>
                          <Input 
                            placeholder="e.g. Police Station" 
                            className="h-9"
                            value={region.receivingPlace}
                            onChange={(e) => updateRegion(route.id, region.id, 'receivingPlace', e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 h-9 w-9" onClick={() => removeRegion(route.id, region.id)}>
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
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex justify-between items-center pt-6 border-t border-slate-200">
        <Button 
          variant="ghost" 
          onClick={() => step === 1 ? navigate('/dashboard/budgets') : setStep(1)}
          className="text-slate-600"
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> {step === 1 ? 'Back to Budgets' : 'Previous Step'}
        </Button>
        
        <Button 
          onClick={() => step === 1 ? setStep(2) : navigate(`/dashboard/budgets/template/${id}`)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
        >
          {step === 1 ? 'Next: Assign Regions' : 'Generate Template'} <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ActionPlanPage;