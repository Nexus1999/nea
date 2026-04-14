"use client";

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Truck, 
  Calendar, 
  Package,
  ArrowRight,
  PlusCircle,
  Car,
  Info,
  MapPin
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess } from "@/utils/toast";

interface Vehicle {
  id: string;
  type: 'LORRY' | 'ESCORT_HARDTOP' | 'ESCORT_COASTER';
  quantity: number;
}

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
  vehicles: Vehicle[];
}

const ActionPlanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  const [routes, setRoutes] = useState<Route[]>([
    { 
      id: '1', 
      name: 'Northern Route', 
      loadingDate: '', 
      startDate: '',
      regions: [],
      vehicles: [
        { id: 'v1', type: 'LORRY', quantity: 1 },
        { id: 'v2', type: 'ESCORT_HARDTOP', quantity: 1 }
      ]
    }
  ]);

  const addRoute = () => {
    setRoutes([...routes, {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      loadingDate: '',
      startDate: '',
      regions: [],
      vehicles: [
        { id: Math.random().toString(36).substr(2, 9), type: 'LORRY', quantity: 1 },
        { id: Math.random().toString(36).substr(2, 9), type: 'ESCORT_HARDTOP', quantity: 1 }
      ]
    }]);
  };

  const updateRoute = (routeId: string, field: keyof Route, value: any) => {
    setRoutes(routes.map(r => r.id === routeId ? { ...r, [field]: value } : r));
  };

  const addVehicle = (routeId: string) => {
    setRoutes(routes.map(r => r.id === routeId ? {
      ...r,
      vehicles: [...r.vehicles, { id: Math.random().toString(36).substr(2, 9), type: 'LORRY', quantity: 1 }]
    } : r));
  };

  const updateVehicle = (routeId: string, vehicleId: string, field: keyof Vehicle, value: any) => {
    setRoutes(routes.map(r => r.id === routeId ? {
      ...r,
      vehicles: r.vehicles.map(v => v.id === vehicleId ? { ...v, [field]: value } : v)
    } : r));
  };

  const addRegion = (routeId: string) => {
    setRoutes(routes.map(r => r.id === routeId ? {
      ...r,
      regions: [...r.regions, {
        id: Math.random().toString(36).substr(2, 9),
        name: '',
        boxes: 0,
        deliveryDate: '',
        receivingPlace: ''
      }]
    } : r));
  };

  const updateRegion = (routeId: string, regionId: string, field: keyof Region, value: any) => {
    setRoutes(routes.map(r => r.id === routeId ? {
      ...r,
      regions: r.regions.map(reg => reg.id === regionId ? { ...reg, [field]: value } : reg)
    } : r));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
            <span className="hover:text-indigo-600 cursor-pointer" onClick={() => navigate('/dashboard/budgets')}>Budgets</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900">Transportation Action Plan</span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">Action Plan Setup</h1>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${step === 1 ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
            <span className="text-[11px] font-black uppercase tracking-widest">1. Routes & Vehicles</span>
          </div>
          <div className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${step === 2 ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
            <span className="text-[11px] font-black uppercase tracking-widest">2. Regions & Delivery</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-4 items-start">
        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-black text-indigo-900 uppercase tracking-wider">System Requirements</p>
          <p className="text-xs text-indigo-700 font-medium leading-relaxed">
            Each route automatically includes <span className="font-bold">2 Police Officers</span>, <span className="font-bold">1 Security Officer</span>, and <span className="font-bold">1 Exam Officer per region</span>. 
            Ensure at least one Lorry and one Escort vehicle are assigned per route.
          </p>
        </div>
      </div>

      {/* Step 1: Routes & Vehicles */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              Route Configuration
            </h2>
            <Button onClick={addRoute} className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest px-6">
              <PlusCircle className="w-4 h-4 mr-2" /> Add New Route
            </Button>
          </div>

          <div className="grid gap-6">
            {routes.map((route, index) => (
              <Card key={route.id} className="border-none shadow-sm rounded-3xl overflow-hidden ring-1 ring-slate-200">
                <div className="bg-slate-50/80 px-8 py-5 border-b flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Badge className="bg-slate-900 text-white rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest">Route #{index + 1}</Badge>
                    <Input 
                      className="h-10 bg-transparent border-none font-black text-xl uppercase tracking-tight focus-visible:ring-0 p-0 placeholder:text-slate-300" 
                      placeholder="Enter Route Name (e.g. COASTAL ROUTE)..."
                      value={route.name}
                      onChange={(e) => updateRoute(route.id, 'name', e.target.value)}
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={() => setRoutes(routes.filter(r => r.id !== route.id))}>
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
                
                <CardContent className="p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> Loading Date (Upakiaji)
                      </label>
                      <Input type="date" className="h-12 rounded-xl border-slate-200" value={route.loadingDate} onChange={(e) => updateRoute(route.id, 'loadingDate', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> Travel Start Date
                      </label>
                      <Input type="date" className="h-12 rounded-xl border-slate-200" value={route.startDate} onChange={(e) => updateRoute(route.id, 'startDate', e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                        <Car className="w-3.5 h-3.5" /> Vehicle Specification
                      </h4>
                      <Button variant="ghost" size="sm" className="h-8 text-indigo-600 font-bold uppercase text-[9px] tracking-widest" onClick={() => addVehicle(route.id)}>
                        <Plus className="w-3 h-3 mr-1" /> Add Vehicle
                      </Button>
                    </div>
                    
                    <div className="grid gap-3">
                      {route.vehicles.map((vehicle) => (
                        <div key={vehicle.id} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div className="flex-1">
                            <Select value={vehicle.type} onValueChange={(val: any) => updateVehicle(route.id, vehicle.id, 'type', val)}>
                              <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="LORRY">LORRY (Cargo)</SelectItem>
                                <SelectItem value="ESCORT_HARDTOP">ESCORT (Hardtop)</SelectItem>
                                <SelectItem value="ESCORT_COASTER">ESCORT (Coaster)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-32">
                            <Input 
                              type="number" 
                              className="h-10 rounded-xl border-slate-200 bg-white" 
                              value={vehicle.quantity} 
                              onChange={(e) => updateVehicle(route.id, vehicle.id, 'quantity', parseInt(e.target.value))}
                              placeholder="Qty"
                            />
                          </div>
                          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-600" onClick={() => updateRoute(route.id, 'vehicles', route.vehicles.filter(v => v.id !== vehicle.id))}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Regions & Delivery */}
      {step === 2 && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {routes.map((route) => (
            <div key={route.id} className="space-y-4">
              <div className="flex items-center gap-4 px-2">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl">
                  <Truck className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-xl uppercase tracking-tight text-slate-900">{route.name || 'Unnamed Route'}</h3>
                  <div className="flex gap-4 mt-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Starts: {route.startDate || 'TBD'}
                    </p>
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                      <Car className="w-3 h-3" /> {route.vehicles.reduce((sum, v) => sum + v.quantity, 0)} Vehicles
                    </p>
                  </div>
                </div>
                <Button onClick={() => addRegion(route.id)} className="h-10 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest px-6">
                  <Plus className="w-4 h-4 mr-2" /> Add Region
                </Button>
              </div>

              <div className="grid gap-4">
                {route.regions.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30">
                    <MapPin className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No regions assigned to this route yet</p>
                  </div>
                ) : (
                  route.regions.map((region) => (
                    <div key={region.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-6 items-end group hover:border-indigo-200 transition-all">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Region Name</label>
                        <Input 
                          placeholder="e.g. Arusha" 
                          className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white font-bold"
                          value={region.name}
                          onChange={(e) => updateRegion(route.id, region.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Boxes</label>
                        <div className="relative">
                          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input 
                            type="number" 
                            className="h-11 pl-10 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white font-bold"
                            value={region.boxes}
                            onChange={(e) => updateRegion(route.id, region.id, 'boxes', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Expected Delivery</label>
                        <Input 
                          type="date" 
                          className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white"
                          value={region.deliveryDate}
                          onChange={(e) => updateRegion(route.id, region.id, 'deliveryDate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Receiving Place</label>
                        <Input 
                          placeholder="e.g. Police Station" 
                          className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white"
                          value={region.receivingPlace}
                          onChange={(e) => updateRegion(route.id, region.id, 'receivingPlace', e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl h-11 w-11" onClick={() => updateRoute(route.id, 'regions', route.regions.filter(reg => reg.id !== region.id))}>
                          <Trash2 className="w-5 h-5" />
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

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Button 
            variant="ghost" 
            onClick={() => step === 1 ? navigate('/dashboard/budgets') : setStep(1)}
            className="text-slate-500 font-bold uppercase text-[10px] tracking-widest h-12 rounded-2xl px-8"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> {step === 1 ? 'Cancel' : 'Previous Step'}
          </Button>
          
          <Button 
            onClick={() => step === 1 ? setStep(2) : navigate(`/dashboard/budgets/transportation/template/${id}`)}
            className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[11px] tracking-widest h-12 rounded-2xl px-10 shadow-xl shadow-slate-200"
          >
            {step === 1 ? 'Next: Assign Regions' : 'Generate Budget Template'} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActionPlanPage;