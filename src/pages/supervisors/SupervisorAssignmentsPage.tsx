"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UserCheck, Search, RotateCcw, RefreshCw, Building2, Users, Layers, UserPlus, AlertTriangle
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectValue, SelectTrigger,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";
import ReassignSupervisorModal from "@/components/supervisors/ReassignSupervisorModal";
import abbreviateSchoolName from "@/utils/abbreviateSchoolName";

const UALIMU_CODES = ["GATCE", "DSEE", "GATSCCE", "DPEE", "DSPEE", "DPPEE"];

const EXCLUDED_REGIONS = [
  "KASKAZINI PEMBA",
  "KUSINI PEMBA",
  "KASKAZINI UNGUJA",
  "KUSINI UNGUJA",
  "MJINI MAGHARIBI"
];

const SupervisorAssignmentsPage = () => {
  const { id } = useParams(); 
  const [allData, setAllData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [search, setSearch] = useState('');
  const [summaryInfo, setSummaryInfo] = useState({ code: '', year: '', mid: null as any, isUalimu: false });
  
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  
  const [reassignModal, setReassignModal] = useState({ open: false, assignment: null as any });
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

      const code = supervision.mastersummaries.Code;
      const isUalimu = UALIMU_CODES.includes(code);

      setSummaryInfo({
        code: isUalimu ? 'UALIMU' : code,
        year: supervision.mastersummaries.Year || '',
        mid: supervision.mid,
        isUalimu
      });

      let centersWithRequirements: any[] = [];
      
      if (isUalimu) {
        const { data: ualimuMasters } = await supabase
          .from('mastersummaries')
          .select('id')
          .in('Code', UALIMU_CODES)
          .eq('Year', supervision.mastersummaries.Year)
          .eq('is_latest', true);
        
        const mids = ualimuMasters?.map(m => m.id) || [];
        const { data: ualimuCenters } = await supabase
          .from('ualimumastersummary')
          .select('*')
          .in('mid', mids)
          .eq('is_latest', 1);
        
        const centerMap = new Map();
        ualimuCenters?.forEach(c => {
          const key = c.center_number;
          const subjectValues = Object.entries(c)
            .filter(([k, v]) => !['id','mid','region','district','center_name','center_number','is_latest','version','created_at'].includes(k) && typeof v === 'number')
            .map(([, v]) => Number(v) || 0);
          const maxStudents = subjectValues.length > 0 ? Math.max(...subjectValues) : 0;
          
          if (!centerMap.has(key)) {
            centerMap.set(key, { ...c, totalStudents: maxStudents });
          } else {
            const existing = centerMap.get(key);
            existing.totalStudents += maxStudents;
          }
        });

        centersWithRequirements = Array.from(centerMap.values())
          .filter(c => !EXCLUDED_REGIONS.includes(c.region?.toUpperCase()))
          .map(c => {
            const streams = Math.ceil(c.totalStudents / 40);
            const required = Math.ceil(streams / 10) || 1;
            return { ...c, required, streams, center_number: c.center_number, center_name: c.center_name };
          });
      } else {
        const centersTableMap: Record<string, string> = {
          'SFNA': 'primarymastersummary', 'SSNA': 'primarymastersummary', 'PSLE': 'primarymastersummary',
          'FTNA': 'secondarymastersummaries', 'CSEE': 'secondarymastersummaries', 'ACSEE': 'secondarymastersummaries',
          'DPNE': 'dpnemastersummary'
        };
        const centersTable = centersTableMap[code?.toUpperCase() || ''];
        const { data: cData } = await supabase
          .from(centersTable)
          .select('region, district, center_number, center_name')
          .eq('mid', supervision.mid)
          .eq('is_latest', 1);
        
        centersWithRequirements = (cData || [])
          .filter(c => !EXCLUDED_REGIONS.includes(c.region?.toUpperCase()))
          .map(c => ({ ...c, required: 1, streams: 0 }));
      }

      const { data: assignmentsFromDb } = await supabase
        .from('supervisorassignments')
        .select('*')
        .eq('supervision_id', id);

      const workstationCenterNos = [...new Set((assignmentsFromDb || [])
        .map(a => a.workstation?.split('-')[0]?.trim().toUpperCase())
        .filter(Boolean)
      )];

      const workstationNameMap: Record<string, string> = {};
      if (workstationCenterNos.length > 0) {
        const [secRes, tcRes, priRes] = await Promise.all([
          supabase.from('secondaryschools').select('center_no, name').in('center_no', workstationCenterNos),
          supabase.from('teacherscolleges').select('center_no, name').in('center_no', workstationCenterNos),
          supabase.from('primaryschools').select('center_no, name').in('center_no', workstationCenterNos)
        ]);
        secRes.data?.forEach(r => { if (r.center_no) workstationNameMap[r.center_no.trim().toUpperCase()] = r.name; });
        tcRes.data?.forEach(r => { if (r.center_no) workstationNameMap[r.center_no.trim().toUpperCase()] = r.name; });
        priRes.data?.forEach(r => { if (r.center_no) workstationNameMap[r.center_no.trim().toUpperCase()] = r.name; });
      }

      const formatWorkstation = (ws: string) => {
        if (!ws) return '—';
        const centerNo = ws.split('-')[0]?.trim().toUpperCase();
        const name = workstationNameMap[centerNo];
        return name ? `${centerNo} - ${abbreviateSchoolName(name)}` : ws;
      };

      const allRegions = [...new Set([
        ...centersWithRequirements.map(c => c.region?.trim()),
        ...(assignmentsFromDb || [])
          .filter(a => !EXCLUDED_REGIONS.includes(a.region?.toUpperCase()))
          .map(a => a.region?.trim())
      ].filter(Boolean))].sort();
      setRegions(allRegions);

      const centerRows: any[] = [];
      centersWithRequirements.forEach(c => {
        const centerAssignments = assignmentsFromDb?.filter(a => a.center_no === c.center_number) || [];
        
        for (let i = 0; i < c.required; i++) {
          const assign = centerAssignments[i];
          const startStream = (i * 10) + 1;
          const endStream = Math.min((i + 1) * 10, c.streams);
          
          centerRows.push({
            id: `center-${c.center_number}-${i}`,
            center_no: c.center_number,
            region: c.region?.trim() || 'N/A',
            district: c.district?.trim() || 'N/A',
            location: `${c.center_number} - ${abbreviateSchoolName(c.center_name || '')}`,
            supervisor: assign?.supervisor_name || 'VACANT SLOT',
            workstation: assign ? formatWorkstation(assign.workstation) : '—',
            phone: assign?.phone || '—',
            assignment_id: assign?.assignment_id || null,
            is_assigned: !!assign,
            isPlaceholder: !assign,
            slot: i + 1,
            total_slots: c.required,
            streams: c.streams,
            stream_range: isUalimu ? `${startStream}-${endStream}` : null
          });
        }
      });

      const sortedCenterRows = centerRows.sort((a, b) => {
        const regionCompare = a.region.localeCompare(b.region);
        if (regionCompare !== 0) return regionCompare;
        const districtCompare = a.district.localeCompare(b.district);
        if (districtCompare !== 0) return districtCompare;
        return a.center_no.localeCompare(b.center_no);
      });

      const reserveRows = (assignmentsFromDb || [])
        .filter(a => a.center_no === 'RESERVE' && !EXCLUDED_REGIONS.includes(a.region?.toUpperCase()))
        .map((r) => ({
          id: `reserve-${r.assignment_id}`,
          center_no: 'RESERVE',
          region: r.region?.trim() || 'N/A',
          district: r.district?.trim() || 'N/A',
          location: `RESERVE`,
          supervisor: r.supervisor_name || '—',
          workstation: formatWorkstation(r.workstation),
          phone: r.phone || '—',
          assignment_id: r.assignment_id,
          is_assigned: true,
          isPlaceholder: false,
          slot: 1,
          total_slots: 1,
          streams: 0,
          stream_range: null
        }));

      setAllData([...sortedCenterRows, ...reserveRows]);
    } catch (err: any) {
      showError(err.message || "Failed to load assignments");
    }
  };

  const handleAssignClick = () => {
    const hasExisting = allData.some(a => a.is_assigned && 
      (selectedRegion === 'all' || a.region === selectedRegion) &&
      (selectedDistrict === 'all' || a.district === selectedDistrict)
    );
    if (hasExisting) setDialogConfig({ open: true, type: 'assign' });
    else executeAssignment();
  };

  const executeAssignment = async () => {
    setDialogConfig(prev => ({ ...prev, open: false }));
    setIsProcessing(true);
    try {
      const payload = {
        supervision_id: id,
        code: summaryInfo.isUalimu ? 'UALIMU' : summaryInfo.code,
        year: summaryInfo.year,
        regions: selectedRegion !== 'all' ? [selectedRegion] : [],
        districts: selectedDistrict !== 'all' ? [selectedDistrict] : [],
        assigned_by: "system_admin"
      };
      const { data, error } = await supabase.functions.invoke('assign-supervisors', { body: payload });
      if (error) throw error;
      if (data?.success === false) showError(data.error || "Assignment failed");
      else {
        showSuccess(data.message || "Assignments generated successfully!");
        setTimeout(fetchAssignments, 1000);
      }
    } catch (err: any) {
      showError(err.message || "Assignment failed");
    } finally {
      setIsProcessing(false);
    }
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
      showSuccess("Assignments cleared");
      if (dialogConfig.type === 'assign') executeAssignment();
      else await fetchAssignments();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const availableDistricts = useMemo(() => {
    if (selectedRegion === 'all') return [];
    return [...new Set(allData.filter(item => item.region === selectedRegion).map(item => item.district))].sort();
  }, [allData, selectedRegion]);

  const filteredData = useMemo(() => {
    return allData.filter(item => {
      const searchStr = search.toLowerCase();
      const matchesSearch = item.location.toLowerCase().includes(searchStr) ||
        item.supervisor.toLowerCase().includes(searchStr) ||
        item.phone.toLowerCase().includes(searchStr) ||
        item.workstation.toLowerCase().includes(searchStr);
      const matchesRegion = selectedRegion === 'all' || item.region === selectedRegion;
      const matchesDistrict = selectedDistrict === 'all' || item.district === selectedDistrict;
      return matchesSearch && matchesRegion && matchesDistrict;
    });
  }, [allData, search, selectedRegion, selectedDistrict]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      <Card className="w-full relative min-h-[600px] border-none shadow-sm">
        {(loading || isResetting) && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80">
            <Spinner size="lg" label={isResetting ? "Clearing..." : "Loading..."} />
          </div>
        )}

        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 pb-6 border-b mb-4">
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
              Supervision Assignments
            </CardTitle>
            <div className="flex items-center gap-4 mt-1">
              <Badge variant="outline" className={cn(
                "text-[10px] font-black uppercase tracking-widest px-3 py-1",
                summaryInfo.isUalimu ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-50 text-slate-500 border-slate-200"
              )}>
                {summaryInfo.code || '—'}
              </Badge>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <p className="text-[10px] font-bold text-slate-600 tracking-[0.2em] uppercase">
                {summaryInfo.year || '—'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedRegion} onValueChange={(val) => { setSelectedRegion(val); setSelectedDistrict('all'); setCurrentPage(1); }}>
              <SelectTrigger className="w-[150px] h-9 text-[10px] font-black uppercase">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedDistrict} onValueChange={(val) => { setSelectedDistrict(val); setCurrentPage(1); }} disabled={selectedRegion === 'all'}>
              <SelectTrigger className="w-[150px] h-9 text-[10px] font-black uppercase">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {availableDistricts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button 
              size="sm" 
              className="bg-slate-900 hover:bg-black text-[10px] font-black uppercase tracking-wider rounded-lg h-9"
              onClick={handleAssignClick}
              disabled={isProcessing || loading}
            >
              {isProcessing ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5 mr-1.5" />}
              Auto-Assign
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              className="border-2 border-slate-200 text-slate-600 hover:border-red-600 hover:text-red-600 text-[10px] font-black uppercase tracking-wider rounded-lg h-9 px-4 transition-all"
              onClick={() => setDialogConfig({ open: true, type: 'reset' })}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search location, supervisor, phone..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-9 h-10 text-sm border-slate-200 focus:ring-slate-100"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
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
                {currentData.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      No assignments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((item, index) => (
                    <TableRow key={item.id} className={cn(
                      "hover:bg-slate-50/30 border-b border-slate-100 transition-colors",
                      item.isPlaceholder && "bg-slate-50/50 italic"
                    )}>
                      <TableCell className="text-slate-400 text-xs font-mono">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 font-medium">{item.region}</TableCell>
                      <TableCell className="text-sm text-slate-600 font-medium">{item.district}</TableCell>
                      <TableCell className="text-sm font-medium">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            {item.location}
                          </div>
                          {item.total_slots > 1 && (
                            <div className="flex items-center gap-2 ml-5">
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bold bg-slate-50 text-slate-500 border-slate-200">
                                SLOT {item.slot}/{item.total_slots}
                              </Badge>
                              {item.stream_range && (
                                <span className="text-[9px] text-indigo-600 font-black flex items-center gap-1 uppercase">
                                  <Layers className="h-2.5 w-2.5" /> STREAMS {item.stream_range}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        "text-sm",
                        item.isPlaceholder ? "text-slate-400 font-bold" : "text-slate-800 font-medium"
                      )}>
                        {item.supervisor}
                      </TableCell>
                      <TableCell className="text-sm text-indigo-600 font-medium font-mono">{item.workstation}</TableCell>
                      <TableCell className="text-sm text-slate-600 font-medium">{item.phone}</TableCell>
                      <TableCell className="text-right px-6">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={cn(
                            "h-8 w-8 p-0 rounded-lg transition-all",
                            item.isPlaceholder ? "border-indigo-200 text-indigo-600 hover:bg-indigo-50" : "border-slate-200 hover:border-slate-900"
                          )}
                          onClick={() => setReassignModal({ open: true, assignment: item })}
                        >
                          {item.isPlaceholder ? <UserPlus className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={dialogConfig.open} onOpenChange={(val) => setDialogConfig({ ...dialogConfig, open: val })}>
        <AlertDialogContent className="max-w-[420px] rounded-2xl border border-slate-200 shadow-2xl p-6 z-[100]">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mb-4", dialogConfig.type === 'assign' ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600')}>
                {dialogConfig.type === 'assign' ? <RefreshCw className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
              </div>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-slate-900">
                {dialogConfig.type === 'assign' ? 'Existing Assignments Found' : 'Clear Assignments?'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
              {dialogConfig.type === 'assign' ? `Assignments already exist. Clear them first to generate a new set.` : `This will permanently delete all supervisor assignments for the selected area.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row items-center gap-3 mt-6">
            <AlertDialogCancel className="flex-1 h-11 font-bold uppercase text-[10px] tracking-widest rounded-xl mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeReset} className={cn("flex-[1.5] h-11 font-black uppercase text-[10px] tracking-widest rounded-xl text-white", dialogConfig.type === 'assign' ? "bg-indigo-600 hover:bg-indigo-700" : "bg-red-600 hover:bg-red-700")}>
              Confirm Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReassignSupervisorModal 
        isOpen={reassignModal.open}
        onClose={() => setReassignModal({ open: false, assignment: null })}
        currentAssignment={reassignModal.assignment}
        supervisionId={id!}
        examCode={summaryInfo.code}
        examYear={summaryInfo.year}
        onAssignmentUpdated={fetchAssignments}
      />
    </div>
  );
};

export default SupervisorAssignmentsPage;