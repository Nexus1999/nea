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
  Download, RefreshCw, MapPin, Globe, Search, X, ChevronDown,
  FileText, Loader2, CheckCircle, Ban, ArrowLeft, Printer
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

      // Fetch unique regions from assignments
      const { data: assignmentRegions, error: regError } = await supabase
        .from('supervisorassignments')
        .select('region')
        .eq('supervision_id', supervisionId);
      
      if (regError) throw regError;
      const uniqueRegions = [...new Set(assignmentRegions?.map(a => a.region).filter(Boolean))].sort();
      setRegions(uniqueRegions);

    } catch (err: any) {
      showError("Failed to load supervision details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDistrictsForRegion = async (regionName: string) => {
    try {
      const { data, error } = await supabase
        .from('supervisorassignments')
        .select('district')
        .eq('supervision_id', supervisionId)
        .eq('region', regionName);
      
      if (error) throw error;
      const uniqueDistricts = [...new Set(data?.map(a => a.district).filter(Boolean))].sort();
      setDistricts(uniqueDistricts);
    } catch (err) {
      showError("Failed to load districts.");
    }
  };

  const handleRegionSelect = (regionName: string) => {
    setSelectedRegion(regionName);
    setSelectedDistricts([]);
    fetchDistrictsForRegion(regionName);
    setIsRegionPopoverOpen(false);
    clearPreview();
  };

  const toggleDistrictSelection = (districtName: string) => {
    setSelectedDistricts(prev =>
      prev.includes(districtName)
        ? prev.filter(n => n !== districtName)
        : [...prev, districtName]
    );
    clearPreview();
  };

  const handleSelectAllDistricts = () => {
    if (selectedDistricts.length === districts.length) {
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
    if (!selectedRegion) return;

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

      const { data, error } = await supabase.functions.invoke(
        'generate-supervisors-list-pdf',
        { body: payload }
      );

      if (error) throw error;

      if (!data?.pdfBase64) throw new Error("No PDF content returned");

      const binary = atob(data.pdfBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setPreviewUrl(url);
      setFileName(`Wasimamizi_${code}_${year}_${selectedRegion.replace(/\s+/g, '_')}.pdf`);
      showSuccess("Supervisors list generated!");
    } catch (err: any) {
      showError(err.message || "Failed to generate list.");
    } finally {
      setIsGenerating(false);
    }
  };

  const searchableRegions = regions.filter(r => r.toLowerCase().includes(regionSearch.toLowerCase()));
  const searchableDistricts = districts.filter(d => d.toLowerCase().includes(districtSearch.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container mx-auto py-6 px-4 h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
          <Printer className="h-6 w-6 text-indigo-600" /> Orodha ya Wasimamizi
        </h1>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/supervisors')} className="rounded-xl font-bold">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        <Card className="shadow-xl border-none rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-900 text-white p-6">
            <CardTitle className="text-lg font-black uppercase tracking-widest">Filters</CardTitle>
            <CardDescription className="text-slate-400 font-bold uppercase text-[10px]">
              Session: {code}-{year}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Region</Label>
              <Popover open={isRegionPopoverOpen} onOpenChange={setIsRegionPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-12 rounded-xl border-2">
                    {selectedRegion || "Select Region"}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 rounded-xl shadow-2xl border-none">
                  <div className="p-2 border-b"><Input placeholder="Search..." value={regionSearch} onChange={e => setRegionSearch(e.target.value)} className="h-9 rounded-lg" /></div>
                  <ScrollArea className="h-64">
                    <div className="p-1">
                      {searchableRegions.map(r => (
                        <Button key={r} variant="ghost" className="w-full justify-start h-10 rounded-lg font-bold" onClick={() => handleRegionSelect(r)}>{r}</Button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Districts</Label>
              <Popover open={isDistrictPopoverOpen} onOpenChange={setIsDistrictPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-12 rounded-xl border-2" disabled={!selectedRegion}>
                    {selectedDistricts.length > 0 ? `${selectedDistricts.length} Selected` : "All Districts"}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 rounded-xl shadow-2xl border-none">
                  <div className="p-2 border-b"><Input placeholder="Search..." value={districtSearch} onChange={e => setDistrictSearch(e.target.value)} className="h-9 rounded-lg" /></div>
                  <ScrollArea className="h-64">
                    <div className="p-2 space-y-1">
                      <div className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={handleSelectAllDistricts}>
                        <Checkbox checked={selectedDistricts.length === districts.length && districts.length > 0} />
                        <span className="font-bold text-sm">Select All</span>
                      </div>
                      <Separator className="my-1" />
                      {searchableDistricts.map(d => (
                        <div key={d} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer" onClick={() => toggleDistrictSelection(d)}>
                          <Checkbox checked={selectedDistricts.includes(d)} />
                          <span className="text-sm font-medium">{d}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleGenerateList} disabled={isGenerating || !selectedRegion} className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95">
              {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Printer className="mr-2 h-5 w-5" />}
              Generate List
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-xl border-none rounded-2xl overflow-hidden flex flex-col bg-slate-50">
          <CardHeader className="bg-white border-b p-6 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" /> Preview
            </CardTitle>
            {previewUrl && (
              <Button variant="outline" size="sm" onClick={() => { const link = document.createElement('a'); link.href = previewUrl; link.download = fileName; link.click(); }} className="rounded-xl font-bold border-2">
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0 relative">
            {previewUrl ? (
              <iframe src={previewUrl} className="w-full h-full border-none" title="PDF Preview" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4">
                  <FileText className="h-10 w-10 opacity-20" />
                </div>
                <p className="font-bold uppercase text-xs tracking-widest">Select filters and click generate to preview the list</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupervisorsListsPage;