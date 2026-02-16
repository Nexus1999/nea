"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UserCheck, 
  Download,
  Search,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Users
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";
import ReassignSupervisorModal from "@/components/supervisors/ReassignSupervisorModal";
import { SupervisorDetailsDrawer } from "@/components/supervisors/SupervisorsProfile";
import abbreviateSchoolName from "@/utils/abbreviateSchoolName";

const SupervisorAssignmentsPage = () => {
  const { id } = useParams(); 
  const [assignments, setAssignments] = useState<any[]>([]);
  const [reserves, setReserves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [summaryInfo, setSummaryInfo] = useState({ code: '', year: '' });
  
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [dialogConfig, setDialogConfig] = useState({ open: false, type: 'assign' as 'assign' | 'reset' });

  useEffect(() => {
    document.title = "Supervisor Assignments | NEAS";
    if (id) fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await fetchAssignments();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data: supervision, error: supError } = await supabase
        .from('supervisions')
        .select(`id, mid, mastersummaries ( Code, Year )`)
        .eq('id', id)
        .single();

      if (supError) throw supError;
      if (!supervision) return;

      setSummaryInfo({
        code: supervision.mastersummaries.Code || '',
        year: supervision.mastersummaries.Year || ''
      });

      const centersTableMap: Record<string, string> = {
        'SFNA': 'primarymastersummary', 'SSNA': 'primarymastersummary', 'PSLE': 'primarymastersummary',
        'FTNA': 'secondarymastersummaries', 'CSEE': 'secondarymastersummaries', 'ACSEE': 'secondarymastersummaries',
        'DPEE': 'dpeemastersummary', 'DPNE': 'dpnemastersummary'
      };
      
      const centersTable = centersTableMap[supervision.mastersummaries.Code?.toUpperCase() || ''];
      if (!centersTable) throw new Error(`Unsupported exam code`);

      const [centersRes, assignmentsRes] = await Promise.all([
        supabase.from(centersTable).select('region, district, center_number, center_name').eq('mid', supervision.mid).eq('is_latest', 1),
        supabase.from('supervisorassignments').select('*').eq('supervision_id', id)
      ]);

      if (centersRes.error) throw centersRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      const centers = centersRes.data || [];
      const allAssignments = assignmentsRes.data || [];

      const uniqueRegions = [...new Set(centers.map(c => c.region))].sort();
      setRegions(uniqueRegions);

      // Separate main assignments and reserves
      const mainAssignments = allAssignments.filter(a => a.is_reserve === false);
      const reserveAssignments = allAssignments.filter(a => a.is_reserve === true);

      // Format Main Assignments
      const formattedMain = centers.map((c) => {
        const assign = mainAssignments.find(a => a.center_no === c.center_number);
        return {
          sn_id: c.center_number,
          region: c.region,
          district: c.district,
          center_full: `${c.center_number} - ${abbreviateSchoolName(c.center_name || '')}`,
          supervisor: assign?.supervisor_name || 'PENDING',
          workstation: assign?.workstation || '—',
          phone: assign?.phone || '—',
          assignment_id: assign?.id || null,
          is_assigned: !!assign
        };
      });

      // Format Reserves
      const formattedReserves = reserveAssignments.map((r, i) => ({
        sn_id: `res-${i}`,
        region: r.region,
        district: r.district,
        supervisor: r.supervisor_name,
        workstation: r.workstation,
        phone: r.phone,
        assignment_id: r.id
      }));

      setAssignments(formattedMain);
      setReserves(formattedReserves);

    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleAssignClick = () => {
    // Check if assignments already exist for the selected criteria
    const hasExisting = assignments.some(a => 
      a.is_assigned && 
      (selectedRegion === 'all' || a.region === selectedRegion) &&
      (selectedDistrict === 'all' || a.district === selectedDistrict)
    );

    if (hasExisting) {
      setDialogConfig({ open: true, type: 'assign' });
    } else {
      executeAssignment();
    }
  };

  const executeAssignment = async () => {
    setDialogConfig(prev => ({ ...prev, open: false }));
    setIsProcessing(true);
    try {
      const payload = {
        supervision_id: Number(id),
        code: summaryInfo.code,
        year: summaryInfo.year,
        regions: selectedRegion !== 'all' ? [selectedRegion] : [],
        districts: selectedDistrict !== 'all' ? [selectedDistrict] : [],
        assigned_by: "system_admin"
      };

      const { data, error } = await supabase.functions.invoke('assign-supervisors', { body: payload });
      if (error) throw error;

      if (data?.success === false) {
        showError(data.error || "Assignment failed");
      } else {
        showSuccess(data.message || "Assignments generated successfully!");
        await fetchAssignments();
      }
    } catch (err: any) {
      showError(err.message || "Assignment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetClick = () => {
    setDialogConfig({ open: true, type: 'reset' });
  };

  const executeReset = async () => {
    setDialogConfig(prev => ({ ...prev, open: false }));
    setIsResetting(true);
    try {
      let query = supabase.from('supervisorassignments').delete().eq('supervision_id', id);
      
      if (selectedRegion !== 'all') query = query.eq('region', selectedRegion);
      if (selectedDistrict !== 'all') query = query.eq('district', selectedDistrict);

      const { error } = await query;
      if (error) throw error;

      showSuccess("Assignments cleared for selected criteria");
      await fetchAssignments();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedRegion('all');
    setSelectedDistrict('all');
    setSearch('');
    setCurrentPage(1);
  };

  const availableDistricts = useMemo(() => {
    if (selectedRegion === 'all') return [];
    const filteredDistricts = assignments
      .filter(item => item.region === selectedRegion)
      .map(item => item.district);
    return [...new Set(filteredDistricts)].sort();
  }, [assignments, selectedRegion]);

  const filteredData = useMemo(() => {
    return assignments.filter(item => {
      const searchStr = search.toLowerCase();
      const matchesSearch = 
        item.center_full.toLowerCase().includes(searchStr) ||
        item.supervisor.toLowerCase().includes(searchStr) ||
        item.phone.toLowerCase().includes(searchStr) ||
        item.workstation.toLowerCase().includes(searchStr);

      const matchesRegion = selectedRegion === 'all' || item.region === selectedRegion;
      const matchesDistrict = selectedDistrict === 'all' || item.district === selectedDistrict;
      return matchesSearch && matchesRegion && matchesDistrict;
    });
  }, [assignments, search, selectedRegion, selectedDistrict]);

  const filteredReserves = useMemo(() => {
    return reserves.filter(item => {
      const matchesRegion = selectedRegion === 'all' || item.region === selectedRegion;
      const matchesDistrict = selectedDistrict === 'all' || item.district === selectedDistrict;
      return matchesRegion && matchesDistrict;
    });
  }, [reserves, selectedRegion, selectedDistrict]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      <Card className="w-full relative min-h-[600px] border-none shadow-sm">
        {(loading || isResetting) && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
            <Spinner label={isResetting ? "Clearing data..." : "Syncing assignments..."} size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 pb-6 border-b">
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Supervision Assignments</CardTitle>
            <p className="text-[10px] font-bold text-indigo-600 tracking-[0.2em] uppercase mt-1">
              {summaryInfo.code} — {summaryInfo.year}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedRegion} onValueChange={(val) => { setSelectedRegion(val); setSelectedDistrict('all'); setCurrentPage(1); }}>
              <SelectTrigger className="w-[150px] h-9 text-[10px] font-bold uppercase">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedDistrict} onValueChange={(val) => { setSelectedDistrict(val); setCurrentPage(1); }} disabled={selectedRegion === 'all'}>
              <SelectTrigger className="w-[150px] h-9 text-[10px] font-bold uppercase">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {availableDistricts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button size="sm" className="bg-slate-900 hover:bg-black text-[10px] font-black uppercase tracking-wider h-9" onClick={handleAssignClick} disabled={isProcessing || loading}>
              {isProcessing ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5 mr-1.5" />}
              Assign
            </Button>

            <Button variant="outline" size="sm" className="border-2 border-slate-200 text-slate-600 hover:border-red-600 hover:text-red-600 text-[10px] font-black uppercase tracking-wider h-9 px-4" onClick={handleResetClick}>
               <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <Tabs defaultValue="main" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="main" className="rounded-lg text-[10px] font-black uppercase px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Main Assignments ({filteredData.length})
                </TabsTrigger>
                <TabsTrigger value="reserves" className="rounded-lg text-[10px] font-black uppercase px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Reserves ({filteredReserves.length})
                </TabsTrigger>
              </TabsList>

              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-9 h-9 text-xs border-slate-200" />
              </div>
            </div>

            <TabsContent value="main" className="mt-0">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-b border-slate-200">
                      <TableHead className="w-[60px] text-[10px] font-black uppercase text-slate-500">SN</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Region</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">District</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Center</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Supervisor</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Workstation</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Phone</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 px-6">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.map((item, index) => (
                      <TableRow key={item.sn_id} className="hover:bg-slate-50/30 border-b border-slate-100 transition-colors">
                        <TableCell className="text-slate-400 text-xs font-mono">{((currentPage - 1) * itemsPerPage) + index + 1}</TableCell>
                        <TableCell className="text-[11px] font-medium uppercase text-slate-600">{item.region}</TableCell>
                        <TableCell className="text-[11px] uppercase text-slate-600">{item.district}</TableCell>
                        <TableCell className="text-[11px] font-bold text-slate-800">{item.center_full}</TableCell>
                        <TableCell>
                          <span className={cn("text-xs font-bold", !item.is_assigned ? "text-orange-500 italic" : "text-slate-900")}>
                            {item.supervisor}
                          </span>
                        </TableCell>
                        <TableCell className="text-[11px] font-mono text-indigo-600 font-semibold">{item.workstation}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-600">{item.phone}</TableCell>
                        <TableCell className="text-right px-6">
                          {item.is_assigned && (
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg border-slate-200 hover:border-slate-900" onClick={() => {
                              setSelectedAssignment(item);
                              setIsReassignModalOpen(true);
                            }}>
                              <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && <div className="mt-6 flex justify-center"><PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>}
            </TabsContent>

            <TabsContent value="reserves" className="mt-0">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent border-b border-slate-200">
                      <TableHead className="w-[60px] text-[10px] font-black uppercase text-slate-500">SN</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Region</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">District</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Supervisor</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Workstation</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReserves.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-20 text-slate-400 text-[10px] font-bold uppercase tracking-widest">No reserve supervisors found.</TableCell></TableRow>
                    ) : (
                      filteredReserves.map((item, index) => (
                        <TableRow key={item.sn_id} className="hover:bg-slate-50/30 border-b border-slate-100 transition-colors">
                          <TableCell className="text-slate-400 text-xs font-mono">{index + 1}</TableCell>
                          <TableCell className="text-[11px] font-medium uppercase text-slate-600">{item.region}</TableCell>
                          <TableCell className="text-[11px] uppercase text-slate-600">{item.district}</TableCell>
                          <TableCell className="text-xs font-bold text-slate-900">{item.supervisor}</TableCell>
                          <TableCell className="text-[11px] font-mono text-indigo-600 font-semibold">{item.workstation}</TableCell>
                          <TableCell className="text-xs font-mono text-slate-600">{item.phone}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={dialogConfig.open} onOpenChange={(val) => setDialogConfig({ ...dialogConfig, open: val })}>
        <AlertDialogContent className="max-w-[420px] rounded-2xl border border-slate-200 shadow-2xl p-6">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mb-4", dialogConfig.type === 'assign' ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600')}>
                {dialogConfig.type === 'assign' ? <ShieldAlert className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
              </div>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-slate-900">
                {dialogConfig.type === 'assign' ? 'Existing Assignments' : 'Clear Assignments?'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
              {dialogConfig.type === 'assign' 
                ? `Assignments already exist for the selected criteria. To generate new ones, you must clear the current list first.` 
                : `This will permanently remove all supervisor assignments for the selected Region/District.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row items-center gap-3 mt-6">
            <AlertDialogCancel className="flex-1 h-11 font-bold uppercase text-[10px] tracking-widest rounded-xl mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={dialogConfig.type === 'assign' ? executeReset : executeReset} className={cn("flex-[1.5] h-11 font-black uppercase text-[10px] tracking-widest rounded-xl text-white", dialogConfig.type === 'assign' ? "bg-indigo-600 hover:bg-indigo-700" : "bg-red-600 hover:bg-red-700")}>
              Confirm Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReassignSupervisorModal 
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        currentAssignment={selectedAssignment}
        supervisionId={id!}
        onAssignmentUpdated={fetchAssignments}
      />
    </div>
  );
};

export default SupervisorAssignmentsPage;