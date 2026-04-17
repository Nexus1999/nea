"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Truck, Calendar, Package, ArrowRight, Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
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

const SmartRouteSuggester: React.FC<SmartRouteSuggesterProps> = ({ isOpen, onClose, onSelect, loadingDate: initialLoadingDate, budgetId }) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedMsafara[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(initialLoadingDate || "");

  const fetchAndPlan = async (dateToUse: string) => {
    if (!dateToUse) { setError("Please select a loading date."); return; }
    setLoading(true);
    setError(null);
    try {
      const { data: boxes } = await supabase.from('transportation_region_boxes').select('region_name, boxes_count').eq('budget_id', budgetId).gt('boxes_count', 0);
      const { data: dists } = await supabase.from('region_distances').select('*');

      if (!boxes || boxes.length === 0) {
        setError("No boxes found for this budget. Add demands first.");
        return;
      }

      const demands: RegionDemand[] = boxes.map(b => ({ region: b.region_name, boxes: b.boxes_count }));
      const planned = generateIntelligentRoutes(demands, dateToUse, dists || []);
      setSuggestions(planned);
    } catch (err: any) {
      setError("Failed to generate routes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(initialLoadingDate || "");
      if (initialLoadingDate) fetchAndPlan(initialLoadingDate);
    }
  }, [isOpen, initialLoadingDate]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] flex flex-col p-0 border-none shadow-2xl overflow-hidden bg-slate-50">
        <div className="bg-slate-900 p-8 text-white shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500 rounded-lg"><Sparkles className="text-white w-5 h-5" /></div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">AI Route Planner</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400">Optimized against strict regional corridors.</DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex items-end gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="flex-1 space-y-1">
              <Label className="text-[10px] font-bold text-slate-400 uppercase">Loading Date</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-white/10 border-white/20 text-white h-10" />
            </div>
            <Button onClick={() => fetchAndPlan(selectedDate)} disabled={loading} className="h-10 bg-indigo-600 hover:bg-indigo-700 px-6 font-bold uppercase text-xs">
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Regenerate
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="text-xs font-bold text-slate-400 uppercase">Sequencing Corridor Paths...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <AlertCircle />
              <p className="text-sm font-medium">{error || "No suggestions available."}</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] p-6">
              <div className="grid gap-6">
                {suggestions.map((m) => (
                  <div key={m.msafaraNumber} className="bg-white border rounded-2xl p-6 shadow-sm hover:border-indigo-300 transition-colors group">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-black text-slate-900 uppercase">{m.name}</h3>
                          <Badge className="bg-green-50 text-green-700 border-green-100 uppercase text-[9px]">Verified Corridor</Badge>
                        </div>
                        
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                            <Package className="w-3.5 h-3.5" /> {m.totalBoxes} Boxes
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                            <Truck className="w-3.5 h-3.5" /> {m.totalTons}T
                          </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Delivery Sequence</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">DAR</span>
                            <ArrowRight className="w-3 h-3 text-slate-300" />
                            {m.regions.map((r, i) => (
                              <React.Fragment key={i}>
                                <Badge variant="outline" className="bg-white text-slate-700 font-bold text-[10px] px-2 py-0.5">
                                  {r.name}
                                </Badge>
                                {i < m.regions.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300" />}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 italic font-medium">{m.notes}</p>
                      </div>

                      <div className="md:w-40 flex flex-col justify-center border-t md:border-t-0 md:border-l pl-0 md:pl-6 pt-4 md:pt-0">
                        <Button 
                          onClick={() => { onSelect(m); onClose(); }}
                          className="w-full h-12 bg-slate-900 hover:bg-indigo-600 rounded-xl font-bold uppercase text-[10px] tracking-widest"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Use This
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartRouteSuggester;