"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UserPlus, Search, RotateCcw, Phone, AlertTriangle, RefreshCw, Link, Download 
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import PaginationControls from "@/components/ui/pagination-controls";
import Spinner from "@/components/Spinner";
import ReassignTeacherModal from "@/components/miscellaneous/ReassignTeacherModal";
import { AssignmentExportModal } from "@/components/miscellaneous/AssignmentExportModal";

const JobAssignmentsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [jobDetails, setJobDetails] = useState({ name: '', section: '' });
  
  const [dialogConfig, setDialogConfig] = useState({ open: false, type: 'reset' });
  const [reassignModal, setReassignModal] = useState({ open: false, teacher: null as any });
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    document.title = "Job Assignments | NEAS";
    if (id) fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: job, error: jobError } = await supabase
        .from('jobassignments')
        .select('name, section')
        .eq('id', id)
        .single();

      if (jobError) throw jobError;
      setJobDetails(job);

      const { data, error } = await supabase
        .from('teacher_assignments') 
        .select(`
          id,
          teacher_id,
          primaryteachers (
            teacher_name, sex, phone, workstation,
            account_name, account_number, bank_name,
            region_code,
            district_number
          )
        `)
        .eq('job_id', id);

      if (error) throw error;

      // Fetch region and district names separately to avoid complex join issues
      const regionCodes = [...new Set(data.map((item: any) => item.primaryteachers?.region_code).filter(Boolean))];
      const districtNumbers = [...new Set(data.map((item: any) => item.primaryteachers?.district_number).filter(Boolean))];

      const { data: regions } = await supabase.from('regions').select('region_code, region_name').in('region_code', regionCodes);
      const { data: districts } = await supabase.from('districts').select('district_number, district_name').in('district_number', districtNumbers);

      const regionMap = Object.fromEntries(regions?.map(r => [r.region_code, r.region_name]) || []);
      const districtMap = Object.fromEntries(districts?.map(d => [d.district_number, d.district_name]) || []);

      const formatted = data.map((item: any) => ({
        assignmentId: item.id,
        teacherId: item.teacher_id,
        fullname: item.primaryteachers?.teacher_name || 'N/A',
        sex: item.primaryteachers?.sex || 'N/A',
        phone: item.primaryteachers?.phone || 'N/A',
        workstation: item.primaryteachers?.workstation || 'N/A',
        region: regionMap[item.primaryteachers?.region_code] || 'N/A',
        district: districtMap[item.primaryteachers?.district_number] || 'N/A',
        account_name: item.primaryteachers?.account_name || '',
        account_number: item.primaryteachers?.account_number || '',
        bank_name: item.primaryteachers?.bank_name || '',
      }));

      setAssignments(formatted);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };
 
  const handleAccountsLink = () => {
    const portalUrl = `${window.location.origin}/portal/${id}`;
    navigator.clipboard.writeText(portalUrl);
    showSuccess("Portal Link copied! Share this with teachers.");
  };

  const handleResetAssignments = async () => {
    setResetLoading(true);
    try {
      const { error } = await supabase
        .from('teacher_assignments')
        .delete()
        .eq('job_id', id);

      if (error) throw error;
      
      showSuccess("All assignments have been cleared");
      setAssignments([]);
      setDialogConfig({ ...dialogConfig, open: false });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return assignments.filter(item => {
      const searchStr = search.toLowerCase();
      return (
        item.fullname.toLowerCase().includes(searchStr) ||
        item.phone.toLowerCase().includes(searchStr) ||
        item.workstation.toLowerCase().includes(searchStr)
      );
    });
  }, [assignments, search]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4 p-4">
      <Card className="w-full relative min-h-[600px] border-none shadow-sm">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80">
            <Spinner size="lg" label="Loading.." />          
          </div>
        )}

        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 pb-6 border-b mb-4">
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
              {jobDetails.name || "Loading..."}
            </CardTitle>
            <p className="text-[10px] font-bold text-slate-500 mt-1 tracking-[0.2em] uppercase">
              Section: {jobDetails.section || "N/A"}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button 
                variant="default" 
                size="sm" 
                className="bg-slate-900 hover:bg-black text-[10px] font-black uppercase tracking-wider rounded-lg h-9" 
                onClick={() => {
                  if (assignments.length > 0) setDialogConfig({ open: true, type: 'assign' });
                  else navigate(`/dashboard/miscellaneous/jobs/assign/${id}`);
                }}
            >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Assign Teacher
            </Button>

            <Button 
                variant="outline" 
                size="sm" 
                className="border-2 border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 text-[10px] font-black uppercase tracking-wider rounded-lg h-9 px-4 transition-all" 
                onClick={handleAccountsLink}
            >
                <Link className="h-3.5 w-3.5 mr-1.5" /> Accounts Link
            </Button>

            <Button 
                variant="outline" 
                size="sm" 
                className="border-2 border-slate-200 text-slate-600 hover:border-emerald-600 hover:text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-lg h-9 px-4 transition-all" 
                onClick={() => setExportModalOpen(true)}
            >
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export
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
                  placeholder="Search name, workstation or phone..."
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
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Fullname</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase text-slate-500">Sex</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Workstation</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500">Phone</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 px-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-20 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      No teachers assigned to this job yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((item, index) => (
                    <TableRow key={item.assignmentId} className="hover:bg-slate-50/30 border-b border-slate-100 transition-colors">
                      <TableCell className="text-slate-400 text-xs font-mono">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 font-medium">{item.region}</TableCell>
                      <TableCell className="text-sm text-slate-600 font-medium">{item.district}</TableCell>
                      <TableCell className="text-sm text-slate-800">{item.fullname}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-black text-[9px] ${item.sex === 'M' ? 'bg-indigo-50 text-indigo-600' : 'bg-pink-50 text-pink-600'}`}>
                          {item.sex}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 font-medium">{item.workstation}</TableCell>
                      <TableCell className="text-sm text-slate-600 font-medium">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-slate-300" />
                          {item.phone}
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setReassignModal({ open: true, teacher: item })}
                          className="h-8 w-8 p-0 border-slate-200 hover:border-slate-900 rounded-lg transition-all"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
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

      <AssignmentExportModal 
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        data={assignments}
        jobDetails={jobDetails}
      />

      <AlertDialog open={dialogConfig.open} onOpenChange={(val) => setDialogConfig({ ...dialogConfig, open: val })}>
        <AlertDialogContent className="max-w-[420px] rounded-2xl border border-slate-200 shadow-2xl p-6">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
                dialogConfig.type === 'assign' ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'
              }`}>
                {dialogConfig.type === 'assign' ? <RefreshCw className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
              </div>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-slate-900">
                {dialogConfig.type === 'assign' ? 'Active Job Found' : 'Clear All Data?'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
              {dialogConfig.type === 'assign' && `This job already has teachers assigned. To assign new ones, the current list must be cleared.`}
              {dialogConfig.type === 'reset' && `This action will permanently remove all ${assignments.length} assigned teachers from this specific job record.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-row items-center gap-3 mt-6">
            <AlertDialogCancel className="flex-1 h-11 font-bold uppercase text-[10px] tracking-widest rounded-xl mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetAssignments}
              disabled={resetLoading}
              className="flex-[1.5] h-11 font-black uppercase text-[10px] tracking-widest rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {resetLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Confirm Clear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReassignTeacherModal 
        isOpen={reassignModal.open}
        onClose={() => setReassignModal({ open: false, teacher: null })}
        currentTeacher={reassignModal.teacher}
        jobId={id}
        onAssignmentUpdated={() => {
          fetchInitialData();
        }}
      />
    </div>
  );
};

export default JobAssignmentsPage;