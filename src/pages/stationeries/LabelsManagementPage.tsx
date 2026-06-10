"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}

// Category definitions per exam code
const getCategoriesForExam = (examCode: string | undefined): Category[] => {
  if (!examCode) return [];
  switch (examCode) {
    case "CSEE":
    case "ACSEE":
      return [
        { id: "stationeries", name: "Stationeries", icon: Package },
        { id: "arabic_booklets", name: "Arabic Booklets", icon: BookOpen },
        { id: "ict_covers", name: "ICT Covers", icon: Cpu },
        { id: "fine_arts_booklets", name: "Fine Arts Booklets", icon: Palette },
        { id: "braille_stationeries", name: "Braille Stationeries", icon: FileText },
        { id: "kitbags", name: "Kitbags", icon: Briefcase },
      ];
    case "FTNA":
      return [
        { id: "district_stationeries", name: "Stationeries", icon: Package },
        { id: "ict_covers", name: "ICT Covers", icon: Cpu },
        { id: "fine_arts_booklets", name: "Fine Arts Booklets", icon: Palette },
        { id: "braille_stationeries", name: "Braille Stationeries", icon: FileText },
      ];
    case "PSLE":
    case "SSNA":
    case "SFNA":
      return [
        { id: "district_stationeries", name: "Stationeries", icon: Package },
        { id: "braille_stationeries", name: "Braille Stationeries", icon: FileText },
        { id: "kitbags", name: "Kitbags", icon: Briefcase },
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
    keepPreviousData: true, // keeps old data visible while fetching new
    placeholderData: (prev) => prev, // immediately show previous data when switching categories
    staleTime: 5 * 60 * 1000, // 5 minutes
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
      { header: "Region", accessor: "region", width: "w-[12%]" },
      { header: "District", accessor: "district", width: "w-[12%]" },
      { header: "Center No.", accessor: "center_number", width: "w-[10%]" },
      {
        header: "Center Name",
        accessor: "center_name",
        width: "w-[20%]",
        render: (label: LabelItem) => abbreviateSchoolName(label.center_name),
      },
    ];

    if (selectedCategoryId === "stationeries") {
      return [
        { header: "Region", accessor: "region", width: "w-[9%]" },
        { header: "District", accessor: "district", width: "w-[10%]" },
        { header: "Center No.", accessor: "center_number", width: "w-[9%]" },
        {
          header: "Center Name",
          accessor: "center_name",
          width: "w-[10%]",
          render: (label: LabelItem) => abbreviateSchoolName(label.center_name),
        },
        { header: "Normal B.", accessor: "normal_booklets", width: "w-[10%]" },
        { header: "Graph B.", accessor: "graph_booklets", width: "w-[10%]" },
        { header: "Normal LS", accessor: "normal_loosesheets", width: "w-[10%]" },
        { header: "Graph LS", accessor: "graph_loosesheets", width: "w-[10%]" },
        { header: "BKM", accessor: "bkm", width: "w-[4%]" },
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
      // Invalidate the cache for this category
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
        <Spinner label="Loading labels management..." />
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
    <div className="container mx-auto py-4 px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Labels Management</h1>
          <p className="text-gray-600 mt-1 font-extrabold">
            {masterSummary.Code} - {masterSummary.Year}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Dropdown Selector */}
          <Select value={selectedCategoryId || ""} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <cat.icon className="h-4 w-4 text-slate-500" />
                    <span>{cat.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Region Dropdown Selector */}
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => navigate("/dashboard/stationeries")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="border-t-4 border-blue-600 shadow-xl rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 flex-wrap gap-3">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              {currentCategory && (
                <>
                  <currentCategory.icon className="h-6 w-6 text-blue-600" />
                  {currentCategory.name} Labels
                </>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {selectedCategoryId === "stationeries" && stationery && (
              <Button
                variant="outline"
                onClick={() => setIsBoxLimitsDrawerOpen(true)}
                className="bg-blue-50 text-blue-600"
              >
                <Settings className="h-4 w-4 mr-2" /> Box Limits
              </Button>
            )}
            {selectedCategoryId === "kitbags" && stationery && (
              <Button
                variant="outline"
                onClick={() => setIsKitbagLimitsDrawerOpen(true)}
                className="bg-green-50 text-green-600"
              >
                <Settings className="h-4 w-4 mr-2" /> Kitbag Limits
              </Button>
            )}
            <Button onClick={handleCreateLabels} disabled={isGeneratingLabels || !selectedCategoryId}>
              {isGeneratingLabels ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <PlusCircle className="h-4 w-4 mr-2" />
              )}
              Create Labels
            </Button>
            <Button variant="destructive" onClick={handleResetLabels} disabled={isGeneratingLabels || !selectedCategoryId}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search bar */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by center name, number or district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Table with skeleton loading */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  {getTableColumns.map((col, idx) => (
                    <TableHead key={idx} className={col.width}>
                      {col.header}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labelsLoading && allLabels.length === 0 ? (
                  // Show skeleton rows for initial load
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {getTableColumns.map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : currentLabels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={getTableColumns.length + 1} className="text-center text-muted-foreground">
                      No labels found. Click "Create Labels" to generate.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentLabels.map((label, idx) => (
                    <TableRow key={idx}>
                      {getTableColumns.map((col, j) => (
                        <TableCell key={j}>
                          {col.render ? col.render(label) : (label as any)[col.accessor]}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Update indicator (background fetch) */}
          {labelsFetching && !labelsLoading && allLabels.length > 0 && (
            <div className="text-xs text-muted-foreground text-right mt-1">Updating labels…</div>
          )}
          {totalPages > 1 && (
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          )}
        </CardContent>
      </Card>

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
    </div>
  );
};

export default LabelsManagementPage;