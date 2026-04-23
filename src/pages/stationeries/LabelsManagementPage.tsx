"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Package, BookOpen, Cpu, Palette, FileText, Briefcase, Loader2, Settings, Printer, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { fetchMasterSummaryById, fetchBoxLimitsSettings } from "@/integrations/supabase/stationery-settings-api";
import { MasterSummaryOption, Stationery } from "@/types/stationeries";
import BoxLimitsModal from "@/components/stationeries/BoxLimitsModal";
import KitbagLimitsModal from "@/components/stationeries/KitbagLimitsModal";
import { PlusCircle, RotateCcw } from "lucide-react";
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";
import BreadcrumbNav from "@/components/BreadcrumbNav";

// Helper: Abbreviate center names
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

const getCategoriesForExam = (examCode: string | undefined) => {
  if (!examCode) return [];
  switch (examCode) {
    case 'CSEE':
    case 'ACSEE':
      return [
        { id: 'stationeries', name: 'Stationeries', icon: Package },
        { id: 'arabic_booklets', name: 'Arabic Booklets', icon: BookOpen },
        { id: 'ict_covers', name: 'ICT Covers', icon: Cpu },
        { id: 'fine_arts_booklets', name: 'Fine Arts Booklets', icon: Palette },
        { id: 'braille_stationeries', name: 'Braille Stationeries', icon: FileText },
        { id: 'kitbags', name: 'Kitbags', icon: Briefcase },
      ];
    case 'FTNA':
      return [
        { id: 'district_stationeries', name: 'Stationeries', icon: Package },
        { id: 'ict_covers', name: 'ICT Covers', icon: Cpu },
        { id: 'fine_arts_booklets', name: 'Fine Arts Booklets', icon: Palette },
        { id: 'braille_stationeries', name: 'Braille Stationeries', icon: FileText },
      ];
    case 'PSLE':
    case 'SSNA':
    case 'SFNA':
      return [
        { id: 'district_stationeries', name: 'Stationeries', icon: Package },
        { id: 'braille_stationeries', name: 'Braille Stationeries', icon: FileText },
        { id: 'kitbags', name: 'Kitbags', icon: Briefcase },
      ];
    default:
      return [];
  }
};

