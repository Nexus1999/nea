"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import {
  Download, RefreshCw, MapPin, Globe, FolderOpenDot, Search, Check, X, ChevronDown, FileText, Loader2, CheckCircle, Ban, ArrowLeft, ListChecks, Printer, Maximize2, Minimize2, Lock, AlertCircle, HelpCircle, Eye, ChevronRight, Sparkles
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
const SINGLE_REGION_CATEGORIES = ['Stationeries Description', 'Bkm Description'];

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
    if (code === 'ACSEE') return '116';
    if (code === 'CSEE' || code === 'FTNA' ? '016' : null) return '016';
    return null;
  }
  return null;
};

// --- Dynamic Header Mapping ---
const getReportHeader = (code: string, year: string, category: string): { title: string, subtitle: string | null } => {
  const yearStr = year;
  
  const baseTitles: Record<string, string> = {
    'PSLE': `SHAJARA ZA MTIHANI WA DARASA LA SABA ${yearStr}`,
    'SSNA': `SHAJARA ZA UPIMAJI WA KITAIFA WA DARASA LA SITA ${yearStr}`,
    'SFNA': `SHAJARA ZA UPIMAJI WA KITAIFA WA DARASA LA NNE ${yearStr}`,
    'FTNA': `SHAJARA ZA UPIMAJI WA KITAIFA WA KIDATO CHA PILI ${yearStr}`,
    'CSEE': `SHAJARA ZA MTIHANI WA KIDATO CHA NNE ${yearStr}`,
    'ACSEE': `SHAJARA ZA MTIHANI WA KIDATO CHA SITA ${yearStr}`,
  };

  const baseTitle = baseTitles[code] || 'RIPOTI YA VIFAA VYA MTIHANI';

  switch (category) {
    case 'Stationeries':
      return { title: baseTitle, subtitle: null };
    case 'Bkm Description':
      return { title: `MGAWANYO WA BKM ZA ${baseTitle.replace('SHAJARA ZA ', '')}`, subtitle: null };
    case 'Stationeries Description':
      return { title: baseTitle, subtitle: null };
    case 'Supervisors Forms':
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

const StationeryReportsPage = () => {
  const navigate = useNavigate();
  const { masterSummaryId } = useParams<{ masterSummaryId: string }>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [masterSummary, setMasterSummary] = useState<MasterSummary | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  
  const [regionSearch, setRegionSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [districtsLoading, setDistrictsLoading] = useState(true);

  // New UI States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const code = masterSummary?.Code || '';
  const year = masterSummary?.Year?.toString() || '';

  const availableCategories = useMemo(() => {
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
  
  const regionStatusText = useMemo(() => {
    if (selectedRegions.length === 0) return 'No Region Selected';
    if (isSingleRegionRequired) {
      return selectedRegions[0];
    }
    if (selectedRegions.length === regions.length) return 'All Regions Selected';
    return `${selectedRegions.length} Regions Selected`;
  }, [selectedRegions, regions.length, isSingleRegionRequired]);

  // Validation logic
  const validationError = useMemo(() => {
    if (!selectedCategory) return "Please select a category to begin.";
    if (!hideRegionSelector && selectedRegions.length === 0) return "Please select at least one region.";
    if (!hideRegionSelector && isSingleRegionRequired && selectedRegions.length > 1) {
      return `The '${selectedCategory}' report requires exactly one region.`;
    }
    if (showDistrictSelector && selectedDistricts.length === 0) return "Please select at least one district.";
    return null;
  }, [selectedCategory, selectedRegions, selectedDistricts, hideRegionSelector, isSingleRegionRequired, showDistrictSelector]);

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

  const fetchRegions = useCallback(async (mid: number, code: string, subjectCodeFilter: string | null = null) => {
    setRegionsLoading(true);
    try {
      let distinctRegionNames: string[] = [];

      if (subjectCodeFilter && ["FTNA", "CSEE", "ACSEE"].includes(code)) {
          const detailedTableName = 'secondarymastersummaries';
          const { data: subjectRegions, error: subjectRegionError } = await supabase
              .from(detailedTableName)
              .select('region')
              .eq('mid', mid)
              .eq('is_latest', true)
              .gt(subjectCodeFilter, 0);

          if (subjectRegionError) {
              showError(subjectRegionError.message || "Failed to fetch subject-aware regions.");
              setRegions([]);
              return;
          }
          distinctRegionNames = Array.from(new Set(subjectRegions.map(d => d.region))).filter(name => name);
      } else {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_distinct_regions_for_mastersummary', {
              p_mid: mid,
              p_code: code,
          });

          if (rpcError || !rpcData || rpcData.length === 0) {
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
      let detailedTableName: string | null = null;
      if (["SFNA", "SSNA", "PSLE"].includes(code)) {
        detailedTableName = "primarymastersummary";
      } else if (["FTNA", "CSEE", "ACSEE"].includes(code)) {
        detailedTableName = "secondarymastersummaries";
      } else {
        setDistricts([]);
        return;
      }

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
  
  useEffect(() => {
    if (masterSummary) {
      const subjectCodeFilter = SUBJECT_AWARE_REGION_CATEGORIES.includes(selectedCategory)
        ? getSubjectCodeForCategory(masterSummary.Code, selectedCategory)
        : null;
        
      fetchRegions(masterSummary.id, masterSummary.Code, subjectCodeFilter);
      fetchDistricts(masterSummary.id, masterSummary.Code);
    }
  }, [masterSummary, fetchRegions, fetchDistricts, selectedCategory]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setActiveStep(1);
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

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
        newRegions = prev.includes(regionName) ? [] : [regionName];
        // Auto-advance to Step 3 if single region is selected
        if (newRegions.length === 1) {
          setTimeout(() => {
            if (showDistrictSelector) {
              setActiveStep(3);
            }
          }, 300);
        }
      } else {
        newRegions = prev.includes(regionName)
          ? prev.filter(name => name !== regionName)
          : [...prev, regionName];
      }
      
      clearPreview();
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

  useEffect(() => {
    if (selectedRegions.length > 0 && showDistrictSelector) {
      const selectedRegionCodes = regions
        .filter(r => selectedRegions.includes(r.region_name))
        .map(r => r.region_code);

      const districtsInSelectedRegions = districts
        .filter(d => selectedRegionCodes.includes(d.region_number))
        .map(d => d.district_name);

      if (selectedCategory === 'Stationeries Description' || selectedCategory === 'Bkm Description') {
        setSelectedDistricts(districtsInSelectedRegions);
      } else {
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
    setSelectedDistricts([]); 
    setSelectedRegions([]);
    clearPreview();
    
    // Auto-advance to Step 2
    setTimeout(() => {
      if (HIDE_REGION_SELECTOR_CATEGORIES.includes(category)) {
        // If region selector is hidden, skip to Step 3 or complete
        if (CATEGORIES_REQUIRING_DISTRICTS.includes(category)) {
          setActiveStep(3);
        } else {
          setActiveStep(1); // Keep on 1 or close
        }
      } else {
        setActiveStep(2);
      }
    }, 300);
  };

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setFileName('');
    }
  };

  const handleGenerateReport = async () => {
    if (validationError) {
      showError(validationError);
      return;
    }

    setIsGenerating(true);
    clearPreview();

    try {
      const { title, subtitle } = getReportHeader(code, year, selectedCategory);
      let generatedReports: { region: string, url: string, fileName: string }[] = [];

      const isSupervisorReport = selectedCategory === 'Supervisors Forms';
      const isSubjectPercentageReport = SUBJECT_AWARE_REGION_CATEGORIES.includes(selectedCategory) && selectedCategory !== 'Braille Stationeries';
      const isSpecialNeedsReport = selectedCategory === 'Braille Stationeries';
      const isStationeryDescriptionReport = selectedCategory === 'Stationeries Description';
      const isBkmDescriptionReport = selectedCategory === 'Bkm Description';
      const isStationeriesReport = selectedCategory === 'Stationeries';
      
      if (isBkmDescriptionReport) {
          const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-bkm-description-report`;
          const regionName = selectedRegions[0];

          const payload = {
              mid: masterSummaryId,
              code,
              year,
              region: regionName,
              districts: selectedDistricts,
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
          const downloadedFileName = `BKM ${regionName} ${code}-${year}.pdf`;
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
        const downloadedFileName = `Stationeries ${code} ${year} ${selectedRegions.length > 1 ? 'MultiRegion' : (selectedRegions[0] || 'Region')}.pdf`;
        generatedReports.push({ region: selectedRegions.join(', '), url, fileName: downloadedFileName });
      } else if (isSupervisorReport) {
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
          const downloadedFileName = `Supervisors Forms ${code}-${year} ${selectedRegions.length > 1 ? 'MultiRegion' : (selectedRegions[0] || 'Region')}.pdf`;
          generatedReports.push({ region: selectedRegions.join(', '), url, fileName: downloadedFileName });
      } else if (isStationeryDescriptionReport) {
          for (const regionName of selectedRegions) {
            const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-stationery-description-report`;
            const regionObj = regions.find(r => r.region_name === regionName);
            const regionCode = regionObj?.region_code;
            const regionDistrictNames = districts
              .filter(d => d.region_number === regionCode)
              .map(d => d.district_name);

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
            const downloadedFileName = `Stationeries ${regionName} ${code}-${year}.pdf`;
            generatedReports.push({ region: regionName, url, fileName: downloadedFileName });
          }
      } else {
          throw new Error('Unsupported category selected.');
      }

      if (generatedReports.length > 0) {
          const lastReport = generatedReports[generatedReports.length - 1];
          setFileName(lastReport.fileName);
          setPreviewUrl(lastReport.url);
          
          generatedReports.slice(0, -1).forEach(r => URL.revokeObjectURL(r.url));
          showSuccess("Report generated successfully!");
      }
      
    } catch (error: any) {
      console.error('Error generating document:', error);
      showError(error.message || 'Failed to generate document.');
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

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else {
      showError("Unable to print. Please download the PDF to print.");
    }
  };

  const handleRefreshPreview = () => {
    setPreviewKey(prev => prev + 1);
    showSuccess("Preview refreshed");
  };

  const handleClearFilters = () => {
    setSelectedRegions([]);
    setSelectedDistricts([]);
    setSelectedCategory('');
    setRegionSearch('');
    setDistrictSearch('');
    setActiveStep(1);
    clearPreview();
  };

  if (!masterSummaryId || (regionsLoading && districtsLoading && !masterSummary)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!masterSummary) {
    return (
      <Card className="w-full max-w-4xl mx-auto mt-8 border-slate-200 shadow-xl rounded-2xl">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-2xl font-bold text-slate-800">Stationery Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-center text-slate-500">Master Summary details could not be loaded for ID: {masterSummaryId}.</p>
          <div className="text-center mt-6">
            <Button variant="outline" onClick={() => navigate('/dashboard/stationeries')} className="rounded-xl">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stationeries
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/dashboard/stationeries')} className="rounded-xl h-10 w-10 border-slate-200">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FolderOpenDot className="h-6 w-6 text-slate-700" />
              Stationery Reports
            </h1>
            <p className="text-xs text-gray-500 font-semibold">{code} — {year}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="rounded-xl h-9 border-slate-200 hidden lg:flex items-center gap-2"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", isSidebarCollapsed ? "rotate-180" : "rotate-0")} />
            {isSidebarCollapsed ? "Show Filters" : "Hide Filters"}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden relative">
        {/* Left Panel - Collapsible Filters Sidebar */}
        <div
          className={cn(
            "flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out",
            isSidebarCollapsed ? "w-0 opacity-0 pointer-events-none lg:mr-0" : "w-full lg:w-[380px] opacity-100"
          )}
        >
          <Card className="h-full flex flex-col shadow-lg border-slate-200 rounded-2xl overflow-hidden bg-white">
            <CardHeader className="border-b bg-slate-50/50 p-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-base font-bold text-slate-900">Filter Wizard</CardTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClearFilters} title="Reset Filters" className="h-8 w-8 rounded-lg hover:bg-slate-100">
                  <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                </Button>
              </div>
            </CardHeader>

            {/* Step-by-Step Wizard Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
              {/* Step 1: Category */}
              <div className={cn("border rounded-xl overflow-hidden transition-all", activeStep === 1 ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200")}>
                <button
                  onClick={() => setActiveStep(1)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold", selectedCategory ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700")}>
                      {selectedCategory ? <Check className="h-3 w-3" /> : "1"}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Category Selection</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", activeStep === 1 ? "rotate-180" : "")} />
                </button>
                
                {activeStep === 1 && (
                  <div className="p-3 bg-white border-t space-y-1">
                    {availableCategories.map((category) => {
                      const isSelected = selectedCategory === category;
                      return (
                        <button
                          key={category}
                          onClick={() => handleCategorySelect(category)}
                          className={cn(
                            "w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs font-semibold transition-all",
                            isSelected ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <span>{category}</span>
                          {isSelected && <Check className="h-4 w-4 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 2: Region(s) */}
              <div className={cn(
                "border rounded-xl overflow-hidden transition-all",
                !selectedCategory && "opacity-50 pointer-events-none",
                activeStep === 2 ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200"
              )}>
                <button
                  onClick={() => selectedCategory && setActiveStep(2)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 text-left"
                  disabled={!selectedCategory}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      hideRegionSelector ? "bg-blue-500 text-white" : selectedRegions.length > 0 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700"
                    )}>
                      {hideRegionSelector ? <Lock className="h-3 w-3" /> : selectedRegions.length > 0 ? <Check className="h-3 w-3" /> : "2"}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Region Selection</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", activeStep === 2 ? "rotate-180" : "")} />
                </button>

                {activeStep === 2 && (
                  <div className="p-3 bg-white border-t space-y-3">
                    {hideRegionSelector ? (
                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
                        <Lock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700 font-medium leading-relaxed">
                          This category automatically generates reports for all eligible regions. Region selection is locked.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            placeholder="Search regions..."
                            className="h-8 pl-8 text-xs rounded-lg border-slate-200"
                            value={regionSearch}
                            onChange={(e) => setRegionSearch(e.target.value)}
                          />
                        </div>

                        <ScrollArea className="h-48 border rounded-lg p-1">
                          {!isSingleRegionRequired && (
                            <div 
                              className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
                              onClick={handleSelectAllRegions}
                            >
                              <Checkbox
                                checked={isAllRegionsSelected}
                                onCheckedChange={handleSelectAllRegions}
                                className="rounded"
                              />
                              <span className="text-xs font-bold text-slate-700">Select All ({regions.length})</span>
                            </div>
                          )}

                          {searchableRegions.map((region) => {
                            const isSelected = selectedRegions.includes(region.region_name);
                            return (
                              <div
                                key={region.region_code}
                                className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
                                onClick={() => toggleRegionSelection(region.region_name)}
                              >
                                {!isSingleRegionRequired ? (
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleRegionSelection(region.region_name)}
                                    className="rounded"
                                  />
                                ) : (
                                  <div className={cn("w-3.5 h-3.5 rounded-full border flex items-center justify-center", isSelected ? "border-slate-900 bg-slate-900" : "border-slate-300")}>
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </div>
                                )}
                                <span className="text-xs font-medium text-slate-700">{region.region_name}</span>
                              </div>
                            );
                          })}
                        </ScrollArea>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Step 3: District(s) */}
              <div className={cn(
                "border rounded-xl overflow-hidden transition-all",
                (!selectedCategory || (!hideRegionSelector && selectedRegions.length === 0)) && "opacity-50 pointer-events-none",
                activeStep === 3 ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200"
              )}>
                <button
                  onClick={() => selectedCategory && (hideRegionSelector || selectedRegions.length > 0) && setActiveStep(3)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 text-left"
                  disabled={!selectedCategory || (!hideRegionSelector && selectedRegions.length === 0)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      !showDistrictSelector ? "bg-slate-100 text-slate-400" : selectedDistricts.length > 0 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700"
                    )}>
                      {!showDistrictSelector ? <Lock className="h-3 w-3" /> : selectedDistricts.length > 0 ? <Check className="h-3 w-3" /> : "3"}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">District Selection</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", activeStep === 3 ? "rotate-180" : "")} />
                </button>

                {activeStep === 3 && (
                  <div className="p-3 bg-white border-t space-y-3">
                    {!showDistrictSelector ? (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
                        <Lock className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          District selection is not required for the '{selectedCategory}' category.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            placeholder="Search districts..."
                            className="h-8 pl-8 text-xs rounded-lg border-slate-200"
                            value={districtSearch}
                            onChange={(e) => setDistrictSearch(e.target.value)}
                          />
                        </div>

                        <ScrollArea className="h-48 border rounded-lg p-1">
                          <div 
                            className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
                            onClick={handleSelectAllDistricts}
                          >
                            <Checkbox
                              checked={isAllDistrictsSelected}
                              onCheckedChange={handleSelectAllDistricts}
                              className="rounded"
                            />
                            <span className="text-xs font-bold text-slate-700">Select All ({filteredDistricts.length})</span>
                          </div>

                          {searchableDistricts.map((district) => {
                            const isSelected = selectedDistricts.includes(district.district_name);
                            return (
                              <div
                                key={district.district_number}
                                className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-50 cursor-pointer"
                                onClick={() => toggleDistrictSelection(district.district_name)}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleDistrictSelection(district.district_name)}
                                  className="rounded"
                                />
                                <span className="text-xs font-medium text-slate-700">{district.district_name}</span>
                              </div>
                            );
                          })}
                        </ScrollArea>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Real-time Filter Summary & Validation */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Live Summary</span>
                <div className="space-y-1.5 text-xs font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>Category:</span>
                    <span className="text-slate-900 font-bold truncate max-w-[180px]">{selectedCategory || "None"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Regions:</span>
                    <span className="text-slate-900 font-bold">
                      {hideRegionSelector ? "Auto-all" : selectedRegions.length > 0 ? `${selectedRegions.length} selected` : "None"}
                    </span>
                  </div>
                  {showDistrictSelector && (
                    <div className="flex justify-between">
                      <span>Districts:</span>
                      <span className="text-slate-900 font-bold">
                        {selectedDistricts.length > 0 ? `${selectedDistricts.length} selected` : "None"}
                      </span>
                    </div>
                  )}
                </div>

                {validationError && (
                  <div className="pt-2 border-t border-slate-200/60 flex items-start gap-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>{validationError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Unified Action Bar */}
            <div className="p-4 border-t bg-slate-50 flex-shrink-0 space-y-3">
              {isGenerating && (
                <div className="w-full space-y-1">
                  <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-900 animate-pulse rounded-full" style={{ width: '100%' }} />
                  </div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 text-center">
                    Generating document, please wait...
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateReport}
                  disabled={isGenerating || !!validationError}
                  className="flex-1 bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs h-10 rounded-xl transition-all duration-300 shadow-md"
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-3.5 w-3.5" />
                  )}
                  {isGenerating ? 'Generating...' : 'Generate Report'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  disabled={isGenerating || (!selectedCategory && selectedRegions.length === 0)}
                  className="h-10 rounded-xl border-slate-200 text-xs font-bold"
                >
                  Clear
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Panel - Preview Panel */}
        <Card className="flex-1 flex flex-col shadow-lg border-slate-200 rounded-2xl overflow-hidden bg-white">
          <CardHeader className="border-b bg-slate-50/50 p-4 flex flex-row items-center justify-between space-y-0 flex-shrink-0">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-700" /> Document Preview
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5 truncate max-w-[250px] sm:max-w-md">
                {fileName ? `Viewing: ${fileName}` : "Generate a report to preview it here"}
              </CardDescription>
            </div>
            
            {/* Preview Toolbar */}
            <div className="flex items-center gap-1.5">
              {previewUrl && (
                <>
                  <Button variant="outline" size="icon" onClick={handleRefreshPreview} title="Refresh Preview" className="h-8 w-8 rounded-lg border-slate-200">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handlePrint} title="Print Document" className="h-8 w-8 rounded-lg border-slate-200">
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={downloadDocument} title="Download PDF" className="h-8 w-8 rounded-lg border-slate-200">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} title="Toggle Fullscreen" className="h-8 w-8 rounded-lg border-slate-200">
                    {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </Button>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-4 flex items-center justify-center bg-slate-50/50 relative min-h-0">
            <div className="w-full h-full border border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner flex items-center justify-center relative">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center text-center p-8">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100 animate-spin">
                    <Loader2 className="h-6 w-6 text-slate-900" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-1">Generating Document</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Compiling data and generating PDF. This may take a few moments...
                  </p>
                </div>
              ) : previewUrl ? (
                <iframe 
                  key={previewKey}
                  ref={iframeRef}
                  src={previewUrl} 
                  width="100%" 
                  height="100%" 
                  frameBorder="0"
                  title="Document preview"
                  className="border-none w-full h-full"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
                  <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                    <FileText className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-1">No Document Generated</p>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Configure your desired category, region, and district filters on the left panel, then click "Generate Report" to view the PDF document.
                  </p>
                  {selectedCategory && (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-left w-full space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Current Selection</span>
                      <p className="text-xs font-bold text-slate-700 truncate">📁 {selectedCategory}</p>
                      <p className="text-xs font-medium text-slate-500">
                        🌍 {hideRegionSelector ? "All Eligible Regions" : selectedRegions.length > 0 ? `${selectedRegions.length} region(s)` : "No region selected"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fullscreen Preview Overlay */}
      {isFullscreen && previewUrl && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col">
          <div className="h-14 border-b bg-slate-50 px-6 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-700" />
              <span className="font-bold text-sm text-slate-900">{fileName || "Document Preview"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefreshPreview} className="rounded-xl h-9">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl h-9">
                <Printer className="h-4 w-4 mr-2" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={downloadDocument} className="rounded-xl h-9">
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)} className="h-9 w-9 rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 bg-slate-100 p-4">
            <iframe 
              key={previewKey}
              ref={iframeRef}
              src={previewUrl} 
              width="100%" 
              height="100%" 
              frameBorder="0"
              title="Fullscreen Document preview"
              className="border rounded-xl bg-white shadow-lg w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StationeryReportsPage;