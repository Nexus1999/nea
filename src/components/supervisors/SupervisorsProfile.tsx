"use client";

import React, { useEffect, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  User as PersonIcon,
  Briefcase as WorkIcon,
  GraduationCap as SchoolIcon,
  ClipboardList as AssignmentIcon,
  MapPin,
} from "lucide-react";
import Spinner from "@/components/Spinner";
import { supabase } from "@/integrations/supabase/client";
import abbreviateSchoolName from "@/utils/abbreviateSchoolName";

/* ---------------- UI HELPERS ---------------- */

const InfoCard = ({ icon: Icon, title, children }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200">
    <div className="flex items-center gap-2 border-b border-slate-50 pb-3 mb-4 text-slate-600">
      <Icon className="h-4 w-4 text-slate-400" />
      <h4 className="text-xs font-bold uppercase tracking-widest">{title}</h4>
    </div>
    <div className="space-y-2.5">{children}</div>
  </div>
);

const DataField = ({ label, value }) => (
  <div className="flex items-baseline gap-2">
    <span className="text-[11px] font-bold uppercase text-slate-400 tracking-tight whitespace-nowrap">
      {label}:
    </span>
    <span className="text-[14px] font-semibold text-slate-700 truncate">
      {value || "N/A"}
    </span>
  </div>
);

/* ---------------- MAIN COMPONENT ---------------- */

