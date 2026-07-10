"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  RefreshCw,
  Boxes,
  X,
  Maximize2,
  Minimize2,
  Calendar,
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
import { BoxLabelsWizardModal } from "@/components/stationeries/BoxLabelsWizardModal";
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";
import { cn } from "@/lib/utils";

// Import Print Utilities
import { generateLabelsHtml } from "@/utils/labels/printEngine";
import { renderStationeriesLabels } from "@/utils/labels/stationeries";
import { renderDistrictStationeriesLabels } from "@/utils/labels/districtStationeries";
import { renderFtnaDistrictStationeriesLabels } from "@/utils/labels/ftnaDistrictStationeries";
import { renderArabicBookletsLabels } from "@/utils/labels/arabicBooklets";
import { renderIctCoversLabels } from "@/utils/labels/ictCovers";
import { renderFineArtsBookletsLabels } from "@/utils/labels/fineArtsBooklets";
import { renderBrailleStationeriesLabels } from "@/utils/labels/brailleStationeries";
import { renderBkmLabels } from "@/utils/labels/bkm";
import { renderKitbagsLabels } from "@/utils/labels/kitbags";
import { renderTimetablesLabels } from "@/utils/labels/timetables";
import { renderBoxLabels } from "@/utils/labels/boxLabels";

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
  bkm_red?: number;
  bkm_pink?: number;
  container_type: string;
  container_number: string; // Matches DB schema (text null)
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
        { id: "supervisors_forms", name: "Supervisors Forms", icon: FileText, color: "text-indigo-600", bgColor: "bg-indigo-50" },
        { id: "arabic_booklets", name: "Arabic Booklets", icon: BookOpen, color: "text-emerald-600", bgColor: "bg-emerald-50" },
        { id: "ict_covers", name: "ICT Covers", icon: Cpu, color: "text-purple-600", bgColor: "bg-purple-50" },
        { id: "fine_arts_booklets", name: "Fine Arts Booklets", icon: Palette, color: "text-orange-600", bgColor: "bg-orange-50" },
        { id: "braille_stationeries", name: "Braille Stationeries", icon: FileText, color: "text-pink-600", bgColor: "bg-pink-50" },
        { id: "bkm", name: "BKM", icon: Boxes, color: "text-teal-600", bgColor: "bg-teal-50" },
        { id: "kitbags", name: "Kitbags", icon: Briefcase, color: "text-indigo-600", bgColor: "bg-indigo-50" },
        { id: "timetables", name: "Timetables", icon: Calendar, color: "text-green-600", bgColor: "bg-green-50" },
        { id: "box_labels", name: "Box Labels", icon: Package, color: "text-amber-600", bgColor: "bg-amber-50" },
      ];
    case "FTNA":
      return [
        { id: "district_stationeries", name: "Stationeries", icon: Package, color: "text-blue-600", bgColor: "bg-blue-50" },
        { id: "ict_covers", name: "ICT Covers", icon: Cpu, color: "text-purple-600", bgColor: "bg-purple-50" },
        { id: "fine_arts_booklets", name: "Fine Arts Booklets", icon: Palette, color: "text-orange-600", bgColor: "bg-orange-50" },
        { id: "braille_stationeries", name: "Braille Stationeries", icon: FileText, color: "text-pink-600", bgColor: "bg-pink-50" },
        { id: "bkm", name: "BKM", icon: Boxes, color: "text-teal-600", bgColor: "bg-teal-50" },
        { id: "timetables", name: "Timetables", icon: Calendar, color: "text-green-600", bgColor: "bg-green-50" },
        { id: "box_labels", name: "Box Labels", icon: Package, color: "text-amber-600", bgColor: "bg-amber-50" },
      ];
    case "PSLE":
    case "SSNA":
    case "SFNA":
      return [
        { id: "district_stationeries", name: "Stationeries", icon: Package, color: "text-blue-600", bgColor: "bg-blue-50" },
        { id: "braille_stationeries", name: "Braille Stationeries", icon: FileText, color: "text-pink-600", bgColor: "bg-pink-50" },
        { id: "kitbags", name: "Kitbags", icon: Briefcase, color: "text-indigo-600", bgColor: "bg-indigo-50" },
        { id: "timetables", name: "Timetables", icon: Calendar, color: "text-green-600", bgColor: "bg-green-50" },
        { id: "box_labels", name: "Box Labels", icon: Package, color: "text-amber-600", bgColor: "bg-amber-50" },
      ];
    default:
      return [];
  }
};

