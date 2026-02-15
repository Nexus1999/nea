import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

interface JobAssignment {
  id: string;
  name: string;
  section: string;
  start_date: string;
  end_date: string;
  total_required: number;
  status: 'pending' | 'active' | 'completed';
}

interface EditJobAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  assignment: JobAssignment;
}

export const EditJobAssignmentModal = ({ open, onOpenChange, onSuccess, assignment }: EditJobAssignmentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: assignment.name,
    section: assignment.section,
    start_date: assignment.start_date,
    end_date: assignment.end_date,
    total_required: assignment.total_required,
    status: assignment.status
  });

  useEffect(() => {
    setFormData({
      name: assignment.name,
      section: assignment.section,
      start_date: assignment.start_date,
      end_date: assignment.end_date,
      total_required: assignment.total_required,
      status: assignment.status
    });
  }, [assignment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('jobassignments')
      .update(formData)
      .eq('id', assignment.id);

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Assignment updated successfully");
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Assignment Name</Label>
            <Input 
              id="edit-name" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-section">Section</Label>
            <Input 
              id="edit-section" 
              value={formData.section} 
              onChange={e => setFormData({...formData, section: e.target.value})} 
              required 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start_date">Start Date</Label>
              <Input 
                id="edit-start_date" 
                type="date" 
                value={formData.start_date} 
                onChange={e => setFormData({...formData, start_date: e.target.value})} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end_date">End Date</Label>
              <Input 
                id="edit-end_date" 
                type="date" 
                value={formData.end_date} 
                onChange={e => setFormData({...formData, end_date: e.target.value})} 
                required 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-total_required">Total Required</Label>
            <Input 
              id="edit-total_required" 
              type="number" 
              value={formData.total_required} 
              onChange={e => setFormData({...formData, total_required: parseInt(e.target.value)})} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value: any) => setFormData({...formData, status: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};