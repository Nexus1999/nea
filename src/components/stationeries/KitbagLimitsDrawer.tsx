"use client";

import React, { useState, useEffect } from 'react';
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
import { Briefcase, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface KitbagLimitsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationery: any;
  onSuccess: () => void;
  examCode: string;
}

const KitbagLimitsDrawer: React.FC<KitbagLimitsDrawerProps> = ({
  open,
  onOpenChange,
  stationery,
  onSuccess,
  examCode,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kitbags, setKitbags] = useState<number>(0);

  useEffect(() => {
    if (open && stationery?.id) {
      fetchKitbagLimits();
    }
  }, [open, stationery]);

  const fetchKitbagLimits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stationery_box_limits')
        .select('kitbags')
        .eq('stationery_id', stationery.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setKitbags(data.kitbags || 0);
    } catch (error: any) {
      console.error('Error fetching kitbag limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!stationery?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('stationery_box_limits')
        .upsert({ stationery_id: stationery.id, kitbags }, { onConflict: 'stationery_id' });

      if (error) throw error;
      showSuccess('Kitbag limits updated successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      showError(error.message || 'Failed to update kitbag limits');
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
                <Briefcase className="h-4 w-4" />
              </div>
              <SheetTitle className="text-lg font-bold">Kitbag Limits</SheetTitle>
            </div>
            <SheetDescription className="text-xs">
              Set kitbag limits for {examCode}
            </SheetDescription>
          </SheetHeader>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="flex-1 px-8 py-6 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Kitbags Count</Label>
              <Input
                type="number"
                className="h-9 rounded-xl"
                value={kitbags}
                onChange={(e) => setKitbags(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" className="bg-black text-white hover:bg-slate-800 px-6" disabled={saving} onClick={handleSubmit}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save Limits</>}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default KitbagLimitsDrawer;