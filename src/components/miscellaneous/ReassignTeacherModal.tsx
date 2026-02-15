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
          region_code,
          district_number,
          districts:district_number (district_name)
        `)
        .eq('status', 'active');

      if (error) throw error;

      setTeachers(data.map((t: any) => ({
        id: t.id,
        teacher_name: t.teacher_name || '',
        phone: t.phone || 'N/A',
        workstation: t.workstation || 'N/A',
        region_code: t.region_code, // Captured for the NOT NULL constraint
        district_number: t.district_number, // Captured for the NOT NULL constraint
        district_name: t.districts?.district_name || 'N/A',
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
      newDistrict: teacher?.district_name || '',
      newWorkstation: teacher?.workstation || '',
      newPhone: teacher?.phone || ''
    }));
  };

  const validateAndSubmit = async (e: any) => {
    if (e) e.preventDefault();
    if (!formData.newTeacher) return;

    setLoading(true);
    try {
      // 1. Check if teacher already participated in 2026
      const { data: yearlyJobs, error: yearlyError } = await supabase
        .from('teacher_assignments')
        .select(`job_id, jobassignments(name)`)
        .eq('teacher_id', formData.newTeacher.id)
        .eq('assignment_year', 2026);

      if (yearlyError) throw yearlyError;

      // 2. Check if teacher is already in THIS specific job
      const { data: stationConflicts } = await supabase
        .from('teacher_assignments')
        .select(`id`)
        .eq('job_id', jobId)
        .eq('teacher_id', formData.newTeacher.id);

      const hasStationConflict = stationConflicts && stationConflicts.length > 0;
      const hasYearlyConflict = yearlyJobs && yearlyJobs.length > 0;

      if (hasYearlyConflict || hasStationConflict) {
        let message = "";
        if (hasYearlyConflict) {
          const jobNames = yearlyJobs.map((j: any) => j.jobassignments?.name).filter(Boolean).join(', ');
          message += `Teacher has already participated in: ${jobNames || 'Another Job'}. `;
        }
        if (hasStationConflict) {
          message += `Teacher is already assigned to this specific job list. `;
        }

        setDialogConfig({
          open: true,
          type: 'reassign',
          description: message
        });
        setLoading(false); // Stop loading to allow dialog to show
        return;
      }

      await executeUpdate();
    } catch (err: any) {
      showError("Validation failed: " + err.message);
      setLoading(false);
    }
  };

  const executeUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('teacher_assignments')
        .update({ 
          teacher_id: formData.newTeacher.id,
          region_code: formData.newTeacher.region_code,     // Fix: NOT NULL requirement
          district_number: formData.newTeacher.district_number // Fix: NOT NULL requirement
        })
        .eq('id', currentTeacher.assignmentId);

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
      <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
        <Box sx={{ p: 3, pb: 2, borderBottom: '1px solid #e5e7eb', position: 'relative' }}>
          <IconButton onClick={onClose} size="small" sx={{ position: 'absolute', right: 16, top: 16 }}>
            <X size={18} />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountCircle /> Reassign Teacher
          </Typography>
        </Box>

        <DialogContent sx={{ p: 3 }}>
            {/* Current Teacher Info (Read Only) */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', mb: 1.5, display: 'block' }}>
                CURRENT TEACHER
              </Typography>
              <TextField label="Name" value={formData.currentName} fullWidth readOnly size="small" sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField label="District" value={formData.currentDistrict} fullWidth readOnly size="small" />
                <TextField label="Workstation" value={formData.currentWorkstation} fullWidth readOnly size="small" />
              </Box>
            </Box>

            {/* New Teacher Search */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', mb: 1.5, display: 'block' }}>
                NEW ASSIGNMENT
              </Typography>
              <Autocomplete
                options={teachers}
                getOptionLabel={(option: any) => option.teacher_name}
                filterOptions={filter}
                value={formData.newTeacher}
                onChange={(_, val) => handleTeacherSelect(val)}
                loading={fetching}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Search by name or district..." size="small" />
                )}
                renderOption={(props, option: any) => (
                  <Box component="li" {...props} key={option.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{option.teacher_name}</Typography>
                    <Typography variant="caption">{option.district_name} • {option.workstation}</Typography>
                  </Box>
                )}
              />
              
              <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
                <TextField label="New District" value={formData.newDistrict} fullWidth readOnly size="small" />
                <TextField label="New Workstation" value={formData.newWorkstation} fullWidth readOnly size="small" />
              </Box>
            </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button 
            className="bg-slate-900 text-white w-full h-11" 
            disabled={loading || !formData.newTeacher}
            onClick={validateAndSubmit}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : <><UserPlus className="mr-2 h-4 w-4" /> Reassign Teacher</>}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conflict Alert */}
      <AlertDialog open={dialogConfig.open} onOpenChange={(val) => setDialogConfig({ ...dialogConfig, open: val })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex flex-col items-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <AlertDialogTitle>Duplicate Assignment Detected</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                {dialogConfig.description}
                <br /><br />
                Do you want to force this reassignment anyway?
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeUpdate} className="bg-red-600">
              Confirm Reassignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ReassignTeacherModal;