"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UserCheck, 
  Download,
  Search,
  FilterX,
  RotateCcw,
  RefreshCw,
  Eraser,
  Printer
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
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";
import EditSupervisorDrawer from "@/components/supervisors/EditSupervisorDrawer";
import { SupervisorDetailsDrawer } from "@/components/supervisors/SupervisorsProfile";
import abbreviateSchoolName from "@/utils/abbreviateSchoolName";

const SupervisorAssignmentsPage = () => {
  const { id } = useParams(); 
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [summaryInfo, setSummaryInfo] = useState({ code: '', year: '' });
  
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    console.log("🛠️ Component Mounted. ID from URL:", id);
    document.title = "Supervisor Assignments | NEAS";
    if (id) {
        fetchInitialData();
    } else {
        console.error("❌ No ID found in URL parameters. fetchInitialData skipped.");
        setLoading(false);
    }
  }, [id]);

  const fetchInitialData = async () => {
    console.log("🔄 Starting fetchInitialData...");
    setLoading(true);
    try {
        await fetchAssignments();
    } catch (err) {
        console.error("❌ Error in fetchInitialData:", err);
    } finally {
        console.log("🏁 fetchInitialData completed.");
        setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    console.log("📡 fetchAssignments: Fetching supervision metadata for ID:", id);
    try {
      // 1. Get supervision meta data
      const { data: supervision, error: supError } = await supabase
        .from('supervisions')
        .select(`id, mid, mastersummaries ( Code, Year )`)
        .eq('id', id)
        .single();

      if (supError) {
          console.error("❌ Supabase fetch supervision error:", supError);
          throw supError;
      }

      if (!supervision || !supervision.mastersummaries) {
        console.warn("⚠️ No supervision metadata found in database.");
        return; 
      }

      console.log("✅ Supervision Metadata found:", supervision);

      setSummaryInfo({
        code: supervision.mastersummaries.Code || '',
        year: supervision.mastersummaries.Year || ''
      });

      // 2. Identify the correct centers table
      const centersTableMap = {
        'SFNA': 'primarymastersummary', 'SSNA': 'primarymastersummary', 'PSLE': 'primarymastersummary',
        'FTNA': 'secondarymastersummaries', 'CSEE': 'secondarymastersummaries', 'ACSEE': 'secondarymastersummaries',
        'DPEE': 'dpeemastersummary', 'DPNE': 'dpnemastersummary'
      };
      
      const rawCode = supervision.mastersummaries.Code?.toUpperCase();
      const centersTable = centersTableMap[rawCode];
      
      if (!centersTable) {
          console.error(`❌ Table mapping failed. Code "${rawCode}" not found in map.`);
          throw new Error(`Unsupported exam code: ${rawCode}`);
      }

      console.log(`📡 Fetching from table: ${centersTable} for MID: ${supervision.mid}`);

      // 3. Fetch Centers and Existing Assignments in Parallel
      const [centersRes, assignmentsRes] = await Promise.all([
        supabase.from(centersTable).select('region, district, center_number, center_name').eq('mid', supervision.mid).eq('is_latest', 1),
        supabase.from('supervisorassignments').select('*').eq('supervision_id', id)
      ]);

      if (centersRes.error) {
          console.error("❌ Error fetching centers:", centersRes.error);
          throw centersRes.error;
      }
      if (assignmentsRes.error) {
          console.error("❌ Error fetching existing assignments:", assignmentsRes.error);
          throw assignmentsRes.error;
      }

      const centers = centersRes.data || [];
      const existingAssignments = assignmentsRes.data || [];
      console.log(`📊 Found ${centers.length} centers and ${existingAssignments.length} existing assignments.`);

      // 4. Update Regions list
      const uniqueRegions = [...new Set(centers.map(c => c.region))].sort();
      setRegions(uniqueRegions);

      // 5. Fetch workstation school names
      const neededWorkstationIds = [...new Set(existingAssignments.map(a => a.workstation).filter(Boolean))];
      let schoolMap = new Map();
      
      if (neededWorkstationIds.length > 0) {
        console.log("📡 Fetching school names for workstations:", neededWorkstationIds);
        const { data: schoolNames, error: schoolError } = await supabase
          .from('secondaryschools')
          .select('center_no, name')
          .in('center_no', neededWorkstationIds);
        
        if (schoolError) console.error("⚠️ Non-critical: Error fetching school names:", schoolError);
        schoolNames?.forEach(s => schoolMap.set(s.center_no, s.name));
      }

      // 6. Format Data
      console.log("📝 Formatting table data...");
      const formatted = centers.map((c) => {
        const assign = existingAssignments.find(a => a.center_no === c.center_number);
        
        let formattedWorkstation = '—';
        if (assign?.workstation) {
          const name = schoolMap.get(assign.workstation);
          formattedWorkstation = name ? `${assign.workstation} - ${abbreviateSchoolName(name)}` : assign.workstation;
        }

        return {
          sn_id: c.center_number,
          region: c.region,
          district: c.district,
          center_full: `${c.center_number} - ${abbreviateSchoolName(c.center_name || '')}`,
          supervisor: assign?.supervisor_name || 'PENDING',
          workstation: formattedWorkstation,
          phone: assign?.phone || '—',
          assignment_id: assign?.id || null,
          is_assigned: !!assign
        };
      });

      setAssignments(formatted);
      console.log("✅ State 'assignments' updated successfully.");

    } catch (err) {
      console.error("❌ Catch Block - Fetch Error:", err);
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ... (handleAssignSupervisors and other logic remain same as your snippet)

const handleAssignSupervisors = async () => {
    console.log("🚀 handleAssignSupervisors triggered.");
    if (!id) {
        showError("Missing supervision ID");
        return;
    }
    if (selectedRegion === 'all' && selectedDistrict === 'all') {
        showError("Please select at least a region or a district.");
        return;
    }

    try {
        setIsProcessing(true);
        const payload = {
            supervision_id: Number(id),
            code: summaryInfo.code,
            year: summaryInfo.year,
            regions: selectedRegion !== 'all' ? [selectedRegion] : [],
            districts: selectedDistrict !== 'all' ? [selectedDistrict] : [],
            assigned_by: "system_admin"
        };
        console.log("📡 Invoking Edge Function with payload:", payload);

        const { data, error } = await supabase.functions.invoke('assign-supervisors', { body: payload });

        // Handle network/invocation errors
        if (error) throw error;

        // NEW: Handle logical errors from the function (like "Assignments already exist")
        if (data && data.success === false) {
            console.warn("⚠️ Assignment Blocked:", data.error || data.message);
            // This shows the "Please clear them" message to the user
            showError(data.error || data.message || "Assignments already exist.");
            return;
        }

        console.log("✅ Edge Function Success:", data);
        
        // Show success message if you have a showSuccess helper
        if (typeof showSuccess === 'function') {
            showSuccess(data.message || "Assignments generated successfully!");
        }

        await fetchAssignments();

    } catch (err) {
        console.error("❌ Assignment process failed:", err);
        showError(err.message || "Assignment failed");
    } finally {
        setIsProcessing(false);
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

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      <Card className="w-full relative min-h-[600px] border-none shadow-sm">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
            <Spinner label="Syncing assignments..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 pb-6">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">Supervision Assignments</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 font-bold tracking-wider uppercase">
              {summaryInfo.code}-{summaryInfo.year}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedRegion} onValueChange={(val) => { 
              setSelectedRegion(val); 
              setSelectedDistrict('all'); 
              setCurrentPage(1); 
            }}>
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select 
              value={selectedDistrict} 
              onValueChange={(val) => { setSelectedDistrict(val); setCurrentPage(1); }}
              disabled={selectedRegion === 'all'}
            >
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue placeholder={selectedRegion === 'all' ? "Select Region first" : "All Districts"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {availableDistricts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button 
              size="sm" 
              className="bg-black hover:bg-gray-800 text-xs font-bold"
              onClick={handleAssignSupervisors}
              disabled={isProcessing || loading}
            >
              {isProcessing ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1" />}
              {isProcessing ? "Processing..." : "Assign"}
            </Button>

            <Button variant="outline" size="sm" className="text-xs font-bold" onClick={handleResetFilters}>
               <RotateCcw className="h-4 w-4 mr-1" /> Reset
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6 flex items-center justify-between">
            <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                placeholder="Search..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-9 h-10"
                />
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="w-[60px]">SN</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead>Supervisor</TableHead>
                  <TableHead>Workstation</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      No assignments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((item, index) => (
                    <TableRow key={item.sn_id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-muted-foreground text-[10px] font-mono">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </TableCell>
                      <TableCell className="text-[11px] font-medium uppercase">{item.region}</TableCell>
                      <TableCell className="text-[11px] uppercase">{item.district}</TableCell>
                      <TableCell className="text-[11px] font-bold text-slate-700">{item.center_full}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-xs font-bold",
                          !item.is_assigned ? "text-orange-500 italic" : "text-slate-900"
                        )}>
                          {item.supervisor}
                        </span>
                      </TableCell>
                      <TableCell className="text-[11px] font-mono text-indigo-600 font-semibold">{item.workstation}</TableCell>
                      <TableCell className="text-xs font-mono">{item.phone}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                            setSelectedSupervisorId(item.assignment_id);
                            setIsEditDrawerOpen(true);
                          }}>
                            <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && totalPages > 1 && (
            <div className="mt-4">
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </CardContent>
      </Card>

      <SupervisorDetailsDrawer 
        open={isDetailsDrawerOpen} 
        onOpenChange={setIsDetailsDrawerOpen} 
        supervisorId={selectedSupervisorId?.toString() || null} 
      />
      <EditSupervisorDrawer 
        isOpen={isEditDrawerOpen} 
        onClose={() => setIsEditDrawerOpen(false)} 
        onRefresh={fetchAssignments} 
        supervisorId={selectedSupervisorId?.toString() || null} 
      />
    </div>
  );
};

export default SupervisorAssignmentsPage;