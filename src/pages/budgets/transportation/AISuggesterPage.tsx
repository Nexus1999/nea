"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, RefreshCw, CheckCircle2, Truck, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import { generateIntelligentRoutes } from "@/utils/intelligentRoutePlanner";

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
      // Mock demands for demonstration - in real app, fetch from regional_demands table
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/budgets')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              AI Route Suggester
            </h1>
            <p className="text-sm text-muted-foreground">{budget?.title} ({budget?.year})</p>
          </div>
        </div>
        <Button 
          onClick={handleGenerate} 
          disabled={suggesting}
          className="bg-purple-600 hover:bg-purple-700 gap-2"
        >
          {suggesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate Suggestions
        </Button>
      </div>

      {suggestions.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-4 bg-purple-50 rounded-full mb-4">
              <Sparkles className="h-10 w-10 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold">No Suggestions Yet</h3>
            <p className="text-muted-foreground max-w-md mt-2">
              Click the button above to let our AI analyze regional demands and suggest the most efficient transportation routes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {suggestions.map((route, idx) => (
            <Card key={idx} className="overflow-hidden border-l-4 border-l-purple-500">
              <CardHeader className="bg-slate-50/50 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-purple-600" />
                    {route.name}
                  </CardTitle>
                  <Badge variant="outline" className="bg-white">{route.totalBoxes} Boxes</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Route Path:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {route.pathDisplay.map((point: string, pIdx: number) => (
                      <React.Fragment key={pIdx}>
                        <Badge variant="secondary">{point}</Badge>
                        {pIdx < route.pathDisplay.length - 1 && <span className="text-slate-300">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="pt-4 border-t flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      Est. Distance: <span className="font-bold text-slate-900">{route.totalKm} KM</span>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Apply Route
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AISuggesterPage;