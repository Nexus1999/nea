"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, AlertTriangle, Loader2, Users, 
  ArrowLeft, RefreshCw, Filter, Sparkles, Shield, BookOpen,
  TrendingUp, MapPin, BarChart3, Search, UserPlus
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import PaginationControls from "@/components/ui/pagination-controls";

const AssignTeachersPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState<any[]>([]);

  // Data States
  const [jobInfo, setJobInfo] = useState<any>(null);
  const [allRegions, setAllRegions] = useState<any[]>([]);
  const [allDistricts, setAllDistricts] = useState<any[]>([]);
  const [teacherGeoCodes, setTeacherGeoCodes] = useState<any[]>([]);
  
  // Table States
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Criteria State
  const [criteria, setCriteria] = useState({
    totalRequired: 0,
    regionCode: 'all',
    districtNumber: 'all',
    maleQuota: 50,
    femaleQuota: 50
  });

  useEffect(() => {
    document.title = "Assign Jobs | NEAS";
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: job, error: jobErr } = await supabase
          .from('jobassignments')
          .select('*')
          .eq('id', id)
          .single();
        if (jobErr) throw jobErr;
        setJobInfo(job);
        
        const { data: regData } = await supabase.from('regions').select('region_code, region_name');
        const { data: distData } = await supabase.from('districts').select('region_number, district_number, district_name');
        setAllRegions(regData || []);
        setAllDistricts(distData || []);

        const { data: geoCodes, error: geoErr } = await supabase
          .from('primaryteachers')
          .select('region_code, district_number')
          .eq('status', 'active');
        
        if (geoErr) throw geoErr;
        setTeacherGeoCodes(geoCodes || []);

        setCriteria(prev => ({ ...prev, totalRequired: job.total_required }));
      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [id]);

  const uniqueRegions = useMemo(() => {
    const codesInTeachers = new Set(teacherGeoCodes.map(t => String(t.region_code)));
    return allRegions
      .filter(r => codesInTeachers.has(String(r.region_code)))
      .sort((a, b) => a.region_name.localeCompare(b.region_name));
  }, [allRegions, teacherGeoCodes]);

  const filteredDistricts = useMemo(() => {
    if (criteria.regionCode === 'all') return [];
    const districtsInTeachers = new Set(
      teacherGeoCodes
        .filter(t => String(t.region_code) === criteria.regionCode)
        .map(t => String(t.district_number))
    );
    return allDistricts
      .filter(d => String(d.region_number) === criteria.regionCode)
      .filter(d => districtsInTeachers.has(String(d.district_number)))
      .sort((a, b) => a.district_name.localeCompare(b.district_name));
  }, [allDistricts, teacherGeoCodes, criteria.regionCode]);

  // Filtered and paginated data for table
  const filteredTeachers = useMemo(() => {
    if (!searchTerm) return selectedTeachers;
    const search = searchTerm.toLowerCase();
    return selectedTeachers.filter(t => 
      t.teacher_name?.toLowerCase().includes(search) ||
      t.workstation?.toLowerCase().includes(search) ||
      t.check_number?.toLowerCase().includes(search) ||
      t.phone?.toLowerCase().includes(search)
    );
  }, [selectedTeachers, searchTerm]);

  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const paginatedTeachers = filteredTeachers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const runSelectionAlgorithm = async () => {
    setIsProcessing(true);
    try {
      // 1. Check for existing assignments for this job
      const { data: existing } = await supabase.from('teacher_assignments').select('id').eq('job_id', id);
      if (existing && existing.length > 0) {
        const confirmClear = window.confirm(`There are already ${existing.length} teachers assigned to this job. Do you want to delete them and create a new selection?`);
        if (!confirmClear) {
          setIsProcessing(false);
          return;
        }
        await supabase.from('teacher_assignments').delete().eq('job_id', id);
      }

      // 2. Get ALL assignments across all jobs with workstation info
      const { data: allAssignments } = await supabase
        .from('teacher_assignments')
        .select(`
          teacher_id,
          job_id,
          primaryteachers!inner(workstation)
        `);

      // 3. Build workstation usage map for OTHER jobs
      const workstationJobMap = new Map<string, Set<string>>();
      const teacherAssignmentMap = new Map<number, Set<string>>();
      
      allAssignments?.forEach(assignment => {
        const workstation = assignment.primaryteachers?.workstation;
        const jobId = assignment.job_id;
        const teacherId = assignment.teacher_id;
        
        if (workstation && jobId !== id) {
          if (!workstationJobMap.has(workstation)) {
            workstationJobMap.set(workstation, new Set());
          }
          workstationJobMap.get(workstation)!.add(jobId);
        }
        
        if (teacherId) {
          if (!teacherAssignmentMap.has(teacherId)) {
            teacherAssignmentMap.set(teacherId, new Set());
          }
          teacherAssignmentMap.get(teacherId)!.add(jobId);
        }
      });

      // 4. Fetch all active teachers in target scope
      let query = supabase.from('primaryteachers').select('*').eq('status', 'active');
      if (criteria.regionCode !== 'all') query = query.eq('region_code', criteria.regionCode);
      if (criteria.districtNumber !== 'all') query = query.eq('district_number', criteria.districtNumber);

      const { data: pool, error: poolErr } = await query;
      if (poolErr) throw poolErr;

      // 5. Categorize teachers by workstation priority
      const categorizeTeacher = (teacher: any) => {
        const workstation = teacher.workstation;
        const teacherId = teacher.id;
        
        if (!workstationJobMap.has(workstation) && !teacherAssignmentMap.has(teacherId)) return 1;
        if (!workstationJobMap.has(workstation) && teacherAssignmentMap.has(teacherId)) return 2;
        if (workstationJobMap.has(workstation) && !teacherAssignmentMap.has(teacherId)) return 3;
        return 4;
      };

      // 6. Group by Districts for Pro-Rata distribution
      const targetDistricts = criteria.districtNumber === 'all' 
        ? [...new Set(pool.map(p => p.district_number))] 
        : [parseInt(criteria.districtNumber)];

      const perDistrictTarget = Math.floor(criteria.totalRequired / targetDistricts.length);
      let finalDraft: any[] = [];
      const usedWorkstations = new Set<string>();

      let eligiblePool = pool.filter(p => !usedWorkstations.has(p.workstation));
      
      eligiblePool.sort((a, b) => {
        const priorityA = categorizeTeacher(a);
        const priorityB = categorizeTeacher(b);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return Math.random() - 0.5;
      });

      targetDistricts.forEach(distCode => {
        ['M', 'F'].forEach(sex => {
          const quota = sex === 'M' ? criteria.maleQuota : criteria.femaleQuota;
          const neededCount = Math.round((perDistrictTarget * quota) / 100);
          
          let available = eligiblePool.filter(p => 
            p.district_number === distCode && 
            p.sex === sex && 
            !usedWorkstations.has(p.workstation)
          );
          
          let selected = 0;
          for (const teacher of available) {
            if (selected >= neededCount) break;
            if (!usedWorkstations.has(teacher.workstation)) {
              usedWorkstations.add(teacher.workstation);
              finalDraft.push(teacher);
              selected++;
            }
          }
        });
      });

      setSelectedTeachers(finalDraft);
      setCurrentStep(3);
      setCurrentPage(1);
      setSearchTerm('');
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoveToStep = (step: number) => {
    if (step > 1 && criteria.regionCode === 'all') {
      showError("Please select a Region before proceeding.");
      return;
    }
    if (step === 2) {
      runSelectionAlgorithm();
    } else {
      setCurrentStep(step);
    }
  };

  const handleQuotaChange = (gender: 'male' | 'female', value: number) => {
    const val = Math.min(100, Math.max(0, value));
    setCriteria(prev => ({
      ...prev,
      [gender + 'Quota']: val,
      [gender === 'male' ? 'femaleQuota' : 'maleQuota']: 100 - val
    }));
  };

  const handleFinalAssign = async () => {
    setIsProcessing(true);
    try {
      const assignments = selectedTeachers.map(t => ({
        job_id: id,
        teacher_id: t.id,
        assignment_year: 2026,
        region_code: t.region_code,
        district_number: t.district_number
      }));

      const { error } = await supabase.from('teacher_assignments').insert(assignments);
      if (error) throw error;

      showSuccess(`Successfully assigned ${selectedTeachers.length} teachers.`);
      navigate(`/dashboard/miscellaneous/jobs/assignments/${id}`);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Spinner size="lg" label="Loading.." />           
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 p-3 lg:px-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-none">
                  {jobInfo?.name}
                </h1>
                <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mt-1">
                  {jobInfo?.section}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(-1)}
              className="border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all rounded-lg h-8 px-3 text-[10px] font-black uppercase tracking-tighter"
            >
              <ArrowLeft className="w-3 h-3 mr-1.5" />
              Back
            </Button>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-slate-50 rounded-full border border-slate-200 p-1.5">
            {[
              { num: 1, label: 'Configure', icon: Filter },
              { num: 2, label: 'Generate', icon: Sparkles },
              { num: 3, label: 'Review', icon: CheckCircle }
            ].map((step, idx) => (
              <React.Fragment key={step.num}>
                <button 
                  onClick={() => handleMoveToStep(step.num)}
                  disabled={step.num === 2 || (step.num > currentStep + 1)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200
                    ${currentStep === step.num 
                      ? 'bg-slate-900 text-white shadow-sm' 
                      : currentStep > step.num
                        ? 'text-slate-700 hover:bg-slate-200'
                        : 'text-slate-400'
                    }
                    ${step.num === 2 ? 'cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <span className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black
                    ${currentStep === step.num 
                      ? 'bg-white text-slate-900' 
                      : currentStep > step.num
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-200 text-slate-400'
                    }
                  `}>
                    {currentStep > step.num ? <CheckCircle className="w-3 h-3" /> : step.num}
                  </span>
                  <span className="font-bold text-[10px] uppercase tracking-wider hidden sm:inline">
                    {step.label}
                  </span>
                </button>
                {idx < 2 && (
                  <div className={`w-4 h-px ${currentStep > step.num ? 'bg-slate-400' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-tight text-slate-900">
                      Geographic Selection
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-700 tracking-wide">Region Selection *</label>
                    <select 
                      className="w-full h-10 px-3 border-2 border-slate-100 rounded-lg bg-slate-50 text-sm font-semibold outline-none focus:border-blue-500"
                      value={criteria.regionCode}
                      onChange={(e) => setCriteria({...criteria, regionCode: e.target.value})}
                    >
                      <option value="all">Select a region...</option>
                      {uniqueRegions.map(r => <option key={r.region_code} value={r.region_code}>{r.region_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-700 tracking-wide">District Selection</label>
                    <select 
                      className="w-full h-10 px-3 border-2 border-slate-100 rounded-lg bg-slate-50 text-sm font-semibold outline-none focus:border-blue-500"
                      disabled={criteria.regionCode === 'all'}
                      value={criteria.districtNumber}
                      onChange={(e) => setCriteria({...criteria, districtNumber: e.target.value})}
                    >
                      <option value="all">All Districts</option>
                      {filteredDistricts.map(d => <option key={d.district_number} value={d.district_number}>{d.district_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-white rounded-xl shadow-sm border border-indigo-100 p-6 flex flex-col justify-between relative overflow-hidden">
                <div className="relative">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-indigo-600" />
                      </div>
                      <h2 className="text-sm font-black uppercase tracking-tight text-slate-800">Gender Distribution</h2>
                    </div>
                    <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase">Target: {criteria.totalRequired}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500">Male Quota</span>
                          <p className="text-[10px] font-medium text-indigo-400">≈ {Math.round((criteria.totalRequired * criteria.maleQuota) / 100)} teachers</p>
                        </div>
                        <span className="text-2xl font-black text-indigo-600">{criteria.maleQuota}%</span>
                      </div>
                      <input 
                        type="range" 
                        className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600" 
                        value={criteria.maleQuota} 
                        onChange={(e) => handleQuotaChange('male', parseInt(e.target.value))} 
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500">Female Quota</span>
                          <p className="text-[10px] font-medium text-pink-400">≈ {Math.round((criteria.totalRequired * criteria.femaleQuota) / 100)} teachers</p>
                        </div>
                        <span className="text-2xl font-black text-pink-500">{criteria.femaleQuota}%</span>
                      </div>
                      <input 
                        type="range" 
                        className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-pink-500" 
                        value={criteria.femaleQuota} 
                        onChange={(e) => handleQuotaChange('female', parseInt(e.target.value))} 
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="text-xs font-bold px-6 bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all" 
                    disabled={criteria.regionCode === 'all'}
                    onClick={() => handleMoveToStep(2)}
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
                    {isProcessing ? "Processing..." : "Generate Selection"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="h-full">
              <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl shadow-sm border border-blue-100 p-6 h-full">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-black text-base uppercase tracking-tight text-slate-900">Selection Policy</h3>
                </div>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 mb-1">Workstation Priority</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Workstations that have never contributed are prioritized. Each workstation contributes only ONE teacher per job.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900 mb-1">Pro-Rata Distribution</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Teachers are allocated proportionally across selected districts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-slate-900" />
                    Draft Selection
                  </h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">
                    Showing <span className="text-slate-900">{filteredTeachers.length}</span> of <span className="text-slate-900">{selectedTeachers.length}</span> teachers
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                    className="border border-slate-200 hover:border-slate-900 font-black uppercase text-[10px] rounded-lg h-9 px-4"
                  >
                    <Filter className="w-3 h-3 mr-1.5" />
                    Adjust
                  </Button>
                  <Button 
                    disabled={isProcessing}
                    onClick={handleFinalAssign} 
                    className="bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] rounded-lg h-9 px-6 transition-all"
                  >
                    {isProcessing ? <Loader2 className="animate-spin w-3.5 h-3.5 mr-2" /> : <CheckCircle className="w-3.5 h-3.5 mr-2" />}
                    Authorize Assignment
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 md:flex-initial md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search name, workstation, phone..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-9 h-9 text-sm border-slate-200 focus:ring-slate-100"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={runSelectionAlgorithm}
                  disabled={isProcessing}
                  className="border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-black uppercase text-[10px] rounded-lg h-9 px-4 ml-auto"
                >
                  <RefreshCw className={`w-3 h-3 mr-1.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  Re-Shuffle
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="hover:bg-transparent border-b border-slate-200">
                      <TableHead className="w-[60px] text-[10px] font-black uppercase text-slate-500">SN</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Fullname</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase text-slate-500">Sex</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Check No</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Workstation</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">District</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTeachers.map((teacher, index) => {
                      const actualIndex = ((currentPage - 1) * itemsPerPage) + index + 1;
                      return (
                        <TableRow key={teacher.id} className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
                          <TableCell className="text-slate-400 text-xs font-mono">
                            {actualIndex.toString().padStart(2, '0')}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-slate-800">
                            {teacher.teacher_name}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-black text-[9px] ${teacher.sex === 'M' ? 'bg-indigo-50 text-indigo-600' : 'bg-pink-50 text-pink-600'}`}>
                              {teacher.sex}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 font-medium">{teacher.check_number}</TableCell>
                          <TableCell className="text-sm text-slate-600 font-medium">{teacher.workstation}</TableCell>
                          <TableCell className="text-sm text-slate-600 font-medium">
                            {allDistricts.find(d => d.district_number === teacher.district_number)?.district_name || 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 font-medium">{teacher.phone || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center pt-2">
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignTeachersPage;