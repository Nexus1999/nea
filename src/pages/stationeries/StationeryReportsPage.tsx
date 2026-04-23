"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { showStyledSwal } from '@/utils/alerts';
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import {
  Download, RefreshCw, MapPin, Globe, FolderOpenDot, Search, Check, X, ChevronDown, FileText, Loader2, CheckCircle, Ban, ArrowLeft, ListChecks, Printer
} from "lucide-react";

// --- Types ---
interface Region {
  region_code: number;
  region_name: string;
}

interface District {
  district_number: number;
  district_name: string;
  region_number: number;
}

interface MasterSummary {
  id: number;
  Examination: string;
  Code: string;
  Year: number;
}

// --- Category Definitions and Scope Rules ---
const CATEGORY_MAP: Record<string, string[]> = {
  'SFNA': ['Stationeries', 'Bkm Description', 'Braille Stationeries'],
  'SSNA': ['Stationeries', 'Bkm Description', 'Braille Stationeries'],
  'PSLE': ['Stationeries', 'Bkm Description', 'Braille Stationeries'],
  'FTNA': ['Stationeries', 'Bkm Description', 'Braille Stationeries', 'ICT Covers', 'Fine Arts Booklets'],
  'ACSEE': ['Supervisors Forms', 'Stationeries Description', 'Braille Stationeries', 'ICT Covers', 'Fine Arts Booklets', 'Arabic Booklets'],
  'CSEE': ['Supervisors Forms', 'Stationeries Description', 'Braille Stationeries', 'ICT Covers', 'Fine Arts Booklets', 'Arabic Booklets'],
};

const DISTRICT_ALLOWED_CATEGORIES: Record<string, string[]> = {
  'SSNA': ['Bkm Description'],
  'SFNA': ['Bkm Description'],
  'PSLE': ['Bkm Description'],
  'FTNA': ['Bkm Description'],
  'ACSEE': ['Stationeries Description'],
  'CSEE': ['Stationeries Description'],
};

const CATEGORIES_REQUIRING_DISTRICTS = ['Bkm Description', 'Stationeries Description'];

// Categories that MUST be generated per region (single region only)
const SINGLE_REGION_CATEGORIES = ['Stationeries Description', 'Bkm Description']; // ADDED Bkm Description

// Categories that require subject registration filtering for regions
const SUBJECT_AWARE_REGION_CATEGORIES = ['ICT Covers', 'Arabic Booklets', 'Fine Arts Booklets', 'Braille Stationeries'];

// HIDE region selection UI for these categories (auto-generate per eligible region)
const HIDE_REGION_SELECTOR_CATEGORIES = SUBJECT_AWARE_REGION_CATEGORIES;

// Helper to map category to subject code (for secondary exams)
const getSubjectCodeForCategory = (code: string, category: string): string | null => {
  if (category === "ICT Covers") {
    return code === 'ACSEE' ? '136' : '036';
  }
  if (category === "Arabic Booklets") {
    return code === 'ACSEE' ? '125' : '025';
  }
  if (category === "Fine Arts Booklets") {
    // Ensure a valid subject code is always returned for these exam types
    if (code === 'ACSEE') return '116';
    if (code === 'CSEE' || code === 'FTNA') return '016';
    return null; // Return null if no matching code
  }
  return null;
};


// --- Dynamic Header Mapping ---
const getReportHeader = (code: string, year: string, category: string): { title: string, subtitle: string | null } => {
  const yearStr = year; // Already a string
  
  const baseTitles: Record<string, string> = {
    'PSLE': `SHAJARA ZA MTIHANI WA DARASA LA SABA ${yearStr}`,
    'SSNA': `SHAJARA ZA UPIMAJI WA KITAIFA WA DARASA LA SIT ${yearStr}`,
    'SFNA': `SHAJARA ZA UPIMAJI WA KITAIFA WA DARASA LA NNE ${yearStr}`,
    'FTNA': `SHAJARA ZA UPIMAJI WA KITAIFA WA KIDATO CHA PILI ${yearStr}`,
    'CSEE': `SHAJARA ZA MTIHANI WA KIDATO CHA NNE ${yearStr}`,
    'ACSEE': `SHAJARA ZA MTIHANI WA KIDATO CHA SITA ${yearStr}`,
  };

  const baseTitle = baseTitles[code] || 'RIPOTI YA VIFAA VYA MTIHANI';

  switch (category) {
    case 'Stationeries':
      // This case now handles primary exams AND FTNA (Supervisor Report)
      return { title: baseTitle, subtitle: null };
    case 'Bkm Description':
      return { title: `MGAWANYO WA BKM ZA ${baseTitle.replace('SHAJARA ZA ', '')}`, subtitle: null };
    case 'Stationeries Description':
      return { title: baseTitle, subtitle: null };
    case 'Supervisors Forms': // Still needed for ACSEE/CSEE
      return { title: baseTitle, subtitle: null };
    case 'Braille Stationeries':
      return { title: baseTitle, subtitle: 'MAHITAJI MAALUMU (BRAILLE)' };
    case 'ICT Covers':
      const ictSubject = code === 'ACSEE' ? '136-COMPUTER SCIENCE' : '036-INFORMATION AND COMPUTERS STUDIES';
      return { title: baseTitle, subtitle: `SOMO LA ${ictSubject}` };
    case 'Fine Arts Booklets':
      const fineArtsSubject = code === 'ACSEE' ? '116-FINE ART' : (code === 'CSEE' || code === 'FTNA' ? '016-FINE ART' : 'N/A');
      return { title: baseTitle, subtitle: `SOMO LA ${fineArtsSubject}` };
    case 'Arabic Booklets':
      const arabicSubject = code === 'ACSEE' ? '125-ARABIC LANGUAGE' : '025-ARABIC LANGUAGE';
      return { title: baseTitle, subtitle: `SOMO LA ${arabicSubject}` };
    default:
      return { title: 'RIPOTI YA VIFAA VYA MTIHANI', subtitle: null };
  }
};


