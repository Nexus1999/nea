"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, ChevronRight, ChevronLeft, Check, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

interface BoxLabelsWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterSummaryId: number;
  examCode: string;
  examYear: string;
  regions: string[];
  onSuccess: () => void;
}

const PRESET_ITEMS = [
  "BKM",
  "BRAILLE SHEETS",
  "TR",
  "TWM",
  "ICT COVERS",
  "ARABIC BOOKLETS",
  "FINEARTS BOOKLETS",
];

// Helper to resolve subject columns based on selected items and exam code
const getSubjectColumns = (selectedItems: string[], code: string): string[] => {
  const cols: string[] = [];
  const isSecondary = ["FTNA", "CSEE", "ACSEE"].includes(code);
  if (!isSecondary) return cols;

  selectedItems.forEach(item => {
    const upper = item.toUpperCase();
    if (upper === "ICT COVERS") {
      if (code === "ACSEE") cols.push("136");
      else if (code === "CSEE") cols.push("036");
      else if (code === "FTNA") cols.push("398", "841");
    } else if (upper === "ARABIC BOOKLETS") {
      if (code === "ACSEE") cols.push("125");
      else if (code === "CSEE") cols.push("025");
      else if (code === "FTNA") cols.push("025");
    } else if (upper === "FINEARTS BOOKLETS" || upper === "FINE ARTS BOOKLETS") {
      if (code === "ACSEE") cols.push("116");
      else if (code === "CSEE") cols.push("016");
      else if (code === "FTNA") cols.push("016");
    }
  });
  return cols;
};

