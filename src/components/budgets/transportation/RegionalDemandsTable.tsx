"use client";

import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import { ALL_TANZANIAN_REGIONS } from "@/utils/intelligentRoutePlanner";

interface RegionalDemandsTableProps {
  budgetId: string;
}

const RegionalDemandsTable: React.FC<RegionalDemandsTableProps> = ({ budgetId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [demands, setDemands] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchDemands();
  }, [budgetId]);

  const fetchDemands = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transportation_region_boxes')
        .select('region_name, boxes_count')
        .eq('budget_id', budgetId);

      if (error) throw error;

      const demandMap: Record<string, number> = {};
      data?.forEach(item => {
        demandMap[item.region_name] = item.boxes_count;
      });
      setDemands(demandMap);
    } catch (err: any) {
      showError(err.message || "Failed to load demands");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCount = (region: string, count: string) => {
    const val = parseInt(count) || 0;
    setDemands(prev => ({ ...prev, [region]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upsertData = Object.entries(demands).map(([region, count]) => ({
        budget_id: parseInt(budgetId),
        region_name: region,
        boxes_count: count
      }));

      const { error } = await supabase
        .from('transportation_region_boxes')
        .upsert(upsertData, { onConflict: 'budget_id,region_name' });

      if (error) throw error;
      showSuccess("Regional demands updated successfully");
    } catch (err: any) {
      showError(err.message || "Failed to save demands");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Total Regions: {ALL_TANZANIAN_REGIONS.length}
        </p>
        <Button 
          size="sm" 
          onClick={handleSave} 
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest h-8"
        >
          {saving ? <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> : <Save className="w-3 h-3 mr-2" />}
          Save All
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-[9px] font-black uppercase tracking-widest">Region</TableHead>
              <TableHead className="text-[9px] font-black uppercase tracking-widest w-[120px]">Box Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ALL_TANZANIAN_REGIONS.map((region) => (
              <TableRow key={region} className="hover:bg-slate-50/50">
                <TableCell className="text-xs font-bold text-slate-700">{region}</TableCell>
                <TableCell>
                  <Input 
                    type="number" 
                    value={demands[region] || 0} 
                    onChange={(e) => handleUpdateCount(region, e.target.value)}
                    className="h-8 text-xs font-bold text-indigo-600 border-slate-200 focus:ring-indigo-500"
                  />
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