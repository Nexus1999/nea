import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

interface AddJobAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddJobAssignmentModal = ({ open, onOpenChange, onSuccess }: AddJobAssignmentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    section: '',
    start_date: '',
    end_date: '',
    total_required: 0,
    status: 'pending' as const
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('jobassignments')
      .insert([formData]);

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Assignment added successfully");
      onSuccess();
      onOpenChange(false);
      setFormData({
        name: '',
        section: '',
        start_date: '',
        end_date: '',
        total_required: 0,
        status: 'pending'
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Assignment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Assignment Name</Label>
            <Input 
              id="name" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="section">Section</Label>
            <Input 
              id="section" 
              value={formData.section} 
              onChange={e => setFormData({...formData, section: e.target.value})} 
              required 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input 
                id="start_date" 
                type="date" 
                value={formData.start_date} 
                onChange={e => setFormData({...formData, start_date: e.target.value})} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input 
                id="end_date" 
                type="date" 
                value={formData.end_date} 
                onChange={e => setFormData({...formData, end_date: e.target.value})} 
                required 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="total_required">Total Required</Label>
            <Input 
              id="total_required" 
              type="number" 
              value={formData.total_required} 
              onChange={e => setFormData({...formData, total_required: parseInt(e.target.value)})} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
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
              {loading ? "Saving..." : "Save Assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};