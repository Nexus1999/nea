"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  ChevronRight,
  Package,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import { generateIntelligentRoutes, SuggestedMsafara } from "@/utils/intelligentRoutePlanner";
import { Badge } from "@/components/ui/badge";

const AISuggesterPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [budget, setBudget] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<SuggestedMsafara[]>([]);
  const [demands, setDemands] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: budgetData, error: bErr } = await supabase
          .from('budgets')
          .select('*')
          .eq('id', id)
          .single();
        if (bErr) throw bErr;
        setBudget(budgetData);

        const { data: demandsData, error: dErr } = await supabase
          .from('regional_demands')
          .select('region, boxes')
          .eq('budget_id', id);
        if (dErr) throw dErr;
        setDemands(demandsData || []);

      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleGenerate = async () => {
    if (demands.length === 0) {
      showError("No regional demands found for this budget. Please add demands first.");
      return;
    }

    setSuggesting(true);
    try {
      const { data: distances } = await supabase
        .from('regional_distances')
        .select('*');

      const formattedDemands = demands.map(d => ({
        region: d.region,
        boxes: d.boxes
      }));

      const routes = generateIntelligentRoutes(
        formattedDemands, 
        budget?.start_date || new Date().toISOString(),
        distances || []
      );

      setSuggestions(routes);
      showSuccess(`Generated ${routes.length} optimized routes`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSuggesting(false);
    }
  };

  const handleApplySuggestions = async () => {
    setSuggesting(true);
    try {
      const { error: delErr } = await supabase
        .from('transportation_routes')
        .delete()
        .eq('budget_id', id);
      if (delErr) throw delErr;

      for (const route of suggestions) {
        const { data: newRoute, error: rErr } = await supabase
          .from('transportation_routes')
          .insert({
            budget_id: id,
            name: route.name,
            starting_point: route.startingPoint,
            loading_date: route.loadingDate,
            start_date: route.startDate,
            total_boxes: route.totalBoxes,
            total_tons: route.totalTons,
          })
          .select()
          .single();

        if (rErr) throw rErr;

        const vehiclePayload = route.vehicles.map(v => ({
          route_id: newRoute.id,
          vehicle_type: v.type === 'TT' ? 'TRUCK_AND_TRAILER' : v.type === 'T' ? 'STANDARD_TRUCK' : 'ESCORT_VEHICLE',
          quantity: v.quantity
        }));
        await supabase.from('transportation_route_vehicles').insert(vehiclePayload);

        const stopPayload = route.regions.map((reg, idx) => ({
          route_id: newRoute.id,
          region_name: reg.name,
          receiving_place: reg.receivingPlace,
          boxes_count: reg.boxes,
          delivery_date: reg.deliveryDate,
          sequence_order: idx
        }));
        await supabase.from('transportation_route_stops').insert(stopPayload);
      }

      showSuccess("All suggested routes have been applied to your action plan");
      navigate(`/dashboard/budgets/action-plan/${id}`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSuggesting(false);
    }
  };

  if (loading) return <div className="flex h-[400px] items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 space-y-10 max-w-[1700px] mx-auto pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/dashboard/budgets')}>Budgets</span>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate(`/dashboard/budgets/action-plan/${id}`)}>Action Plan</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900">AI Suggester</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-purple-600" /> AI Route Suggester
          </h1>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="ghost"
            onClick={() => navigate(-1)}
            className="rounded-xl h-11 px-6 font-bold uppercase text-[10px] tracking-widest"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={suggesting || demands.length === 0}
            className="rounded-xl h-11 px-8 bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-purple-100"
          >
            {suggesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Suggestions
          </Button>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
          <div className="p-6 bg-purple-50 rounded-3xl mb-6">
            <Sparkles className="h-12 w-12 text-purple-400" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            {demands.length > 0 ? "Ready to Optimize?" : "No Demands Found"}
          </h3>
          <p className="text-slate-500 max-w-md text-center mt-2 font-medium">
            {demands.length > 0 
              ? "Our AI engine will analyze regional demands, distances, and vehicle capacities to suggest the most cost-effective routes."
              : "Please add regional demands to this budget before using the AI Suggester."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 font-bold px-4 py-1.5 rounded-full">
                {suggestions.length} ROUTES SUGGESTED
              </Badge>
              <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-bold px-4 py-1.5 rounded-full">
                {suggestions.reduce((sum, r) => sum + r.totalBoxes, 0)} TOTAL BOXES
              </Badge>
            </div>
            <Button 
              onClick={handleApplySuggestions}
              disabled={suggesting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-[10px] tracking-widest h-11 px-8 shadow-lg shadow-emerald-100"
            >
              {suggesting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Apply All Suggestions
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {suggestions.map((route, idx) => (
              <Card key={idx} className="border-none bg-white shadow-sm hover:shadow-xl transition-all rounded-[2.5rem] overflow-hidden ring-1 ring-slate-200/50 group">
                <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase tracking-tight text-lg">{route.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suggested Route {idx + 1}</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-500 text-white border-none px-4 py-1 rounded-full font-black">
                    {route.totalBoxes} BOXES
                  </Badge>
                </div>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <MapPin className="h-3.5 w-3.5" /> Delivery Sequence
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {route.pathDisplay.map((point: string, pIdx: number) => (
                        <React.Fragment key={pIdx}>
                          <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-xs font-black text-slate-700">
                            {point}
                          </div>
                          {pIdx < route.pathDisplay.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                    <div className="p-4 bg-slate-50/50 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Est. Distance</p>
                      <p className="text-xl font-black text-slate-900">{route.totalKm} KM</p>
                    </div>
                    <div className="p-4 bg-slate-50/50 rounded-2xl">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Est. Weight</p>
                      <p className="text-xl font-black text-slate-900">{route.totalTons} Tons</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vehicle Configuration</p>
                    <div className="flex flex-wrap gap-2">
                      {route.vehicles.map((v, vIdx) => (
                        <Badge key={vIdx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                          {v.quantity}x {v.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AISuggesterPage;