export const SupervisorDetailsDrawer = ({ open, onOpenChange, supervisorId }) => {
  const [supervisor, setSupervisor] = useState(null);
  const [workCenter, setWorkCenter] = useState(null);
  const [eduCenter, setEduCenter] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  // RESET DATA ON CLOSE
  useEffect(() => {
    if (!open) {
      setSupervisor(null);
      setWorkCenter(null);
      setEduCenter(null);
      setAssignments([]);
    } else if (supervisorId) {
      loadAllData();
    }
  }, [open, supervisorId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Basic Supervisor Info
      const { data: sup } = await supabase
        .from("supervisors")
        .select("*")
        .eq("id", supervisorId)
        .single();

      if (sup) {
        setSupervisor(sup);
        
        // Professional Details Lookup
        if (sup.center_no) {
          const { data: sec } = await supabase.from("secondaryschools").select("name").eq("center_no", sup.center_no).single();
          if (sec) {
            setWorkCenter(abbreviateSchoolName(sec.name));
          } else {
            const { data: col } = await supabase.from("teacherscolleges").select("name").eq("center_no", sup.center_no).single();
            setWorkCenter(abbreviateSchoolName(col?.name || sup.supervisor_center_name));
          }
        }

        // Education Background Lookup
        if (sup.index_no && sup.index_no.includes("-")) {
          const eduCenterNo = sup.index_no.split("-")[0]; 
          const { data: edu } = await supabase
            .from("secondaryschools")
            .select("name, region, district")
            .eq("center_no", eduCenterNo)
            .single();
          
          if (edu) {
            setEduCenter({
              ...edu,
              name: abbreviateSchoolName(edu.name)
            });
          }
        }

        // 2. Load Assignment History from supervisorassignments table
        // Construct clean full name (handles missing middle names)
        const fullName = `${sup.first_name} ${sup.middle_name || ""} ${sup.last_name}`.replace(/\s+/g, ' ').trim();
        
        const { data: assignData, error: assignError } = await supabase
          .from("supervisorassignments")
          .select(`
            assignment_id,
            center_no,
            workstation,
            assigned_by,
            assigned_at,
            supervisions (
              mastersummaries (
                Code,
                Year
              )
            )
          `)
          .ilike("supervisor_name", `%${fullName}%`)
          .order("assigned_at", { ascending: false });
        
        if (assignError) throw assignError;

        // Flatten data for display
        const formattedHistory = (assignData || []).map(a => ({
          id: a.assignment_id,
          exam: `${a.supervisions?.mastersummaries?.Code || 'N/A'} ${a.supervisions?.mastersummaries?.Year || ''}`,
          center: a.center_no,
          workstation: a.workstation,
          assigned_by: a.assigned_by,
          date: a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : "N/A"
        }));

        setAssignments(formattedHistory);
      }
    } catch (error) {
      console.error("Error loading supervisor details:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[1000px] p-0 bg-[#f8fafc] flex flex-col border-l shadow-2xl overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Spinner /></div>
        ) : (
          <>
            {/* HEADER */}
            <div className="relative p-10 text-slate-800 overflow-hidden bg-[linear-gradient(135deg,#e2e8f0_0%,#f1f5f9_50%,#cbd5e1_100%)] border-b border-slate-200">
              <div className="absolute inset-0 opacity-[0.08] pointer-events-none" 
                   style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='11' cy='18' r='7' fill='%23000'/%3E%3Ccircle cx='59' cy='43' r='7' fill='%23000'/%3E%3Ccircle cx='16' cy='36' r='3' fill='%23000'/%3E%3Ccircle cx='79' cy='67' r='3' fill='%23000'/%3E%3Ccircle cx='34' cy='90' r='3' fill='%23000'/%3E%3Ccircle cx='90' cy='14' r='3' fill='%23000'/%3E%3Ccircle cx='12' cy='86' r='4' fill='%23000'/%3E%3Ccircle cx='40' cy='21' r='4' fill='%23000'/%3E%3Ccircle cx='63' cy='10' r='5' fill='%23000'/%3E%3C/svg%3E")` }}></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="h-28 w-28 rounded-2xl rotate-3 border-4 border-white bg-white/50 flex items-center justify-center shadow-lg shrink-0">
                  <PersonIcon className="h-12 w-12 text-slate-400 -rotate-3" />
                </div>
                <div className="text-center md:text-left flex-1">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                    {supervisor?.first_name} {supervisor?.middle_name} {supervisor?.last_name}
                  </h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-2 text-slate-500 font-medium italic">
                    <MapPin className="h-4 w-4" />
                    {supervisor?.region || "N/A"} • {supervisor?.district || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <InfoCard icon={PersonIcon} title="Personal Details">
                  <DataField label="First Name" value={supervisor?.first_name} />
                  <DataField label="Middle Name" value={supervisor?.middle_name} />
                  <DataField label="Last Name" value={supervisor?.last_name} />
                  <DataField label="NIN" value={supervisor?.nin} />
                  <DataField label="Phone" value={supervisor?.phone} />
                </InfoCard>

                <InfoCard icon={WorkIcon} title="Professional Details">
                  <DataField label="TSC Number" value={supervisor?.tsc_no} />
                  <DataField label="Cheque No" value={supervisor?.cheque_no} />
                  <DataField label="Center Name" value={workCenter} />
                  <DataField label="Center Number" value={supervisor?.center_no} />
                  <DataField label="Center Type" value={supervisor?.center_type} />
                </InfoCard>

                <InfoCard icon={SchoolIcon} title="Education Background">
                  <DataField label="Region" value={eduCenter?.region} />
                  <DataField label="District" value={eduCenter?.district} />
                  <DataField label="Center" value={eduCenter?.name} />
                  <DataField label="Index No" value={supervisor?.index_no} />
                  <DataField label="Year" value={supervisor?.csee_year} />
                </InfoCard>
              </div>

              {/* ASSIGNMENT HISTORY TABLE */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center gap-2 bg-slate-50/30">
                  <AssignmentIcon className="h-5 w-5 text-slate-400" />
                  <h3 className="font-bold text-lg text-slate-800 tracking-tight">Deployment History</h3>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="w-12 text-center font-bold text-[10px] uppercase">#</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase">Exam</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase">Center</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase">Workstation</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase">Assigned By</TableHead>
                        <TableHead className="text-right font-bold text-[10px] uppercase pr-8">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.length > 0 ? (
                        assignments.map((a, i) => (
                          <TableRow key={a.id || i} className="hover:bg-slate-50/50">
                            <TableCell className="text-center font-mono text-xs text-slate-400">
                              {(i + 1).toString().padStart(2, '0')}
                            </TableCell>
                            <TableCell className="font-bold text-slate-700 text-xs">
                              {a.exam}
                            </TableCell>
                            <TableCell className="text-slate-600 text-xs font-medium uppercase">
                              {a.center}
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs uppercase italic">
                              {a.workstation ? abbreviateSchoolName(a.workstation) : "—"}
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs font-semibold">
                              {a.assigned_by}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-slate-500 pr-8">
                              {a.date}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-slate-400 italic">No records found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};