"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Stationery } from "@/types/stationeries";

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

interface ReoDeoExtraDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationery: Stationery | null;
  onSuccess: () => void;
}

const ReoDeoExtraDrawer: React.FC<ReoDeoExtraDrawerProps> = ({ open, onOpenChange, stationery, onSuccess }) => {
  const [settings, setSettings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const examCode = stationery?.examination_code;

  const filteredItems = useMemo(() => {
    if (!examCode) return ALL_EXTRA_ITEMS;
    if (['PSLE', 'SSNA', 'SFNA'].includes(examCode)) {
      return ALL_EXTRA_ITEMS.filter(i => ['fbm1', 'fbm2', 'tr', 'twm', 'bkm', 'brsheets', 'brbkm'].includes(i.key));
    }
    if (['ACSEE', 'CSEE'].includes(examCode)) {
      return ALL_EXTRA_ITEMS.filter(i => [
        'normalbooklets','graphbooklets','normalloosesheets','graphloosesheets',
        'tr','twm','bkm','brsheets','brbkm','arabicbooklets','ictcovers','finearts'
      ].includes(i.key));
    }
    if (examCode === 'FTNA') {
      return ALL_EXTRA_ITEMS.filter(i => ['tr','twm','bkm','brsheets','brbkm','ictcovers','finearts'].includes(i.key));
    }
    return ALL_EXTRA_ITEMS;
  }, [examCode]);

  useEffect(() => {
    if (open && stationery?.id) {
      setLoading(true);
      supabase
        .from('stationery_reo_deo_extra')
        .select('*')
        .eq('stationery_id', stationery.id)
        .maybeSingle()
        .then(({ data }) => {
          const newSettings: Record<string, number> = {};
          filteredItems.forEach(item => {
            newSettings[item.key] = data ? Number(data[item.key] || 0) : 0;
          });
          setSettings(newSettings);
        })
        .finally(() => setLoading(false));
    }
  }, [open, stationery?.id, filteredItems]);

  const handleSave = async () => {
    if (!stationery?.id) return;
    setSaving(true);
    try {
      const payload = { stationery_id: stationery.id, ...settings };
      await supabase.from('stationery_reo_deo_extra').upsert(payload, { onConflict: 'stationery_id' });
      showSuccess("REO/DEO Extra settings saved successfully.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[550px] p-0 flex flex-col bg-white overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50/50">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-black text-white rounded-md">
                <Users className="h-4 w-4" />
              </div>
              <SheetTitle className="text-lg font-bold">REO/DEO Extra Settings</SheetTitle>
            </div>
            <SheetDescription className="text-xs">
              Configure extra percentages for {stationery?.title}
            </SheetDescription>
          </SheetHeader>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="flex-1 px-8 py-6 space-y-5 overflow-y-auto">
            <div className="grid grid-cols-1 gap-4">
              {filteredItems.map(item => (
                <div key={item.key} className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">{item.name} (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-9 rounded-xl"
                    value={settings[item.key] || 0}
                    onChange={(e) => setSettings(prev => ({ ...prev, [item.key]: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" className="bg-black text-white hover:bg-slate-800 px-6" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Settings</>}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ReoDeoExtraDrawer;