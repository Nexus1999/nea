"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sparkles,
  Truck,
  Shield,
  MapPin,
  Package,
  Weight,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  generateIntelligentRoutes,
  SuggestedMsafara,
  RegionDemand,
  ALL_TANZANIAN_REGIONS,
  GEO_CLUSTERS,
} from "@/utils/intelligentRoutePlanner";

interface SmartRouteSuggesterProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (msafara: SuggestedMsafara) => void;
  loadingDate?: string;
}

const SmartRouteSuggester: React.FC<SmartRouteSuggesterProps> = ({
  isOpen,
  onClose,
  onSelect,
  loadingDate,
}) => {
  const [regionBoxes, setRegionBoxes] = useState<Record<string, number>>({});
  const [suggestions, setSuggestions] = useState<SuggestedMsafara[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [planningDate, setPlanningDate] = useState(
    loadingDate || new Date().toISOString().split("T")[0]
  );

  const handleBoxChange = (region: string, value: string) => {
    const num = parseInt(value) || 0;
    setRegionBoxes((prev) => ({ ...prev, [region]: num }));
  };

  const totalBoxesEntered = useMemo(
    () => Object.values(regionBoxes).reduce((sum, v) => sum + (v || 0), 0),
    [regionBoxes]
  );

  const regionsWithBoxes = useMemo(
    () => Object.values(regionBoxes).filter((v) => v > 0).length,
    [regionBoxes]
  );

  const handleGenerate = () => {
    const demands: RegionDemand[] = ALL_TANZANIAN_REGIONS.map((region) => ({
      region,
      boxes: regionBoxes[region] || 0,
    })).filter((d) => d.boxes > 0);

    if (demands.length === 0) return;

    const generated = generateIntelligentRoutes(demands, planningDate);
    setSuggestions(generated);
    setHasGenerated(true);
  };

  const handleReset = () => {
    setRegionBoxes({});
    setSuggestions([]);
    setHasGenerated(false);
  };

  const handleUseSuggestion = (msafara: SuggestedMsafara) => {
    onSelect(msafara);
    onClose();
  };

  const clusterGroups = GEO_CLUSTERS.map((cluster) => ({
    ...cluster,
    regions: cluster.regions.filter((r) => ALL_TANZANIAN_REGIONS.includes(r)),
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="bg-slate-900 text-white px-6 py-5 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-lg font-bold">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              AI Smart Route Suggester
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-1">
              Enter box counts per region below. The system will suggest optimal
              Msafara groupings based on vehicle capacity and geographic clusters.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Loading Date
              </label>
              <Input
                type="date"
                value={planningDate}
                onChange={(e) => setPlanningDate(e.target.value)}
                className="h-9 w-44 rounded-xl border-slate-200"
              />
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">
                  Regions with boxes
                </span>
                <span className="font-black text-slate-900">{regionsWithBoxes}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">
                  Total boxes
                </span>
                <span className="font-black text-slate-900">{totalBoxesEntered.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">
                  Total weight
                </span>
                <span className="font-black text-slate-900">
                  {((totalBoxesEntered * 34) / 1000).toFixed(1)} tons
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {clusterGroups.map((cluster) => (
              <div key={cluster.name}>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  {cluster.name}
                </h3>
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="hover:bg-transparent border-b border-slate-100">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-3">
                          Region
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-3 w-36">
                          Boxes
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-3 w-32 text-right">
                          Est. Weight
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-3 w-40">
                          Receives At
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cluster.regions.map((region) => {
                        const boxes = regionBoxes[region] || 0;
                        const tons = ((boxes * 34) / 1000).toFixed(2);
                        const hubReceivingAt =
                          region === "KAGERA" ||
                          region === "GEITA" ||
                          region === "MARA"
                            ? "MWANZA"
                            : region === "SIMIYU"
                            ? "SHINYANGA"
                            : region === "RUVUMA"
                            ? "NJOMBE"
                            : region === "KATAVI"
                            ? "RUKWA"
                            : region;
                        const isHub = hubReceivingAt !== region;

                        return (
                          <TableRow
                            key={region}
                            className="hover:bg-slate-50/50 border-b border-slate-50"
                          >
                            <TableCell className="font-bold text-sm text-slate-800 py-2.5">
                              {region}
                              {isHub && (
                                <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-blue-500">
                                  → hub
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-2">
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={boxes || ""}
                                onChange={(e) =>
                                  handleBoxChange(region, e.target.value)
                                }
                                className="h-8 w-28 rounded-lg border-slate-200 text-sm font-bold"
                              />
                            </TableCell>
                            <TableCell className="py-2 text-right">
                              {boxes > 0 ? (
                                <span className="text-xs font-bold text-slate-600">
                                  {tons} tons
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </TableCell>
                            <TableCell className="py-2">
                              <span className="text-xs text-slate-500 font-medium">
                                {hubReceivingAt}
                                {isHub && (
                                  <span className="text-blue-400"> (hub)</span>
                                )}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={regionsWithBoxes === 0}
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Intelligent Routes
              {regionsWithBoxes > 0 && ` (${regionsWithBoxes} regions)`}
            </Button>
            {hasGenerated && (
              <Button
                onClick={handleReset}
                variant="outline"
                className="h-12 px-6 rounded-xl font-bold uppercase text-[10px] tracking-widest"
              >
                Reset
              </Button>
            )}
          </div>

          {hasGenerated && suggestions.length === 0 && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700 font-medium">
                No routes could be generated. Please enter box counts for at least
                one region.
              </p>
            </div>
          )}

          {hasGenerated && suggestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-600">
                  {suggestions.length} Msafara Suggested — Click one to use it
                </h3>
              </div>

              {suggestions.map((msafara) => (
                <div
                  key={msafara.msafaraNumber}
                  className="border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-sm cursor-pointer transition-all group"
                  onClick={() => handleUseSuggestion(msafara)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-black text-slate-900 text-sm uppercase tracking-tight">
                        {msafara.name}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Load: {msafara.loadingDate} • Start:{" "}
                        {msafara.startDate}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseSuggestion(msafara);
                      }}
                    >
                      Use This Route
                    </Button>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 mb-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[9px] font-bold text-slate-400">DSM</span>
                    <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                    {msafara.regions.map((r, idx) => (
                      <React.Fragment key={r.name}>
                        <span
                          className={`text-[9px] font-black ${
                            idx === msafara.regions.length - 1
                              ? "text-blue-600"
                              : "text-slate-700"
                          }`}
                        >
                          {r.name}
                          {r.receivingPlace !== r.name && (
                            <span className="text-slate-400 font-normal">
                              @{r.receivingPlace}
                            </span>
                          )}
                        </span>
                        {idx < msafara.regions.length - 1 && (
                          <ArrowRight className="w-2 h-2 text-slate-300" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="rounded-lg border border-slate-100 overflow-hidden mb-3">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 py-2">Region</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 py-2">Receives At</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 py-2">Delivery</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 py-2 text-right">Boxes</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-400 py-2 text-right">Tons</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {msafara.regions.map((r) => (
                          <TableRow key={r.name} className="hover:bg-transparent border-b border-slate-50">
                            <TableCell className="py-1.5 text-xs font-bold text-slate-800">{r.name}</TableCell>
                            <TableCell className="py-1.5 text-xs text-slate-500">{r.receivingPlace}</TableCell>
                            <TableCell className="py-1.5 text-xs text-slate-500">{r.deliveryDate}</TableCell>
                            <TableCell className="py-1.5 text-xs font-black text-slate-900 text-right">{r.boxes}</TableCell>
                            <TableCell className="py-1.5 text-xs text-slate-500 text-right">
                              {((r.boxes * 34) / 1000).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Package className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] font-black text-slate-700">
                        {msafara.totalBoxes} boxes
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Weight className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] font-black text-slate-700">
                        {msafara.totalTons} tons
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                      <Truck className="w-3 h-3 text-blue-500" />
                      <span className="text-[10px] font-black text-blue-700">
                        {msafara.estimatedLorries} lorry unit(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg">
                      <Shield className="w-3 h-3 text-orange-500" />
                      <span className="text-[10px] font-black text-orange-700">
                        {msafara.estimatedEscorts} escort(s)
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest">
                      {msafara.notes}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 flex justify-between items-center shrink-0">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Routes are suggestions only — you can edit after selecting
          </p>
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-xl font-bold uppercase text-[10px] tracking-widest"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartRouteSuggester;