"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, 
  Save, 
  Sparkles, 
  Plus, 
  Trash2, 
  MapPin,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";

const RoutePlannerPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    startingPoint: 'DAR ES SALAAM',
    startDate: '',
    loadingDate: '', // Added loadingDate
    vehicles: [{ type: 'TRUCK_AND_TRAILER', quantity: 1 }],
    stops: [] as any[]
  });

  useEffect(() => {
    fetchRegions();
    if (editId) fetchRouteData();
  }, [editId]);

  const fetchRegions = async () => {
    const { data } = await supabase.from('transportation_region_boxes').select('*').eq('budget_id', id).gt('boxes_count', 0);
    setRegions(data || []);
  };

  const fetchRouteData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('transportation_routes')
        .select('*, transportation_route_vehicles(*), transportation_route_stops(*)')
        .eq('id', editId)
        .single();

      if (data) {
        setFormData({
          name: data.name,
          startingPoint: data.starting_point,
          startDate: data.start_date,
          loadingDate: data.loading_date || data.start_date,
          vehicles: data.transportation_route_vehicles.map((v: any) => ({ type: v.vehicle_type, quantity: v.quantity })),
          stops: data.transportation_route_stops.sort((a: any, b: any) => a.sequence_order - b.sequence_order).map((s: any) => ({
            name: s.region_name,
            receivingPlace: s.receiving_place,
            boxes: s.boxes_count,
            deliveryDate: s.delivery_date
          }))
        });
      }
    } catch (err) {
      showError("Failed to load route");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.startDate || formData.stops.length === 0) {
      showError("Please fill in all required fields and add at least one stop");
      return;
    }

    setLoading(true);
    try {
      const totalBoxes = formData.stops.reduce((sum, s) => sum + Number(s.boxes), 0);
      const payload = {
        budget_id: id,
        name: formData.name,
        starting_point: formData.startingPoint,
        start_date: formData.startDate,
        loading_date: formData.loadingDate || formData.startDate, // Fixed: Added loading_date
        total_boxes: totalBoxes,
        total_tons: (totalBoxes * 34) / 1000,
      };

      let routeId = editId;
      if (editId) {
        await supabase.from('transportation_routes').update(payload).eq('id', editId);
        await supabase.from('transportation_route_vehicles').delete().eq('route_id', editId);
        await supabase.from('transportation_route_stops').delete().eq('route_id', editId);
      } else {
        const { data, error } = await supabase.from('transportation_routes').insert(payload).select().single();
        if (error) throw error;
        if (!data) throw new Error("Failed to create route record");
        routeId = data.id;
      }

      if (!routeId) throw new Error("Route ID is missing");

      await supabase.from('transportation_route_vehicles').insert(
        formData.vehicles.map(v => ({ route_id: routeId, vehicle_type: v.type, quantity: v.quantity }))
      );

      await supabase.from('transportation_route_stops').insert(
        formData.stops.map((s, idx) => ({
          route_id: routeId,
          region_name: s.name,
          receiving_place: s.receivingPlace,
          boxes_count: s.boxes,
          delivery_date: s.deliveryDate,
          sequence_order: idx
        }))
      );

      showSuccess("Route saved successfully");
      navigate(`/dashboard/budgets/action-plan/${id}`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && editId) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/budgets/action-plan/${id}`)} className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
            {editId ? 'Edit Route' : 'Manual Route Planner'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(`/dashboard/budgets/transportation/ai-suggester/${id}`)}
            className="border-2 border-slate-200 text-slate-600 hover:border-purple-600 hover:text-purple-600 text-[10px] font-black uppercase tracking-wider rounded-lg h-10 px-6 transition-all"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Use AI Suggester
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-lg h-10 px-8"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Route</>}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-none shadow-sm">
          <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Route Name</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Northern Corridor A" className="h-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Loading Date</Label>
                <Input type="date" value={formData.loadingDate} onChange={e => setFormData({...formData, loadingDate: e.target.value})} className="h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Start Date</Label>
                <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="h-10 rounded-xl" />
              </div>
            </div>
            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase text-slate-400">Vehicles</Label>
                <Button variant="ghost" size="sm" onClick={() => setFormData({...formData, vehicles: [...formData.vehicles, { type: 'ESCORT_VEHICLE', quantity: 1 }]})} className="h-7 text-indigo-600 font-bold text-[10px] uppercase">
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              {formData.vehicles.map((v, idx) => (
                <div key={idx} className="flex gap-2">
                  <Select value={v.type} onValueChange={val => {
                    const newV = [...formData.vehicles];
                    newV[idx].type = val;
                    setFormData({...formData, vehicles: newV});
                  }}>
                    <SelectTrigger className="h-9 rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRUCK_AND_TRAILER">Truck & Trailer (TT)</SelectItem>
                      <SelectItem value="STANDARD_TRUCK">Standard Truck (T)</SelectItem>
                      <SelectItem value="ESCORT_VEHICLE">Escort Vehicle (HT)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, vehicles: formData.vehicles.filter((_, i) => i !== idx)})} className="h-9 w-9 text-slate-300 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black uppercase tracking-widest">Delivery Stops</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setFormData({...formData, stops: [...formData.stops, { name: '', receivingPlace: '', boxes: 0, deliveryDate: '' }]})} className="h-7 text-indigo-600 font-bold text-[10px] uppercase">
              <Plus className="w-3 h-3 mr-1" /> Add Stop
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.stops.map((stop, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, stops: formData.stops.filter((_, i) => i !== idx)})} className="absolute -top-2 -right-2 h-6 w-6 bg-white shadow-sm rounded-full text-slate-300 hover:text-red-600">
                  <Trash2 className="h-3 w-3" />
                </Button>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-slate-400">Region</Label>
                  <Select value={stop.name} onValueChange={val => {
                    const newS = [...formData.stops];
                    const reg = regions.find(r => r.region_name === val);
                    newS[idx].name = val;
                    newS[idx].boxes = reg?.boxes_count || 0;
                    setFormData({...formData, stops: newS});
                  }}>
                    <SelectTrigger className="h-9 rounded-lg bg-white"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {regions.map(r => <SelectItem key={r.id} value={r.region_name}>{r.region_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-slate-400">Receiving Place</Label>
                  <Input value={stop.receivingPlace} onChange={e => {
                    const newS = [...formData.stops];
                    newS[idx].receivingPlace = e.target.value;
                    setFormData({...formData, stops: newS});
                  }} className="h-9 rounded-lg bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-slate-400">Boxes</Label>
                  <Input type="number" value={stop.boxes} onChange={e => {
                    const newS = [...formData.stops];
                    newS[idx].boxes = e.target.value;
                    setFormData({...formData, stops: newS});
                  }} className="h-9 rounded-lg bg-white" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-slate-400">Delivery Date</Label>
                  <Input type="date" value={stop.deliveryDate} onChange={e => {
                    const newS = [...formData.stops];
                    newS[idx].deliveryDate = e.target.value;
                    setFormData({...formData, stops: newS});
                  }} className="h-9 rounded-lg bg-white" />
                </div>
              </div>
            ))}
            {formData.stops.length === 0 && (
              <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <MapPin className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No stops added yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoutePlannerPage;