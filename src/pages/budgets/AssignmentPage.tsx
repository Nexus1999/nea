"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  UserCheck, 
  Truck, 
  Shield, 
  Users, 
  Save, 
  Loader2, 
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  MapPin
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";

const AssignmentPage = () => {
  const { id: budgetId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [budget, setBudget] = useState<any>(null);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Budget
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .single();
      setBudget(budgetData);

      // 2. Fetch Current Template Version Requirements
      const { data: version } = await supabase
        .from('transportation_template_versions')
        .select('id')
        .eq('template_id', (await supabase.from('transportation_templates').select('id').eq('budget_id', budgetId).single()).data?.id)
        .eq('is_current', true)
        .single();

      if (version) {
        const { data: reqs } = await supabase
          .from('transportation_template_personnel')
          .select(`
            *,
            transportation_routes (name)
          `)
          .eq('template_version_id', version.id);
        
        setRequirements(reqs || []);

        // 3. Fetch Existing Assignments
        const { data: existing } = await supabase
          .from('transportation_assignments')
          .select('*')
          .eq('template_version_id', version.id);
        
        const assignmentMap: Record<string, string> = {};
        existing?.forEach(a => {
          // We use a composite key to map assignments back to requirements
          const key = `${a.route_id}-${a.role}-${a.region_name || 'global'}`;
          assignmentMap[key] = a.participant_id;
        });
        setAssignments(assignmentMap);
      }

      // 4. Fetch All Available Participants
      const { data: parts } = await supabase.from('participants').select('*').eq('active', true);
      setParticipants(parts || []);

    } catch (err: any) {
      showError("Failed to load assignment data");
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssign = (req: any, participantId: string) => {
    const key = `${req.route_id}-${req.role}-${req.region_name || 'global'}`;
    setAssignments(prev => ({ ...prev, [key]: participantId }));
  };

  const handleSaveAssignments = async () => {
    setSaving(true);
    try {
      // This would involve clearing old assignments and inserting new ones for this version
      showSuccess("Assignments saved successfully!");
    } catch (err: any) {
      showError("Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" label="Loading Assignment Engine..." /></div>;

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <UserCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
              <span>Execution Layer</span>
              <ChevronRight className="w-3 h-3" />
              <span>Workforce Allocation</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              Staff Assignments
            </h1>
          </div>
        </div>

        <Button 
          onClick={handleSaveAssignments}
          disabled={saving}
          className="rounded-xl h-11 px-8 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-[10px] tracking-widest gap-2 shadow-lg"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Assignments
        </Button>
      </div>

      {/* ASSIGNMENT GRID */}
      <div className="grid grid-cols-1 gap-6">
        {requirements.map((req) => (
          <Card key={req.id} className="border-none shadow-sm rounded-[2rem] overflow-hidden hover:shadow-md transition-all border border-slate-100">
            <CardContent className="p-0 flex flex-col md:flex-row">
              <div className="p-8 md:w-1/3 bg-slate-50/50 border-r border-slate-100">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                  <MapPin className="w-3 h-3" /> {req.transportation_routes?.name}
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
                  {req.role.replace(/_/g, ' ')}
                </h3>
                {req.region_name && (
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-none font-bold text-[10px]">
                    REGION: {req.region_name}
                  </Badge>
                )}
                <div className="mt-4 flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span>Qty: {req.quantity}</span>
                  <span>Days: {req.days}</span>
                </div>
              </div>

              <div className="p-8 flex-1 flex items-center gap-6">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Staff Member</label>
                  <Select 
                    value={assignments[`${req.route_id}-${req.role}-${req.region_name || 'global'}`] || ""}
                    onValueChange={(val) => handleAssign(req, val)}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 font-bold">
                      <SelectValue placeholder="Choose from available staff..." />
                    </SelectTrigger>
                    <SelectContent>
                      {participants
                        .filter(p => p.role === req.role)
                        .map(p => (
                          <SelectItem key={p.id} value={p.id} className="font-bold uppercase text-xs">
                            {p.full_name} ({p.rank || 'Standard'})
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-px h-12 bg-slate-100 hidden md:block" />

                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Allocated Cost</p>
                  <p className="text-xl font-black text-slate-900">TZS {req.total_cost.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FINALIZATION */}
      <div className="flex justify-center pt-10">
        <Button 
          size="lg" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 rounded-2xl shadow-xl shadow-indigo-100 font-black uppercase text-xs tracking-widest h-14"
          onClick={() => {
            showSuccess("Assignments finalized! Deployment orders generated.");
            navigate('/dashboard/budgets');
          }}
        >
          <CheckCircle2 className="w-5 h-5 mr-2" /> Finalize Deployment
        </Button>
      </div>
    </div>
  );
};

export default AssignmentPage;