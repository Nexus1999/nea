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
import { cn } from "@/lib/utils"; // assuming you have this from shadcn

const filter = createFilterOptions({
  limit: 50,
  stringify: (option: any) => option.searchBlob,
});

interface ReassignTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTeacher: any;
  jobId: string | number;
  onAssignmentUpdated: () => void;
}

const ReassignTeacherModal = ({
  isOpen,
  onClose,
  currentTeacher,
  jobId,
  onAssignmentUpdated,
}: ReassignTeacherModalProps) => {
  const [formData, setFormData] = useState({
    currentName: '',
    currentDistrict: '',
    currentWorkstation: '',
    currentPhone: '',
    newTeacher: null as any,
    newDistrict: '',
    newWorkstation: '',
    newPhone: '',
  });

  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [dialogConfig, setDialogConfig] = useState({
    open: false,
    type: 'reassign',
    description: '',
  });

  useEffect(() => {
    if (currentTeacher && isOpen) {
      setFormData({
        currentName: currentTeacher.fullname || currentTeacher.teacher_name || '',
        currentDistrict: currentTeacher.district || '',
        currentWorkstation: currentTeacher.workstation || '',
        currentPhone: currentTeacher.phone || '',
        newTeacher: null,
        newDistrict: '',
        newWorkstation: '',
        newPhone: '',
      });
      fetchAllTeachers();
    }
  }, [currentTeacher, isOpen]);

  const fetchAllTeachers = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('primaryteachers')
        .select(`
          id, 
          teacher_name, 
          phone, 
          workstation,
          region_code,
          district_number,
          districts:district_number (district_name)
        `)
        .eq('status', 'active');

      if (error) throw error;

      setTeachers(
        data.map((t: any) => ({
          id: t.id,
          teacher_name: t.teacher_name || '',
          phone: t.phone || 'N/A',
          workstation: t.workstation || 'N/A',
          region_code: t.region_code,
          district_number: t.district_number,
          district: t.districts?.district_name || 'N/A',
          searchBlob: `${t.teacher_name} ${t.workstation} ${t.districts?.district_name}`.toLowerCase(),
        }))
      );
    } catch (err) {
      showError('Failed to load teachers');
    } finally {
      setFetching(false);
    }
  };

  const handleTeacherSelect = (teacher: any) => {
    setFormData((prev) => ({
      ...prev,
      newTeacher: teacher,
      newDistrict: teacher?.district || '',
      newWorkstation: teacher?.workstation || '',
      newPhone: teacher?.phone || '',
    }));
  };

  const validateAndSubmit = async () => {
    if (!formData.newTeacher) return;

    setLoading(true);
    try {
      // 1. Already assigned to this exact job
      const { data: stationConflicts } = await supabase
        .from('teacher_assignments')
        .select('id')
        .eq('job_id', jobId)
        .eq('teacher_id', formData.newTeacher.id);

      if (stationConflicts?.length) {
        showError("This teacher is already assigned to this job.");
        setLoading(false);
        return;
      }

      // 2. Other 2026 assignments → show confirmation
      const { data: yearlyJobs } = await supabase
        .from('teacher_assignments')
        .select('job_id, jobassignments!inner(name)')
        .eq('teacher_id', formData.newTeacher.id)
        .gte('assigned_at', '2026-01-01')
        .lte('assigned_at', '2026-12-31');

      if (yearlyJobs?.length) {
        const jobNames = [...new Set(yearlyJobs.map((j: any) => j.jobassignments.name))].join(', ');
        setDialogConfig({
          open: true,
          type: 'reassign',
          description: `This teacher has already participated in: ${jobNames}. Proceed anyway?`,
        });
        setLoading(false);
        return;
      }

      await executeUpdate();
    } catch (err) {
      showError("Validation failed");
    } finally {
      setLoading(false);
    }
  };

  const executeUpdate = async () => {
    setLoading(true);
    try {
      const payload = {
        teacher_id: formData.newTeacher.id,
        region_code: formData.newTeacher.region_code,
        district_number: formData.newTeacher.district_number,
      };

      let error;

      if (currentTeacher?.isNew) {
        ({ error } = await supabase.from('teacher_assignments').insert({
          ...payload,
          job_id: jobId,
          assignment_year: 2026,
        }));
      } else {
        const assignmentId = currentTeacher?.assignmentId;
        if (!assignmentId) throw new Error("Missing Assignment ID");

        ({ error } = await supabase
          .from('teacher_assignments')
          .update(payload)
          .eq('id', assignmentId));
      }

      if (error) throw error;

      showSuccess(currentTeacher?.isNew ? 'Teacher assigned successfully' : 'Teacher reassigned successfully');
      onAssignmentUpdated();
      onClose();
    } catch (err: any) {
      showError(err.message || 'Failed to process assignment');
    } finally {
      setLoading(false);
      setDialogConfig((prev) => ({ ...prev, open: false }));
    }
  };

  const isReassign = !currentTeacher?.isNew;

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        sx={{ zIndex: 1200 }}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
          },
        }}
      >
        <Box sx={{ p: 3, pb: 2, borderBottom: '1px solid #e5e7eb', position: 'relative' }}>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ position: 'absolute', right: 16, top: 16, color: '#64748b' }}
          >
            <X size={18} />
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '18px',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <AccountCircle sx={{ fontSize: 22 }} />
            {isReassign ? 'Reassign Teacher' : 'Assign Teacher'}
          </Typography>
        </Box>

        <DialogContent sx={{ p: 3, bgcolor: '#ffffff' }}>
          <div className="space-y-6">
            {!isReassign ? null : (
              <div>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: '#64748b',
                    mb: 1.5,
                    display: 'block',
                  }}
                >
                  Current Teacher
                </Typography>

                <div className="space-y-3">
                  <TextField
                    label="Teacher Name"
                    value={formData.currentName}
                    fullWidth
                    size="small"
                    InputProps={{
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccountCircle sx={{ fontSize: 18, color: '#64748b' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="District" value={formData.currentDistrict} fullWidth size="small" InputProps={{ readOnly: true }} />
                    <TextField label="Workstation" value={formData.currentWorkstation} fullWidth size="small" InputProps={{ readOnly: true }} />
                  </div>
                  <TextField label="Phone Number" value={formData.currentPhone} fullWidth size="small" InputProps={{ readOnly: true }} />
                </div>
              </div>
            )}

            {isReassign && <Divider sx={{ my: 4 }} />}

            <div>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  color: '#64748b',
                  mb: 1.5,
                  display: 'block',
                }}
              >
                {isReassign ? 'New Teacher' : 'Select Teacher'}
              </Typography>

              <div className="space-y-3">
                <Autocomplete
                  options={teachers}
                  getOptionLabel={(option) => option.teacher_name}
                  filterOptions={filter}
                  autoHighlight
                  value={formData.newTeacher}
                  onChange={(_, val) => handleTeacherSelect(val)}
                  loading={fetching}
                  renderOption={(props, option) => {
                    const { key, ...other } = props;
                    return (
                      <li key={option.id} {...other} className="py-2 px-3 hover:bg-slate-50">
                        <div className="font-semibold">{option.teacher_name}</div>
                        <div className="text-xs text-[#64748b]">
                          {option.district} • {option.workstation}
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
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: '#64748b' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <>
                            {fetching && <CircularProgress size={20} />}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <TextField label="District" value={formData.newDistrict} fullWidth size="small" InputProps={{ readOnly: true }} />
                  <TextField label="Workstation" value={formData.newWorkstation} fullWidth size="small" InputProps={{ readOnly: true }} />
                </div>

                <TextField label="Phone Number" value={formData.newPhone} fullWidth size="small" InputProps={{ readOnly: true }} />
              </div>
            </div>
          </div>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid #e5e7eb', justifyContent: 'flex-end' }}>
          <Button
            variant="default"
            className={cn(
              "bg-slate-900 hover:bg-black text-white uppercase tracking-wider font-black text-[10px] h-10 px-8 rounded-lg shadow-sm",
              (loading || !formData.newTeacher) && "opacity-70 cursor-not-allowed"
            )}
            disabled={loading || !formData.newTeacher}
            onClick={validateAndSubmit}
          >
            {loading ? (
              <>
                <CircularProgress size={14} sx={{ color: 'white', mr: 1.5 }} />
                Validating...
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                {isReassign ? 'Reassign Teacher' : 'Assign Teacher'}
              </>
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conflict Confirmation Dialog */}
      <AlertDialog
        open={dialogConfig.open}
        onOpenChange={(open) => setDialogConfig((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent className="max-w-[420px] rounded-2xl border border-slate-200 shadow-2xl p-6 z-[9999]">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-red-50 text-red-600">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-slate-900">
                Potential Conflict
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
              {dialogConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex gap-3 mt-6">
            <AlertDialogCancel className="flex-1 h-11 border-slate-200 text-slate-500 hover:text-slate-900 font-bold uppercase text-[10px] tracking-widest rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                executeUpdate();
              }}
              className="flex-[1.5] h-11 font-black uppercase text-[10px] tracking-widest rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors"
            >
              Confirm Assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ReassignTeacherModal;