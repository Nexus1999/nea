"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Package, BookOpen, Cpu, Palette, FileText, Briefcase, Loader2, Settings, Printer, Search, PlusCircle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { fetchMasterSummaryById, fetchBoxLimitsSettings } from "@/integrations/supabase/stationery-settings-api";
import { MasterSummaryOption, Stationery } from "@/types/stationeries";
import BoxLimitsDrawer from "@/components/stationeries/BoxLimitsDrawer";
import KitbagLimitsDrawer from "@/components/stationeries/KitbagLimitsDrawer";
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";

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

const categoryQueryMap: Record<string, string> = {
  stationeries: 'stationeries',
  district_stationeries: 'district_stationeries',
  arabic_booklets: 'Arabic Booklets',
  ict_covers: 'ICT Covers',
  fine_arts_booklets: 'Fine Arts Booklets',
  braille_stationeries: 'Braille Stationeries',
  kitbags: 'kitbags'
};

const LabelsManagementPage: React.FC = () => {
  const { masterSummaryId } = useParams<{ masterSummaryId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [masterSummary, setMasterSummary] = useState<MasterSummaryOption | null>(null);
  const [stationery, setStationery] = useState<Stationery | null>(null);
  const [activeTab, setActiveTab] = useState<string>('stationeries');
  const [isBoxLimitsDrawerOpen, setIsBoxLimitsDrawerOpen] = useState(false);
  const [isKitbagLimitsDrawerOpen, setIsKitbagLimitsDrawerOpen] = useState(false);
  const [allLabels, setAllLabels] = useState<LabelItem[]>([]);
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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
      const summary = await fetchMasterSummaryById(id);
      if (summary) {
        setMasterSummary(summary);
        const { data: stationeryData } = await supabase
          .from('stationeries')
          .select('*')
          .eq('mid', summary.id)
          .single();
        setStationery(stationeryData as Stationery | null);

        const categories = getCategoriesForExam(summary.Code);
        if (categories.length > 0 && !categories.some(cat => cat.id === activeTab)) {
          setActiveTab(categories[0].id);
        }

        const tableName = ['FTNA', 'CSEE', 'ACSEE'].includes(summary.Code) ? 'secondarymastersummaries' : 'primarymastersummary';
        const { data: regs } = await supabase
          .from(tableName)
          .select('region')
          .eq('mid', summary.id)
          .eq('is_latest', true);
        if (regs) {
          const distinct = Array.from(new Set(regs.map((r: any) => r.region).filter(Boolean))).sort((a, b) => a.localeCompare(b));
          setRegions(distinct);
        }
      }
    } catch (error: any) {
      showError(error.message || "Failed to load details.");
    } finally {
      setLoading(false);
    }
  }, [masterSummaryId, activeTab]);

  const loadAllLabels = useCallback(async () => {
    if (!masterSummary) return;
    setLoading(true);
    try {
      const dbCategory = categoryQueryMap[activeTab] || activeTab;
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('mid', masterSummary.id)
        .eq('category', dbCategory)
        .order('region', { ascending: true })
        .order('district', { ascending: true })
        .order('center_number', { ascending: true });
      if (error) throw error;
      setAllLabels(data as LabelItem[]);
    } catch (err: any) {
      showError("Failed to load labels");
    } finally {
      setLoading(false);
    }
  }, [masterSummary, activeTab]);

  const filteredLabels = useMemo(() => {
    let filtered = [...allLabels];
    if (selectedRegion !== 'All') filtered = filtered.filter(label => label.region === selectedRegion);
    if (debouncedSearchTerm) {
      filtered = filtered.filter(label =>
        label.center_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        label.center_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        label.district.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [allLabels, selectedRegion, debouncedSearchTerm]);

  const totalPages = Math.ceil(filteredLabels.length / itemsPerPage);
  const currentLabels = filteredLabels.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    loadMasterSummaryAndStationery();
  }, [loadMasterSummaryAndStationery]);

  useEffect(() => {
    loadAllLabels();
  }, [loadAllLabels]);

  const handleCreateLabels = async () => {
    if (!masterSummary || !stationery?.id) return;
    setIsGeneratingLabels(true);
    try {
      let data: any, error: any;
      if (activeTab === 'stationeries') {
        const boxLimits = await fetchBoxLimitsSettings(stationery.id);
        if (!boxLimits) {
          showError("Box limits not defined.");
          setIsGeneratingLabels(false);
          return;
        }
        ({ data, error } = await supabase.functions.invoke('pack-stationery-labels', {
          body: { masterSummaryId: masterSummary.id, stationeryId: stationery.id, examCode: masterSummary.Code, activeTab, region: selectedRegion !== 'All' ? selectedRegion : null },
        }));
      } else if (activeTab === 'district_stationeries') {
        ({ data, error } = await supabase.functions.invoke('pack-district-stationeries', {
          body: { masterSummaryId: masterSummary.id, stationeryId: stationery.id, examCode: masterSummary.Code, region: selectedRegion !== 'All' ? selectedRegion : null },
        }));
      } else if (['arabic_booklets', 'ict_covers', 'fine_arts_booklets'].includes(activeTab)) {
        const categoryMap: Record<string, string> = { arabic_booklets: 'Arabic Booklets', ict_covers: 'ICT Covers', fine_arts_booklets: 'Fine Arts Booklets' };
        ({ data, error } = await supabase.functions.invoke('pack-subject-category-labels', {
          body: { masterSummaryId: masterSummary.id, stationeryId: stationery.id, examCode: masterSummary.Code, category: categoryMap[activeTab], region: selectedRegion !== 'All' ? selectedRegion : null },
        }));
      } else if (activeTab === 'braille_stationeries') {
        ({ data, error } = await supabase.functions.invoke('pack-braille-sheets', {
          body: { masterSummaryId: masterSummary.id, stationeryId: stationery.id, examCode: masterSummary.Code, category: 'Braille Stationeries', region: selectedRegion !== 'All' ? selectedRegion : null },
        }));
      } else if (activeTab === 'kitbags') {
        ({ data, error } = await supabase.functions.invoke('pack-kitbag-labels', {
          body: { masterSummaryId: masterSummary.id, stationeryId: stationery.id, examCode: masterSummary.Code, region: selectedRegion !== 'All' ? selectedRegion : null },
        }));
      }

      if (error) throw error;
      showSuccess("Labels generated successfully!");
      loadAllLabels();
    } catch (error: any) {
      showError(error.message || "Failed to generate labels.");
    } finally {
      setIsGeneratingLabels(false);
    }
  };

  const handleResetLabels = async () => {
    if (!masterSummary) return;
    setIsGeneratingLabels(true);
    try {
      const dbCategory = categoryQueryMap[activeTab] || activeTab;
      const query = supabase.from('labels').delete().eq('mid', masterSummary.id).eq('category', dbCategory);
      if (selectedRegion !== 'All') query.eq('region', selectedRegion);
      await query;
      setAllLabels([]);
      showSuccess("Labels reset successfully!");
    } catch (error: any) {
      showError("Failed to reset labels.");
    } finally {
      setIsGeneratingLabels(false);
    }
  };

  const getTableColumns = useMemo(() => {
    const baseColumns = [
      { header: 'Region', accessor: 'region', width: 'w-[12%]' },
      { header: 'District', accessor: 'district', width: 'w-[12%]' },
      { header: 'Center No.', accessor: 'center_number', width: 'w-[10%]' },
      { header: 'Center Name', accessor: 'center_name', width: 'w-[20%]', render: (label: LabelItem) => abbreviateSchoolName(label.center_name) },
    ];

    if (activeTab === 'stationeries') {
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
    return baseColumns;
  }, [activeTab]);

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Spinner label="Loading labels..." /></div>;

  return (
    <div className="container mx-auto py-4 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Labels Management</h1>
          <p className="text-gray-600 mt-1 font-extrabold">{masterSummary?.Code}-{masterSummary?.Year}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Select region" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Regions</SelectItem>
              {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => navigate('/dashboard/stationeries')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 bg-white border rounded-xl p-1">
          {getCategoriesForExam(masterSummary?.Code).map(cat => (
            <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium">
              <cat.icon className="h-4 w-4" /> {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {getCategoriesForExam(masterSummary?.Code).map(cat => (
          <TabsContent key={cat.id} value={cat.id} className="mt-6">
            <Card className="border-t-4 border-blue-600 shadow-xl rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50">
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2"><cat.icon className="h-6 w-6 text-blue-600" /> {cat.name} Labels</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {cat.id === 'stationeries' && stationery && (
                    <Button variant="outline" onClick={() => setIsBoxLimitsDrawerOpen(true)} className="bg-blue-50 text-blue-600"><Settings className="h-4 w-4 mr-2" /> Box Limits</Button>
                  )}
                  {cat.id === 'kitbags' && stationery && (
                    <Button variant="outline" onClick={() => setIsKitbagLimitsDrawerOpen(true)} className="bg-green-50 text-green-600"><Settings className="h-4 w-4 mr-2" /> Kitbag Limits</Button>
                  )}
                  <Button onClick={handleCreateLabels} disabled={isGeneratingLabels}>{isGeneratingLabels ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />} Create Labels</Button>
                  <Button variant="destructive" onClick={handleResetLabels}><RotateCcw className="h-4 w-4 mr-2" /> Reset</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-md" />
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        {getTableColumns.map((col, i) => <TableHead key={i} className={col.width}>{col.header}</TableHead>)}
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentLabels.map((label, i) => (
                        <TableRow key={i}>
                          {getTableColumns.map((col, j) => <TableCell key={j}>{col.render ? col.render(label) : (label as any)[col.accessor]}</TableCell>)}
                          <TableCell className="text-right"><Button variant="ghost" size="icon"><Printer className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {stationery && masterSummary?.Code && (
        <>
          <BoxLimitsDrawer open={isBoxLimitsDrawerOpen} onOpenChange={setIsBoxLimitsDrawerOpen} stationery={stationery} onSuccess={() => {}} examCode={masterSummary.Code} />
          <KitbagLimitsDrawer open={isKitbagLimitsDrawerOpen} onOpenChange={setIsKitbagLimitsDrawerOpen} stationery={stationery} onSuccess={() => {}} examCode={masterSummary.Code} />
        </>
      )}
    </div>
  );
};

export default LabelsManagementPage;