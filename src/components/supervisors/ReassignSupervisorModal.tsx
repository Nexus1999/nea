"use client";

import React, { useState, useEffect } from 'react';
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
import { X, UserPlus, AlertTriangle } from 'lucide-react';
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
  onAssignmentUpdated: () => void;
}

const ReassignSupervisorModal = ({
  isOpen,
  onClose,
  currentAssignment,
  supervisionId,
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
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (currentAssignment && isOpen) {
      setFormData({
        currentName: currentAssignment.supervisor || '',
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

  const handleSupervisorSelect = (supervisor: any) => {
    setFormData((prev) => ({
      ...prev,
      newSupervisor: supervisor,
      newWorkstation: supervisor?.center_no || '',
      newPhone: supervisor?.phone || '',
    }));
  };

  const handleReassignClick = () => {
    if (!formData.newSupervisor) return;
    setShowConfirm(true);
  };

  const executeUpdate = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      // Check if already assigned to this supervision
      const { data: conflicts } = await supabase
        .from('supervisorassignments')
        .select('assignment_id')
        .eq('supervision_id', supervisionId)
        .eq('supervisor_name', formData.newSupervisor.full_name);

      if (conflicts?.length) {
        showError("This supervisor is already assigned to this examination.");
        setLoading(false);
        return;
      }

      const payload = {
        supervisor_name: formData.newSupervisor.full_name,
        workstation: formData.newSupervisor.center_no,
        phone: formData.newSupervisor.phone,
      };

      const centerNo = currentAssignment.center_no || '';
      const targetCenters = [centerNo];
      
      const match = centerNo.match(/^([SP])(\d+)$/);
      if (match) {
        const type = match[1];
        const number = match[2];
        const linkedType = type === 'S' ? 'P' : 'S';
        targetCenters.push(`${linkedType}${number}`);
      }

      const { error } = await supabase
        .from('supervisorassignments')
        .update(payload)
        .eq('supervision_id', supervisionId)
        .in('center_no', targetCenters);

      if (error) throw error;

      showSuccess('Supervisor reassigned successfully');
      onClose();
      setTimeout(() => {
        onAssignmentUpdated();
      }, 500);
      
    } catch (err: any) {
      showError(err.message || 'Failed to process assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        sx={{ zIndex: 1200 }}
        PaperProps={{
          sx: { borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.12)' },
        }}
      >
        <Box sx={{ p: 3, pb: 2, borderBottom: '1px solid #e5e7eb', position: 'relative' }}>
          <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', right: 16, top: 16, color: '#64748b' }}>
            <X size={18} />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountCircle sx={{ fontSize: 22 }} />
            Reassign Supervisor
          </Typography>
        </Box>

        <DialogContent sx={{ p: 3, bgcolor: '#ffffff' }}>
          <div className="space-y-6">
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
            </div>

            <Divider sx={{ my: 4 }} />

            <div>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', color: '#64748b', mb: 1.5, display: 'block' }}>
                New Supervisor (from {currentAssignment?.district})
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
                        <div className="text-xs text-[#64748b]">
                          {option.district} • {option.center_no}
                        </div>
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
            {loading ? <CircularProgress size={14} sx={{ color: 'white', mr: 1.5 }} /> : <><UserPlus className="h-3.5 w-3.5 mr-1.5" /> Reassign</>}
          </Button>
        </DialogActions>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="font-black text-lg uppercase tracking-tight">Confirm Reassignment</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-center text-sm text-slate-500">
              Are you sure you want to reassign this station to <strong>{formData.newSupervisor?.full_name}</strong>? 
              {currentAssignment?.center_no?.match(/^[SP]\d+$/) && " This will update both linked S and P centers."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center gap-3 mt-4">
            <AlertDialogCancel className="flex-1 h-10 font-bold uppercase text-[10px] tracking-widest rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeUpdate}
              className="flex-1 h-10 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-xl"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ReassignSupervisorModal;