// Map category id to database category string candidates to handle casing/naming mismatches
const categoryQueryMap: Record<string, string[]> = {
  stationeries: ["stationeries", "Stationeries"],
  district_stationeries: ["district_stationeries", "District Stationeries", "district-stationeries"],
  supervisors_forms: ["Supervisors Forms", "supervisors_forms", "supervisors-forms", "district_stationeries", "District Stationeries"],
  arabic_booklets: ["Arabic Booklets", "arabic_booklets", "arabic-booklets"],
  ict_covers: ["ICT Covers", "ict_covers", "ict-covers"],
  fine_arts_booklets: ["Fine Arts Booklets", "fine_arts_booklets", "fine-arts-booklets"],
  braille_stationeries: ["Braille Stationeries", "braille_stationeries", "braille-stationeries"],
  kitbags: ["kitbags", "Kitbags"],
  bkm: ["bkm", "BKM"],
  timetables: ["timetables", "Timetables"],
  box_labels: ["Box Labels", "box_labels"],
};

// ---------- React Query Hook for Labels ----------
const useLabels = (masterSummaryId: number | undefined, categoryId: string | null) => {
  const dbCategories = categoryId ? categoryQueryMap[categoryId] : null;
  return useQuery({
    queryKey: ["labels", masterSummaryId, categoryId],
    queryFn: async () => {
      if (!masterSummaryId || !dbCategories) return [];
      const { data, error } = await supabase
        .from("labels")
        .select("*")
        .eq("mid", masterSummaryId)
        .in("category", dbCategories);
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Master summary & stationery state
  const [masterSummary, setMasterSummary] = useState<MasterSummaryOption | null>(null);
  const [stationery, setStationery] = useState<Stationery | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [regions, setRegions] = useState<string[]>([]);

  // UI state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [selectedItem, setSelectedItem] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Drawer states
  const [isBoxLimitsDrawerOpen, setIsBoxLimitsDrawerOpen] = useState(false);
  const [isKitbagLimitsDrawerOpen, setIsKitbagLimitsDrawerOpen] = useState(false);
  const [isBoxLabelsWizardOpen, setIsBoxLabelsWizardOpen] = useState(false);
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);

  // Print Preview Modal states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Extract unique items for District Stationeries and Supervisors Forms
  const uniqueItems = useMemo(() => {
    if (selectedCategoryId !== "district_stationeries" && selectedCategoryId !== "supervisors_forms") return [];
    const itemsSet = new Set<string>();
    allLabels.forEach((label) => {
      if (label.item) {
        itemsSet.add(label.item);
      }
    });
    return Array.from(itemsSet).sort();
  }, [allLabels, selectedCategoryId]);

  // Client-side filtering, sorting + pagination
  const filteredLabels = useMemo(() => {
    let filtered = [...allLabels];
    if (selectedRegion !== "All") {
      filtered = filtered.filter((label) => label.region === selectedRegion);
    }
    if ((selectedCategoryId === "district_stationeries" || selectedCategoryId === "supervisors_forms") && selectedItem !== "All") {
      filtered = filtered.filter((label) => label.item === selectedItem);
    }
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (label) =>
          (label.center_name && label.center_name.toLowerCase().includes(term)) ||
          (label.center_number && label.center_number.toLowerCase().includes(term)) ||
          (label.district && label.district.toLowerCase().includes(term))
      );
    }

    // Sort by region, district, center_number, and container_number (treated as a number)
    filtered.sort((a, b) => {
      // 1. Region
      const regA = a.region || "";
      const regB = b.region || "";
      if (regA !== regB) return regA.localeCompare(regB);

      // 2. District
      const distA = a.district || "";
      const distB = b.district || "";
      if (distA !== distB) return distA.localeCompare(distB);

      // 3. Center Number
      const cNumA = a.center_number || "";
      const cNumB = b.center_number || "";
      if (cNumA !== cNumB) return cNumA.localeCompare(cNumB);

      // 4. Container Number (treated as number)
      const numA = parseInt(a.container_number || "0", 10);
      const numB = parseInt(b.container_number || "0", 10);
      if (isNaN(numA) && isNaN(numB)) {
        return (a.container_number || "").localeCompare(b.container_number || "");
      }
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;
      return numA - numB;
    });

    return filtered;
  }, [allLabels, selectedRegion, selectedItem, selectedCategoryId, debouncedSearchTerm]);

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
  }, [selectedRegion, selectedItem, debouncedSearchTerm, selectedCategoryId]);

  // Reset item filter when category changes
  useEffect(() => {
    setSelectedItem("All");
  }, [selectedCategoryId]);

  // Table columns depend on active category and exam code
  const getTableColumns = useMemo(() => {
    const examCode = masterSummary?.Code || "";

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

    if (selectedCategoryId === "supervisors_forms") {
      return [
        { header: "Region", accessor: "region", width: "w-[12%]" },
        { header: "District", accessor: "district", width: "w-[12%]" },
        { header: "Item", accessor: "item", width: "w-[10%]" },
        {
          header: "Quantity",
          accessor: "quantity",
          width: "w-[20%]",
          render: (label: LabelItem) => {
            if (label.item === "BKM") {
              const red = label.bkm_red || 0;
              const pink = label.bkm_pink || 0;
              return (
                <div className="flex flex-col items-center justify-center text-xs">
                  <span className="font-bold text-red-600">RED: {red}</span>
                  <span className="font-bold text-pink-600">PINK: {pink}</span>
                  <span className="text-[10px] text-slate-400">(Total: {label.quantity})</span>
                </div>
              );
            }
            return label.quantity;
          }
        },
        { header: "Box/Env", accessor: "container_number", width: "w-[10%]" },
        { header: "Total Boxes", accessor: "total_containers", width: "w-[10%]" },
      ];
    }

    if (selectedCategoryId === "district_stationeries") {
      // 1. FTNA Custom columns as requested: Region, District, TR, TWM, BKM RED, BKM PINK, Box, Boxes, Actions
      if (examCode === "FTNA") {
        return [
          { header: "Region", accessor: "region", width: "w-[12%]" },
          { header: "District", accessor: "district", width: "w-[12%]" },
          {
            header: "TR",
            accessor: "tr",
            width: "w-[8%]",
            render: (label: LabelItem) => label.item === "TR" ? <span className="font-bold text-slate-800">{label.quantity}</span> : "-"
          },
          {
            header: "TWM",
            accessor: "twm",
            width: "w-[8%]",
            render: (label: LabelItem) => label.item === "TWM" ? <span className="font-bold text-slate-800">{label.quantity}</span> : "-"
          },
          {
            header: "BKM RED",
            accessor: "bkm_red",
            width: "w-[10%]",
            render: (label: LabelItem) => label.item === "BKM" ? <span className="font-bold text-red-600">{label.bkm_red ?? 0}</span> : "-"
          },
          {
            header: "BKM PINK",
            accessor: "bkm_pink",
            width: "w-[10%]",
            render: (label: LabelItem) => label.item === "BKM" ? <span className="font-bold text-pink-600">{label.bkm_pink ?? 0}</span> : "-"
          },
          { header: "Box/Env", accessor: "container_number", width: "w-[10%]" },
          { header: "Total Boxes", accessor: "total_containers", width: "w-[10%]" },
        ];
      }

      // 2. Standard CSEE / ACSEE co-packed BKM columns
      const isSecondaryDistrict = ["CSEE", "ACSEE"].includes(examCode);
      if (isSecondaryDistrict) {
        return [
          { header: "Region", accessor: "region", width: "w-[12%]" },
          { header: "District", accessor: "district", width: "w-[12%]" },
          { header: "Item", accessor: "item", width: "w-[10%]" },
          {
            header: "Quantity",
            accessor: "quantity",
            width: "w-[20%]",
            render: (label: LabelItem) => {
              if (label.item === "BKM") {
                const red = label.bkm_red || 0;
                const pink = label.bkm_pink || 0;
                return (
                  <div className="flex flex-col items-center justify-center text-xs">
                    <span className="font-bold text-red-600">RED: {red}</span>
                    <span className="font-bold text-pink-600">PINK: {pink}</span>
                    <span className="text-[10px] text-slate-400">(Total: {label.quantity})</span>
                  </div>
                );
              }
              return label.quantity;
            }
          },
          { header: "Box/Env", accessor: "container_number", width: "w-[10%]" },
          { header: "Total", accessor: "total_containers", width: "w-[10%]" },
        ];
      }

      // 3. Keep standard primary display
      return [
        { header: "Region", accessor: "region", width: "w-[15%]" },
        { header: "District", accessor: "district", width: "w-[15%]" },
        { header: "Item", accessor: "item", width: "w-[15%]" },
        { header: "Quantity", accessor: "quantity", width: "w-[15%]" },
        { header: "Box", accessor: "container_number", width: "w-[10%]" },
        { header: "Boxes", accessor: "total_containers", width: "w-[10%]" },
      ];
    }

    if (selectedCategoryId === "braille_stationeries") {
      return [
        { header: "Region", accessor: "region", width: "w-[10%]" },
        { header: "District", accessor: "district", width: "w-[10%]" },
        { header: "Center No.", accessor: "center_number", width: "w-[10%]" },
        {
          header: "Center Name",
          accessor: "center_name",
          width: "w-[20%]",
          render: (label: LabelItem) => abbreviateSchoolName(label.center_name),
        },
        { header: "Sheets", accessor: "quantity", width: "w-[10%]" },
        { header: "BKM", accessor: "bkm", width: "w-[10%]" },
        { header: "Envelope", accessor: "container_number", width: "w-[10%]" },
        { header: "Envelopes", accessor: "total_containers", width: "w-[10%]" },
      ];
    }

    if (selectedCategoryId === "kitbags") {
      return [
        { header: "Region", accessor: "region", width: "w-[25%]" },
        { header: "Kitbags", accessor: "quantity", width: "w-[25%]" },
        { header: "Box", accessor: "container_number", width: "w-[15%]" },
        { header: "Boxes", accessor: "total_containers", width: "w-[15%]" },
      ];
    }

    if (selectedCategoryId === "ict_covers") {
      return [
        { header: "Region", accessor: "region", width: "w-[10%]" },
        { header: "District", accessor: "district", width: "w-[10%]" },
        { header: "Center No.", accessor: "center_number", width: "w-[10%]" },
        {
          header: "Center Name",
          accessor: "center_name",
          width: "w-[25%]",
          render: (label: LabelItem) => abbreviateSchoolName(label.center_name),
        },
        { header: "ICT Covers", accessor: "quantity", width: "w-[10%]" },
        { header: "Envelope", accessor: "container_number", width: "w-[10%]" },
        { header: "Envelopes", accessor: "total_containers", width: "w-[10%]" },
      ];
    }

    if (selectedCategoryId === "fine_arts_booklets") {
      return [
        { header: "Region", accessor: "region", width: "w-[10%]" },
        { header: "District", accessor: "district", width: "w-[10%]" },
        { header: "Center No.", accessor: "center_number", width: "w-[10%]" },
        {
          header: "Center Name",
          accessor: "center_name",
          width: "w-[20%]",
          render: (label: LabelItem) => abbreviateSchoolName(label.center_name),
        },
        { header: "Fine Arts Booklets", accessor: "quantity", width: "w-[10%]" },
        { header: "BKM", accessor: "bkm", width: "w-[10%]" },
        { header: "Envelope", accessor: "container_number", width: "w-[10%]" },
        { header: "Envelopes", accessor: "total_containers", width: "w-[10%]" },
      ];
    }

    if (selectedCategoryId === "arabic_booklets") {
      return [
        { header: "Region", accessor: "region", width: "w-[10%]" },
        { header: "District", accessor: "district", width: "w-[10%]" },
        { header: "Center No.", accessor: "center_number", width: "w-[10%]" },
        {
          header: "Center Name",
          accessor: "center_name",
          width: "w-[25%]",
          render: (label: LabelItem) => abbreviateSchoolName(label.center_name),
        },
        { header: "Arabic Booklets", accessor: "quantity", width: "w-[10%]" },
        { header: "Envelope", accessor: "container_number", width: "w-[10%]" },
        { header: "Envelopes", accessor: "total_containers", width: "w-[10%]" },
      ];
    }

    if (selectedCategoryId === "bkm") {
      return [
        { header: "Region", accessor: "region", width: "w-[10%]" },
        { header: "District", accessor: "district", width: "w-[10%]" },
        { header: "Center No.", accessor: "center_number", width: "w-[10%]" },
        {
          header: "Center Name",
          accessor: "center_name",
          width: "w-[25%]",
          render: (label: LabelItem) => abbreviateSchoolName(label.center_name),
        },
        { header: "BKM", accessor: "bkm", width: "w-[10%]" },
        { header: "Envelope", accessor: "container_number", width: "w-[10%]" },
        { header: "Envelopes", accessor: "total_containers", width: "w-[10%]" },
      ];
    }

    if (selectedCategoryId === "timetables") {
       return [
        { header: "Region", accessor: "region", width: "w-[15%]" },
        { header: "District", accessor: "district", width: "w-[15%]" },
        { header: "Timetables", accessor: "quantity", width: "w-[15%]" },
        { header: "Envelope", accessor: "container_number", width: "w-[10%]" },
        { header: "Envelopes", accessor: "total_containers", width: "w-[10%]" },
       ];
    }

    if (selectedCategoryId === "box_labels") {
      return [
        { header: "Region", accessor: "region", width: "w-[15%]" },
        { header: "District", accessor: "district", width: "w-[15%]" },
        {
          header: "Items",
          accessor: "item",
          width: "w-[30%]",
          render: (label: LabelItem) => {
            try {
              if (label.item.startsWith("[")) {
                return JSON.parse(label.item).join(", ");
              }
            } catch (e) {}
            return label.item;
          }
        },
        { header: "Box", accessor: "container_number", width: "w-[10%]" },
        { header: "Boxes", accessor: "total_containers", width: "w-[10%]" },
      ];
    }

    return [
      { header: "Region", accessor: "region", width: "w-[12%]" },
      { header: "District", accessor: "district", width: "w-[12%]" },
      { header: "Center No.", accessor: "center_number", width: "w-[10%]" },
      {
        header: "Center Name",
        accessor: "center_name",
        width: "w-[25%]",
        render: (label: LabelItem) => abbreviateSchoolName(label.center_name),
      },
      { header: "Item", accessor: "item", width: "w-[10%]" },
      { header: "Quantity", accessor: "quantity", width: "w-[10%]" },
      { header: "Box", accessor: "container_number", width: "w-[8%]" },
      { header: "Boxes", accessor: "total_containers", width: "w-[8%]" },
    ];
  }, [selectedCategoryId, masterSummary]);

  // ---------- Print Handler ----------
  const handlePrint = (labelToPrint?: LabelItem) => {
    const labelsToProcess = labelToPrint ? [labelToPrint] : filteredLabels;
    if (labelsToProcess.length === 0) {
      showError("No labels available to print.");
      return;
    }

    const examCode = masterSummary?.Code || "";
    const examYear = String(masterSummary?.Year || "");

    let htmlContent = "";
    switch (selectedCategoryId) {
      case "stationeries":
        htmlContent = renderStationeriesLabels(labelsToProcess, examCode, examYear);
        break;
      case "supervisors_forms":
        htmlContent = renderDistrictStationeriesLabels(labelsToProcess, examCode, examYear);
        break;
      case "district_stationeries":
        if (examCode === "FTNA") {
          htmlContent = renderFtnaDistrictStationeriesLabels(labelsToProcess, examCode, examYear);
        } else {
          htmlContent = renderDistrictStationeriesLabels(labelsToProcess, examCode, examYear);
        }
        break;
      case "arabic_booklets":
        htmlContent = renderArabicBookletsLabels(labelsToProcess, examCode, examYear);
        break;
      case "ict_covers":
        htmlContent = renderIctCoversLabels(labelsToProcess, examCode, examYear);
        break;
      case "fine_arts_booklets":
        htmlContent = renderFineArtsBookletsLabels(labelsToProcess, examCode, examYear);
        break;
      case "braille_stationeries":
        htmlContent = renderBrailleStationeriesLabels(labelsToProcess, examCode, examYear);
        break;
      case "bkm":
        htmlContent = renderBkmLabels(labelsToProcess, examCode, examYear);
        break;
      case "kitbags":
        htmlContent = renderKitbagsLabels(labelsToProcess, examCode, examYear);
        break;
      case "timetables":
        htmlContent = renderTimetablesLabels(labelsToProcess, examCode, examYear);
        break;
      case "box_labels":
        htmlContent = renderBoxLabels(labelsToProcess, examCode, examYear);
        break;
      default:
        showError("Printing is not supported for this category yet.");
        return;
    }

    // If the template already returns a full HTML document, use it directly.
    // Otherwise, wrap it in the print engine's layout.
    const trimmedHtml = htmlContent.trim();
    const fullHtml = trimmedHtml.startsWith("<!DOCTYPE") || trimmedHtml.startsWith("<html")
      ? htmlContent
      : generateLabelsHtml(htmlContent);

    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setIsPreviewOpen(true);
  };

  // ---------- Mutations (Create & Reset Labels) ----------
  const handleCreateLabels = async () => {
    if (!masterSummary || !stationery?.id || !selectedCategoryId) return;

    // Intercept Box Labels to open the wizard modal
    if (selectedCategoryId === "box_labels") {
      setIsBoxLabelsWizardOpen(true);
      return;
    }

    setIsGeneratingLabels(true);
    try {
      let invokeFunction = "";
      let payload: any = {
        masterSummaryId: masterSummary.id,
        stationeryId: stationery.id,
        examCode: masterSummary.Code,
        activeTab: selectedCategoryId === "supervisors_forms" ? "supervisors_forms" : selectedCategoryId,
        region: selectedRegion !== "All" ? selectedRegion : null,
        region_id: selectedRegion !== "All" ? selectedRegion : null,
        regionId: selectedRegion !== "All" ? selectedRegion : null,
      };

      if (selectedCategoryId === "stationeries") {
        const boxLimits = await fetchBoxLimitsSettings(stationery.id);
        if (!boxLimits) {
          showError("Box limits not defined.");
          setIsGeneratingLabels(false);
          return;
        }
        invokeFunction = "pack-stationery-labels";
      } else if (selectedCategoryId === "district_stationeries" || selectedCategoryId === "supervisors_forms") {
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
      } else if (selectedCategoryId === "bkm") {
        invokeFunction = "pack-bkm-into-center_envelopes";
      } else if (selectedCategoryId === "timetables") {
        invokeFunction = "pack-timetables-into-envelopes";
      }

      if (selectedCategoryId === "bkm") {
        const regionsToProcess = selectedRegion === "All" ? regions : [selectedRegion];
        if (regionsToProcess.length === 0) {
          showError("No regions available to generate BKM labels.");
          setIsGeneratingLabels(false);
          return;
        }
        for (const r of regionsToProcess) {
          const { error } = await supabase.functions.invoke(invokeFunction, {
            body: {
              mid: masterSummary.id,
              code: masterSummary.Code,
              region: r,
            }
          });
          if (error) {
            let errMsg = error.message;
            if (error.context && typeof error.context.json === 'function') {
              try {
                const body = await error.context.json();
                if (body && body.error) errMsg = body.error;
              } catch (_) {}
            } else if (error.context && error.context.text) {
              try {
                const text = await error.context.text();
                const body = JSON.parse(text);
                if (body && body.error) errMsg = body.error;
              } catch (_) {}
            }
            throw new Error(`Region ${r}: ${errMsg}`);
          }
        }
      } else {
        const { data, error } = await supabase.functions.invoke(invokeFunction, { body: payload });
        if (error) {
          let errMsg = error.message;
          if (error.context && typeof error.context.json === 'function') {
            try {
              const body = await error.context.json();
              if (body && body.error) errMsg = body.error;
            } catch (_) {}
          } else if (error.context && error.context.text) {
            try {
              const text = await error.context.text();
              const body = JSON.parse(text);
              if (body && body.error) errMsg = body.error;
            } catch (_) {}
          }
          throw new Error(errMsg);
        }
      }

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
      const dbCategories = categoryQueryMap[selectedCategoryId] || [selectedCategoryId];
      const query = supabase
        .from("labels")
        .delete()
        .eq("mid", masterSummary.id)
        .in("category", dbCategories);
      if (selectedRegion !== "All") query.eq("region", selectedRegion);
      if ((selectedCategoryId === "district_stationeries" || selectedCategoryId === "supervisors_forms") && selectedItem !== "All") {
        query.eq("item", selectedItem);
      }
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
          {(selectedCategoryId === "stationeries" || selectedCategoryId === "district_stationeries" || selectedCategoryId === "supervisors_forms") && stationery && (
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
            variant="outline"
            size="sm"
            onClick={() => handlePrint()}
            disabled={isGeneratingLabels || filteredLabels.length === 0}
            className="h-9 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" /> Print All
          </Button>
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

            {/* Item Selector (Only for District Stationeries and Supervisors Forms) */}
            {(selectedCategoryId === "district_stationeries" || selectedCategoryId === "supervisors_forms") && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Item:</span>
                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger className="w-48 h-10 rounded-xl border-slate-200 bg-white font-medium text-slate-700">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="All" className="rounded-lg font-medium">All Items</SelectItem>
                    {uniqueItems.map((item) => (
                      <SelectItem key={item} value={item} className="rounded-lg font-medium">
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-white">
          <Table>
            <TableHeader className="bg-slate-50/75">
              {selectedCategoryId === "stationeries" ? (
                <>
                  <TableRow className="border-b border-slate-100">
                    <TableHead rowSpan={2} className="w-[60px] text-xs font-bold uppercase tracking-wider text-slate-400 py-4 pl-6 align-middle">S/N</TableHead>
                    <TableHead rowSpan={2} className="w-[10%] text-xs font-bold uppercase tracking-wider text-slate-400 py-4 align-middle">Region</TableHead>
                    <TableHead rowSpan={2} className="w-[10%] text-xs font-bold uppercase tracking-wider text-slate-400 py-4 align-middle">District</TableHead>
                    <TableHead rowSpan={2} className="w-[10%] text-xs font-bold uppercase tracking-wider text-slate-400 py-4 align-middle">Center No.</TableHead>
                    <TableHead rowSpan={2} className="w-[15%] text-xs font-bold uppercase tracking-wider text-slate-400 py-4 align-middle">Center Name</TableHead>
                    <TableHead colSpan={2} className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 py-2 border-b border-slate-100">Booklets</TableHead>
                    <TableHead colSpan={2} className="text-center text-xs font-bold uppercase tracking-wider text-slate-400 py-2 border-b border-slate-100">Loose Sheets</TableHead>
                    <TableHead rowSpan={2} className="w-[5%] text-xs font-bold uppercase tracking-wider text-slate-400 py-4 align-middle">BKM</TableHead>
                    <TableHead rowSpan={2} className="w-[5%] text-xs font-bold uppercase tracking-wider text-slate-400 py-4 align-middle">Box</TableHead>
                    <TableHead rowSpan={2} className="w-[5%] text-xs font-bold uppercase tracking-wider text-slate-400 py-4 align-middle">Boxes</TableHead>
                    <TableHead rowSpan={2} className="text-right text-xs font-bold uppercase tracking-wider text-slate-400 py-4 pr-6 align-middle">Actions</TableHead>
                  </TableRow>
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2">Normal</TableHead>
                    <TableHead className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2">Graph</TableHead>
                    <TableHead className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2">Normal</TableHead>
                    <TableHead className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-2">Graph</TableHead>
                  </TableRow>
                </>
              ) : (
                <TableRow className="border-b border-slate-100">
                  <TableHead className="w-[60px] text-xs font-bold uppercase tracking-wider text-slate-400 py-4 pl-6">S/N</TableHead>
                  {getTableColumns.map((col, idx) => (
                    <TableHead key={idx} className={`${col.width} text-xs font-bold uppercase tracking-wider text-slate-400 py-4`}>
                      {col.header}
                    </TableHead>
                  ))}
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-400 py-4 pr-6">Actions</TableHead>
                </TableRow>
              )}
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
                  <TableCell colSpan={selectedCategoryId === "stationeries" ? 13 : getTableColumns.length + 2} className="text-center py-12 text-slate-400 font-medium">
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
                      <TableCell
                        key={j}
                        className={cn(
                          "py-4 text-sm text-slate-600 font-medium",
                          ((selectedCategoryId === "stationeries" &&
                            ["normal_booklets", "graph_booklets", "normal_loosesheets", "graph_loosesheets", "bkm", "container_number", "total_containers"].includes(col.accessor)) ||
                            ["text-center", "quantity", "bkm", "container_number", "total_containers"].includes(col.accessor)) &&
                            "text-center"
                        )}
                      >
                        {col.render ? (
                          col.render(label)
                        ) : col.accessor === "center_number" ? (
                          <span className="font-bold text-slate-700">{label.center_number || "-"}</span>
                        ) : col.accessor === "center_name" ? (
                          <span className="text-slate-600">{label.center_name ? abbreviateSchoolName(label.center_name) : "-"}</span>
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
                        onClick={() => handlePrint(label)}
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
            category={selectedCategoryId}
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

      {/* Box Labels Wizard Modal */}
      {masterSummary && (
        <BoxLabelsWizardModal
          open={isBoxLabelsWizardOpen}
          onOpenChange={setIsBoxLabelsWizardOpen}
          masterSummaryId={masterSummary.id}
          examCode={masterSummary.Code}
          examYear={String(masterSummary.Year)}
          regions={regions}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["labels", masterSummary.id, selectedCategoryId] });
          }}
        />
      )}

      {/* Print Preview Modal */}
      {isPreviewOpen && previewUrl && (
        <div className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-all",
          isFullscreen ? "p-0" : "p-4"
        )}>
          <div className={cn(
            "bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 transition-all duration-300",
            isFullscreen ? "w-full h-full rounded-none" : "w-full max-w-5xl h-[85vh]"
          )}>
            {/* Modal Header */}
            <div className="h-14 border-b bg-slate-50 px-6 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-700" />
                <span className="font-bold text-sm text-slate-900">
                  Print Preview — {currentCategory?.name || "Labels"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (iframeRef.current && iframeRef.current.contentWindow) {
                      iframeRef.current.contentWindow.focus();
                      iframeRef.current.contentWindow.print();
                    }
                  }}
                  className="rounded-xl h-9 border-slate-200 text-xs font-bold"
                >
                  <Printer className="h-4 w-4 mr-2" /> Print Labels
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-9 w-9 rounded-xl border-slate-200"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    setPreviewUrl(null);
                  }}
                  className="h-9 w-9 rounded-xl text-slate-500 hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Modal Body (Iframe Preview) */}
            <div className="flex-1 bg-slate-100 p-4 overflow-hidden">
              <iframe
                ref={iframeRef}
                src={previewUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                title="Labels Print Preview"
                className="border rounded-xl bg-white shadow-lg w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default LabelsManagementPage;