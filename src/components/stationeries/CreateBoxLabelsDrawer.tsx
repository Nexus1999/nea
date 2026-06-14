"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Boxes, Loader2, Plus, Trash2, Save, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface CreateBoxLabelsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterSummaryId: number;
  regions: string[];
  onSuccess: () => void;
}

const ITEM_SUGGESTIONS = [
  "Timetables",
  "ICT Covers",
  "Fine Arts Booklets",
  "Arabic Booklets",
  "Supervisors Forms",
  "Stationeries Description",
  "Bkm Description",
  "Braille Stationeries",
];

export const CreateBoxLabelsDrawer: React.FC<CreateBoxLabelsDrawerProps> = ({
  open,
  onOpenChange,
  masterSummaryId,
  regions,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 1: Scope
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("None");

  // Step 2: Items
  const [items, setItems] = useState<string[]>([""]);

  // Step 3: Box Count
  const [boxCount, setBoxCount] = useState<number>(1);

  // Fetch districts when region changes
  useEffect(() => {
    if (!selectedRegion) {
      setDistricts([]);
      return;
    }
    setLoading(true);
    supabase
      .from("districts")
      .select("district_name")
      .order("district_name", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          showError("Failed to load districts.");
        } else {
          // In a real app, we'd filter by region_number, but since we have a list of all districts,
          // we can fetch distinct districts from the master summary table for this region.
          // Let's fetch from secondarymastersummaries/primarymastersummary to be accurate.
          supabase
            .from("secondarymastersummaries")
            .select("district")
            .eq("mid", masterSummaryId)
            .eq("region", selectedRegion)
            .eq("is_latest", true)
            .then(({ data: secData }) => {
              if (secData && secData.length > 0) {
                const unique = Array.from(new Set(secData.map((d: any) => d.district).filter(Boolean))).sort();
                setDistricts(unique as string[]);
              } else {
                supabase
                  .from("primarymastersummary")
                  .select("district")
                  .eq("mid", masterSummaryId)
                  .eq("region", selectedRegion)
                  .eq("is_latest", true)
                  .then(({ data: priData }) => {
                    const unique = Array.from(new Set((priData || []).map((d: any) => d.district).filter(Boolean))).sort();
                    setDistricts(unique as string[]);
                  });
              }
            });
        }
      })
      .finally(() => setLoading(false));
  }, [selectedRegion, masterSummaryId]);

  const handleAddItem = () => {
    if (items.length < 4) {
      setItems([...items, ""]);
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems.length === 0 ? [""] : newItems);
  };

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const handleSave = async () => {
    const filteredItems = items.map(i => i.trim()).filter(Boolean);
    if (filteredItems.length === 0) {
      showError("Please add at least one item.");
      return;
    }

    setSaving(true);
    try {
      const itemsString = filteredItems.join(", ");
      const payload = [];

      for (let i = 1; i <= boxCount; i++) {
        payload.push({
          mid: masterSummaryId,
          region: selectedRegion,
          district: selectedDistrict === "None" ? null : selectedDistrict,
          item: itemsString,
          quantity: 0,
          container_number: String(i),
          total_containers: boxCount,
          category: "Box Labels",
        });
      }

      const { error } = await supabase.from("labels").insert(payload);
      if (error) throw error;

      showSuccess("Box Labels generated successfully!");
      onSuccess();
      onOpenChange(false);
      // Reset state
      setStep(1);
      setSelectedRegion("");
      setSelectedDistrict("None");
      setItems([""]);
      setBoxCount(1);
    } catch (error: any) {
      showError(error.message || "Failed to save Box Labels.");
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
                <Boxes className="h-4 w-4" />
              </div>
              <SheetTitle className="text-lg font-bold">Configure Box Labels</SheetTitle>
            </div>
            <SheetDescription className="text-xs">
              Step-by-step wizard to configure custom outer box labels.
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Step Indicator */}
        <div className="px-8 py-3 bg-slate-100/50 border-b flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span>Step {step} of 3</span>
          <span>
            {step === 1 && "Scope Selection"}
            {step === 2 && "Items Configuration"}
            {step === 3 && "Box Count"}
          </span>
        </div>

        <div className="flex-1 px-8 py-6 space-y-5 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Select Region *</Label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Choose region..." />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Select District (Optional)</Label>
                <Select
                  value={selectedDistrict}
                  onValueChange={setSelectedDistrict}
                  disabled={!selectedRegion || loading}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                      </div>
                    ) : (
                      <SelectValue placeholder="Entire Region (No District)" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">Entire Region (No District)</SelectItem>
                    {districts.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400 font-medium">
                  If left as "Entire Region", the label will use the Region-only (Kitbags) layout.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Items in Box (Max 4)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  disabled={items.length >= 4}
                  className="h-8 rounded-lg text-xs font-bold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder={`Item ${index + 1} (e.g., Timetables)`}
                        value={item}
                        onChange={(e) => handleItemChange(index, e.target.value)}
                        className="h-10 rounded-xl"
                        list={`suggestions-${index}`}
                      />
                      <datalist id={`suggestions-${index}`}>
                        {ITEM_SUGGESTIONS.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(index)}
                        className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Number of Boxes *</Label>
                <Input
                  type="number"
                  min={1}
                  value={boxCount}
                  onChange={(e) => setBoxCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-10 rounded-xl"
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  This will generate {boxCount} labels (e.g., Box 1 of {boxCount}, Box 2 of {boxCount}).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t bg-slate-50 flex justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onOpenChange(false);
            }}
            disabled={saving}
          >
            {step > 1 ? <><ChevronLeft className="mr-1 h-4 w-4" /> Back</> : "Cancel"}
          </Button>

          {step < 3 ? (
            <Button
              size="sm"
              className="bg-black text-white hover:bg-slate-800 px-6"
              onClick={() => {
                if (step === 1 && !selectedRegion) {
                  showError("Please select a region.");
                  return;
                }
                setStep(step + 1);
              }}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-black text-white hover:bg-slate-800 px-6"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Save & Generate</>}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};