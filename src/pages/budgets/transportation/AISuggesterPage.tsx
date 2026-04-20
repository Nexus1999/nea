"use client";

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Sparkles, 
  RefreshCw, 
  Loader2, 
  CheckCircle2,
  ArrowRight,
  Calendar,
  Package,
  Truck,
  CheckCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
          total_boxes: msafara.totalBoxes,
          total_tons: msafara.totalTons,
        })
        .select()
        .single();

      if (rError) throw rError;

      await supabase.from('transportation_route_vehicles').insert(
        msafara.vehicles.map(v => ({
          route_id: route.id,
          vehicle_type: v.type === 'TT' ? 'TRUCK_AND_TRAILER' : v.type === 'T' ? 'STANDARD_TRUCK' : 'ESCORT_VEHICLE',
          quantity: v.quantity
        }))
      );

      await supabase.from('transportation_route_stops').insert(
        msafara.regions.map((r, idx) => ({
          route_id: route.id,
          region_name: r.name,
          receiving_place: r.receivingPlace,
          boxes_count: r.boxes,
          delivery_date: r.deliveryDate,
          sequence_order: idx
        }))
      );

      setSuggestions(prev => prev.filter(s => s.msafaraNumber !== msafara.msafaraNumber));
      return true;
    } catch (err: any) {
      showError(err.message);
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
    showSuccess(`Successfully applied ${count} routes`);
    setApplying(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/budgets/transportation/route-planner/${id}`)} className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">AI Route Suggester</h1>
        </div>
        <div className="flex gap-2">
          {suggestions.length > 0 && (
            <Button 
              onClick={handleApproveAll}
              disabled={applying}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg h-10 px-6"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Approve All</>}
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => navigate(`/dashboard/budgets/transportation/route-planner/${id}`)}
            className="border-2 border-slate-200 text-slate-600 hover:border-blue-600 hover:text-blue-600 text-[10px] font-black uppercase tracking-wider rounded-lg h-10 px-6 transition-all"
          >
            Manual Planner
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden border border-slate-100">
        <CardContent className="p-8 flex flex-col md:flex-row items-end gap-6">
          <div className="flex-1 space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Loading Date</Label>
            <Input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border-slate-200 h-11 rounded-xl focus:ring-indigo-500"
            />
          </div>
          <Button 
            onClick={fetchAndPlan} 
            disabled={loading || !selectedDate}
            className="h-11 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest px-8 rounded-xl"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RefreshCw className="h-4 w-4 mr-2" /> Generate Suggestions</>}
          </Button>
        </CardContent>
      </Card>

      <ScrollArea className="h-[600px]">
        <div className="grid grid-cols-1 gap-6">
          {suggestions.map((msafara) => (
            <Card key={msafara.msafaraNumber} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden group">
              <CardContent className="p-6 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{msafara.name}</h3>
                    <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 font-black text-[10px]">OPTIMIZED</Badge>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Starts: {msafara.startDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Package className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">{msafara.totalBoxes} Boxes ({msafara.totalTons}T)</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-600">DAR</span>
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                      {msafara.regions.map((r, idx) => (
                        <React.Fragment key={idx}>
                          <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 font-bold text-[10px]">{r.name}</Badge>
                          {idx < msafara.regions.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {msafara.vehicles.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100">
                        <Truck className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{v.quantity}x {v.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="md:w-48 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-6">
                  <Button 
                    onClick={() => {
                      handleApply(msafara);
                      showSuccess(`Applied ${msafara.name}`);
                    }}
                    className="w-full h-14 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Apply
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {suggestions.length === 0 && !loading && (
            <div className="py-20 text-center">
              <Sparkles className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Select a date to see AI suggestions</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AISuggesterPage;