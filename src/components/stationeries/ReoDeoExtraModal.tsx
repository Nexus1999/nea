import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Stationery } from "@/types/stationeries";
import { Card, CardContent } from "@/components/ui/card";

// Define the structure for the extra settings data
interface ExtraSetting {
  id?: number;
  stationery_id: number;
  item_name: string;
  percentage: number;
}

// Define all possible items for REO/DEO Extra configuration (keys must match DB column names)
const ALL_EXTRA_ITEMS = [
  { name: 'Normal Booklets', key: 'normalbooklets' },
  { name: 'Graph Booklets', key: 'graphbooklets' },
  { name: 'Normal Loose Sheets', key: 'normalloosesheets' },
  { name: 'Graph Loose Sheets', key: 'graphloosesheets' },
  { name: 'Arabic Booklets', key: 'arabicbooklets' },
  { name: 'ICT Covers', key: 'ictcovers' },
  { name: 'Fine Arts Booklets', key: 'finearts' },
  { name: 'BKM', key: 'bkm' },
  { name: 'Braille Sheets', key: 'brsheets' },
  { name: 'Braille BKM', key: 'brbkm' },
  { name: 'TR', key: 'tr' },
  { name: 'TWM', key: 'twm' },
  { name: 'FBM1', key: 'fbm1' },
  { name: 'FBM2', key: 'fbm2' },
];

interface ReoDeoExtraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationery: Stationery | null;
  onSuccess: () => void;
}

const ReoDeoExtraModal: React.FC<ReoDeoExtraModalProps> = ({ open, onOpenChange, stationery, onSuccess }) => {
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const stationeryId = stationery?.id;
  const examCode = stationery?.examination_code;

  // Dynamic grid: 3 columns for ACSEE/CSEE, 2 for others
  const gridClass = useMemo(() => {
    const threeColExams = ['ACSEE', 'CSEE','FTNA','PSLE','SFNA','SSNA'];
    return threeColExams.includes(examCode || '')
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  }, [examCode]);

  // Filter items per exam (avoid referencing filteredItems before init)
  const filteredItems = useMemo(() => {
    const primaryExams = ['PSLE', 'SSNA', 'SFNA'];
    const secondaryExams = ['ACSEE', 'CSEE'];

    if (!examCode) return ALL_EXTRA_ITEMS;

    if (primaryExams.includes(examCode)) {
      // Primary: FBM1, FBM2, TR, TWM, BKM, Braille Sheets, Braille BKM
      const keys = ['fbm1', 'fbm2', 'tr', 'twm', 'bkm', 'brsheets', 'brbkm'];
      return ALL_EXTRA_ITEMS.filter(i => keys.includes(i.key));
    }

    if (secondaryExams.includes(examCode)) {
      // Secondary: keep booklets & loose sheets, TR/TWM/BKM, Braille Sheets/BKM, Arabic, ICT, Fine Arts (no FBM1/FBM2)
      const keys = [
        'normalbooklets','graphbooklets','normalloosesheets','graphloosesheets',
        'tr','twm','bkm','brsheets','brbkm','arabicbooklets','ictcovers','finearts'
      ];
      return ALL_EXTRA_ITEMS.filter(i => keys.includes(i.key));
    }
    if (examCode=='FTNA') {
       const keys = [         
        'tr','twm','bkm','brsheets','brbkm','ictcovers','finearts'
      ];
      return ALL_EXTRA_ITEMS.filter(i => keys.includes(i.key));
    }

    return ALL_EXTRA_ITEMS;
  }, [examCode]);

  const fetchSettings = useCallback(async () => {
    if (!stationeryId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('stationery_reo_deo_extra')
      .select('*')
      .eq('stationery_id', stationeryId)
      .single(); // single row schema

    if (error) {
      showError(error.message || 'Failed to load REO/DEO Extra settings.');
      setSettings({});
      setLoading(false);
      return;
    }

    // Build settings from single row using filtered keys
    const newSettings: Record<string, number> = {};
    filteredItems.forEach(item => {
      const v = (data && typeof data[item.key] !== 'undefined') ? Number(data[item.key]) : 0;
      newSettings[item.key] = isNaN(v) ? 0 : v;
    });

    setSettings(newSettings);
    setLoading(false);
  }, [stationeryId, filteredItems]);

  useEffect(() => {
    if (open && stationeryId) {
      fetchSettings();
    } else if (!open) {
      setSettings({});
    }
  }, [open, stationeryId, fetchSettings]);

  // Ensure controlled inputs: initialize any missing keys to 0 when filteredItems change
  useEffect(() => {
    if (filteredItems.length > 0) {
      setSettings(prev => {
        const next = { ...prev };
        filteredItems.forEach(item => {
          if (typeof next[item.key] === 'undefined' || next[item.key] === null) {
            next[item.key] = 0;
          }
        });
        return next;
      });
    }
  }, [filteredItems]);

  const handleChange = (key: string, value: string) => {
    const num = parseFloat(value);
    setSettings(prev => ({
      ...prev,
      [key]: !isNaN(num) && num >= 0 ? num : 0
    }));
  };

  const handleSave = async () => {
    if (!stationeryId) return;
    setIsSaving(true);

    try {
      // Prepare single payload: one row per stationery_id
      const payload: Record<string, any> = { stationery_id: stationeryId };
      filteredItems.forEach(item => {
        payload[item.key] = settings[item.key] || 0;
      });

      // Check if a row already exists for this stationery_id
      const { data: existingRows, error: existsErr } = await supabase
        .from('stationery_reo_deo_extra')
        .select('id')
        .eq('stationery_id', stationeryId)
        .limit(1);

      if (existsErr) {
        throw existsErr;
      }

      if (existingRows && existingRows.length > 0) {
        // Update existing row
        const { error: updateErr } = await supabase
          .from('stationery_reo_deo_extra')
          .update(payload)
          .eq('stationery_id', stationeryId);

        if (updateErr) throw updateErr;
      } else {
        // Insert new row
        const { error: insertErr } = await supabase
          .from('stationery_reo_deo_extra')
          .insert(payload);

        if (insertErr) throw insertErr;
      }

      showSuccess("REO/DEO Extra settings saved successfully.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>REO Extra Settings</DialogTitle>        
        </DialogHeader>
        
        <Card className="mt-4">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-2">
               {stationery?.examination_code} - {stationery?.examination_year}
            </p>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-neas-green" />
              </div>
            ) : (
              <div className={gridClass}>
                {filteredItems.map(item => (
                  <div key={item.key} className="space-y-1">
                    <Label htmlFor={item.key}>{item.name} (%)</Label>
                    <Input
                      id={item.key}
                      type="number"
                      min="0"
                      step="0.1"
                      value={String(settings[item.key] ?? 0)}
                      onChange={(e) => handleChange(item.key, e.target.value)}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || loading}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReoDeoExtraModal;