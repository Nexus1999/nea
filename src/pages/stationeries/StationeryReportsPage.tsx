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
    if (code === 'CSEE' || code === 'FTNA') return '016';
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
  
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [districtsLoading, setDistrictsLoading] = useState(true);

  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const [isRegionPopoverOpen, setIsRegionPopoverOpen] = useState(false);
  const [isDistrictPopoverOpen, setIsDistrictPopoverOpen] = useState(false);

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
  
  const categoryPopoverHeight = useMemo(() => availableCategories.length * 36 + 8, [availableCategories]); 
  const regionPopoverHeight = useMemo(() => Math.min(regions.length * 40 + 60, 256), [regions]);
  const districtPopoverHeight = useMemo(() => Math.min(filteredDistricts.length * 40 + 60, 256), [filteredDistricts]);

  const mainContentHeightClass = "h-[calc(100vh-180px)]"; 
  
  const regionStatusText = useMemo(() => {
    if (selectedRegions.length === 0) return 'No Region Selected';
    if (isSingleRegionRequired) {
      return selectedRegions[0];
    }
    if (selectedRegions.length === regions.length) return 'All Regions Selected';
    return `${selectedRegions.length} Regions Selected`;
  }, [selectedRegions, regions.length, isSingleRegionRequired]);
      
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
      } else {
        newRegions = prev.includes(regionName)
          ? prev.filter(name => name !== regionName)
          : [...prev, regionName];
      }
      
      clearPreview();
      
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
    clearPreview();
    setIsCategoryPopoverOpen(false);
  };

  const validateForm = () => {
    if (!masterSummary) {
      showError('Master Summary details are missing.');
      return false;
    }
    if (!selectedCategory) {
        showError('Please select a category.');
        return false;
    }

    if (!hideRegionSelector && selectedRegions.length === 0) {
      showError('Please select at least one region.');
      return false;
    }

    if (!hideRegionSelector && isSingleRegionRequired && selectedRegions.length > 1) {
        showError(`The '${selectedCategory}' report can only be generated for one region at a time.`);
        return false;
    }

    if (SUBJECT_AWARE_REGION_CATEGORIES.includes(selectedCategory)) {
        const subjectCode = getSubjectCodeForCategory(code, selectedCategory);
        if (!subjectCode && selectedCategory !== 'Braille Stationeries') {
            showError(`Cannot generate '${selectedCategory}' report for exam code '${code}'. No corresponding subject code found.`);
            return false;
        }
    }
    
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
    <div className="container mx-auto py-4 px-4 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-1.5 bg-black text-white rounded-md">
              <FolderOpenDot className="h-5 w-5" />
            </div>
            Stationery Reports
          </h1>
          <p className="text-gray-600 mt-1 font-extrabold">{code}-{year}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/stationeries')} className="rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stationeries
        </Button>
      </div>

      <div className={cn("flex flex-col lg:flex-row gap-6", mainContentHeightClass)}> 
        {/* Left Panel - Controls */}
        <Card className="w-full lg:w-[380px] flex flex-col flex-shrink-0 shadow-xl border-slate-200 rounded-2xl overflow-hidden bg-white">
          <CardHeader className="border-b bg-slate-50/50 p-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-900">Report Filters</CardTitle>
              <Button variant="ghost" size="icon" onClick={handleClearFilters} title="Clear Filters" className="h-8 w-8 rounded-lg hover:bg-slate-100">
                <RefreshCw className="h-4 w-4 text-slate-600" />
              </Button>
            </div>
            <CardDescription className="text-xs font-semibold text-slate-500 mt-1">
              Configure parameters for {code} ({year})
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 p-6 space-y-5 overflow-y-auto scrollbar-none"> 
            {/* Category Selection */}
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" /> Select Category
              </Label>
              <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between text-left font-medium h-10 rounded-xl border-slate-200 hover:bg-slate-50"
                    disabled={regionsLoading || isGenerating || availableCategories.length === 0}
                  >
                    <span className="truncate">{selectedCategory || "Select a category..."}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[330px] p-0 rounded-xl shadow-xl border-slate-200">
                  <ScrollArea style={{ height: `${categoryPopoverHeight}px` }}>
                    <div className="p-1.5 space-y-0.5">
                      {availableCategories.length === 0 ? (
                        <p className="text-center text-sm text-slate-500 py-3">No categories defined for {code}.</p>
                      ) : (
                        availableCategories.map((category) => (
                          <Button
                            key={category}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start h-9 rounded-lg text-sm font-medium",
                              selectedCategory === category ? "bg-slate-900 text-white hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"
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
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> Select Region(s)
                  {isSingleRegionRequired && selectedCategory && (
                      <span className="text-red-500 text-[9px] font-bold uppercase tracking-normal ml-auto">(Single Region)</span>
                  )}
                </Label>
                <Popover open={isRegionPopoverOpen} onOpenChange={setIsRegionPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                          "w-full justify-between text-left font-medium h-10 rounded-xl border-slate-200 hover:bg-slate-50",
                          isRegionSelectionInvalid && "border-red-500 ring-1 ring-red-500"
                      )}
                      disabled={regionsLoading || isGenerating || !selectedCategory}
                    >
                      <span className="truncate">{selectedRegions.length > 0 ? regionStatusText : "Select regions..."}</span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[330px] p-0 rounded-xl shadow-xl border-slate-200 overflow-hidden">
                    <div className="p-2 border-b bg-slate-50">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Search regions..."
                          className="h-9 pl-9 rounded-lg border-slate-200"
                          value={regionSearch}
                          onChange={(e) => setRegionSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <ScrollArea style={{ height: `${regionPopoverHeight}px` }}>
                      <div className="p-1.5 space-y-0.5">
                        {regionsLoading ? (
                          <div className="flex items-center justify-center p-6">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                          </div>
                        ) : searchableRegions.length === 0 ? (
                          <p className="text-center text-sm text-slate-500 py-3">No regions found.</p>
                        ) : (
                          <>
                            {/* Select All */}
                            <div 
                              className={cn(
                                  "flex items-center space-x-2.5 p-2.5 rounded-lg h-9 cursor-pointer hover:bg-slate-100",
                                  isSingleRegionRequired && 'opacity-50 cursor-not-allowed hover:bg-transparent'
                              )}
                              onClick={handleSelectAllRegions}
                            >
                              <Checkbox
                                checked={isAllRegionsSelected}
                                onCheckedChange={handleSelectAllRegions}
                                id="select-all-regions"
                                disabled={isSingleRegionRequired}
                                className="rounded"
                              />
                              <Label htmlFor="select-all-regions" className={cn("font-bold text-xs text-slate-700 cursor-pointer", isSingleRegionRequired && 'cursor-not-allowed')}>
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
                                  className="flex items-center space-x-2.5 p-2.5 cursor-pointer hover:bg-slate-100 rounded-lg h-9"
                                  onClick={() => toggleRegionSelection(region.region_name)}
                                >
                                  {!isSingleRegionRequired ? (
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleRegionSelection(region.region_name)}
                                      id={`region-${region.region_code}`}
                                      className="rounded"
                                    />
                                  ) : (
                                    <div className={cn("w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center", isSelected && "border-black bg-black")}>
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                  )}
                                  <Label htmlFor={`region-${region.region_code}`} className="font-medium text-xs text-slate-700 cursor-pointer flex-1">
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
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Select Districts
                </Label>
                <Popover open={isDistrictPopoverOpen} onOpenChange={setIsDistrictPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between text-left font-medium h-10 rounded-xl border-slate-200 hover:bg-slate-50"
                      disabled={selectedRegions.length === 0 || districtsLoading || isGenerating}
                    >
                      <span className="truncate">
                        {selectedDistricts.length > 0 ? `${selectedDistricts.length} district(s) selected` : "Select districts..."}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[330px] p-0 rounded-xl shadow-xl border-slate-200 overflow-hidden">
                    <div className="p-2 border-b bg-slate-50">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Search districts..."
                          className="h-9 pl-9 rounded-lg border-slate-200"
                          value={districtSearch}
                          onChange={(e) => setDistrictSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <ScrollArea style={{ height: `${districtPopoverHeight}px` }}>
                      <div className="p-1.5 space-y-0.5">
                        {districtsLoading ? (
                          <div className="flex items-center justify-center p-6">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                          </div>
                        ) : filteredDistricts.length === 0 ? (
                          <p className="text-center text-sm text-slate-500 py-3">No districts found for selected regions.</p>
                        ) : (
                          <>
                            {/* Select All */}
                            <div 
                              className="flex items-center space-x-2.5 p-2.5 cursor-pointer hover:bg-slate-100 rounded-lg h-9"
                              onClick={handleSelectAllDistricts}
                            >
                              <Checkbox
                                checked={isAllDistrictsSelected}
                                onCheckedChange={handleSelectAllDistricts}
                                id="select-all-districts"
                                className="rounded"
                              />
                              <Label htmlFor="select-all-districts" className="font-bold text-xs text-slate-700 cursor-pointer">
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
                                  className="flex items-center space-x-2.5 p-2.5 cursor-pointer hover:bg-slate-100 rounded-lg h-9"
                                  onClick={() => toggleDistrictSelection(district.district_name)}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleDistrictSelection(district.district_name)}
                                    id={`district-${district.district_number}`}
                                    className="rounded"
                                  />
                                  <Label htmlFor={`district-${district.district_number}`} className="font-medium text-xs text-slate-700 cursor-pointer flex-1">
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
            
            {/* Generate Report Button and Progress Bar */}
            <div className="pt-4 flex flex-col gap-4">
              {isGenerating && (
                <div className="w-full space-y-1.5">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-black animate-pulse rounded-full" style={{ width: '100%' }} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
                    Generating document(s), please wait...
                  </p>
                </div>
              )}

              <Button
                onClick={handleGenerateReport}
                disabled={
                  isGenerating
                  || !selectedCategory
                  || (!hideRegionSelector && selectedRegions.length === 0)
                  || (showDistrictSelector && selectedDistricts.length === 0)
                  || (!hideRegionSelector && isRegionSelectionInvalid)
                }
                className="w-full bg-black text-white hover:bg-slate-800 font-bold text-sm h-11 rounded-xl transition-all duration-300 shadow-md"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isGenerating ? 'Generating Report(s)...' : 'Generate Report(s)'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Preview */}
        <Card className="flex-1 flex flex-col shadow-xl border-slate-200 rounded-2xl overflow-hidden bg-white">
          <CardHeader className="border-b bg-slate-50/50 p-5 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-700" /> Document Preview
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-1">
                {fileName ? `Viewing: ${fileName}` : "Generate a report to preview it here"}
              </CardDescription>
            </div>
            {previewUrl && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadDocument} className="rounded-xl h-9 border-slate-200 hover:bg-slate-50">
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
                <Button variant="ghost" size="icon" onClick={clearPreview} className="h-9 w-9 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-6 flex items-center justify-center bg-slate-50/50">
            <div className="w-full h-full border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-inner flex items-center justify-center">
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
                <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                    <FileText className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-base font-bold text-slate-800 mb-1">No Document Generated</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Select your desired category, region, and district filters on the left panel, then click "Generate Report(s)" to view the PDF document.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          
          {/* Status Bar */}
          <div className="p-4 border-t bg-slate-50 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              {hideRegionSelector ? (
                <>
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">Auto-generating for eligible regions</span>
                </>
              ) : (
                <>
                  {(selectedRegions.length > 0 && !isSingleRegionRequired) || (isSingleRegionRequired && selectedRegions.length === 1) ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Ban className="h-4 w-4 text-red-500" />
                  )}
                  <span className={cn("font-bold uppercase tracking-wider text-[10px]", selectedRegions.length > 0 ? 'text-emerald-700' : 'text-red-500')}>
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
                className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg h-8 px-3 font-semibold"
              >
                Clear Districts ({selectedDistricts.length})
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StationeryReportsPage;