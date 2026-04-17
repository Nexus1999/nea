"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Sparkles, 
  Truck, 
  Calendar, 
  Package, 
  ArrowRight, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateIntelligentRoutes, SuggestedMsafara, RegionDemand } from "@/utils/intelligentRoutePlanner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SmartRouteSuggesterProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (msafara: SuggestedMsafara) => void;
  loadingDate: string;
  budgetId: string;
}

const SmartRouteSuggester: React.FC<SmartRouteSuggesterProps> = ({
  isOpen,
  onClose,
  onSelect,
  loadingDate: initialLoadingDate,
  budgetId,
}) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedMsafara[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(initialLoadingDate || "");

  const fetchAndPlan = async (dateToUse: string) => {
    if (!dateToUse) {
      setError("Please select a loading date to generate suggestions.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('transportation_region_boxes')
        .select('region_name, boxes_count')
        .eq('budget_id', budgetId)
        .gt('boxes_count', 0);

      if (fetchError) throw fetchError;

      if (!data || data.length === 0) {
        setError("No regional demands found. Please add box counts in the 'Manage Regional Demands' section first.");
        setSuggestions([]);
        return;
      }

      const demands: RegionDemand[] = data.map(d => ({
        region: d.region_name,
        boxes: d.boxes_count
      }));

      const plannedRoutes = generateIntelligentRoutes(demands, dateToUse);
      setSuggestions(plannedRoutes);
    } catch (err: any) {
      setError(err.message || "Failed to generate suggestions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(initialLoadingDate || "");
      if (initialLoadingDate) {
        fetchAndPlan(initialLoadingDate);
      }
    }
  }, [isOpen, initialLoadingDate]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-slate-900 text-white p-8 shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">
                AI Route Suggester
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 text-base">
              Plan your logistics sequence based on real-time regional demands.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 flex items-end gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex-1 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Loading Date</Label>
              <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white/10 border-white/20 text-white h-11 rounded-xl focus:ring-indigo-500"
              />
            </div>
            <Button 
              onClick={() => fetchAndPlan(selectedDate)} 
              disabled={loading || !selectedDate}
              className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest px-6 rounded-xl"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Generate Suggestions
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-slate-50">
          {loading ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Analyzing logistics clusters...</p>
            </div>
          ) : error ? (
            <div className="h-[400px] flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Action Required</h3>
              <p className="text-slate-500 max-w-md">{error}</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="h-[400px] flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Ready to Plan</h3>
              <p className="text-slate-500 max-w-md">Select a loading date above to see optimized route suggestions.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] p-6">
              <div className="grid grid-cols-1 gap-6">
                {suggestions.map((msafara) => (
                  <div 
                    key={msafara.msafaraNumber}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all overflow-hidden group"
                  >
                    <div className="p-6 flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                            {msafara.name}
                          </h3>
                          <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 font-black text-[10px] px-3 py-1">
                            OPTIMIZED
                          </Badge>
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
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Route Sequence</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-600">DAR</span>
                            <ArrowRight className="w-3 h-3 text-slate-300" />
                            {msafara.regions.map((r, idx) => (
                              <React.Fragment key={idx}>
                                <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 font-bold text-[10px]">
                                  {r.name}
                                </Badge>
                                {idx < msafara.regions.length - 1 && (
                                  <ArrowRight className="w-3 h-3 text-slate-300" />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {msafara.vehicles.map((v, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100">
                              <Truck className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-black uppercase tracking-widest">{v.quantity}x {v.type.replace(/_/g, ' ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="md:w-48 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-6">
                        <Button 
                          onClick={() => {
                            onSelect(msafara);
                            onClose();
                          }}
                          className="w-full h-14 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all group-hover:scale-105"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Use This
                        </Button>
                        <p className="text-[9px] text-center mt-3 text-slate-400 font-medium italic">
                          {msafara.notes}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="p-6 bg-white border-t flex justify-between items-center shrink-0">
          <p className="text-[10px] text-slate-400 font-medium">
            * Suggestions are based on a maximum capacity of 880 boxes per Msafara.
          </p>
          <Button variant="ghost" onClick={onClose} className="font-bold uppercase text-[10px] tracking-widest">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartRouteSuggester;