"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  ChevronRight,
  Package,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import { generateIntelligentRoutes } from "@/utils/intelligentRoutePlanner";
import { Badge } from "@/components/ui/badge";

const AISuggesterPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [budget, setBudget] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        const { data, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setBudget(data);
      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBudget();
  }, [id]);

  const handleGenerate = async () => {
    setSuggesting(true);
    try {
      const mockDemands = [
        { region: 'ARUSHA', boxes: 150 },
        { region: 'KILIMANJARO', boxes: 120 },
        { region: 'MWANZA', boxes: 300 },
        { region: 'SHINYANGA', boxes: 200 },
      ];
      
      const routes = generateIntelligentRoutes(mockDemands, new Date().toISOString());
      setSuggestions(routes);
      showSuccess("AI Route suggestions generated");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSuggesting(false);
    }
  };

  if (loading) return <div className="flex h-[400px] items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 space-y-10 max-w-[1700px] mx-auto pb-32">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/dashboard/budgets')}>Budgets</span>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate(`/dashboard/budgets/overview/${id}`)}>Action Plan</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900">AI Suggester</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-purple-600" /> AI Route Suggester
          </h1>
        </div>
        
        <Button 
          onClick={handleGenerate} 
          disabled={suggesting}
          className="rounded-xl h-11 px-8 bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-purple-100"
        >
          {suggesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate Suggestions
        </Button>
      </div>

      {suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
          <div className="p-6 bg-purple-50 rounded-3xl mb-6">
            <Sparkles className="h-12 w-12 text-purple-400" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Ready to Optimize?</h3>
          <p className="text-slate-500 max-w-md text-center mt-2 font-medium">
            Our AI engine will analyze regional demands, distances, and vehicle capacities to suggest the most cost-effective routes.
          </p>
        </div>
      ) : (
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

                <Button className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Apply This Suggestion
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AISuggesterPage;