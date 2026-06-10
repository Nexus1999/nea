"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  BookOpen,
  Cpu,
  Palette,
  FileText,
  Briefcase,
  Settings,
  Printer,
  Search,
  PlusCircle,
  RotateCcw,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import {
  fetchMasterSummaryById,
  fetchBoxLimitsSettings,
} from "@/integrations/supabase/stationery-settings-api";
import { MasterSummaryOption, Stationery } from "@/types/stationeries";
import BoxLimitsDrawer from "@/components/stationeries/BoxLimitsDrawer";
import KitbagLimitsDrawer from "@/components/stationeries/KitbagLimitsDrawer";
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";

// ---------- Helper Functions ----------
function abbreviateSchoolName(name: string): string {
  if (!name) return "";
  return name
    .replace(/\bPRIMARY SCHOOL\b/gi, "PS")
    .replace(/\bSECONDARY SCHOOL\b/gi, "SS")
    .replace(/\bHIGH SCHOOL\b/gi, "HS")
    .replace(/\bTEACHERS'? COLLEGE\b/gi, "TC")
    .replace(/\bTEACHERS'? TRAINING COLLEGE\b/gi, "TC")
    .replace(/\bSEMINARY\b/gi, "SEM")
    .replace(/\bISLAMIC SEMINARY\b/gi, "ISL SEM")
    .trim();
}

// ---------- Types ----------
interface LabelItem {
  id: number;
  mid: number;
  region: string;
  district: string;
  center_name: string;
  center_number: string;
  normal_booklets: number;
  graph_booklets: number;
  normal_loosesheets: number;
  graph_loosesheets: number;
  bkm: number;
  container_type: string;
  container_number: number;
  total_containers: number;
  item: string;
  quantity: number;
  category: string;
}

interface Category {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

// Category definitions per exam code with modern colors
const getCategoriesForExam = (examCode: string | undefined): Category[] => {
  if (!examCode) return [];
  switch (examCode) {
    case "CSEE":
    case "ACSEE":
      return [
        { id: "stationeries", name: "Stationeries", icon: Package, color: "text-blue-600", bgColor: "bg-blue-50" },
        { id: "arabic_booklets", name: "Arabic Booklets", icon: BookOpen, color: "text-emerald-600", bgColor: "bg-emerald-50" },
        { id: "ict_covers", name: "ICT Covers", icon: Cpu, color: "text-purple-600", bgColor: "bg-purple-50" },
        { id: "fine_arts_booklets", name: "Fine Arts Booklets", icon: Palette, color: "text-orange-600", bgColor: "bg-orange-50" },
        { id: "braille_stationeries", name: "Braille Stationeries", icon: FileText, color: "text-pink-600", bgColor: "bg-pink-50" },
        { id: "kitbags", name: "Kitbags", icon: Briefcase, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      ];
    case "FTNA":
      return [
        { id: "district_stationeries", name: "Stationeries", icon: Package, color: "text-blue-600", bgColor: "bg-blue-50" },
        { id: "ict_covers", name: "ICT Covers", icon: Cpu, color: "text-purple-600", bgColor: "bg-purple-50" },
        { id: "fine_arts_booklets", name: "Fine Arts Booklets", icon: Palette, color: "text-orange-600", bgColor: "bg-orange-50" },
        { id: "braille_stationeries", name: "Braille Stationeries", icon: FileText, color: "text-pink-600", bgColor: "bg-pink-50" },
      ];
    case "PSLE":
    case "SSNA":
    case "SFNA":
      return [
        { id: "district_stationeries", name: "Stationeries", icon: Package, color: "text-blue-600", bgColor: "bg-blue-50" },
        { id: "braille_stationeries", name: "Braille Stationeries", icon: FileText, color: "text-pink-600", bgColor: "bg-pink-50" },
        { id: "kitbags", name: "Kitbags", icon: Briefcase, color: "text-indigo-600", bgColor: "bg-indigo-50" },
      ];
    default:
      return [];
  }
};

// Map category id to database category string
const categoryQueryMap: Record<string, string> = {
  stationeries: "stationeries",
  district_stationeries: "district_stationeries",
  arabic_booklets: "Arabic Booklets",
  ict_covers: "ICT Covers",
  fine_arts_booklets: "Fine Arts Booklets",
  braille_stationeries: "Braille Stationeries",
  kitbags: "kitbags",
};

// ---------- React Query Hook for Labels ----------
const useLabels = (masterSummaryId: number | undefined, categoryId: string | null) => {
  const dbCategory = categoryId ? categoryQueryMap[categoryId] : null;
  return useQuery({
    queryKey: ["labels", masterSummaryId, categoryId],
    queryFn: async () => {
      if (!masterSummaryId || !dbCategory) return [];
      const { data, error } = await supabase
        .from("labels")
        .select("*")
        .eq("mid", masterSummaryId)
        .eq("category", dbCategory)
        .order("region", { ascending: true })
        .order("district", { ascending: true })
        .order("center_number", { ascending: true });
      if (error) throw error;
      return data as LabelItem[];
    },
    enabled: !!masterSummaryId && !!categoryId,
    keepPreviousData: true,
    placeholderData: (prev) => prev,
    staleTime: 5 * 60 * 1000,
  });
};

// ---------- Main Component ----------
const LabelsManagementPage: React.FC = () => {
  const { masterSummaryId } = useParams<{ masterSummaryId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Master summary & stationery state
  const [masterSummary, setMasterSummary] = useState<MasterSummaryOption | null>(null);
  const [stationery, setStationery] = useState<Stationery | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [regions, setRegions] = useState<string[]>([]);

  // UI state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Drawer states
  const [isBoxLimitsDrawerOpen, setIsBoxLimitsDrawerOpen] = useState(false);
  const [isKitbagLimitsDrawerOpen, setIsKitbagLimitsDrawerOpen] = useState(false);
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);

  // Load master summary and stationery
  useEffect(() => {
    const load = async () => {
      if (!masterSummaryId) {
        setLoadingSummary(false);
        return;
      }
      setLoadingSummary(true);
      try {
        const id = parseInt(masterSummaryId);
        const summary = await fetchMasterSummaryById(id);
        if (summary) {
          setMasterSummary(summary);
          const { data: stationeryData } = await supabase
            .from("stationeries")
            .select("*")
            .eq("mid", summary.id)
            .single();
          setStationery(stationeryData as Stationery | null);

          // Set first category as default if none selected
          const categories = getCategoriesForExam(summary.Code);
          if (categories.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(categories[0].id);
          }

          // Fetch regions for filtering
          const tableName = ["FTNA", "CSEE", "ACSEE"].includes(summary.Code)
            ? "secondarymastersummaries"
            : "primarymastersummary";
          const { data: regs } = await supabase
            .from(tableName)
            .select("region")
            .eq("mid", summary.id)
            .eq("is_latest", true);
          if (regs) {
            const distinct = Array.from(new Set(regs.map((r: any) => r.region).filter(Boolean))).sort((a, b) =>
              a.localeCompare(b)
            );
            setRegions(distinct);
          }
        }
      } catch (error: any) {
        showError(error.message || "Failed to load details.");
      } finally {
        setLoadingSummary(false);
      }
    };
    load();
  }, [masterSummaryId]);

  // React Query for labels of the selected category
  const {
    data: allLabels = [],
    isLoading: labelsLoading,
    isFetching: labelsFetching,
  } = useLabels(masterSummary?.id, selectedCategoryId);

  // Client-side filtering + pagination
  const filteredLabels = useMemo(() => {
    let filtered = [...allLabels];
    if (selectedRegion !== "All") {
      filtered = filtered.filter((label) => label.region === selectedRegion);
    }
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (label) =>
          label.center_name.toLowerCase().includes(term) ||
          label.center_number.toLowerCase().includes(term) ||
          label.district.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [allLabels, selectedRegion, debouncedSearchTerm]);

  const totalPages = Math.ceil(filteredLabels.length / itemsPerPage);
  const currentLabels = filteredLabels.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 750);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRegion, debouncedSearchTerm, selectedCategoryId]);

  // Table columns depend on active category
  const getTableColumns = useMemo(() => {
    const baseColumns = [
      { header: "Region", accessor: "region", width: "w-[15%]" },
      { header: "District", accessor: "district", width: "w-[15%]" },
      { header: "Center No.", accessor: "center_number", width: "w-[12%]" },
      {
        header: "Center Name",
        accessor: "center_name",
        width: "w-[40%]",
        render: (label: LabelItem) => abbreviateSchoolName(label.center_name),
      },
    ];

    if (selectedCategoryId === "stationeries") {
      return [
        { header: "Region", accessor: "region", width: "w-[10%]" },
        { header: "District", accessor: "district", width: "w-[10%]" },
        { header: "Center No.", accessor: "center_number", width: "w-[10%]" },
        {
          header: "Center Name",
          accessor: "center_name",
          width: "w-[15%]",
          render: (label: LabelItem) => abbreviateSchoolName(label.center_name),
        },
        { header: "Normal B.", accessor: "normal_booklets", width: "w-[8%]" },
        { header: "Graph B.", accessor: "graph_booklets", width: "w-[8%]" },
        { header: "Normal LS", accessor: "normal_loosesheets", width: "w-[8%]" },
        { header: "Graph LS", accessor: "graph_loosesheets", width: "w-[8%]" },
        { header: "BKM", accessor: "bkm", width: "w-[5%]" },
        { header: "Box", accessor: "container_number", width: "w-[5%]" },
        { header: "Boxes", accessor: "total_containers", width: "w-[5%]" },
      ];
    }
    return baseColumns;
  }, [selectedCategoryId]);

  // ---------- Mutations (Create & Reset Labels) ----------
  const handleCreateLabels = async () => {
    if (!masterSummary || !stationery?.id || !selectedCategoryId) return;
    setIsGeneratingLabels(true);
    try {
      let invokeFunction = "";
      let payload: any = {
        masterSummaryId: masterSummary.id,
        stationeryId: stationery.id,
        examCode: masterSummary.Code,
        region: selectedRegion !== "All" ? selectedRegion : null,
      };

      if (selectedCategoryId === "stationeries") {
        const boxLimits = await fetchBoxLimitsSettings(stationery.id);
        if (!boxLimits) {
          showError("Box limits not defined.");
          setIsGeneratingLabels(false);
          return;
        }
        invokeFunction = "pack-stationery-labels";
      } else if (selectedCategoryId === "district_stationeries") {
        invokeFunction = "pack-district-stationeries";
      } else if (["arabic_booklets", "ict_covers", "fine_arts_booklets"].includes(selectedCategoryId)) {
        const categoryMap: Record<string, string> = {
          arabic_booklets: "Arabic Booklets",
          ict_covers: "ICT Covers",
          fine_arts_booklets: "Fine Arts Booklets",
        };
        invokeFunction = "pack-subject-category-labels";
        payload.category = categoryMap[selectedCategoryId];
      } else if (selectedCategoryId === "braille_stationeries") {
        invokeFunction = "pack-braille-sheets";
        payload.category = "Braille Stationeries";
      } else if (selectedCategoryId === "kitbags") {
        invokeFunction = "pack-kitbag-labels";
      }

      const { data, error } = await supabase.functions.invoke(invokeFunction, { body: payload });
      if (error) throw error;
      showSuccess("Labels generated successfully!");
      await queryClient.invalidateQueries({ queryKey: ["labels", masterSummary.id, selectedCategoryId] });
    } catch (error: any) {
      showError(error.message || "Failed to generate labels.");
    } finally {
      setIsGeneratingLabels(false);
    }
  };

  const handleResetLabels = async () => {
    if (!masterSummary || !selectedCategoryId) return;
    setIsGeneratingLabels(true);
    try {
      const dbCategory = categoryQueryMap[selectedCategoryId] || selectedCategoryId;
      const query = supabase
        .from("labels")
        .delete()
        .eq("mid", masterSummary.id)
        .eq("category", dbCategory);
      if (selectedRegion !== "All") query.eq("region", selectedRegion);
      await query;
      showSuccess("Labels reset successfully!");
      await queryClient.invalidateQueries({ queryKey: ["labels", masterSummary.id, selectedCategoryId] });
    } catch (error: any) {
      showError("Failed to reset labels.");
    } finally {
      setIsGeneratingLabels(false);
    }
  };

  // Current category object
  const currentCategory = getCategoriesForExam(masterSummary?.Code).find((c) => c.id === selectedCategoryId);

  if (loadingSummary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner label="Loading labels management..." size="lg" />
      </div>
    );
  }

  if (!masterSummary) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p className="text-red-600">Failed to load examination data.</p>
        <Button onClick={() => navigate("/dashboard/stationeries")} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const categories = getCategoriesForExam(masterSummary.Code);

  return (
    <Card className="relative min-h-[600px] border-0 shadow-lg rounded-2xl overflow-hidden bg-white">
      {/* Background loading overlay */}
      {(labelsLoading || isGeneratingLabels) && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-2xl">
          <Spinner label={isGeneratingLabels ? "Generating labels..." : "Loading labels..."} size="lg" />
        </div>
      )}

      {/* Card Header */}
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Labels Management
            </CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-500 mt-0.5">
              {masterSummary.Code} — {masterSummary.Year}
            </CardDescription>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {selectedCategoryId === "stationeries" && stationery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBoxLimitsDrawerOpen(true)}
              className="h-9 rounded-xl border-blue-200 bg-blue-50/50 text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-semibold text-xs"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" /> Box Limits
            </Button>
          )}
          {selectedCategoryId === "kitbags" && stationery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsKitbagLimitsDrawerOpen(true)}
              className="h-9 rounded-xl border-emerald-200 bg-emerald-50/50 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-semibold text-xs"
            >
              <Settings className="h-3.5 w-3.5 mr-1.5" /> Kitbag Limits
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleCreateLabels}
            disabled={isGeneratingLabels || !selectedCategoryId}
            className="h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs gap-1.5"
          >
            <PlusCircle className="h-3.5 w-3.5" /> Create Labels
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLabels}
            disabled={isGeneratingLabels || !selectedCategoryId}
            className="h-9 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </CardHeader>

      {/* Card Content */}
      <CardContent className="p-6">
        {/* Filters Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by center name, number or district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 rounded-xl border-slate-200 bg-white focus-visible:ring-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Category Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category:</span>
              <Select value={selectedCategoryId || ""} onValueChange={setSelectedCategoryId}>
                <SelectTrigger className="w-56 h-10 rounded-xl border-slate-200 bg-white font-medium text-slate-700">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-md ${cat.bgColor} ${cat.color}`}>
                          <cat.icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium text-slate-700">{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Region Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Region:</span>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-48 h-10 rounded-xl border-slate-200 bg-white font-medium text-slate-700">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="All" className="rounded-lg font-medium">All Regions</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r} value={r} className="rounded-lg font-medium">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
          <Table>
            <TableHeader className="bg-slate-50/75">
              <TableRow className="border-b border-slate-100">
                <TableHead className="w-[60px] text-xs font-bold uppercase tracking-wider text-slate-400 py-4 pl-6">S/N</TableHead>
                {getTableColumns.map((col, idx) => (
                  <TableHead key={idx} className={`${col.width} text-xs font-bold uppercase tracking-wider text-slate-400 py-4`}>
                    {col.header}
                  </TableHead>
                ))}
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-400 py-4 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labelsLoading && allLabels.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-slate-100">
                    <TableCell className="pl-6 py-4">
                      <div className="h-4 w-6 bg-slate-100 rounded animate-pulse" />
                    </TableCell>
                    {getTableColumns.map((_, j) => (
                      <TableCell key={j} className="py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                      </TableCell>
                    ))}
                    <TableCell className="pr-6 py-4 text-right">
                      <div className="h-8 w-8 bg-slate-100 rounded-lg animate-pulse ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : currentLabels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={getTableColumns.length + 2} className="text-center py-12 text-slate-400 font-medium">
                    No labels found. Click "Create Labels" to generate.
                  </TableCell>
                </TableRow>
              ) : (
                currentLabels.map((label, idx) => (
                  <TableRow key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <TableCell className="text-xs font-semibold text-slate-400 py-4 pl-6">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </TableCell>
                    {getTableColumns.map((col, j) => (
                      <TableCell key={j} className="py-4 text-sm text-slate-600 font-medium">
                        {col.render ? (
                          col.render(label)
                        ) : col.accessor === "center_number" ? (
                          <span className="font-bold text-slate-700">{label.center_number}</span>
                        ) : col.accessor === "region" || col.accessor === "district" ? (
                          <span className="text-slate-500">{label[col.accessor as keyof LabelItem]}</span>
                        ) : (
                          <span className="font-semibold text-slate-800">{label[col.accessor as keyof LabelItem]}</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right py-4 pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Background Fetching Indicator */}
        {labelsFetching && !labelsLoading && allLabels.length > 0 && (
          <div className="flex items-center justify-end gap-2 text-xs text-slate-400 mt-3 font-medium">
            <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
            <span>Updating labels in background...</span>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </CardContent>

      {/* Drawers */}
      {stationery && masterSummary.Code && (
        <>
          <BoxLimitsDrawer
            open={isBoxLimitsDrawerOpen}
            onOpenChange={setIsBoxLimitsDrawerOpen}
            stationery={stationery}
            onSuccess={() => {}}
            examCode={masterSummary.Code}
          />
          <KitbagLimitsDrawer
            open={isKitbagLimitsDrawerOpen}
            onOpenChange={setIsKitbagLimitsDrawerOpen}
            stationery={stationery}
            onSuccess={() => {}}
            examCode={masterSummary.Code}
          />
        </>
      )}
    </Card>
  );
};

export default LabelsManagementPage;