const LabelsManagementPage: React.FC = () => {
  const { masterSummaryId } = useParams<{ masterSummaryId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [masterSummary, setMasterSummary] = useState<MasterSummaryOption | null>(null);
  const [stationery, setStationery] = useState<Stationery | null>(null);
  const [activeTab, setActiveTab] = useState<string>('stationeries');
  const [isBoxLimitsModalOpen, setIsBoxLimitsModalOpen] = useState(false);
  const [isKitbagLimitsModalOpen, setIsKitbagLimitsModalOpen] = useState(false);
  const [allLabels, setAllLabels] = useState<LabelItem[]>([]);
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 750);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadMasterSummaryAndStationery = useCallback(async () => {
    if (!masterSummaryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const id = parseInt(masterSummaryId);
      if (isNaN(id)) throw new Error("Invalid Master Summary ID provided.");
      const summary = await fetchMasterSummaryById(id);
      if (summary) {
        setMasterSummary(summary);
        const { data: stationeryData, error: stationeryError } = await supabase
          .from('stationeries')
          .select('*')
          .eq('mid', summary.id)
          .single();
        if (stationeryError && stationeryError.code !== 'PGRST116') throw stationeryError;
        setStationery(stationeryData as Stationery | null);

        const categories = getCategoriesForExam(summary.Code);
        if (categories.length > 0 && !categories.some(cat => cat.id === activeTab)) {
          setActiveTab(categories[0].id);
        }

        // Regions list for selection (use secondary table for ACSEE/CSEE/FTNA)
        if (['FTNA', 'CSEE', 'ACSEE'].includes(summary.Code)) {
          const { data: regs, error: regsErr } = await supabase
            .from('secondarymastersummaries')
            .select('region')
            .eq('mid', summary.id)
            .eq('is_latest', true);
          if (!regsErr && regs) {
            const distinct = Array.from(new Set(regs.map((r: any) => r.region).filter(Boolean))).sort((a, b) => a.localeCompare(b));
            setRegions(distinct);
          }
        } else {
          const { data: regs, error: regsErr } = await supabase
            .from('primarymastersummary')
            .select('region')
            .eq('mid', summary.id)
            .eq('is_latest', true);
          if (!regsErr && regs) {
            const distinct = Array.from(new Set(regs.map((r: any) => r.region).filter(Boolean))).sort((a, b) => a.localeCompare(b));
            setRegions(distinct);
          }
        }
      } else {
        showError("Master Summary not found for the given ID.");
      }
    } catch (error: any) {
      showError(error.message || "Failed to load master summary details.");
    } finally {
      setLoading(false);
    }
  }, [masterSummaryId, activeTab]);

  const loadAllLabels = useCallback(async () => {
    if (!masterSummary) return;

    setLoading(true);
    try {
      let query = supabase
        .from('labels')
        .select('*')
        .eq('mid', masterSummary.id)
        .eq('category', activeTab)
        .order('region', { ascending: true })
        .order('district', { ascending: true })
        .order('center_number', { ascending: true })
        .order('container_type', { ascending: true })
        .order('container_number', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      setAllLabels(data as LabelItem[]);
    } catch (err: any) {
      console.error(err);
      showError("Failed to load existing labels");
      setAllLabels([]);
    } finally {
      setLoading(false);
    }
  }, [masterSummary, activeTab]);

  // Filter and paginate labels
  const filteredLabels = useMemo(() => {
    let filtered = [...allLabels];

    // Filter by region
    if (selectedRegion !== 'All') {
      filtered = filtered.filter(label => label.region === selectedRegion);
    }

    // Filter by search term
    if (debouncedSearchTerm) {
      filtered = filtered.filter(label =>
        label.center_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        label.center_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        label.district.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [allLabels, selectedRegion, debouncedSearchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredLabels.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLabels = filteredLabels.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    document.title = "Labels Management | NEAS";
    loadMasterSummaryAndStationery();
  }, [loadMasterSummaryAndStationery]);

  useEffect(() => {
    loadAllLabels();
  }, [loadAllLabels]);

  useEffect(() => {
    setCurrentPage(1); // Reset page when filters change
  }, [selectedRegion, debouncedSearchTerm]);

  const categories = getCategoriesForExam(masterSummary?.Code);

  const handleCreateLabels = async () => {
    if (!masterSummary || !stationery || !stationery.id) {
      showError("Master summary or stationery details are missing.");
      return;
    }
    setIsGeneratingLabels(true);
    try {
      let data: any, error: any;

     if (['stationeries'].includes(activeTab)){
  // validate box limits
  const boxLimits = await fetchBoxLimitsSettings(stationery.id);
  if (!boxLimits) {
    showError("Box limits not defined. Please set them first.");
    setIsGeneratingLabels(false);
    return;
  }

    ({ data, error } = await supabase.functions.invoke('pack-stationery-labels', {
      body: {
        masterSummaryId: masterSummary.id,
        stationeryId: stationery.id,
        examCode: masterSummary.Code,
        activeTab,
        region: selectedRegion !== 'All' ? selectedRegion : null,
      },
    }));
  
  
  } else if(['district_stationeries'].includes(activeTab)) {
    ({ data, error } = await supabase.functions.invoke('pack-district-stationeries', {
      body: {
        masterSummaryId: masterSummary.id,
        stationeryId: stationery.id,
        examCode: masterSummary.Code,
        region: selectedRegion !== 'All' ? selectedRegion : null,
      },
    }));
  }

    
 else if (['arabic_booklets', 'ict_covers', 'fine_arts_booklets'].includes(activeTab)) {
        const categoryMap: Record<string, string> = {
          arabic_booklets: 'Arabic Booklets',
          ict_covers: 'ICT Covers',
          fine_arts_booklets: 'Fine Arts Booklets',
           
        };
        ({ data, error } = await supabase.functions.invoke('pack-subject-category-labels', {
          body: {
            masterSummaryId: masterSummary.id,
            stationeryId: stationery.id,
            examCode: masterSummary.Code,
            category: categoryMap[activeTab],
            region: selectedRegion !== 'All' ? selectedRegion : null,
          },
        }));
      } else if (['braille_stationeries'].includes(activeTab)) {
        const categoryMap: Record<string, string> = {
         
          braille_stationeries: 'Braille Stationeries',
        };
        ({ data, error } = await supabase.functions.invoke('pack-braille-sheets', {
          body: {
            masterSummaryId: masterSummary.id,
            stationeryId: stationery.id,
            examCode: masterSummary.Code,
            category: categoryMap[activeTab],
            region: selectedRegion !== 'All' ? selectedRegion : null,
          },
        }));

      } else if (activeTab === 'kitbags') {
        ({ data, error } = await supabase.functions.invoke('pack-kitbag-labels', {
          body: {
            masterSummaryId: masterSummary.id,
            stationeryId: stationery.id,
            examCode: masterSummary.Code,
            region: selectedRegion !== 'All' ? selectedRegion : null,
          },
        }));
      } else {
        showError("Label generation not implemented for this category yet.");
        setIsGeneratingLabels(false);
        return;
      }

      if (error) throw error;

      showSuccess("Labels generated and saved successfully!");
      loadAllLabels(); // Refresh labels after creation
    } catch (error: any) {
      showError(error.message || "Failed to generate labels.");
    } finally {
      setIsGeneratingLabels(false);
    }
  };

  const handleResetLabels = async () => {
    if (!masterSummary) {
      showError("Master summary details are missing.");
      return;
    }
    setIsGeneratingLabels(true);
    try {
      const query = supabase.from('labels').delete().eq('mid', masterSummary.id).eq('category', activeTab);
      if (selectedRegion !== 'All') query.eq('region', selectedRegion);
      const { error: deleteError } = await query;
      if (deleteError) throw deleteError;
      setAllLabels([]);
      showSuccess("Labels reset successfully!");
    } catch (error: any) {
      showError(error.message || "Failed to reset labels.");
    } finally {
      setIsGeneratingLabels(false);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // Define dynamic table columns based on activeTab
  const getTableColumns = useMemo(() => {

    const baseColumns = [
      { header: 'Region', accessor: 'region', width: 'w-[12%]' },
      { header: 'District', accessor: 'district', width: 'w-[12%]' },
      { header: 'Center No.', accessor: 'center_number', width: 'w-[10%]' },
      { header: 'Center Name', accessor: 'center_name', width: 'w-[20%]', render: (label: LabelItem) => abbreviateSchoolName(label.center_name) },
    ];

    if (activeTab === 'ict_covers' || activeTab === 'arabic_booklets') {
      const itemName = categories.find(cat => cat.id === activeTab)?.name || 'Item';
      return [
        ...baseColumns,
        { header: itemName, accessor: 'quantity', width: 'w-[10%]' },
        { header: 'Envelope', accessor: 'container_number', width: 'w-[8%]' },
        { header: 'Envelopes', accessor: 'total_containers', width: 'w-[8%]' },
      ];
    } else if (activeTab === 'braille_stationeries') {
      return [
        ...baseColumns,
        { header: 'Sheets', accessor: 'quantity', width: 'w-[8%]' },
        { header: 'BKM', accessor: 'bkm', width: 'w-[8%]' },
        { header: 'Envelope', accessor: 'container_number', width: 'w-[8%]' },
        { header: 'Envelopes', accessor: 'total_containers', width: 'w-[8%]' },
      ];
    } else if (activeTab === 'fine_arts_booklets') {
      return [
        ...baseColumns,
        { header: 'Booklets', accessor: 'quantity', width: 'w-[8%]' },
        { header: 'BKM', accessor: 'bkm', width: 'w-[8%]' },
        { header: 'Envelope', accessor: 'container_number', width: 'w-[8%]' },
        { header: 'Envelopes', accessor: 'total_containers', width: 'w-[8%]' },
      ];
    } else if (activeTab === 'stationeries') {
      return [
        { header: 'Region', accessor: 'region', width: 'w-[9%]' },
        { header: 'District', accessor: 'district', width: 'w-[10%]' },
        { header: 'Center No.', accessor: 'center_number', width: 'w-[9%]' },
        { header: 'Center Name', accessor: 'center_name', width: 'w-[10%]', render: (label: LabelItem) => abbreviateSchoolName(label.center_name) },
        { header: 'Normal B.', accessor: 'normal_booklets', width: 'w-[10%]' },
        { header: 'Graph B.', accessor: 'graph_booklets', width: 'w-[10%]' },
        { header: 'Normal LS', accessor: 'normal_loosesheets', width: 'w-[10%]' },
        { header: 'Graph LS', accessor: 'graph_loosesheets', width: 'w-[10%]' },
        { header: 'BKM', accessor: 'bkm', width: 'w-[4%]' },
        { header: 'Box', accessor: 'container_number', width: 'w-[5%]' },
        { header: 'Boxes', accessor: 'total_containers', width: 'w-[5%]' },
      ];
    }
    else if (activeTab === 'district_stationeries') {
      return [
        { header: 'Region', accessor: 'region', width: 'w-[15%]' },
      { header: 'District', accessor: 'district', width: 'w-[15%]' },      
      { header: 'Item', accessor: 'item', width: 'w-[15%]' },
      { header: 'Quantity', accessor: 'quantity', width: 'w-[10%]' },      
      { header: 'Box.', accessor: 'container_number', width: 'w-[5%]' },
      { header: 'Boxes', accessor: 'total_containers', width: 'w-[5%]' },
      ];
    }
    else if (activeTab === 'kitbags') {
      return [
      { header: 'Region', accessor: 'region', width: 'w-[65%]' },      
      { header: 'Kitbas', accessor: 'quantity', width: 'w-[10%]' },      
      { header: 'Box', accessor: 'container_number', width: 'w-[5%]' },
      { header: 'Boxes', accessor: 'total_containers', width: 'w-[5%]' },
      ];
    }
    return [
      { header: 'Region', accessor: 'region', width: 'w-[15%]' },
      { header: 'District', accessor: 'district', width: 'w-[15%]' },
      { header: 'Center No.', accessor: 'center_number', width: 'w-[10%]' },
      { header: 'Center Name', accessor: 'center_name', width: 'w-[20%]', render: (label: LabelItem) => abbreviateSchoolName(label.center_name) },
      { header: 'Item', accessor: 'item', width: 'w-[15%]' },
      { header: 'Quantity', accessor: 'quantity', width: 'w-[10%]' },
      { header: 'Container', accessor: 'container_type', width: 'w-[10%]' },
      { header: 'No.', accessor: 'container_number', width: 'w-[5%]' },
      { header: 'Total', accessor: 'total_containers', width: 'w-[5%]' },
    ];
  }, [activeTab, categories]);

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Stationeries', href: '/dashboard/stationeries' },
    { label: 'Labels Management', href: `/dashboard/mastersummaries/${masterSummaryId}/labels` },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner label="Loading labels management..." />
      </div>
    );
  }

  if (!masterSummary) {
    return (
      <Card className="w-full max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Labels Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500">No master summary found for ID: {masterSummaryId}.</p>
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
    <div className="container mx-auto py-4 px-4">
 
      
      <div className="flex items-center justify-between mb-6">
        <div className="w-full">
          <div className="mt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Labels Management</h1>
              <p className="text-gray-600 mt-1">
                <span className="font-extrabold">{masterSummary.Code}-{masterSummary.Year}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-52">
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Regions</SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => navigate('/dashboard/stationeries')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stationeries
              </Button>
            </div>
          </div>
        </div>
      </div>

      {categories.length > 0 ? (
        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setAllLabels([]); }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {categories.map(category => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 transition-all duration-300 ease-out hover:text-gray-900 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-200 data-[state=active]:scale-[1.02] hover:bg-gray-50"
              >
                <category.icon className="h-4 w-4 transition-transform duration-300 data-[state=active]:scale-110" />
                <span className="hidden sm:inline">{category.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(category => (
            <TabsContent key={category.id} value={category.id} className="mt-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <Card className="border-t-4 border-blue-600 shadow-xl rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                      <category.icon className="h-6 w-6 text-blue-600" />
                      {category.name} Labels
                    </CardTitle>
                    <CardDescription className="mt-1">Manage labels for {category.name} for {selectedRegion === 'All' ? 'all regions' : selectedRegion}.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {category.id === 'stationeries' && stationery && masterSummary.Code && (
                      <Button
                        variant="outline"
                        onClick={() => setIsBoxLimitsModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100"
                      >
                        <Settings className="h-4 w-4" />
                        Box Limits
                      </Button>
                    )}
                      {category.id === 'district_stationeries' && stationery && masterSummary.Code && (
                      <Button
                        variant="outline"
                        onClick={() => setIsBoxLimitsModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100"
                      >
                        <Settings className="h-4 w-4" />
                        Box Limits
                      </Button>
                    )}
                    {category.id === 'kitbags' && stationery && masterSummary.Code && (
                      <Button
                        variant="outline"
                        onClick={() => setIsKitbagLimitsModalOpen(true)}
                        className="flex items-center gap-2 bg-green-50 text-green-600 hover:bg-green-100"
                      >
                        <Settings className="h-4 w-4" />
                        Kitbag Limits
                      </Button>
                    )}
                    <Button
                      className="flex items-center gap-2"
                      onClick={handleCreateLabels}
                      disabled={isGeneratingLabels}
                    >
                      {isGeneratingLabels ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="h-4 w-4" />
                      )}
                      Create Labels
                    </Button>
                    <Button variant="destructive" className="flex items-center gap-2" onClick={handleResetLabels}>
                      <RotateCcw className="h-4 w-4" /> Reset Labels
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    <Input
                      placeholder="Search by center name, number, or district..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-md"
                    />
                    <Button variant="outline" disabled>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                  </div>
                  
                  {currentLabels.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 mt-4">
                          <thead className="bg-gray-50">
                            <tr>
                              {getTableColumns.map((col, index) => (
                                <th key={index} className={`px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider ${col.width}`}>
                                  {col.header}
                                </th>
                              ))}
                              <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-[5%]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {currentLabels.map((label, index) => (
                              <tr key={label.id || index}>
                                {getTableColumns.map((col, colIndex) => (
                                  <td key={colIndex} className={`px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 ${col.width}`}>
                                    {col.render ? col.render(label) : (label as any)[col.accessor]}
                                  </td>
                                ))}
                                <td className="px-2 py-2 whitespace-nowrap text-right text-sm font-medium">
                                  <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {totalPages > 1 && (
                        <div className="mt-4">
                          <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">No labels generated yet. Choose a region and click "Create Labels".</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>No Categories Available</CardTitle>
            <CardDescription>No stationery categories are defined for the examination code: {masterSummary.Code}.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Please ensure to master summary has a valid examination code with defined stationery categories.</p>
          </CardContent>
        </Card>
      )}

      {stationery && masterSummary.Code && (
        <>
          <BoxLimitsModal
            open={isBoxLimitsModalOpen}
            onOpenChange={setIsBoxLimitsModalOpen}
            stationery={stationery}
            onSuccess={() => {}}
            examCode={masterSummary.Code}
          />
          <KitbagLimitsModal
            open={isKitbagLimitsModalOpen}
            onOpenChange={setIsKitbagLimitsModalOpen}
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