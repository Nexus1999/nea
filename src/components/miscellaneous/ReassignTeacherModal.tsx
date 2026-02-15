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
  createFilterOptions
} from '@mui/material';
import { AccountCircle } from '@mui/icons-material';
import { X, Search, UserPlus, AlertTriangle } from 'lucide-react';
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

const filter = createFilterOptions({
  limit: 50,
  stringify: (option: any) => option.searchBlob,
});

const ReassignTeacherModal = ({ 
  isOpen, 
  onClose, 
  currentTeacher, 
  jobId, 
  onAssignmentUpdated 
}: any) => {
  const [formData, setFormData] = useState({
    currentName: '',
    currentDistrict: '',
    currentWorkstation: '',
    currentPhone: '',
    newTeacher: null as any,
    newDistrict: '',
    newWorkstation: '',
    newPhone: ''
  });
  
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  const [dialogConfig, setDialogConfig] = useState({ 
    open: false, 
    type: 'reassign', 
    description: '' 
  });

  useEffect(() => {
    if (currentTeacher && isOpen) {
      setFormData({
        currentName: currentTeacher.fullname || '',
        currentDistrict: currentTeacher.district || '',
        currentWorkstation: currentTeacher.workstation || '',
        currentPhone: currentTeacher.phone || '',
        newTeacher: null,
        newDistrict: '',
        newWorkstation: '',
        newPhone: ''
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
          districts:district_number (district_name)
        `)
        .eq('status', 'active');

      if (error) throw error;

      setTeachers(data.map((t: any) => ({
        id: t.id,
        teacher_name: t.teacher_name || '',
        phone: t.phone || 'N/A',
        workstation: t.workstation || 'N/A',
        district: t.districts?.district_name || 'N/A',
        searchBlob: `${t.teacher_name} ${t.workstation} ${t.districts?.district_name}`.toLowerCase()
      })));
    } catch (err) {
      showError('Failed to load teachers');
    } finally {
      setFetching(false);
    }
  };

  const handleTeacherSelect = (teacher: any) => {
    setFormData(prev => ({
      ...prev,
      newTeacher: teacher,
      newDistrict: teacher?.district || '',
      newWorkstation: teacher?.workstation || '',
      newPhone: teacher?.phone || ''
    }));
  };

  const validateAndSubmit = async (e: any) => {
    if (e) e.preventDefault();
    if (!formData.newTeacher) return;

    setLoading(true);
    try {
      // Check for 2026 assignments
      const { data: yearlyJobs } = await supabase
        .from('teacher_assignments')
        .select(`job_id, jobassignments!inner(name)`)
        .eq('teacher_id', formData.newTeacher.id)
        .gte('assigned_at', '2026-01-01')
        .lte('assigned_at', '2026-12-31');

      const { data: stationConflicts } = await supabase
        .from('teacher_assignments')
        .select(`id`)
        .eq('job_id', jobId)
        .eq('teacher_id', formData.newTeacher.id);

      const hasStationConflict = stationConflicts && stationConflicts.length > 0;

      if ((yearlyJobs && yearlyJobs.length > 0) || hasStationConflict) {
        let message = "";
        if (yearlyJobs && yearlyJobs.length > 0) {
          const jobNames = Array.from(new Set(yearlyJobs.map((j: any) => j.jobassignments.name))).join(', ');
          message += `This teacher has already participated in: ${jobNames}. `;
        }
        if (hasStationConflict) {
          message += `This teacher is already assigned to this specific job. `;
        }

        setDialogConfig({
          open: true,
          type: 'reassign',
          description: message
        });
        setLoading(false);
        return;
      }

      await executeUpdate();
    } catch (err) {
      showError("Validation failed");
      setLoading(false);
    }
  };

  const executeUpdate = async () => {
    // FIX: Get ID directly from prop to avoid any closure issues
    const assignmentId = currentTeacher?.assignmentId;
    if (!assignmentId) {
      showError("Critical Error: Missing Assignment ID");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('teacher_assignments')
        .update({ teacher_id: formData.newTeacher.id })
        .eq('id', assignmentId);

      if (error) throw error;

      showSuccess('Teacher reassigned successfully');
      onAssignmentUpdated();
      onClose();
    } catch (err: any) {
      showError(err.message || 'Failed to reassign');
    } finally {
      setLoading(false);
      setDialogConfig(prev => ({ ...prev, open: false }));
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        // FIX: Ensure main dialog doesn't block the Alert
        sx={{ zIndex: 1200 }} 
        PaperProps={{
          sx: { borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }
        }}
      >
        <Box sx={{ p: 3, pb: 2, borderBottom: '1px solid #e5e7eb', position: 'relative' }}>
          <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', right: 16, top: 16, color: '#64748b' }}>
            <X size={18} />
          </IconButton>
          
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountCircle sx={{ fontSize: 20 }} /> Reassign Teacher
          </Typography>
        </Box>

        <DialogContent sx={{ p: 3, bgcolor: '#ffffff' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', color: '#64748b', mb: 1.5, display: 'block' }}>
                Current Teacher
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <TextField
                  label="Teacher Name"
                  value={formData.currentName}
                  fullWidth
                  InputProps={{ 
                    readOnly: true, 
                    startAdornment: <InputAdornment position="start"><AccountCircle sx={{ fontSize: 18, color: '#64748b' }} /></InputAdornment> 
                  }}
                  size="small"
                />
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <TextField label="District" value={formData.currentDistrict} fullWidth size="small" InputProps={{ readOnly: true }} />
                  <TextField label="Workstation" value={formData.currentWorkstation} fullWidth size="small" InputProps={{ readOnly: true }} />
                </Box>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', color: '#64748b', mb: 1.5, display: 'block' }}>
                New Teacher
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Autocomplete
                  options={teachers}
                  getOptionLabel={(option: any) => option.teacher_name}
                  filterOptions={filter}
                  autoHighlight
                  disableListWrap
                  renderOption={(props, option: any) => {
                    const { key, ...otherProps } = props;
                    return (
                      <Box component="li" key={option.id} {...otherProps} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important', py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.teacher_name}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {option.district} • {option.workstation}
                        </Typography>
                      </Box>
                    );
                  }}
                  value={formData.newTeacher}
                  onChange={(_, val) => handleTeacherSelect(val)}
                  loading={fetching}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search by name, district, or station..."
                      size="small"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={18} color="#64748b" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <React.Fragment>
                            {fetching ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </React.Fragment>
                        ),
                      }}
                    />
                  )}
                />
                
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <TextField label="District" value={formData.newDistrict} fullWidth size="small" InputProps={{ readOnly: true }} />
                  <TextField label="Workstation" value={formData.newWorkstation} fullWidth size="small" InputProps={{ readOnly: true }} />
                </Box>
                <TextField label="Phone Number" value={formData.newPhone} fullWidth size="small" InputProps={{ readOnly: true }} />
              </Box>
            </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid #e5e7eb', justifyContent: 'flex-end' }}>
          <Button 
            variant="default" 
            size="sm" 
            className="bg-slate-900 hover:bg-black text-[10px] font-black uppercase tracking-wider rounded-lg h-10 px-8" 
            disabled={loading || !formData.newTeacher}
            onClick={validateAndSubmit}
          >
            {loading ? (
              <CircularProgress size={14} sx={{ color: 'white', mr: 1 }} />
            ) : (
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            )}
            {loading ? 'Validating...' : 'Reassign Teacher'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* FIXED ALERT DIALOG: Added forced zIndex */}
      <AlertDialog 
        open={dialogConfig.open} 
        onOpenChange={(val) => setDialogConfig({ ...dialogConfig, open: val })}
      >
        <AlertDialogContent className="max-w-[420px] rounded-2xl border border-slate-200 shadow-2xl p-6 z-[9999]">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-indigo-50 text-indigo-600`}>
                <AlertTriangle className="h-7 w-7" />
              </div>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-slate-900">
                Potential Conflict
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-slate-500 text-center leading-relaxed">
              {dialogConfig.description}
              <br/><br/>
              Are you sure you want to proceed with this assignment?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-row items-center gap-3 mt-6">
            <AlertDialogCancel className="flex-1 h-11 border-slate-200 text-slate-500 hover:text-slate-900 font-bold uppercase text-[10px] tracking-widest rounded-xl mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                executeUpdate();
              }}
              className="flex-[1.5] h-11 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-sm bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Reassignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ReassignTeacherModal;