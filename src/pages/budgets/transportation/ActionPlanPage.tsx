"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Wand2,
  Truck,
  Calendar,
  Save,
  RefreshCw,
  Info
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import SmartRouteSuggester from "@/components/budgets/transportation/SmartRouteSuggester";
import { generateIntelligentRoutes, SuggestedMsafara } from "@/utils/intelligentRoutePlanner";

const ActionPlanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [budget, setBudget] = useState<any>(null);
  const [loadingDate, setLoadingDate] = useState(new Date().toISOString().split('T')[0]);
  const [suggestedRoutes, setSuggestedRoutes] = useState<SuggestedMsafara[]>([]);

  useEffect(() => {
    fetchBudgetData();
  }, [id]);

  const fetchBudgetData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setBudget(data);
    } catch (err: any) {
      showError(err.message || "Failed to load budget data");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRoutes = async () => {
    if (!loadingDate) {
      showError("Please select a loading date first.");
      return;
    }

    setGenerating(true);
    try {
      // 1. Fetch Regional Demands using the correct table name
      const { data: demands, error: demandsError } = await supabase
        .from('transportation_region_boxes')
        .select('region_name, boxes_count')
        .eq('budget_id', id);

      if (demandsError) throw demandsError;

      if (!demands || demands.length === 0 || demands.every(d => d.boxes_count === 0)) {
        showError("No regional demands found. Please add box counts in the Regional Demands drawer first.");
        return;
      }

      // 2. Fetch Regional Distances
      const { data: distances, error: distError } = await supabase
        .from('region_distances')
        .select('*');

      if (distError) throw distError;

      // 3. Format demands for the planner
      const formattedDemands = demands
        .filter(d => d.boxes_count > 0)
        .map(d => ({
          region: d.region_name,
          boxes: d.boxes_count || 0
        }));

      // 4. Generate Routes
      const routes = generateIntelligentRoutes(formattedDemands, loadingDate, distances || []);
      
      setSuggestedRoutes(routes);
      showSuccess(`Generated ${routes.length} suggested routes based on demands.`);
    } catch (err: any) {
      showError(err.message || "Failed to generate routes");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="flex h-[400px] items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/budgets')} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">{budget?.title}</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Transportation Action Plan • {budget?.year}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={handleGenerateRoutes} 
            disabled={generating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest h-10 rounded-xl px-6"
          >
            {generating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Smart Route Generator
          </Button>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest h-10 rounded-xl px-6">
            <Save className="w-4 h-4 mr-2" /> Save Plan
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b py-4">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Logistics Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-w-xs space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loading Start Date</Label>
                <Input 
                  type="date" 
                  value={loadingDate} 
                  onChange={(e) => setLoadingDate(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 font-bold text-sm"
                />
                <p className="text-[9px] text-slate-400 italic">All route delivery dates will be calculated from this date.</p>
              </div>
            </CardContent>
          </Card>

          {suggestedRoutes.length > 0 ? (
            <SmartRouteSuggester routes={suggestedRoutes} />
          ) : (
            <Card className="border-dashed border-2 bg-slate-50/50 rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                  <Truck className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-400">No Routes Generated Yet</h3>
                <p className="text-sm text-slate-500 max-w-xs mt-2">
                  Click the "Smart Route Generator" button to automatically plan your logistics based on regional demands.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Plan Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Msafara</span>
                <span className="text-sm font-black">{suggestedRoutes.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Boxes</span>
                <span className="text-sm font-black">
                  {suggestedRoutes.reduce((sum, r) => sum + r.totalBoxes, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Distance</span>
                <span className="text-sm font-black">
                  {suggestedRoutes.reduce((sum, r) => sum + r.totalKm, 0).toLocaleString()} KM
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Important Note</p>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Ensure you have entered the box counts for each region in the <strong>Regional Demands</strong> drawer on the Budgets page before generating routes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionPlanPage;