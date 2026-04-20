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
  Loader2,
  ArrowUp,
  ArrowDown,
  GripVertical
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
  const [saving, setSaving] = useState(false);
  const [regionsForStops, setRegionsForStops] = useState<any[]>([]);
  const [allRegions, setAllRegions] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    startingPoint: 'DAR ES SALAAM',
    loadingDate: '',
    travelDate: '',
    vehicles: [{ type: 'TRUCK_AND_TRAILER', quantity: 1 }],
    stops: [] as any[]
  });

  useEffect(() => {
    fetchAllRegions();
    fetchRegionsForStops();
    if (editId) fetchRouteData();
  }, [editId]);

  const fetchAllRegions = async () => {
    const { data } = await supabase
      .from('regions')
      .select('region_name, town')
      .order('region_name');
    setAllRegions(data || []);
  };

  const fetchRegionsForStops = async () => {
    try {
      const { data: boxesData } = await supabase
        .from('transportation_region_boxes')
        .select('region_name, boxes_count')
        .eq('budget_id', id)
        .gt('boxes_count', 0)
        .order('region_name');

      if (!boxesData?.length) return;

      const regionNames = boxesData.map(b => b.region_name);
      
      const { data: regionsData } = await supabase
        .from('regions')
        .select('region_name, town')
        .in('region_name', regionNames);

      const { data: daysData } = await supabase
        .from('transportation_days_guideline')
        .select('region_id, days_truck');

      const merged = boxesData.map(box => {
        const regionInfo = regionsData?.find(r => r.region_name === box.region_name);
        return {
          ...box,
          town: regionInfo?.town || '',
          days_truck: daysData?.find(d => true)?.days_truck || 2
        };
      });

      setRegionsForStops(merged);
    } catch (err) {
      console.error(err);
      showError("Failed to load regions");
    }
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
          loadingDate: data.loading_date || '',
          travelDate: data.start_date || '',
          vehicles: data.transportation_route_vehicles?.map((v: any) => ({ 
            type: v.vehicle_type, quantity: v.quantity 
          })) || [{ type: 'TRUCK_AND_TRAILER', quantity: 1 }],
          stops: data.transportation_route_stops
            ?.sort((a: any, b: any) => a.sequence_order - b.sequence_order)
            .map((s: any) => ({
              name: s.region_name,
              receivingPlace: s.receiving_place,
              boxes: s.boxes_count,
              deliveryDate: s.delivery_date
            })) || []
        });
      }
    } catch (err) {
      showError("Failed to load route");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadingDateChange = (date: string) => {
    setFormData(prev => {
      const newData = { ...prev, loadingDate: date };
      if (date) {
        const loading = new Date(date);
        loading.setDate(loading.getDate() + 1);
        newData.travelDate = loading.toISOString().split('T')[0];
      }
      return newData;
    });
  };

  const calculateDeliveryDate = (loadingDate: string, daysTruck: number = 2) => {
    if (!loadingDate) return '';
    const date = new Date(loadingDate);
    date.setDate(date.getDate() + daysTruck);
    return date.toISOString().split('T')[0];
  };

  // Reorder stops
  const moveStop = (index: number, direction: 'up' | 'down') => {
    const newStops = [...formData.stops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newStops.length) return;

    [newStops[index], newStops[targetIndex]] = [newStops[targetIndex], newStops[index]];
    setFormData({ ...formData, stops: newStops });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.travelDate || formData.stops.length === 0) {
      showError("Please fill all required fields and add at least one stop");
      return;
    }

    setSaving(true);
    try {
      const totalBoxes = formData.stops.reduce((sum, s) => sum + Number(s.boxes), 0);
      
      const payload = {
        budget_id: id,
        name: formData.name,
        starting_point: formData.startingPoint,
        start_date: formData.travelDate,
        loading_date: formData.loadingDate || formData.travelDate,
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
        routeId = data.id;
      }

      await supabase.from('transportation_route_vehicles').insert(
        formData.vehicles.map(v => ({ route_id: routeId, vehicle_type: v.type, quantity: v.quantity }))
      );

      await supabase.from('transportation_route_stops').insert(
        formData.stops.map((s, idx) => ({
          route_id: routeId,
          region_name: s.name,
          receiving_place: s.receivingPlace,
          boxes_count: Number(s.boxes),
          delivery_date: s.deliveryDate,
          sequence_order: idx
        }))
      );

      showSuccess(editId ? "Route updated successfully" : "Route created successfully");
      navigate(`/dashboard/budgets/action-plan/${id}`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && editId) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <Card className="">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center gap-4">
          
          <div>
            <CardTitle className="text-2xl font-bold">
              {editId ? 'Edit Route' : 'Manual Route Planner'}
            </CardTitle>
            
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(`/dashboard/budgets/transportation/ai-suggester/${id}`)}>
            <Sparkles className="w-4 h-4 mr-2" /> AI Suggester
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-black hover:bg-gray-800">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Route</>}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LEFT COLUMN - Tighter spacing */}
          <div className="md:col-span-1 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Route Name (Msafara)</Label>
                  <Select value={formData.name} onValueChange={(val) => setFormData({...formData, name: val})}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select Region" />
                    </SelectTrigger>
                    <SelectContent>
                      {allRegions.map(r => (
                        <SelectItem key={r.region_name} value={r.region_name}>{r.region_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Loading Date</Label>
                    <Input type="date" value={formData.loadingDate} onChange={(e) => handleLoadingDateChange(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Travel Date</Label>
                    <Input type="date" value={formData.travelDate} onChange={e => setFormData({...formData, travelDate: e.target.value})} className="h-11" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Starting Point</Label>
                  <Input value={formData.startingPoint} onChange={e => setFormData({...formData, startingPoint: e.target.value})} className="h-11" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Vehicles</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setFormData({...formData, vehicles: [...formData.vehicles, { type: 'ESCORT_VEHICLE', quantity: 1 }] })}>
                  <Plus className="w-4 h-4 mr-2" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {formData.vehicles.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                    <div className="flex-1">
                      <Select value={v.type} onValueChange={val => {
                        const newV = [...formData.vehicles];
                        newV[idx].type = val;
                        setFormData({...formData, vehicles: newV});
                      }}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TRUCK_AND_TRAILER">Truck & Trailer (TT)</SelectItem>
                          <SelectItem value="STANDARD_TRUCK">Standard Truck (T)</SelectItem>
                          <SelectItem value="ESCORT_VEHICLE_HT">Escort (HT)</SelectItem>
                          <SelectItem value="ESCORT_VEHICLE_COASTER">Escort (Coaster)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setFormData({...formData, vehicles: formData.vehicles.filter((_, i) => i !== idx)})}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN - Stops with Reordering */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Delivery Stops</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setFormData({...formData, stops: [...formData.stops, { name: '', receivingPlace: '', boxes: 0, deliveryDate: '' }] })}>
                  <Plus className="w-4 h-4 mr-2" /> Add Stop
                </Button>
              </CardHeader>
              <CardContent>
                {formData.stops.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                    <MapPin className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">No stops added yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.stops.map((stop, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl relative group">
                        <div className="absolute -left-2 top-4 text-slate-300">
                          <GripVertical className="h-5 w-5" />
                        </div>

                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveStop(idx, 'up')} disabled={idx === 0}>
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveStop(idx, 'down')} disabled={idx === formData.stops.length - 1}>
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setFormData({...formData, stops: formData.stops.filter((_, i) => i !== idx)})}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pl-6">
                          <div className="space-y-1.5">
                            <Label>Region (Mkoa)</Label>
                            <Select 
                              value={stop.name} 
                              onValueChange={(val) => {
                                const selected = regionsForStops.find(r => r.region_name === val);
                                const newStops = [...formData.stops];
                                newStops[idx] = {
                                  ...newStops[idx],
                                  name: val,
                                  receivingPlace: selected?.town || '',
                                  boxes: selected?.boxes_count || 0,
                                  deliveryDate: formData.loadingDate ? calculateDeliveryDate(formData.loadingDate, selected?.days_truck || 2) : ''
                                };
                                setFormData({...formData, stops: newStops});
                              }}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select Region" />
                              </SelectTrigger>
                              <SelectContent>
                                {regionsForStops.map(r => (
                                  <SelectItem key={r.region_name} value={r.region_name}>
                                    {r.region_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label>Receiving Place</Label>
                            <Input value={stop.receivingPlace} onChange={e => {
                              const newStops = [...formData.stops];
                              newStops[idx].receivingPlace = e.target.value;
                              setFormData({...formData, stops: newStops});
                            }} className="h-10" />
                          </div>

                          <div className="space-y-1.5">
                            <Label>Boxes (Makasha)</Label>
                            <Input type="number" value={stop.boxes} onChange={e => {
                              const newStops = [...formData.stops];
                              newStops[idx].boxes = e.target.value;
                              setFormData({...formData, stops: newStops});
                            }} className="h-10" />
                          </div>

                          <div className="space-y-1.5">
                            <Label>Delivery Date</Label>
                            <Input type="date" value={stop.deliveryDate} onChange={e => {
                              const newStops = [...formData.stops];
                              newStops[idx].deliveryDate = e.target.value;
                              setFormData({...formData, stops: newStops});
                            }} className="h-10" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoutePlannerPage;