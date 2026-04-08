"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Box,
  InputAdornment,
  CircularProgress,
  Typography,
  Autocomplete,
  createFilterOptions,
  Divider,
} from '@mui/material';
import { AccountCircle, Search as SearchIcon } from '@mui/icons-material';
import { X, UserPlus, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

const filter = createFilterOptions({
  limit: 50,
  stringify: (option: any) => option.searchBlob,
});

interface ReassignSupervisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAssignment: any;
  supervisionId: string | number;
  examCode: string;
  examYear: string | number;
  onAssignmentUpdated: () => void;
}

const ReassignSupervisorModal = ({
  isOpen,
  onClose,
  currentAssignment,
  supervisionId,
  examCode,
  examYear,
  onAssignmentUpdated,
}: ReassignSupervisorModalProps) => {
  const [formData, setFormData] = useState({
    currentName: '',
    currentWorkstation: '',
    currentPhone: '',
    newSupervisor: null as any,
    newWorkstation: '',
    newPhone: '',
  });

  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' });

  useEffect(() => {
    if (currentAssignment && isOpen) {
      setFormData({
        currentName: currentAssignment.isPlaceholder ? 'VACANT SLOT' : (currentAssignment.supervisor || ''),
        currentWorkstation: currentAssignment.workstation || '',
        currentPhone: currentAssignment.phone || '',
        newSupervisor: null,
        newWorkstation: '',
        newPhone: '',
      });
      fetchAllSupervisors();
    }
  }, [currentAssignment, isOpen]);

  const fetchAllSupervisors = async () => {
    if (!currentAssignment?.district) return;
    
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('supervisors')
        .select(`id, first_name, middle_name, last_name, phone, center_no, region, district`)
        .eq('status', 'ACTIVE')
        .eq('is_latest', 1)
        .eq('district', currentAssignment.district);

      if (error) throw error;

      setSupervisors(
        data.map((s: any) => {
          const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.replace(/\s+/g, ' ').trim();
          return {
            id: s.id,
            full_name: fullName,
            phone: s.phone || 'N/A',
            center_no: s.center_no || 'N/A',
            region: s.region,
            district: s.district,
            searchBlob: `${fullName} ${s.center_no} ${s.district}`.toLowerCase(),
          };
        })
      );
    } catch (err) {
      showError('Failed to load supervisors');
    } finally {
      setFetching(false);
    }
  };

  const targetCenters = useMemo(() => {
    if (!currentAssignment?.center_no) return [];
    const centerNo = currentAssignment.center_no;
    const centers = [centerNo];
    
    const match = centerNo.match(/^([SP])(\d+)$/);
    if (match) {
      const type = match[1];
      const number = match[2];
      const linkedType = type === 'S' ? 'P' : 'S';
      centers.push(`${linkedType}${number}`);
    }
    return centers;
  }, [currentAssignment]);

  const handleSupervisorSelect = (supervisor: any) => {
    setFormData((prev) => ({
      ...prev,
      newSupervisor: supervisor,
      newWorkstation: supervisor?.center_no || '',
      newPhone: supervisor?.phone || '',
    }));
  };

  const handleReassignClick = async () => {
    if (!formData.newSupervisor) return;

    const supervisorWorkstation = formData.newSupervisor.center_no?.trim().toUpperCase();
    const isSelfSupervising = targetCenters.some(c => c.trim().toUpperCase() === supervisorWorkstation);

    // 1. Self-Supervision Conflict
    if (isSelfSupervising) {
      setErrorDialog({
        open: true,
        title: 'Self-Supervision Conflict',
        message: `${formData.newSupervisor.full_name} cannot supervise their own center (${supervisorWorkstation}).`
      });
      return;
    }

    // 2. ACSEE vs Ualimu Exclusion
    const isUalimuSupervisor = supervisorWorkstation.startsWith('U');
    const isSecondarySupervisor = supervisorWorkstation.startsWith('S');
    const isUalimuExam = ['GATCE', 'GATSCCE', 'DTEE', 'DSEE'].includes(examCode.toUpperCase());
    const isACSEEExam = examCode.toUpperCase() === 'ACSEE';

    if (isACSEEExam && isUalimuSupervisor) {
      setErrorDialog({
        open: true,
        title: 'Exclusion Conflict',
        message: `Supervisors from Ualimu centers (${supervisorWorkstation}) cannot supervise ACSEE examinations.`
      });
      return;
    }

    if (isUalimuExam && isSecondarySupervisor) {
      setErrorDialog({
        open: true,
        title: 'Exclusion Conflict',
        message: `Supervisors from Secondary centers (${supervisorWorkstation}) cannot supervise Ualimu examinations.`
      });
      return;
    }

    setLoading(true);
    try {
      // 3. Already Assigned Conflict
      const { data: currentConflicts } = await supabase
        .from('supervisorassignments')
        .select('assignment_id')
        .eq('supervision_id', supervisionId)
        .eq('supervisor_name', formData.newSupervisor.full_name);

      if (currentConflicts && currentConflicts.length > 0) {
        setErrorDialog({
          open: true,
          title: 'Already Assigned',
          message: `${formData.newSupervisor.full_name} is already assigned to a center in this examination.`
        });
        setLoading(false);
        return;
      }

      setIsConfirmOpen(true);
    } catch (err) {
      showError("Validation failed");
    } finally {
      setLoading(false);
    }
  };

  const executeUpdate = async () => {
    setLoading(true);
    setIsConfirmOpen(false);
    try {
      const updateData = {
        supervisor_name: formData.newSupervisor.full_name,
        workstation: formData.newSupervisor.center_no,
        phone: formData.newSupervisor.phone,
        assigned_by: 'system_admin'
      };

      if (currentAssignment.isPlaceholder) {
        // Insert for the primary center
        const { error: insertError } = await supabase.from('supervisorassignments').insert({
          ...updateData,
          supervision_id: supervisionId,
          center_no: currentAssignment.center_no,
          region: currentAssignment.region,
          district: currentAssignment.district,
        });

        if (insertError) throw insertError;

        // Handle linked center
        const linkedCenter = targetCenters.find(c => c !== currentAssignment.center_no);
        if (linkedCenter) {
          const { data: updated } = await supabase
            .from('supervisorassignments')
            .update(updateData)
            .eq('supervision_id', supervisionId)
            .eq('center_no', linkedCenter)
            .select();

          if (!updated || updated.length === 0) {
            await supabase.from('supervisorassignments').insert({
              ...updateData,
              supervision_id: supervisionId,
              center_no: linkedCenter,
              region: currentAssignment.region,
              district: currentAssignment.district,
            });
          }
        }
      } else {
        // Update all linked centers at once
        const { error: updateError } = await supabase
          .from('supervisorassignments')
          .update(updateData)
          .eq('supervision_id', supervisionId)
          .in('center_no', targetCenters);

        if (updateError) throw updateError;
      }

      showSuccess(currentAssignment.isPlaceholder ? 'Supervisor assigned' : 'Supervisor reassigned');
      onClose();
      onAssignmentUpdated();
    } catch (err: any) {
      showError(err.message || 'Failed to process assignment');
    } finally {
      setLoading(false);
    }
  };

  const isReassign = !currentAssignment?.isPlaceholder;

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        sx={{ zIndex: 1200 }}
        PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.12)' } }}
      >
        <Box sx={{ p: 3, pb: 2, borderBottom: '1px solid #e5e7eb', position: 'relative' }}>
          <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', right: 16, top: 16, color: '#64748b' }}>
            <X size={18} />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountCircle sx={{ fontSize: 22 }} />
            {isReassign ? 'Reassign Supervisor' : 'Assign Supervisor'}
          </Typography>
        </Box>

        <DialogContent sx={{ p: 3, bgcolor: '#ffffff' }}>
          <div className="space-y-6">
            {isReassign && (
              <div>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', color: '#64748b', mb: 1.5, display: 'block' }}>
                  Current Supervisor
                </Typography>
                <div className="space-y-3">
                  <TextField label="Name" value={formData.currentName} fullWidth size="small" InputProps={{ readOnly: true }} />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="Workstation" value={formData.currentWorkstation} fullWidth size="small" InputProps={{ readOnly: true }} />
                    <TextField label="Phone" value={formData.currentPhone} fullWidth size="small" InputProps={{ readOnly: true }} />
                  </div>
                </div>
                <Divider sx={{ my: 4 }} />
              </div>
            )}

            <div>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', color: '#64748b', mb: 1.5, display: 'block' }}>
                {isReassign ? 'New Supervisor' : 'Select Supervisor'} (from {currentAssignment?.district})
              </Typography>
              <div className="space-y-3">
                <Autocomplete
                  options={supervisors}
                  getOptionLabel={(option) => option.full_name}
                  filterOptions={filter}
                  autoHighlight
                  value={formData.newSupervisor}
                  onChange={(_, val) => handleSupervisorSelect(val)}
                  loading={fetching}
                  renderOption={(props, option) => {
                    const { key, ...other } = props;
                    return (
                      <li key={option.id} {...other} className="py-2 px-3 hover:bg-slate-50">
                        <div className="font-semibold">{option.full_name}</div>
                        <div className="text-xs text-[#64748b]">{option.district} • {option.center_no}</div>
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search by name, district, or station..."
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#64748b' }} /></InputAdornment>,
                        endAdornment: <>{fetching && <CircularProgress size={20} />}{params.InputProps.endAdornment}</>,
                      }}
                    />
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Workstation" value={formData.newWorkstation} fullWidth size="small" InputProps={{ readOnly: true }} />
                  <TextField label="Phone" value={formData.newPhone} fullWidth size="small" InputProps={{ readOnly: true }} />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid #e5e7eb' }}>
          <Button
            variant="default"
            className={cn("bg-slate-900 hover:bg-black text-white uppercase tracking-wider font-black text-[10px] h-10 px-8 rounded-lg shadow-sm", (loading || !formData.newSupervisor) && "opacity-70 cursor-not-allowed")}
            disabled={loading || !formData.newSupervisor}
            onClick={handleReassignClick}
          >
            {loading ? <CircularProgress size={14} sx={{ color: 'white', mr: 1.5 }} /> : <><UserPlus className="h-3.5 w-3.5 mr-1.5" /> {isReassign ? 'Reassign' : 'Assign'}</>}
          </Button>
        </DialogActions>
      </Dialog>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="max-w-[420px] rounded-2xl border border-slate-200 shadow-2xl p-6 z-[1300]">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-indigo-50 text-indigo-600">
                <RotateCcw className="h-7 w-7" />
              </div>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-slate-900">Confirm Assignment?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
              Assign <strong>{formData.newSupervisor?.full_name}</strong> to <strong>{targetCenters.join(' & ')}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row items-center gap-3 mt-6">
            <AlertDialogCancel className="flex-1 h-11 font-bold uppercase text-[10px] tracking-widest rounded-xl mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeUpdate} className="flex-[1.5] h-11 font-black uppercase text-[10px] tracking-widest rounded-xl text-white bg-indigo-600 hover:bg-indigo-700">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={errorDialog.open} onOpenChange={(val) => setErrorDialog(prev => ({ ...prev, open: val }))}>
        <AlertDialogContent className="max-w-[420px] rounded-2xl border border-red-100 shadow-2xl p-6 z-[1400]">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-red-50 text-red-600">
                <AlertCircle className="h-7 w-7" />
              </div>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-red-900">{errorDialog.title}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-600 text-center leading-relaxed">{errorDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction className="w-full h-11 font-black uppercase text-[10px] tracking-widest rounded-xl bg-slate-900 hover:bg-black text-white">Understood</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ReassignSupervisorModal;