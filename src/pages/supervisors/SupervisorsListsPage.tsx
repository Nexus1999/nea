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
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import {
  Download,
  RefreshCw,
  MapPin,
  Globe,
  ChevronDown,
  FileText,
  Loader2,
  CheckCircle,
  Ban,
  ArrowLeft,
  Printer,
  X
} from "lucide-react";

interface Supervision {
  id: string;
  mid: number;
  mastersummaries: {
    Examination: string;
    Code: string;
    Year: number;
  };
}

const SupervisorsListsPage = () => {
  const navigate = useNavigate();
  const { id: supervisionId } = useParams<{ id: string }>();

  const [supervision, setSupervision] = useState<Supervision | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);

  const [regionSearch, setRegionSearch] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');

  const [loading, setLoading] = useState(true);

  const [isRegionPopoverOpen, setIsRegionPopoverOpen] = useState(false);
  const [isDistrictPopoverOpen, setIsDistrictPopoverOpen] = useState(false);

  const code = supervision?.mastersummaries?.Code || '';
  const year = supervision?.mastersummaries?.Year?.toString() || '';

  const mainContentHeightClass = "h-[calc(100vh-160px)]";

  const regionPopoverHeight = useMemo(() => Math.min(regions.length * 40 + 60, 256), [regions]);
  const districtPopoverHeight = useMemo(() => Math.min(districts.length * 40 + 60, 256), [districts]);

  const searchableRegions = useMemo(() =>
    regions.filter(r => r.toLowerCase().includes(regionSearch.toLowerCase())),
    [regions, regionSearch]
  );

  const searchableDistricts = useMemo(() =>
    districts.filter(d => d.toLowerCase().includes(districtSearch.toLowerCase())),
    [districts, districtSearch]
  );

  const isAllDistrictsSelected = districts.length > 0 && districts.every(d => selectedDistricts.includes(d));

  useEffect(() => {
    if (supervisionId) fetchSupervisionDetails();
  }, [supervisionId]);

  const fetchSupervisionDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('supervisions')
        .select(`
          id,
          mid,
          mastersummaries ( Examination, Code, Year )
        `)
        .eq('id', supervisionId)
        .single();

      if (error) throw error;
      setSupervision(data as any);

      const { data: regData, error: regErr } = await supabase
        .from('supervisorassignments')
        .select('region')
        .eq('supervision_id', supervisionId);

      if (regErr) throw regErr;

      const uniqueRegions = [...new Set(regData?.map(a => a.region).filter(Boolean))].sort();
      setRegions(uniqueRegions);

    } catch (err: any) {
      showError("Failed to load supervision session.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedRegion || !supervisionId) {
      setDistricts([]);
      return;
    }

    const loadDistricts = async () => {
      try {
        const { data, error } = await supabase
          .from('supervisorassignments')
          .select('district')
          .eq('supervision_id', supervisionId)
          .eq('region', selectedRegion);

        if (error) throw error;

        const unique = [...new Set(data?.map(d => d.district).filter(Boolean))].sort();
        setDistricts(unique);
      } catch (err) {
        showError("Failed to load districts for this region.");
      }
    };

    loadDistricts();
  }, [selectedRegion, supervisionId]);

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region);
    setSelectedDistricts([]);
    setIsRegionPopoverOpen(false);
    clearPreview();
  };

  const toggleDistrictSelection = (district: string) => {
    setSelectedDistricts(prev =>
      prev.includes(district)
        ? prev.filter(d => d !== district)
        : [...prev, district]
    );
    clearPreview();
  };

  const handleSelectAllDistricts = () => {
    if (isAllDistrictsSelected) {
      setSelectedDistricts([]);
    } else {
      setSelectedDistricts([...districts]);
    }
    clearPreview();
  };

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setFileName('');
    }
  };

  const handleGenerateList = async () => {
    if (!supervision || !selectedRegion) {
      showError("Please select a region.");
      return;
    }

    setIsGenerating(true);
    clearPreview();

    try {
      const payload = {
        supervision_id: supervisionId,
        code,
        year: Number(year),
        region: selectedRegion,
        districts: selectedDistricts.length > 0 ? selectedDistricts : null,
      };

      const { data, error } = await supabase.functions.invoke('generate-supervisors-list-pdf', {
        body: payload
      });

      if (error) throw error;

      if (data?.pdfBase64) {
        const byteCharacters = atob(data.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        setPreviewUrl(url);
        setFileName(`Wasimamizi_${code}_${year}_${selectedRegion.replace(/\s+/g, '_')}.pdf`);
        showSuccess("Supervisors list generated successfully!");
      } else {
        throw new Error("No PDF data received from server.");
      }
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      showError(err.message || "Failed to generate the supervisors list.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDocument = () => {
    if (!previewUrl) return;
    const link = document.createElement('a');
    link.href = previewUrl;
    link.setAttribute('download', fileName || `Wasimamizi_${new Date().toISOString().slice(0,10)}.pdf`);
    document.body.appendChild(link);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!supervision) {
    return (
      <Card className="w-full max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-800">Supervisors Lists</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500">
            Could not load supervision details.
          </p>
          <div className="text-center mt-4">
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
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Printer className="h-6 w-6 text-primary" /> Supervision Lists
        </h1>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/supervisors')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Supervisors
        </Button>
      </div>

      <div className={cn("flex gap-4", mainContentHeightClass)}>
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

          <CardContent className="flex-1 p-4 space-y-3 overflow-y-auto">
            <div className="space-y-1">
              <Label className="flex items-center gap-1 font-semibold text-gray-700 text-sm">
                <Globe className="h-4 w-4 text-primary" /> Select Region
              </Label>
              <Popover open={isRegionPopoverOpen} onOpenChange={setIsRegionPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between text-left font-normal h-9"
                    disabled={isGenerating}
                  >
                    {selectedRegion || "Select region..."}
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
                      {searchableRegions.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 py-2">No regions found.</p>
                      ) : (
                        searchableRegions.map((region) => (
                          <Button
                            key={region}
                            variant="ghost"
                            className={cn(
                              "w-full justify-start h-9",
                              selectedRegion === region && "bg-gray-100 text-primary hover:bg-gray-200"
                            )}
                            onClick={() => handleRegionSelect(region)}
                          >
                            {region}
                          </Button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label className="flex items-center gap-1 font-semibold text-gray-700 text-sm">
                <MapPin className="h-4 w-4 text-primary" /> Select Districts
              </Label>
              <Popover open={isDistrictPopoverOpen} onOpenChange={setIsDistrictPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between text-left font-normal h-9"
                    disabled={!selectedRegion || isGenerating}
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
                    className="h-9"
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                  />
                  <ScrollArea style={{ height: `${districtPopoverHeight}px` }} className="mt-2">
                    <div className="p-1">
                      {districts.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 py-2">
                          No districts available
                        </p>
                      ) : (
                        <>
                          <div
                            className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-gray-100 rounded-md h-9"
                            onClick={handleSelectAllDistricts}
                          >
                            <Checkbox checked={isAllDistrictsSelected} id="select-all-districts" />
                            <Label htmlFor="select-all-districts" className="font-semibold cursor-pointer">
                              Select All ({districts.length})
                            </Label>
                          </div>
                          <Separator className="my-1" />

                          {searchableDistricts.map((district) => {
                            const isSelected = selectedDistricts.includes(district);
                            return (
                              <div
                                key={district}
                                className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-gray-100 rounded-md h-9"
                                onClick={() => toggleDistrictSelection(district)}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  id={`dist-${district}`}
                                  onCheckedChange={() => toggleDistrictSelection(district)}
                                />
                                <Label htmlFor={`dist-${district}`} className="cursor-pointer font-normal">
                                  {district}
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

            <div className="pt-4 flex flex-col gap-3">
              {isGenerating && (
                <div className="w-full">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary animate-pulse"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <p className="text-xs text-primary mt-1 text-center">
                    Generating list...
                  </p>
                </div>
              )}

              <Button
                onClick={handleGenerateList}
                disabled={isGenerating || !selectedRegion}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold"
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
          </CardContent>
        </Card>

        <Card className="w-full lg:w-2/3 flex flex-col shadow-lg">
          <CardHeader className="border-b p-3 flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Document Preview
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
                    Select a region then click 'Generate Supervisors List'
                  </p>
                </div>
              )}
            </div>
          </CardContent>

          <div className="p-3 border-t bg-gray-100 flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              {selectedRegion ? (
                <>
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-primary font-medium">
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