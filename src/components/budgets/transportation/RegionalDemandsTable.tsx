"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { ALL_TANZANIAN_REGIONS } from "@/utils/intelligentRoutePlanner";

interface RegionalDemandsTableProps {
  budgetId: string;
  onDataChange?: (demands: Record<string, number>) => void;
}

const RegionalDemandsTable: React.FC<RegionalDemandsTableProps> = ({ budgetId, onDataChange }) => {
  const [demands, setDemands] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDemands = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('transportation_region_boxes')
          .select('region_name, boxes_count')
          .eq('budget_id', budgetId);

        if (error) throw error;

        const demandMap: Record<string, number> = {};
        data?.forEach(d => {
          demandMap[d.region_name] = d.boxes_count;
        });
        setDemands(demandMap);
        onDataChange?.(demandMap);
      } catch (err: any) {
        showError("Failed to load regional demands");
      } finally {
        setLoading(false);
      }
    };

    if (budgetId) fetchDemands();
  }, [budgetId]);

  const handleBoxChange = (region: string, value: string) => {
    const count = parseInt(value) || 0;
    const newDemands = { ...demands, [region]: count };
    setDemands(newDemands);
    onDataChange?.(newDemands);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upsertData = ALL_TANZANIAN_REGIONS.map(region => ({
        budget_id: budgetId,
        region_name: region,
        boxes_count: demands[region] || 0
      }));

      const { error } = await supabase
        .from('transportation_region_boxes')
        .upsert(upsertData, { onConflict: 'budget_id,region_name' });

      if (error) throw error;
      showSuccess("Regional demands saved successfully");
    } catch (err: any) {
      showError(err.message || "Failed to save demands");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
          <Package className="w-4 h-4 text-indigo-600" /> Regional Box Demands
        </h3>
        <Button 
          size="sm" 
          onClick={handleSave} 
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 rounded-lg text-[10px] font-black uppercase tracking-widest"
        >
          {saving ? <Loader2 className="animate-spin h-3 w-3 mr-2" /> : <Save className="h-3 w-3 mr-2" />}
          Save Demands
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Region</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest w-32">Boxes</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Est. Weight (Tons)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ALL_TANZANIAN_REGIONS.map(region => (
              <TableRow key={region} className="hover:bg-slate-50/50">
                <TableCell className="font-bold text-slate-700 text-xs">{region}</TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    value={demands[region] || ""} 
                    onChange={(e) => handleBoxChange(region, e.target.value)}
                    className="h-8 text-xs rounded-lg border-slate-200"
                    placeholder="0"
                  />
                </TableCell>
                <TableCell className="text-right text-xs text-slate-500 font-medium">
                  {(((demands[region] || 0) * 34) / 1000).toFixed(2)} t
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RegionalDemandsTable;