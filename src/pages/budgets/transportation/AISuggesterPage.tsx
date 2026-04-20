"use client";

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Sparkles, 
  RefreshCw, 
  Loader2, 
  ArrowRight,
  Calendar,
  Package,
  Truck,
  CheckCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { generateIntelligentRoutes, SuggestedMsafara, RegionDemand } from "@/utils/intelligentRoutePlanner";
import { showSuccess, showError } from "@/utils/toast";

const AISuggesterPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedMsafara[]>([]);
  const [selectedDate, setSelectedDate] = useState("");

  const fetchAndPlan = async () => {
    if (!selectedDate) {
      showError("Please select a loading date");
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase
        .from('transportation_region_boxes')
        .select('region_name, boxes_count')
        .eq('budget_id', id)
        .gt('boxes_count', 0);

      if (!data || data.length === 0) {
        showError("No regional demands found. Please add box counts first.");
        return;
      }

      const demands: RegionDemand[] = data.map(d => ({
        region: d.region_name,
        boxes: d.boxes_count
      }));

      const plannedRoutes = generateIntelligentRoutes(demands, selectedDate);
      setSuggestions(plannedRoutes);
    } catch (err: any) {
      showError("Failed to generate suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (msafara: SuggestedMsafara) => {
    try {
      const { data: route, error: rError } = await supabase
        .from('transportation_routes')
        .insert({
          budget_id: id,
          name: msafara.name,
          starting_point: msafara.startingPoint,
          start_date: msafara.startDate,
          loading_date: msafara.loadingDate,
          total_boxes: msafara.totalBoxes,
          total_tons: msafara.totalTons,
        })
        .select()
        .single();

      if (rError) throw rError;
      if (!route) throw new Error("Failed to create route");

      await supabase.from('transportation_route_vehicles').insert(
        msafara.vehicles.map(v => ({
          route_id: route.id,
          vehicle_type: v.type === 'TT' ? 'TRUCK_AND_TRAILER' : 
                       v.type === 'T' ? 'STANDARD_TRUCK' : 'ESCORT_VEHICLE',
          quantity: v.quantity
        }))
      );

      await supabase.from('transportation_route_stops').insert(
        msafara.regions.map((r, idx) => ({
          route_id: route.id,
          region_name: r.name,
          receiving_place: r.receivingPlace,
          boxes_count: r.boxes,
          delivery_date: r.delivery_date || r.deliveryDate,
          sequence_order: idx
        }))
      );

      return true;
    } catch (err: any) {
      console.error(err);
      return false;
    }
  };

  const handleApproveAll = async () => {
    if (suggestions.length === 0) return;
    setApplying(true);
    let count = 0;

    for (const s of [...suggestions]) {
      const success = await handleApply(s);
      if (success) count++;
    }
    
    if (count > 0) {
      showSuccess(`Successfully applied ${count} route(s)`);
      setSuggestions([]);
      navigate(`/dashboard/budgets/action-plan/${id}`);
    } else {
      showError("Failed to apply some routes");
    }
    setApplying(false);
  };

  return (
    <Card className="">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center gap-4">
           
          <div>
            <CardTitle className="text-2xl font-bold">System Route Suggester</CardTitle>
          </div>
        </div>

        <div className="flex gap-3">
          {suggestions.length > 0 && (
            <Button 
              onClick={handleApproveAll}
              disabled={applying}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Approve All</>}
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => navigate(`/dashboard/budgets/transportation/route-planner/${id}`)}
          >
            Manual Planner
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Date Selector Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Loading Date</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-11"
              />
            </div>
            <Button 
              onClick={fetchAndPlan} 
              disabled={loading || !selectedDate}
              className="bg-black hover:bg-gray-800 h-11 px-8"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RefreshCw className="h-4 w-4 mr-2" /> Generate AI Suggestions</>}
            </Button>
          </CardContent>
        </Card>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">AI Suggested Routes ({suggestions.length})</h3>
            </div>

            <div className="space-y-6">
              {suggestions.map((msafara, index) => (
                <Card key={index} className="overflow-hidden border border-slate-200">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-black tracking-tight">{msafara.name}</h3>
                          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">AI OPTIMIZED</Badge>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span>Loading: <strong>{msafara.loadingDate}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <span>Travel: <strong>{msafara.startDate}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-slate-500" />
                            <span><strong>{msafara.totalBoxes}</strong> Boxes • <strong>{msafara.totalTons}T</strong></span>
                          </div>
                        </div>

                        {/* Route Flow */}
                        <div className="mt-5 flex items-center flex-wrap gap-2">
                          <Badge variant="outline" className="font-medium">DAR ES SALAAM</Badge>
                          <ArrowRight className="w-4 h-4 text-slate-300" />
                          {msafara.regions.map((r, i) => (
                            <React.Fragment key={i}>
                              <Badge variant="outline" className="font-medium">{r.name}</Badge>
                              {i < msafara.regions.length - 1 && <ArrowRight className="w-4 h-4 text-slate-300" />}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {/* Vehicles */}
                      <div className="lg:w-72 pt-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Vehicles</p>
                        <div className="flex flex-wrap gap-2">
                          {msafara.vehicles.map((v, i) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl">
                              <Truck className="w-4 h-4" />
                              <span className="text-sm font-semibold">{v.quantity}× {v.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {suggestions.length === 0 && !loading && (
          <div className="py-24 text-center border border-dashed border-slate-200 rounded-3xl">
            <Sparkles className="h-16 w-16 text-slate-200 mx-auto mb-6" />
            <p className="text-slate-400 font-medium">No suggestions yet</p>
            <p className="text-sm text-slate-500 mt-1">Select a loading date and click Generate to see AI recommendations</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AISuggesterPage;