// --- Component ---

const StationeryReportsPage = () => {
  const navigate = useNavigate();
  const { masterSummaryId } = useParams<{ masterSummaryId: string }>();

  const [masterSummary, setMasterSummary] = useState<MasterSummary | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]); // Changed to array for multi-select
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  
  const [regionSearch, setRegionSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [districtsLoading, setDistrictsLoading] = useState(true);

  // Popover states for manual control
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const [isRegionPopoverOpen, setIsRegionPopoverOpen] = useState(false);
  const [isDistrictPopoverOpen, setIsDistrictPopoverOpen] = useState(false);

  const code = masterSummary?.Code || '';
  const year = masterSummary?.Year?.toString() || '';

  const availableCategories = useMemo(() => {
    // Filter out any potential empty strings or nulls if the map definition was messy
    return (CATEGORY_MAP[code] || []).filter(c => c && c.trim() !== '');
  }, [code]);

  const showDistrictSelector = useMemo(() => {
    if (!selectedCategory) return false;
    return CATEGORIES_REQUIRING_DISTRICTS.includes(selectedCategory);
  }, [selectedCategory]);
  
  const isSingleRegionRequired = useMemo(() => {
    return SINGLE_REGION_CATEGORIES.includes(selectedCategory);
  }, [selectedCategory]);

  const hideRegionSelector = useMemo(() => {
    return HIDE_REGION_SELECTOR_CATEGORIES.includes(selectedCategory);
  }, [selectedCategory]);

  // Filter districts based on currently selected regions
  const filteredDistricts = useMemo(() => {
    if (selectedRegions.length === 0) {
      return districts;
    }
    const selectedRegionCodes = regions
      .filter(r => selectedRegions.includes(r.region_name))
      .map(r => r.region_code);
      
    return districts.filter(d => selectedRegionCodes.includes(d.region_number));
  }, [districts, selectedRegions, regions]);

  const searchableDistricts = useMemo(() => {
    return filteredDistricts.filter(d => 
      d.district_name.toLowerCase().includes(districtSearch.toLowerCase())
    );
  }, [filteredDistricts, districtSearch]);

  const searchableRegions = useMemo(() => {
    return regions.filter(r => 
      r.region_name.toLowerCase().includes(regionSearch.toLowerCase())
    );
  }, [regions, regionSearch]);

  const isAllRegionsSelected = useMemo(() => regions.length > 0 && regions.every(r => selectedRegions.includes(r.region_name)), [regions, selectedRegions]);
  const isAllDistrictsSelected = useMemo(() => filteredDistricts.length > 0 && filteredDistricts.every(d => selectedDistricts.includes(d.district_name)), [filteredDistricts, selectedDistricts]);
  
  // Calculate dynamic height for popovers
  // Category height: N * 36px (h-9 button height) + 8px (p-1 padding top/bottom)
  const categoryPopoverHeight = useMemo(() => availableCategories.length * 36 + 8, [availableCategories]); 
  const regionPopoverHeight = useMemo(() => Math.min(regions.length * 40 + 60, 256), [regions]); // 60 for search/select all
  const districtPopoverHeight = useMemo(() => Math.min(filteredDistricts.length * 40 + 60, 256), [filteredDistricts]); // 60 for search/select all

  // Calculate the height for the main content area to fit screen
  const mainContentHeightClass = "h-[calc(100vh-160px)]"; 
  
  const regionStatusText = useMemo(() => {
    if (selectedRegions.length === 0) return 'No Region Selected';
    if (isSingleRegionRequired) {
      return selectedRegions[0]; // Show the name of the single selected region
    }
    if (selectedRegions.length === regions.length) return 'All Regions Selected';
    return `${selectedRegions.length} Regions Selected`;
  }, [selectedRegions, regions.length, isSingleRegionRequired]);
      
  // Check if the current selection violates the single-region rule
  const isRegionSelectionInvalid = useMemo(() => isSingleRegionRequired && selectedRegions.length > 1, [isSingleRegionRequired, selectedRegions]);

  const fetchMasterSummary = async () => {
    if (!masterSummaryId) return;
    const { data, error } = await supabase
      .from('mastersummaries')
      .select('id, Examination, Code, Year')
      .eq('id', masterSummaryId)
      .single();

    if (error) {
      if (masterSummaryId) {
        showError(error.message || "Failed to fetch Master Summary details.");
      }
      setMasterSummary(null);
    } else {
      setMasterSummary(data as MasterSummary);
    }
  };

  // RPC to fetch regions based on master summary data
  const fetchRegions = useCallback(async (mid: number, code: string, subjectCodeFilter: string | null = null) => {
    setRegionsLoading(true);
    
    try {
      let distinctRegionNames: string[] = [];

      if (subjectCodeFilter && ["FTNA", "CSEE", "ACSEE"].includes(code)) {
          // For secondary subject-aware reports, use a custom query to find regions with > 0 registration for the subject
          const detailedTableName = 'secondarymastersummaries';
          
          const { data: subjectRegions, error: subjectRegionError } = await supabase
              .from(detailedTableName)
              .select('region')
              .eq('mid', mid)
              .eq('is_latest', true)
              .gt(subjectCodeFilter, 0); // Filter where subject count > 0

          if (subjectRegionError) {
              showError(subjectRegionError.message || "Failed to fetch subject-aware regions.");
              setRegions([]);
              return;
          }
          distinctRegionNames = Array.from(new Set(subjectRegions.map(d => d.region))).filter(name => name);
          
      } else {
          // For all other reports (primary, supervisor, general secondary), use the RPC to get all regions in the summary
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_distinct_regions_for_mastersummary', {
              p_mid: mid,
              p_code: code,
          });

          if (rpcError || !rpcData || rpcData.length === 0) { // Added check for empty rpcData
              // Fallback: If RPC fails or returns no data, try to fetch all regions from the regions table
              const { data: allRegionsData, error: allRegionsError } = await supabase
                  .from('regions')
                  .select('region_name')
                  .order('region_name', { ascending: true });

              if (allRegionsError) {
                  showError(allRegionsError.message || "Failed to fetch all regions as a fallback.");
                  setRegions([]);
                  return;
              } else {
                  distinctRegionNames = (allRegionsData || []).map(r => r.region_name).filter(name => name);
              }
          } else {
              distinctRegionNames = (rpcData || []).filter(name => name);
          }
      }
      
      // 2. Fetch full region details (code, name) from the regions table, filtering by the names found
      const { data: regionDetails, error: detailsError } = await supabase
        .from('regions')
        .select('region_code, region_name')
        .in('region_name', distinctRegionNames)
        .order('region_name', { ascending: true });

      if (detailsError) {
        showError(detailsError.message || "Failed to fetch region details.");
        setRegions([]);
      } else {
        setRegions(regionDetails || []);
      }
    } catch (err: any) {
      console.error("Error in fetchRegions:", err);
      showError(err.message || "An unexpected error occurred while fetching regions.");
      setRegions([]);
    } finally {
      setRegionsLoading(false);
    }
  }, []);

  const fetchDistricts = React.useCallback(async (mid: number, code: string) => {
    setDistrictsLoading(true);

    try {
      // Determine detailed table
      let detailedTableName: string | null = null;
      if (["SFNA", "SSNA", "PSLE"].includes(code)) {
        detailedTableName = "primarymastersummary";
      } else if (["FTNA", "CSEE", "ACSEE"].includes(code)) {
        detailedTableName = "secondarymastersummaries";
      } else {
        setDistricts([]);
        return;
      }

      // 1) Fetch distinct districts from the detailed master summary table for this mid
      const { data: distinctDistrictRows, error: distinctErr } = await supabase
        .from(detailedTableName)
        .select("district")
        .eq("mid", mid)
        .eq("is_latest", true)
        .order("district", { ascending: true });

      if (distinctErr) {
        showError(distinctErr.message || "Failed to fetch districts from master summary.");
        setDistricts([]);
        return;
      }

      const distinctDistrictNames = Array.from(new Set((distinctDistrictRows || []).map((d: any) => d.district).filter(Boolean)));

      if (distinctDistrictNames.length === 0) {
        setDistricts([]);
        return;
      }

      // 2) Load full district records (with region_number) from 'districts' table limited to those names
      const { data: districtDetails, error: detailsErr } = await supabase
        .from("districts")
        .select("district_number, district_name, region_number")
        .in("district_name", distinctDistrictNames)
        .order("district_name", { ascending: true });

      if (detailsErr) {
        showError(detailsErr.message || "Failed to load district details.");
        setDistricts([]);
      } else {
        setDistricts(districtDetails || []);
      }
    } catch (err: any) {
      console.error("Error in fetchDistricts:", err);
      showError(err.message || "An unexpected error occurred while fetching districts.");
    } finally {
      setDistrictsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = `Stationery Reports | NEAS`;
    fetchMasterSummary();
  }, [masterSummaryId]);
  
  // Effect to fetch regions and districts when master summary is loaded or category changes
  useEffect(() => {
    if (masterSummary) {
      const subjectCodeFilter = SUBJECT_AWARE_REGION_CATEGORIES.includes(selectedCategory)
        ? getSubjectCodeForCategory(masterSummary.Code, selectedCategory)
        : null;
        
      fetchRegions(masterSummary.id, masterSummary.Code, subjectCodeFilter);
      fetchDistricts(masterSummary.id, masterSummary.Code);
    }
  }, [masterSummary, fetchRegions, fetchDistricts, selectedCategory]);


  // --- Filtering Logic ---

  const toggleDistrictSelection = (districtName: string) => {
    setSelectedDistricts(prev => 
      prev.includes(districtName)
        ? prev.filter(name => name !== districtName)
        : [...prev, districtName]
    );
    clearPreview();
  };

  const handleSelectAllDistricts = () => {
    const allNames = filteredDistricts.map(d => d.district_name);
    const isAllSelected = allNames.length > 0 && allNames.every(name => selectedDistricts.includes(name));
    
    if (isAllSelected) {
      setSelectedDistricts([]);
    } else {
      setSelectedDistricts(allNames);
    }
    clearPreview();
  };

  const toggleRegionSelection = (regionName: string) => {
    setSelectedRegions(prev => {
      let newRegions: string[];
      
      if (isSingleRegionRequired) {
        // If single region is required, selecting a region deselects all others
        newRegions = prev.includes(regionName) ? [] : [regionName];
      } else {
        // Standard multi-select logic
        newRegions = prev.includes(regionName)
          ? prev.filter(name => name !== regionName)
          : [...prev, regionName];
      }
      
      clearPreview();
      
      // Auto-close popover if single region is selected
      if (isSingleRegionRequired && newRegions.length === 1) {
        setIsRegionPopoverOpen(false);
      }

      return newRegions;
    });
  };
  
  const handleSelectAllRegions = () => {
    if (isSingleRegionRequired) {
      showError(`Cannot select all regions when '${selectedCategory}' requires a single region.`);
      return;
    }
    
    const allNames = regions.map(r => r.region_name);
    const isAllSelected = allNames.length > 0 && allNames.every(name => selectedRegions.includes(name));
    
    if (isAllSelected) {
      setSelectedRegions([]);
    } else {
      setSelectedRegions(allNames);
    }
    clearPreview();
  };


  // Effect to handle automatic district selection when region selection changes
  useEffect(() => {
    if (selectedRegions.length > 0 && showDistrictSelector) {
      const selectedRegionCodes = regions
        .filter(r => selectedRegions.includes(r.region_name))
        .map(r => r.region_code);

      const districtsInSelectedRegions = districts
        .filter(d => selectedRegionCodes.includes(d.region_number))
        .map(d => d.district_name);

      if (selectedCategory === 'Stationeries Description' || selectedCategory === 'Bkm Description') {
        // Auto-select all districts for the selected (single) region when region changes,
        // but allow manual deselection afterwards.
        setSelectedDistricts(districtsInSelectedRegions);
      } else {
        // Preserve previous selection but within the selected regions; if none, select all
        setSelectedDistricts(prev => prev.filter(d => districtsInSelectedRegions.includes(d)));
        if (selectedDistricts.length === 0) {
          setSelectedDistricts(districtsInSelectedRegions);
        }
      }
    } else if (!showDistrictSelector) {
      setSelectedDistricts([]);
    }
  }, [selectedRegions, showDistrictSelector, regions, districts, selectedCategory]);


  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    // Reset districts when category changes, as scope might change
    setSelectedDistricts([]); 
    
    clearPreview();
    setIsCategoryPopoverOpen(false); // Close popover
  };

  // --- Report Generation ---

  const validateForm = () => {
    if (!masterSummary) {
      showError('Master Summary details are missing.');
      return false;
    }
    if (!selectedCategory) {
        showError('Please select a category.');
        return false;
    }

    // Only require user-selected regions if the selector is visible
    if (!hideRegionSelector && selectedRegions.length === 0) {
      showError('Please select at least one region.');
      return false;
    }

    // Validation for single-region reports
    if (!hideRegionSelector && isSingleRegionRequired && selectedRegions.length > 1) {
        showError(`The '${selectedCategory}' report can only be generated for one region at a time.`);
        return false;
    }

    // New validation for subject-aware categories
    if (SUBJECT_AWARE_REGION_CATEGORIES.includes(selectedCategory)) {
        const subjectCode = getSubjectCodeForCategory(code, selectedCategory);
        if (!subjectCode && selectedCategory !== 'Braille Stationeries') {
            showError(`Cannot generate '${selectedCategory}' report for exam code '${code}'. No corresponding subject code found.`);
            return false;
        }
    }
    
    // Only validate districts if the selector is visible AND no districts are selected
    if (showDistrictSelector && selectedDistricts.length === 0) {
      showError('Please select at least one district.');
      return false;
    }
    return true;
  };

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setFileName('');
    }
  };

  const handleGenerateReport = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    clearPreview();

    try {
      const { title, subtitle } = getReportHeader(code, year, selectedCategory);

      let generatedReports: { region: string, url: string, fileName: string }[] = [];

      // Define report types
      const isSupervisorReport = selectedCategory === 'Supervisors Forms';
      const isSubjectPercentageReport = SUBJECT_AWARE_REGION_CATEGORIES.includes(selectedCategory) && selectedCategory !== 'Braille Stationeries';
      const isSpecialNeedsReport = selectedCategory === 'Braille Stationeries';
      const isStationeryDescriptionReport = selectedCategory === 'Stationeries Description';
      const isBkmDescriptionReport = selectedCategory === 'Bkm Description';
      const isStationeriesReport = selectedCategory === 'Stationeries';
      
      if (isBkmDescriptionReport) {
          const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-bkm-description-report`;
          
          // Since SINGLE_REGION_CATEGORIES includes 'Bkm Description', selectedRegions.length must be 1
          const regionName = selectedRegions[0];

          const payload = {
              mid: masterSummaryId,
              code,
              year,
              region: regionName,
              districts: selectedDistricts, // Pass selected districts
              reportTitle: title,
              reportSubtitle: subtitle,
          };

          const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
          });

          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Failed to generate BKM Description report: ${errorData.error || response.statusText}`);
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const downloadedFileName = `BKM_Description_${code}_${year}_${regionName}.pdf`;
          generatedReports.push({ region: regionName, url, fileName: downloadedFileName });

      } else if (isSubjectPercentageReport) {
        const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-subject-percentage-report`;
        const subjectCode = getSubjectCodeForCategory(code, selectedCategory);
        const payload: any = {
          mid: masterSummaryId,
          code,
          year,
          category: selectedCategory,
          reportTitle: title,
          reportSubtitle: subtitle,
          subjectCodeFilter: subjectCode,
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to generate document: ${errorData.error || 'Unknown error'}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const downloadedFileName = `${selectedCategory.replace(/\s/g, '_')}_${code}_${year}_AllRegions_${new Date().toISOString().slice(0, 10)}.pdf`;
        generatedReports.push({ region: 'All Eligible Regions', url, fileName: downloadedFileName });

      } else if (isSpecialNeedsReport) {
        const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-special-needs-report`;
        const payload: any = {
          mid: masterSummaryId,
          code,
          year,
          category: selectedCategory,
          reportTitle: title,
          reportSubtitle: subtitle,
          specialNeedType: 'BR',
          // No regions passed; edge function will auto-pick eligible regions
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to generate document: ${errorData.error || 'Unknown error'}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const downloadedFileName = `${selectedCategory.replace(/\s/g, '_')}_${code}_${year}_AllRegions_${new Date().toISOString().slice(0, 10)}.pdf`;
        generatedReports.push({ region: 'All Eligible Regions', url, fileName: downloadedFileName });

      } else if (isStationeriesReport) {
        // NEW: Stationeries category (all exams) -> single function
        const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-stationeries-report`;
        const payload = {
          mid: masterSummaryId,
          code,
          year,
          regions: selectedRegions,
          reportTitle: title,
          reportSubtitle: subtitle,
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Failed to generate stationeries report: ${errorData.error || response.statusText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const downloadedFileName = `Stationeries_${code}_${year}_${selectedRegions.length > 1 ? 'MultiRegion' : (selectedRegions[0] || 'Region')}.pdf`;
        generatedReports.push({ region: selectedRegions.join(', '), url, fileName: downloadedFileName });
      } else if (isSupervisorReport) {
          // Supervisors Forms (multi-region) - now handles FTNA under 'Stationeries' name
          const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-multi-region-supervisor-report`;
          const payload = {
            mid: masterSummaryId,
            code,
            year,
            regions: selectedRegions,
            reportTitle: title,
            reportSubtitle: subtitle,
          };

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to generate supervisor report: ${errorData.error || response.statusText}`);
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const downloadedFileName = `Supervisor_Report_${code}_${year}_${selectedRegions.length > 1 ? 'MultiRegion' : (selectedRegions[0] || 'Region')}.pdf`;
          generatedReports.push({ region: selectedRegions.join(', '), url, fileName: downloadedFileName });
      } else if (isStationeryDescriptionReport) {
          // Generate one PDF per selected region using the existing edge function
          for (const regionName of selectedRegions) {
            const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-stationery-description-report`;

            // Derive districts for this region
            const regionObj = regions.find(r => r.region_name === regionName);
            const regionCode = regionObj?.region_code;
            const regionDistrictNames = districts
              .filter(d => d.region_number === regionCode)
              .map(d => d.district_name);

            // Use only the selected districts that belong to this region; if none, select all
            const selectedForRegion = selectedDistricts.filter(name => regionDistrictNames.includes(name));

            const payload: any = {
              mid: masterSummaryId,
              code,
              year,
              region: regionName,
              reportTitle: title,
              reportSubtitle: subtitle,
            };
            if (selectedForRegion.length > 0) {
              payload.districts = selectedForRegion;
            }

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Failed to generate stationery description for ${regionName}: ${errorData.error || response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const downloadedFileName = `Stationery_Description_${code}_${year}_${regionName}.pdf`;
            generatedReports.push({ region: regionName, url, fileName: downloadedFileName });
          }
      } else {
          // This handles 'Bkm Description' and any other unhandled categories
          throw new Error('Unsupported category selected.'); // Safety net
      }

      // Handle results: Show the last generated PDF in the preview
      if (generatedReports.length > 0) {
          const lastReport = generatedReports[generatedReports.length - 1];
          setFileName(lastReport.fileName);
          setPreviewUrl(lastReport.url);
          
          generatedReports.slice(0, -1).forEach(r => URL.revokeObjectURL(r.url));
          showSuccess("Report generated successfully!");
      }
      
    } catch (error: any) {
      console.error('Error generating document:', error);
      showError(error.message || 'Failed to generate document. Please ensure the required Edge Function is deployed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDocument = () => {
    if (!previewUrl) return;
    
    const link = document.createElement('a');
    link.href = previewUrl;
    link.setAttribute('download', fileName || `report_${new Date().getTime()}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleClearFilters = () => {
    setSelectedRegions([]);
    setSelectedDistricts([]);
    setSelectedCategory('');
    setRegionSearch('');
    setDistrictSearch('');
    clearPreview();
  };

  // Check if masterSummaryId is present and we are still loading the summary
  if (!masterSummaryId || (regionsLoading && districtsLoading && !masterSummary)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-neas-green" />
      </div>
    );
  }

  // If masterSummaryId is present but fetching failed (masterSummary is null)
  if (!masterSummary) {
    return (
      <Card className="w-full max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">Stationery Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500">Master Summary details could not be loaded for ID: {masterSummaryId}.</p>
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => navigate('/dashboard/stationeries')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stationeries
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-3 px-4 h-full">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FolderOpenDot className="h-6 w-6 text-neas-green" /> Stationery Reports
        </h1>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/stationeries')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stationeries
        </Button>
      </div>

      {/* Main Content Area: Fixed height to fit screen */}
      <div className={cn("flex gap-4", mainContentHeightClass)}> 
        {/* Left Panel - Controls */}
        <Card className="w-full lg:w-1/3 flex flex-col flex-shrink-0 shadow-lg">
          <CardHeader className="border-b p-3">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center justify-between">
              Report Filters
              <Button variant="ghost" size="sm" onClick={handleClearFilters} title="Clear Filters">
                <RefreshCw className="h-4 w-4 text-gray-800" />
              </Button>
            </CardTitle>
            <CardDescription className="text-sm font-semibold text-gray-700">
              Report for: <span className="text-gray-800">{code}-{year}</span>
            </CardDescription>
          </CardHeader>
          
          {/* Filter Fields Container - Now handles scrolling if needed */}
          <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-hidden"> 
            
            {/* Category Selection */}
            <div className="space-y-1">
              <Label htmlFor="category-select" className="flex items-center gap-1 font-semibold text-gray-700 text-sm">
                <ListChecks className="h-4 w-4 text-neas-green" /> Select Category
              </Label>
              <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between text-left font-normal h-9" // Standard height
                    disabled={regionsLoading || isGenerating || availableCategories.length === 0}
                  >
                    {selectedCategory || "Select a category..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <ScrollArea style={{ height: `${categoryPopoverHeight}px` }}>
                    <div className="p-1">
                      {availableCategories.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 py-2">No categories defined for {code}.</p>
                      ) : (
                        availableCategories.map((category) => (
                          <Button
                            key={category}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start h-9",
                              selectedCategory === category && "bg-gray-100 text-neas-green hover:bg-gray-200"
                            )}
                            onClick={() => handleCategorySelect(category)}
                          >
                            {category}
                          </Button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            {/* Conditional Region Selection */}
            {!hideRegionSelector && (
              <div className="space-y-1">
                <Label htmlFor="region-select" className="flex items-center gap-1 font-semibold text-gray-700 text-sm">
                  <Globe className="h-4 w-4 text-neas-green" /> Select Region(s)
                  {isSingleRegionRequired && selectedCategory && (
                      <span className="text-red-500 text-xs ml-2">(Single Region Required)</span>
                  )}
                </Label>
                <Popover open={isRegionPopoverOpen} onOpenChange={setIsRegionPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                          "w-full justify-between text-left font-normal h-9",
                          isRegionSelectionInvalid && "border-red-500 ring-1 ring-red-500"
                      )}
                      disabled={regionsLoading || isGenerating || !selectedCategory}
                    >
                      {selectedRegions.length > 0 ? (
                        <span className="truncate">{regionStatusText}</span>
                      ) : (
                        "Select regions..."
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Input
                      placeholder="Search regions..."
                      className="h-9"
                      value={regionSearch}
                      onChange={(e) => setRegionSearch(e.target.value)}
                    />
                    <ScrollArea style={{ height: `${regionPopoverHeight}px` }} className="mt-2">
                      <div className="p-1">
                        {regionsLoading ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin text-neas-green" />
                          </div>
                        ) : searchableRegions.length === 0 ? (
                          <p className="text-center text-sm text-gray-500 py-2">No regions found.</p>
                        ) : (
                          <>
                            {/* Select All */}
                            <div 
                              className={cn(
                                  "flex items-center space-x-2 p-2 rounded-md h-9",
                                  isSingleRegionRequired ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'
                              )}
                              onClick={handleSelectAllRegions}
                            >
                              <Checkbox
                                checked={isAllRegionsSelected}
                                onCheckedChange={handleSelectAllRegions}
                                id="select-all-regions"
                                disabled={isSingleRegionRequired}
                              />
                              <Label htmlFor="select-all-regions" className={cn("font-semibold", isSingleRegionRequired && 'text-gray-400')}>
                                Select All ({regions.length})
                              </Label>
                            </div>
                            <Separator className="my-1" />
                            
                            {/* Individual Regions */}
                            {searchableRegions.map((region) => {
                              const isSelected = selectedRegions.includes(region.region_name);
                              return (
                                <div 
                                  key={region.region_code}
                                  className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-gray-100 rounded-md h-9"
                                  onClick={() => {
                                    toggleRegionSelection(region.region_name);
                                  }}
                                >
                                  {!isSingleRegionRequired && (
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleRegionSelection(region.region_name)}
                                      id={`region-${region.region_code}`}
                                    />
                                  )}
                                  <Label htmlFor={`region-${region.region_code}`} className="font-normal">
                                    {region.region_name}
                                  </Label>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* District Selection (Conditional) */}
            {showDistrictSelector && (
              <div className="space-y-1">
                <Label htmlFor="district-select" className="flex items-center gap-1 font-semibold text-gray-700 text-sm">
                  <MapPin className="h-4 w-4 text-neas-green" /> Select Districts
                </Label>
                <Popover open={isDistrictPopoverOpen} onOpenChange={setIsDistrictPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between text-left font-normal h-9"
                      disabled={
                        selectedRegions.length === 0 ||
                        districtsLoading ||
                        isGenerating
                      }
                    >
                      {selectedDistricts.length > 0 ? (
                        <span className="truncate">{selectedDistricts.length} district(s) selected</span>
                      ) : (
                        "Select districts..."
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Input
                      placeholder="Search districts..."
                      className="h-9"
                      value={districtSearch}
                      onChange={(e) => setDistrictSearch(e.target.value)}
                    />
                    <ScrollArea style={{ height: `${districtPopoverHeight}px` }} className="mt-2">
                      <div className="p-1">
                        {districtsLoading ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin text-neas-green" />
                          </div>
                        ) : filteredDistricts.length === 0 ? (
                          <p className="text-center text-sm text-gray-500 py-2">No districts found for selected regions.</p>
                        ) : (
                          <>
                            {/* Select All */}
                            <div 
                              className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-gray-100 rounded-md h-9"
                              onClick={handleSelectAllDistricts}
                            >
                              <Checkbox
                                checked={isAllDistrictsSelected}
                                onCheckedChange={handleSelectAllDistricts}
                                id="select-all-districts"
                              />
                              <Label htmlFor="select-all-districts" className="font-semibold">
                                Select All ({filteredDistricts.length})
                              </Label>
                            </div>
                            <Separator className="my-1" />
                            
                            {/* Individual Districts */}
                            {searchableDistricts.map((district) => {
                              const isSelected = selectedDistricts.includes(district.district_name);
                              return (
                                <div 
                                  key={district.district_number}
                                  className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-gray-100 rounded-md h-9"
                                  onClick={() => toggleDistrictSelection(district.district_name)}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleDistrictSelection(district.district_name)}
                                    id={`district-${district.district_number}`}
                                  />
                                  <Label htmlFor={`district-${district.district_number}`} className="font-normal">
                                    {district.district_name}
                                  </Label>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
            )}
            
            {/* Generate Report Button and Progress Bar (Moved here) */}
            <div className="pt-4 flex flex-col gap-3">
              {/* Progress Bar */}
              {isGenerating && (
                <div className="w-full">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neas-green transition-all duration-500"
                      style={{ width: '100%' }} // Simplified progress bar animation
                    />
                    </div>
                  <p className="text-xs text-neas-green mt-1 text-center">
                    Generating document(s), please wait...
                  </p>
                </div>
              )}

              {/* Export Button */}
              <Button
                onClick={handleGenerateReport}
                disabled={
                  isGenerating
                  || !selectedCategory
                  || (!hideRegionSelector && selectedRegions.length === 0)
                  || (showDistrictSelector && selectedDistricts.length === 0)
                  || (!hideRegionSelector && isRegionSelectionInvalid)
                }
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold text-base transition-all duration-300"
                size="lg"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isGenerating ? 'Generating Report(s)...' : 'Generate Report(s)'}
              </Button>
            </div>
            
            {/* Spacer to push content up if needed, though overflow-y-auto handles it */}
            <div className="flex-1" /> 

          </CardContent>
          
        </Card>

        {/* Right Panel - Preview */}
        <Card className="w-full lg:w-2/3 flex flex-col shadow-lg">
          <CardHeader className="border-b p-3 flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-neas-green" /> Document Preview
            </CardTitle>
            {previewUrl && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadDocument} title="Download Document">
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
                <Button variant="destructive" size="sm" onClick={clearPreview} title="Close Preview">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-3 flex items-center justify-center bg-gray-50">
            <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
              {previewUrl ? (
                <iframe 
                  src={previewUrl} 
                  width="100%" 
                  height="100%" 
                  frameBorder="0"
                  title="Document preview"
                  className="border-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <FileText className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-lg font-semibold text-gray-600 mb-2">Preview Area</p>
                  <p className="text-sm text-gray-500">
                    Select filters and click 'Generate Report(s)' to view the PDF here.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          
          {/* Status Bar */}
          <div className="p-3 border-t bg-gray-100 flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              {hideRegionSelector ? (
                <>
                  <CheckCircle className="h-4 w-4 text-neas-green" />
                  <span className="text-neas-green font-medium">Auto-generating for eligible regions.</span>
                </>
              ) : (
                <>
                  {(selectedRegions.length > 0 && !isSingleRegionRequired) || (isSingleRegionRequired && selectedRegions.length === 1) ? (
                    <CheckCircle className="h-4 w-4 text-neas-green" />
                  ) : (
                    <Ban className="h-4 w-4 text-red-500" />
                  )}
                  <span className={(selectedRegions.length > 0 ? 'text-neas-green font-medium' : 'text-red-500')}>
                    {selectedRegions.length === 0 
                      ? 'No Region Selected' 
                      : selectedRegions.length === regions.length
                        ? 'All Regions Selected'
                        : `${selectedRegions.length} Regions Selected`}
                  </span>
                </>
              )}
            </div>
            {showDistrictSelector && selectedDistricts.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedDistricts([])}
                className="text-red-500 hover:bg-red-50"
              >
                Clear District Selection ({selectedDistricts.length})
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StationeryReportsPage;