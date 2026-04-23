import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface KitbagLimitsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stationery: any;
  onSuccess: () => void;
  examCode: string;
}

interface KitbagLimits {
  kitbags: number;
}

const KitbagLimitsModal: React.FC<KitbagLimitsModalProps> = ({
  open,
  onOpenChange,
  stationery,
  onSuccess,
  examCode,
}) => {
  const [loading, setLoading] = useState(false);
  const [kitbagLimits, setKitbagLimits] = useState<KitbagLimits>({
    kitbags: 0,
  });

  useEffect(() => {
    if (open && stationery) {
      fetchKitbagLimits();
    }
  }, [open, stationery]);

  const fetchKitbagLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('stationery_box_limits')
        .select('kitbags')
        .eq('stationery_id', stationery.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setKitbagLimits({
          kitbags: data.kitbags || 0,
        });
      }
    } catch (error: any) {
      console.error('Error fetching kitbag limits:', error);
    }
  };

 
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!stationery?.id) return;

  setLoading(true);
  try {
    const { error } = await supabase
      .from('stationery_box_limits')
      .upsert(
        {
          stationery_id: stationery.id,
          kitbags: kitbagLimits.kitbags,
        },
        // 'onConflict' tells Supabase exactly which column to look at 
        // to decide if it should Insert or Update.
        { onConflict: 'stationery_id' } 
      );

    if (error) throw error;

    showSuccess('Kitbag limits updated successfully!');
    onSuccess();
    onOpenChange(false);
  } catch (error: any) {
    showError(error.message || 'Failed to update kitbag limits');
  } finally {
    setLoading(false);
  }
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kitbag Limits</DialogTitle>
          <DialogDescription>
            Set the kitbag limits for {examCode} examination.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kitbags" className="text-right">
                Kitbags
              </Label>
              <Input
                id="kitbags"
                type="number"
                min="0"
                value={kitbagLimits.kitbags}
                onChange={(e) => setKitbagLimits(prev => ({ ...prev, kitbags: parseInt(e.target.value) || 0 }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default KitbagLimitsModal;