export const BoxLabelsWizardModal: React.FC<BoxLabelsWizardModalProps> = ({
  open,
  onOpenChange,
  masterSummaryId,
  examCode,
  examYear,
  regions,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"REGION" | "DISTRICT">("REGION");

  // Step 1: Items States
  const [items, setItems] = useState<string[]>(["BKM"]);
  const [customItem, setCustomItem] = useState("");

  // Step 2: Region Mode States
  const [selectedRegions, setSelectedRegions] = useState<Record<string, boolean>>({});
  const [regionBoxCounts, setRegionBoxCounts] = useState<Record<string, number>>({});

  // Step 2: District Mode States
  const [districtRegion, setDistrictRegion] = useState<string>("");
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<Record<string, boolean>>({});
  const [districtBoxCounts, setDistrictBoxCounts] = useState<Record<string, number>>({});
  const [districtsLoading, setDistrictsLoading] = useState(false);

  // Candidate Registration States
  const [candidateCounts, setCandidateCounts] = useState<Record<string, number>>({});
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const activeSubjectCols = useMemo(() => getSubjectColumns(items, examCode), [items, examCode]);
  const hasSpecialItems = activeSubjectCols.length > 0;

  // Fetch candidate counts for selected special items
  const fetchCandidateCounts = async (selectedItems: string[]) => {
    const cols = getSubjectColumns(selectedItems, examCode);
    if (cols.length === 0) {
      setCandidateCounts({});
      return;
    }

    setLoadingCandidates(true);
    try {
      const tableName = ["FTNA", "CSEE", "ACSEE"].includes(examCode)
        ? "secondarymastersummaries"
        : "primarymastersummary";

      const { data, error } = await supabase
        .from(tableName)
        .select(`region, district, ${cols.join(",")}`)
        .eq("mid", masterSummaryId)
        .eq("is_latest", true);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((row: any) => {
        const reg = row.region;
        const dist = row.district;
        
        const sum = cols.reduce((acc, col) => acc + Number(row[col] || 0), 0);
        
        if (sum > 0) {
          counts[reg] = (counts[reg] || 0) + sum;
          if (dist) {
            counts[`${reg}_${dist}`] = (counts[`${reg}_${dist}`] || 0) + sum;
          }
        }
      });

      setCandidateCounts(counts);
    } catch (err) {
      console.error("Error fetching candidate counts:", err);
      showError("Failed to load candidate registration data.");
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Fetch districts when region changes in District Mode
  useEffect(() => {
    if (mode === "DISTRICT" && districtRegion) {
      const loadDistricts = async () => {
        setDistrictsLoading(true);
        try {
          const tableName = ["FTNA", "CSEE", "ACSEE"].includes(examCode)
            ? "secondarymastersummaries"
            : "primarymastersummary";
          const { data, error } = await supabase
            .from(tableName)
            .select("district")
            .eq("mid", masterSummaryId)
            .eq("region", districtRegion)
            .eq("is_latest", true);

          if (error) throw error;
          const distinct = Array.from(new Set(data?.map((d: any) => d.district).filter(Boolean))).sort() as string[];
          setDistricts(distinct);
          setSelectedDistricts({});
          setDistrictBoxCounts({});
        } catch (err: any) {
          showError("Failed to load districts.");
        } finally {
          setDistrictsLoading(false);
        }
      };
      loadDistricts();
    }
  }, [mode, districtRegion, masterSummaryId, examCode]);

  const handleAddCustomItem = () => {
    if (!customItem.trim()) return;
    if (items.length >= 4) {
      showError("You can configure a maximum of 4 items.");
      return;
    }
    if (items.includes(customItem.trim())) {
      showError("Item already added.");
      return;
    }
    setItems([...items, customItem.trim()]);
    setCustomItem("");
  };

  const handleTogglePresetItem = (item: string) => {
    if (item === "BKM") {
      setItems(["BKM"]);
      return;
    }
    if (item === "BRAILLE SHEETS") {
      setItems(["BRAILLE SHEETS"]);
      return;
    }

    // If selecting TR or TWM
    if (item === "TR" || item === "TWM") {
      let newItems = items.filter(i => i === "TR" || i === "TWM");
      if (newItems.includes(item)) {
        newItems = newItems.filter(i => i !== item);
      } else {
        newItems.push(item);
      }
      setItems(newItems);
      return;
    }

    // If selecting ICT COVERS, ARABIC BOOKLETS, FINEARTS BOOKLETS
    if (["ICT COVERS", "ARABIC BOOKLETS", "FINEARTS BOOKLETS"].includes(item)) {
      let newItems = items.filter(i => ["ICT COVERS", "ARABIC BOOKLETS", "FINEARTS BOOKLETS"].includes(i));
      if (newItems.includes(item)) {
        newItems = newItems.filter(i => i !== item);
      } else {
        if (newItems.length >= 4) {
          showError("You can configure a maximum of 4 items.");
          return;
        }
        newItems.push(item);
      }
      setItems(newItems);
      return;
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSelectAllRegions = (checked: boolean) => {
    const newSelected: Record<string, boolean> = {};
    const newCounts: Record<string, number> = { ...regionBoxCounts };
    regions.forEach((r) => {
      newSelected[r] = !!checked;
      if (checked && !newCounts[r]) {
        newCounts[r] = 1;
      }
    });
    setSelectedRegions(newSelected);
    setRegionBoxCounts(newCounts);
  };

  const handleAutoSelectActiveDestinations = () => {
    if (mode === "REGION") {
      const newSelected: Record<string, boolean> = {};
      const newCounts: Record<string, number> = {};
      regions.forEach((r) => {
        const count = candidateCounts[r] || 0;
        if (count > 0) {
          newSelected[r] = true;
          newCounts[r] = 1;
        }
      });
      setSelectedRegions(newSelected);
      setRegionBoxCounts(newCounts);
      showSuccess("Auto-selected regions with registered candidates!");
    } else {
      const newSelected: Record<string, boolean> = {};
      const newCounts: Record<string, number> = {};
      districts.forEach((d) => {
        const count = candidateCounts[`${districtRegion}_${d}`] || 0;
        if (count > 0) {
          newSelected[d] = true;
          newCounts[d] = 1;
        }
      });
      setSelectedDistricts(newSelected);
      setDistrictBoxCounts(newCounts);
      showSuccess("Auto-selected districts with registered candidates!");
    }
  };

  const isAllRegionsSelected = regions.length > 0 && regions.every((r) => selectedRegions[r]);

  const handleNextStep = async () => {
    if (step === 1) {
      if (items.length === 0) {
        showError("Please configure at least one item.");
        return;
      }
      // Fetch candidate counts for special subjects before moving to Step 2
      await fetchCandidateCounts(items);
      setStep(2);
    }
  };

  const handlePrevStep = () => {
    setStep(1);
  };

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (mode === "REGION") {
      const hasSelected = Object.keys(selectedRegions).some((r) => selectedRegions[r]);
      if (!hasSelected) {
        showError("Please select at least one region.");
        return;
      }
      const invalidCount = Object.keys(selectedRegions).some(
        (r) => selectedRegions[r] && (!regionBoxCounts[r] || regionBoxCounts[r] <= 0)
      );
      if (invalidCount) {
        showError("Please specify a valid number of boxes for all selected regions.");
        return;
      }
    } else {
      if (!districtRegion) {
        showError("Please select a region.");
        return;
      }
      const hasSelected = Object.keys(selectedDistricts).some((d) => selectedDistricts[d]);
      if (!hasSelected) {
        showError("Please select at least one district.");
        return;
      }
      const invalidCount = Object.keys(selectedDistricts).some(
        (d) => selectedDistricts[d] && (!districtBoxCounts[d] || districtBoxCounts[d] <= 0)
      );
      if (invalidCount) {
        showError("Please specify a valid number of boxes for all selected districts.");
        return;
      }
    }

    setIsGenerating(true);
    try {
      const labelsToInsert: any[] = [];

      if (mode === "REGION") {
        const activeRegions = Object.keys(selectedRegions).filter((r) => selectedRegions[r]);
        for (const region of activeRegions) {
          const boxCount = regionBoxCounts[region] || 1;
          for (let boxNum = 1; boxNum <= boxCount; boxNum++) {
            labelsToInsert.push({
              mid: masterSummaryId,
              region: region,
              district: null,
              center_name: "",
              center_number: "",
              normal_booklets: 0,
              graph_booklets: 0,
              normal_loosesheets: 0,
              graph_loosesheets: 0,
              bkm: 0,
              container_type: "BOX",
              container_number: String(boxNum),
              total_containers: boxCount,
              item: JSON.stringify(items),
              quantity: 0,
              category: "Box Labels",
            });
          }
        }
      } else {
        const activeDistricts = Object.keys(selectedDistricts).filter((d) => selectedDistricts[d]);
        for (const district of activeDistricts) {
          const boxCount = districtBoxCounts[district] || 1;
          for (let boxNum = 1; boxNum <= boxCount; boxNum++) {
            labelsToInsert.push({
              mid: masterSummaryId,
              region: districtRegion,
              district: district,
              center_name: "",
              center_number: "",
              normal_booklets: 0,
              graph_booklets: 0,
              normal_loosesheets: 0,
              graph_loosesheets: 0,
              bkm: 0,
              container_type: "BOX",
              container_number: String(boxNum),
              total_containers: boxCount,
              item: JSON.stringify(items),
              quantity: 0,
              category: "Box Labels",
            });
          }
        }
      }

      // Insert labels into Supabase
      const { error } = await supabase.from("labels").insert(labelsToInsert);
      if (error) throw error;

      showSuccess("Box Labels generated successfully!");
      onSuccess();
      onOpenChange(false);
      // Reset state
      setStep(1);
      setSelectedRegions({});
      setRegionBoxCounts({});
      setDistrictRegion("");
      setSelectedDistricts({});
      setDistrictBoxCounts({});
      setItems(["BKM"]);
    } catch (err: any) {
      showError(err.message || "Failed to generate Box Labels.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl border border-slate-100 shadow-2xl bg-white">
        <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
          <DialogTitle className="text-lg font-bold text-slate-900">
            Box Labels Configuration Wizard
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Step {step} of 2: {step === 1 ? "Configure Box Contents" : "Configure Destinations & Quantities"}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
          {step === 1 ? (
            <div className="space-y-6">
              {/* Preset Items Selection */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Preset Items (Max 4)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {PRESET_ITEMS.map((item) => {
                    const isSelected = items.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleTogglePresetItem(item)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <span className="text-xs font-bold uppercase tracking-wider">{item}</span>
                        {isSelected && <Check className="h-4 w-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Item Input */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Add Custom Item
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter custom item name..."
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    className="h-10 rounded-xl border-slate-200"
                  />
                  <Button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Configured Items List */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Configured Items ({items.length}/4)
                </Label>
                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No items configured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50"
                      >
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {item}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(idx)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Destination Type Selection */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Destination Type
                </Label>
                <RadioGroup
                  value={mode}
                  onValueChange={(val: "REGION" | "DISTRICT") => setMode(val)}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all">
                    <RadioGroupItem value="REGION" id="mode-region" />
                    <Label htmlFor="mode-region" className="font-bold text-sm text-slate-700 cursor-pointer">
                      Region Labels
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all">
                    <RadioGroupItem value="DISTRICT" id="mode-district" />
                    <Label htmlFor="mode-district" className="font-bold text-sm text-slate-700 cursor-pointer">
                      District Labels
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Candidate Registration Smart Helper Banner */}
              {hasSpecialItems && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Smart Candidate Filter Active</h4>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      We detected special subjects in your box contents. You can auto-select only the destinations that have registered candidates.
                    </p>
                    <Button
                      type="button"
                      onClick={handleAutoSelectActiveDestinations}
                      disabled={loadingCandidates}
                      className="mt-2 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 flex items-center gap-1.5"
                    >
                      {loadingCandidates ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Users className="h-3.5 w-3.5" /> Auto-Select Active Destinations
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Region Mode Configuration */}
              {mode === "REGION" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Select Regions & Specify Box Quantities
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all-regions"
                        checked={isAllRegionsSelected}
                        onCheckedChange={handleSelectAllRegions}
                      />
                      <Label
                        htmlFor="select-all-regions"
                        className="text-xs font-bold text-slate-600 cursor-pointer"
                      >
                        Select All
                      </Label>
                    </div>
                  </div>
                  <ScrollArea className="h-[250px] border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                    <div className="space-y-3">
                      {regions.map((region) => {
                        const isSelected = !!selectedRegions[region];
                        const candidateCount = candidateCounts[region] || 0;
                        const hasCandidates = candidateCount > 0;

                        return (
                          <div
                            key={region}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-100 shadow-sm transition-all",
                              hasSpecialItems && !hasCandidates && "opacity-60 border-dashed"
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`region-${region}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  setSelectedRegions({
                                    ...selectedRegions,
                                    [region]: !!checked,
                                  });
                                  if (checked && !regionBoxCounts[region]) {
                                    setRegionBoxCounts({
                                      ...regionBoxCounts,
                                      [region]: 1,
                                    });
                                  }
                                }}
                              />
                              <div className="flex flex-col">
                                <Label
                                  htmlFor={`region-${region}`}
                                  className="font-semibold text-sm text-slate-700 cursor-pointer"
                                >
                                  {region}
                                </Label>
                                {hasSpecialItems && (
                                  <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider mt-0.5",
                                    hasCandidates ? "text-emerald-600" : "text-slate-400"
                                  )}>
                                    {hasCandidates ? `🟢 ${candidateCount} Candidates` : "⚪ No Candidates"}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="flex items-center space-x-2">
                                <Label className="text-xs font-bold text-slate-400">BOXES:</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  className="w-20 h-8 rounded-lg text-center font-bold"
                                  value={regionBoxCounts[region] || 1}
                                  onChange={(e) =>
                                    setRegionBoxCounts({
                                      ...regionBoxCounts,
                                      [region]: Math.max(1, parseInt(e.target.value) || 1),
                                    })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Select Region
                    </Label>
                    <Select value={districtRegion} onValueChange={setDistrictRegion}>
                      <SelectTrigger className="w-full h-10 rounded-xl border-slate-200">
                        <SelectValue placeholder="Choose a region..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {regions.map((r) => (
                          <SelectItem key={r} value={r} className="rounded-lg">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {districtRegion && (
                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Select Districts & Specify Box Quantities
                      </Label>
                      {districtsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                      ) : (
                        <ScrollArea className="h-[200px] border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                          <div className="space-y-3">
                            {districts.map((district) => {
                              const isSelected = !!selectedDistricts[district];
                              const candidateCount = candidateCounts[`${districtRegion}_${district}`] || 0;
                              const hasCandidates = candidateCount > 0;

                              return (
                                <div
                                  key={district}
                                  className={cn(
                                    "flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-100 shadow-sm transition-all",
                                    hasSpecialItems && !hasCandidates && "opacity-60 border-dashed"
                                  )}
                                >
                                  <div className="flex items-center space-x-3">
                                    <Checkbox
                                      id={`district-${district}`}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => {
                                        setSelectedDistricts({
                                          ...selectedDistricts,
                                          [district]: !!checked,
                                        });
                                        if (checked && !districtBoxCounts[district]) {
                                          setDistrictBoxCounts({
                                            ...districtBoxCounts,
                                            [district]: 1,
                                          });
                                        }
                                      }}
                                    />
                                    <div className="flex flex-col">
                                      <Label
                                        htmlFor={`district-${district}`}
                                        className="font-semibold text-sm text-slate-700 cursor-pointer"
                                      >
                                        {district}
                                      </Label>
                                      {hasSpecialItems && (
                                        <span className={cn(
                                          "text-[10px] font-bold uppercase tracking-wider mt-0.5",
                                          hasCandidates ? "text-emerald-600" : "text-slate-400"
                                        )}>
                                          {hasCandidates ? `🟢 ${candidateCount} Candidates` : "⚪ No Candidates"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="flex items-center space-x-2">
                                      <Label className="text-xs font-bold text-slate-400">BOXES:</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        className="w-20 h-8 rounded-lg text-center font-bold"
                                        value={districtBoxCounts[district] || 1}
                                        onChange={(e) =>
                                          setDistrictBoxCounts({
                                            ...districtBoxCounts,
                                            [district]: Math.max(1, parseInt(e.target.value) || 1),
                                          })
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between">
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrevStep}
              disabled={isGenerating}
              className="h-10 rounded-xl font-semibold text-xs text-slate-600"
            >
              <ChevronLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
              className="h-10 rounded-xl font-semibold text-xs text-slate-500"
            >
              Cancel
            </Button>
            {step < 2 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                disabled={loadingCandidates}
                className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5"
              >
                {loadingCandidates ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Loading...
                  </>
                ) : (
                  <>
                    Next <ChevronRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || items.length === 0}
                className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-6"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Generating...
                  </>
                ) : (
                  "Generate Labels"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};