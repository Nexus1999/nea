"use client";

import React, { useEffect, useState, useMemo } from 'react';
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
  Download, RefreshCw, MapPin, Globe, FolderOpenDot, Search, Check, X, ChevronDown,
  FileText, Loader2, CheckCircle, Ban, ArrowLeft, ListChecks, Printer
} from "lucide-react";

// ────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────
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

// ────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────
const SupervisorsListsPage = () => {
  const navigate = useNavigate();
  const { id: masterSummaryId } = useParams<{ id: string }>();

  const [masterSummary, setMasterSummary] = useState<MasterSummary | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);

  const [regionSearch, setRegionSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  const [regionsLoading, setRegionsLoading] = useState(true);
  const [districtsLoading, setDistrictsLoading] = useState(true);

  // Popover control states
  const [isRegionPopoverOpen, setIsRegionPopoverOpen] = useState(false);
  const [isDistrictPopoverOpen, setIsDistrictPopoverOpen] = useState(false);

  const code = masterSummary?.Code || '';
  const year = masterSummary?.Year?.toString() || '';

  // ─── Computed ────────────────────────────────────────────────
  const filteredDistricts = useMemo(() => {
    if (!selectedRegion) return districts;
    const regionObj = regions.find(r => r.region_name === selectedRegion);
    if (!regionObj) return [];
    return districts.filter(d => d.region_number === regionObj.region_code);
  }, [districts, selectedRegion, regions]);

  const searchableRegions = useMemo(() =>
    regions.filter(r => r.region_name.toLowerCase().includes(regionSearch.toLowerCase())),
    [regions, regionSearch]
  );

  const searchableDistricts = useMemo(() =>
    filteredDistricts.filter(d => d.district_name.toLowerCase().includes(districtSearch.toLowerCase())),
    [filteredDistricts, districtSearch]
  );

  const isAllRegionsSelected = regions.length > 0 && regions.every(r => r.region_name === selectedRegion);
  const isAllDistrictsSelected = filteredDistricts.length > 0 &&
    filteredDistricts.every(d => selectedDistricts.includes(d.district_name));

  const regionPopoverHeight = Math.min(regions.length * 40 + 60, 280);
  const districtPopoverHeight = Math.min(filteredDistricts.length * 40 + 60, 280);

  const mainContentHeightClass = "h-[calc(100vh-160px)]";

  const regionStatusText = selectedRegion || 'No Region Selected';

  // ─── Data Fetching ───────────────────────────────────────────
  const fetchMasterSummary = async () => {
    if (!masterSummaryId) return;
    const { data, error } = await supabase
      .from('mastersummaries')
      .select('id, Examination, Code, Year')
      .eq('id', masterSummaryId)
      .single();

    if (error) {
      showError("Failed to load exam session details.");
      setMasterSummary(null);
    } else {
      setMasterSummary(data as MasterSummary);
    }
  };

  const fetchRegions = async () => {
    setRegionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('regions')
        .select('region_code, region_name')
        .order('region_name', { ascending: true });

      if (error) throw error;
      setRegions(data || []);
    } catch (err: any) {
      showError("Failed to load regions.");
    } finally {
      setRegionsLoading(false);
    }
  };

  const fetchDistricts = async () => {
    setDistrictsLoading(true);
    try {
      let tableName = '';
      if (['SFNA', 'SSNA', 'PSLE'].includes(code)) {
        tableName = 'primarymastersummary';
      } else if (['FTNA', 'CSEE', 'ACSEE'].includes(code)) {
        tableName = 'secondarymastersummaries';
      } else {
        setDistricts([]);
        return;
      }

      const { data: distinct, error: distErr } = await supabase
        .from(tableName)
        .select('district')
        .eq('mid', masterSummary?.id)
        .eq('is_latest', true);

      if (distErr) throw distErr;

      const uniqueDistricts = [...new Set(distinct?.map(d => d.district)?.filter(Boolean) || [])];

      if (uniqueDistricts.length === 0) {
        setDistricts([]);
        return;
      }

      const { data: full, error: detailsErr } = await supabase
        .from('districts')
        .select('district_number, district_name, region_number')
        .in('district_name', uniqueDistricts)
        .order('district_name');

      if (detailsErr) throw detailsErr;
      setDistricts(full || []);
    } catch (err: any) {
      showError("Failed to load districts.");
    } finally {
      setDistrictsLoading(false);
    }
  };

  useEffect(() => {
    document.title = `Supervisors Lists | ${code ? `${code}-${year}` : 'NEAS'}`;
    fetchMasterSummary();
  }, [masterSummaryId]);

  useEffect(() => {
    if (masterSummary) {
      fetchRegions();
      fetchDistricts();
    }
  }, [masterSummary]);

  // ─── Handlers ────────────────────────────────────────────────
  const toggleDistrictSelection = (districtName: string) => {
    setSelectedDistricts(prev =>
      prev.includes(districtName)
        ? prev.filter(n => n !== districtName)
        : [...prev, districtName]
    );
    clearPreview();
  };

  const handleSelectAllDistricts = () => {
    if (isAllDistrictsSelected) {
      setSelectedDistricts([]);
    } else {
      setSelectedDistricts(filteredDistricts.map(d => d.district_name));
    }
    clearPreview();
  };

  const handleRegionSelect = (regionName: string) => {
    setSelectedRegion(regionName);
    setSelectedDistricts([]); // reset districts when region changes
    setIsRegionPopoverOpen(false);
    clearPreview();
  };

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setFileName('');
    }
  };

  const validateForm = () => {
    if (!masterSummary) {
      showError("Exam session details are missing.");
      return false;
    }
    if (!selectedRegion) {
      showError("Please select a region.");
      return false;
    }
    return true;
  };

  const handleGenerateList = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    clearPreview();

    try {
      const payload = {
        mid: masterSummary!.id,
        code,
        year: Number(year),
        region: selectedRegion,
        districts: selectedDistricts.length > 0 ? selectedDistricts : null,
      };

      const { data, error } = await supabase.functions.invoke(
        'generate-supervisors-list-pdf', // ← your Edge Function name
        { body: payload }
      );

      if (error) throw error;

      if (!data?.pdfBase64) {
        throw new Error("No PDF content returned from server");
      }

      const binary = atob(data.pdfBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const generatedFileName = data.fileName ||
        `Wasimamizi_${code}_${year}_${selectedRegion.replace(/\s+/g, '_')}.pdf`;

      setPreviewUrl(url);
      setFileName(generatedFileName);

      showSuccess("Supervisors list generated successfully!");
    } catch (err: any) {
      console.error("Generation failed:", err);
      showError(err.message || "Failed to generate supervisors list. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDocument = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = fileName || `Wasimamizi_${new Date().toISOString().slice(0,10)}.pdf`;
    link.click();
    link.remove();
  };

  const handleClearFilters = () => {
    setSelectedRegion('');
    setSelectedDistricts([]);
    setRegionSearch('');
    setDistrictSearch('');
    clearPreview();
  };

  // ─── Loading / Error States ──────────────────────────────────
  if (!masterSummaryId || (regionsLoading && districtsLoading && !masterSummary)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-neas-green" />
      </div>
    );
  }

  if (!masterSummary) {
    return (
      <Card className="max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Supervisors Lists</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500">
            Could not load exam session details for ID: {masterSummaryId}
          </p>
          <div className="text-center mt-6">
            <Button variant="outline" onClick={() => navigate('/dashboard/supervisors')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Supervisors
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-3 px-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Printer className="h-6 w-6 text-neas-green" /> Orodha ya Wasimamizi
        </h1>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/supervisors')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Supervisors
        </Button>
      </div>

      <div className={cn("flex gap-4", mainContentHeightClass)}>
        {/* Left – Controls */}
        <Card className="w-full lg:w-1/3 flex flex-col flex-shrink-0 shadow-lg">
          <CardHeader className="border-b p-3">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center justify-between">
              List Filters
              <Button variant="ghost" size="sm" onClick={handleClearFilters} title="Clear Filters">
                <RefreshCw className="h-4 w-4 text-gray-800" />
              </Button>
            </CardTitle>
            <CardDescription className="text-sm font-semibold text-gray-700">
              Session: <span className="text-gray-800">{code}-{year}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 p-4 space-y-4 overflow-y-auto scrollbar-hidden">
            {/* Region Selection */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 font-semibold text-gray-700 text-sm">
                <Globe className="h-4 w-4 text-neas-green" /> Select Region
              </Label>
              <Popover open={isRegionPopoverOpen} onOpenChange={setIsRegionPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between text-left font-normal h-9"
                    disabled={regionsLoading || isGenerating}
                  >
                    {selectedRegion || "Select region..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Input
                    placeholder="Search regions..."
                    className="h-9 rounded-none border-0 border-b focus-visible:ring-0"
                    value={regionSearch}
                    onChange={(e) => setRegionSearch(e.target.value)}
                  />
                  <ScrollArea style={{ height: `${regionPopoverHeight}px` }}>
                    <div className="p-1">
                      {regionsLoading ? (
                        <div className="flex items-center justify-center p-6">
                          <Loader2 className="h-6 w-6 animate-spin text-neas-green" />
                        </div>
                      ) : searchableRegions.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 py-4">No regions found</p>
                      ) : (
                        searchableRegions.map((region) => (
                          <Button
                            key={region.region_code}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start h-9",
                              selectedRegion === region.region_name && "bg-gray-100 text-neas-green"
                            )}
                            onClick={() => handleRegionSelect(region.region_name)}
                          >
                            {region.region_name}
                          </Button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            {/* Districts Selection */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 font-semibold text-gray-700 text-sm">
                <MapPin className="h-4 w-4 text-neas-green" /> Select Districts
              </Label>
              <Popover open={isDistrictPopoverOpen} onOpenChange={setIsDistrictPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between text-left font-normal h-9"
                    disabled={!selectedRegion || districtsLoading || isGenerating}
                  >
                    {selectedDistricts.length > 0
                      ? `${selectedDistricts.length} district(s) selected`
                      : "Select districts..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Input
                    placeholder="Search districts..."
                    className="h-9 rounded-none border-0 border-b focus-visible:ring-0"
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                  />
                  <ScrollArea style={{ height: `${districtPopoverHeight}px` }}>
                    <div className="p-1">
                      {districtsLoading ? (
                        <div className="flex items-center justify-center p-6">
                          <Loader2 className="h-6 w-6 animate-spin text-neas-green" />
                        </div>
                      ) : filteredDistricts.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 py-4">
                          No districts in this region
                        </p>
                      ) : (
                        <>
                          <div
                            className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer h-9"
                            onClick={handleSelectAllDistricts}
                          >
                            <Checkbox checked={isAllDistrictsSelected} id="select-all-districts" />
                            <Label htmlFor="select-all-districts" className="font-semibold cursor-pointer">
                              Select All ({filteredDistricts.length})
                            </Label>
                          </div>
                          <Separator className="my-1" />

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
                                  id={`dist-${district.district_number}`}
                                  onCheckedChange={() => toggleDistrictSelection(district.district_name)}
                                />
                                <Label htmlFor={`dist-${district.district_number}`} className="cursor-pointer">
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

            {/* Generate Button + Progress */}
            <div className="pt-6 flex flex-col gap-3">
              {isGenerating && (
                <div className="w-full">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-neas-green animate-pulse" style={{ width: '100%' }} />
                  </div>
                  <p className="text-xs text-neas-green mt-1 text-center">
                    Generating supervisors list, please wait...
                  </p>
                </div>
              )}

              <Button
                onClick={handleGenerateList}
                disabled={isGenerating || !selectedRegion}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold text-base transition-all"
                size="lg"
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="mr-2 h-4 w-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate Supervisors List'}
              </Button>
            </div>

            <div className="flex-1" />
          </CardContent>
        </Card>

        {/* Right – Preview */}
        <Card className="w-full lg:w-2/3 flex flex-col shadow-lg">
          <CardHeader className="border-b p-3 flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-neas-green" /> Document Preview
            </CardTitle>
            {previewUrl && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadDocument}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
                <Button variant="destructive" size="sm" onClick={clearPreview}>
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
                  title="Supervisors List Preview"
                  className="border-none"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <FileText className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-lg font-semibold text-gray-600 mb-2">Preview Area</p>
                  <p className="text-sm text-gray-500">
                    Select region (and districts if needed) then click Generate
                  </p>
                </div>
              )}
            </div>
          </CardContent>

          {/* Status bar */}
          <div className="p-3 border-t bg-gray-100 flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              {selectedRegion ? (
                <>
                  <CheckCircle className="h-4 w-4 text-neas-green" />
                  <span className="text-neas-green font-medium">
                    Region: {selectedRegion}
                  </span>
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 text-red-500" />
                  <span className="text-red-500">No Region Selected</span>
                </>
              )}
            </div>

            {selectedDistricts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDistricts([])}
                className="text-red-500 hover:bg-red-50"
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

export default SupervisorsListsPage;