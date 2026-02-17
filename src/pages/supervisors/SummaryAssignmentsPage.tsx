"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { 
  School, Users, Globe2, ArrowLeft,
  ShieldCheck, Building2, MapPin, 
  Search, Info, BarChart3, CheckCircle2, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import { cn } from "@/lib/utils";

// --- Constants ---
const EXCLUDED_REGIONS = [
  "KASKAZINI PEMBA",
  "KUSINI PEMBA",
  "KASKAZINI UNGUJA",
  "KUSINI UNGUJA",
  "MJINI MAGHARIBI"
];

// --- Types ---
interface SummaryStats {
  required: number;
  assigned: number;
  missing: number;
  progress: number;
  fullyAssigned: boolean;
}

interface RegionGroup {
  name: string;
  centers: SummaryStats;
  supervisors: SummaryStats;
  fullyAssigned: boolean;
  districts: Record<string, { centers: SummaryStats; supervisors: SummaryStats; fullyAssigned: boolean }>;
}

// --- Components ---

const SummaryCard = ({ title, stats, icon: Icon, colorClass, gradient }: any) => {
  const progress = stats.progress || 0;
  
  return (
    <Card className="relative overflow-hidden border-none shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
      <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${gradient}`} />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className={`p-3 rounded-2xl bg-white shadow-sm ring-1 ring-black/5`}>
            <Icon className={`h-6 w-6 ${colorClass}`} />
          </div>
          <Badge className={cn(
            "bg-white border-current font-bold text-[10px]",
            stats.fullyAssigned ? "text-emerald-600" : colorClass
          )}>
            {stats.fullyAssigned ? "FULLY ASSIGNED" : `${stats.assigned} / ${stats.required}`}
          </Badge>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-4xl font-black tracking-tighter">
              {progress}%
            </h3>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Allocation Progress</span>
            <span className="text-xs font-black">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-black/5" indicatorClassName={colorClass.replace('text-', 'bg-')} />
          
          <div className="flex justify-between pt-2 border-t border-black/5">
             <div className="flex items-center gap-1.5">
               <div className="h-2 w-2 rounded-full bg-slate-300" />
               <span className="text-[10px] font-medium text-muted-foreground">{stats.assigned} Assigned</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="h-2 w-2 rounded-full bg-slate-800" />
               <span className="text-[10px] font-medium text-muted-foreground">{stats.missing} Missing</span>
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SummaryAssignmentsPage = () => {
  const navigate = useNavigate();
  const { id: supervisionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [regions, setRegions] = useState<RegionGroup[]>([]);
  const [examInfo, setExamInfo] = useState({ code: '', year: '' });
  const [overallStats, setOverallStats] = useState({
    centers: { required: 0, assigned: 0, missing: 0, progress: 0, fullyAssigned: false },
    supervisors: { required: 0, assigned: 0, missing: 0, progress: 0, fullyAssigned: false }
  });

  useEffect(() => {
    document.title = "Assignments Summary | NEAS";
    if (supervisionId) fetchSummaryData();
  }, [supervisionId]);

  const fetchSummaryData = async () => {
    setLoading(true);
    try {
      // 1. Get supervision details
      const { data: supervision, error: supErr } = await supabase
        .from("supervisions")
        .select(`mid, mastersummaries ( Examination, Code, Year )`)
        .eq("id", supervisionId)
        .single();

      if (supErr) throw supErr;
      setExamInfo({ 
        code: supervision.mastersummaries.Code, 
        year: supervision.mastersummaries.Year.toString() 
      });

      const centersTableMap: Record<string, string> = {
        "SFNA": "primarymastersummary", "SSNA": "primarymastersummary", "PSLE": "primarymastersummary",
        "FTNA": "secondarymastersummaries", "CSEE": "secondarymastersummaries", "ACSEE": "secondarymastersummaries",
        "DPEE": "dpeemastersummary", "DPNE": "dpnemastersummary"
      };

      const centersTable = centersTableMap[supervision.mastersummaries.Code];
      if (!centersTable) throw new Error("Unsupported exam code");

      // 2. Fetch all data in parallel
      const [centersRes, availableSupsRes, assignedSupsRes] = await Promise.all([
        supabase.from(centersTable).select("region, district, center_number").eq("mid", supervision.mid).eq("is_latest", 1),
        supabase.from("supervisors").select("region, district").eq("status", "ACTIVE").eq("is_latest", 1),
        supabase.from("supervisorassignments").select("region, district, center_no").eq("supervision_id", supervisionId)
      ]);

      // 3. Filter out excluded regions
      const filterData = (data: any[]) => data?.filter(item => !EXCLUDED_REGIONS.includes(item.region?.toUpperCase())) || [];
      
      const centers = filterData(centersRes.data);
      const assigned = filterData(assignedSupsRes.data);

      // 4. Process into Region/District Map
      const regionMap: Record<string, RegionGroup> = {};

      centers.forEach(c => {
        const rName = c.region || "Other";
        const dName = c.district || "General";
        
        if (!regionMap[rName]) {
          regionMap[rName] = { 
            name: rName, 
            centers: { required: 0, assigned: 0, missing: 0, progress: 0, fullyAssigned: true },
            supervisors: { required: 0, assigned: 0, missing: 0, progress: 0, fullyAssigned: true },
            fullyAssigned: true,
            districts: {} 
          };
        }
        
        if (!regionMap[rName].districts[dName]) {
          regionMap[rName].districts[dName] = { 
            centers: { required: 0, assigned: 0, missing: 0, progress: 0, fullyAssigned: false },
            supervisors: { required: 0, assigned: 0, missing: 0, progress: 0, fullyAssigned: false },
            fullyAssigned: false
          };
        }

        regionMap[rName].centers.required++;
        regionMap[rName].districts[dName].centers.required++;
      });

      // Map assigned
      assigned.forEach(a => {
        const rName = a.region || "Other";
        const dName = a.district || "General";
        if (regionMap[rName] && regionMap[rName].districts[dName]) {
          regionMap[rName].supervisors.assigned++;
          regionMap[rName].districts[dName].supervisors.assigned++;
          if (a.center_no !== 'RESERVE') {
            regionMap[rName].centers.assigned++;
            regionMap[rName].districts[dName].centers.assigned++;
          }
        }
      });

      // 5. Final Calculations
      let totalCentersReq = 0, totalCentersAss = 0;
      let totalSupsReq = 0, totalSupsAss = 0;

      Object.values(regionMap).forEach(r => {
        // Supervisors required = centers + (districts * 5)
        const districtCount = Object.keys(r.districts).length;
        r.supervisors.required = r.centers.required + (districtCount * 5);
        
        r.centers.missing = Math.max(0, r.centers.required - r.centers.assigned);
        r.centers.progress = r.centers.required > 0 ? Math.round((r.centers.assigned / r.centers.required) * 100) : 0;
        
        r.supervisors.missing = Math.max(0, r.supervisors.required - r.supervisors.assigned);
        r.supervisors.progress = r.supervisors.required > 0 ? Math.round((r.supervisors.assigned / r.supervisors.required) * 100) : 0;

        totalCentersReq += r.centers.required;
        totalCentersAss += r.centers.assigned;
        totalSupsReq += r.supervisors.required;
        totalSupsAss += r.supervisors.assigned;

        Object.values(r.districts).forEach(d => {
          d.supervisors.required = d.centers.required + 5;
          d.centers.missing = Math.max(0, d.centers.required - d.centers.assigned);
          d.centers.progress = d.centers.required > 0 ? Math.round((d.centers.assigned / d.centers.required) * 100) : 0;
          d.supervisors.missing = Math.max(0, d.supervisors.required - d.supervisors.assigned);
          d.supervisors.progress = d.supervisors.required > 0 ? Math.round((d.supervisors.assigned / d.supervisors.required) * 100) : 0;
          
          d.fullyAssigned = d.centers.assigned >= d.centers.required && d.supervisors.assigned >= d.supervisors.required;
          if (!d.fullyAssigned) r.fullyAssigned = false;
        });
      });

      setOverallStats({
        centers: { 
          required: totalCentersReq, assigned: totalCentersAss, 
          missing: totalCentersReq - totalCentersAss, 
          progress: totalCentersReq > 0 ? Math.round((totalCentersAss / totalCentersReq) * 100) : 0,
          fullyAssigned: totalCentersAss >= totalCentersReq
        },
        supervisors: { 
          required: totalSupsReq, assigned: totalSupsAss, 
          missing: totalSupsReq - totalSupsAss, 
          progress: totalSupsReq > 0 ? Math.round((totalSupsAss / totalSupsReq) * 100) : 0,
          fullyAssigned: totalSupsAss >= totalSupsReq
        }
      });

      setRegions(Object.values(regionMap).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      showError("Failed to load summary data");
    } finally {
      setLoading(false);
    }
  };

  const filteredRegions = regions.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-6 bg-slate-50">
        <Spinner size="lg" />
        <div className="text-center space-y-2">
           <h2 className="text-xl font-bold text-slate-800">Syncing Summary...</h2>           
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-10 space-y-10 max-w-7xl mx-auto pb-32">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 py-1 px-3 rounded-full">
              <Info className="h-3 w-3 mr-2" /> {examInfo.code} {examInfo.year}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 text-slate-500 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
          <h4 className="text-4xl font-black text-slate-900 tracking-tight">Assignments Summary</h4>       
        </div>
        
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search regions..." 
            className="pl-10 h-12 bg-white border-slate-200 shadow-sm rounded-xl focus:ring-2 focus:ring-blue-500/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <SummaryCard 
          title="Centers Allocation" 
          stats={overallStats.centers} 
          icon={School} 
          colorClass="text-red-600" 
          gradient="from-red-400 to-orange-500"
        />
        <SummaryCard 
          title="Supervisors Allocation" 
          stats={overallStats.supervisors} 
          icon={Users} 
          colorClass="text-emerald-600" 
          gradient="from-emerald-400 to-teal-500"
        />
      </div>

      {/* Regional Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg text-white">
              <Globe2 className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Regional Breakdown</h2>
          </div>
          <Badge className="bg-slate-100 text-slate-600 border-none px-4 py-1">{filteredRegions.length} Regions tracked</Badge>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {filteredRegions.map((region) => (
            <AccordionItem key={region.name} value={region.name} className="border-none bg-white rounded-2xl shadow-sm overflow-hidden group">
              <AccordionTrigger className="hover:no-underline px-6 py-5 group-data-[state=open]:bg-slate-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between w-full text-left gap-4 pr-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center font-bold",
                      region.fullyAssigned ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                    )}>
                       {region.fullyAssigned ? <CheckCircle2 className="h-5 w-5" /> : region.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-extrabold text-lg text-slate-800">{region.name}</span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {Object.keys(region.districts).length} Districts
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-8">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-bold">CENTERS</p>
                      <p className={cn("font-black", region.centers.fullyAssigned ? "text-emerald-600" : "text-red-600")}>
                        {region.centers.assigned}/{region.centers.required}
                      </p>
                    </div>
                    <div className="w-px h-8 bg-slate-200 self-center hidden md:block" />
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-bold">SUPERVISORS</p>
                      <p className={cn("font-black", region.supervisors.fullyAssigned ? "text-emerald-600" : "text-blue-600")}>
                        {region.supervisors.assigned}/{region.supervisors.required}
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  {Object.entries(region.districts).map(([dName, dStats]) => (
                    <div key={dName} className={cn(
                      "p-4 rounded-xl border transition-all cursor-default",
                      dStats.fullyAssigned ? "border-emerald-100 bg-emerald-50/30" : "border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md"
                    )}>
                      <div className="flex justify-between items-center mb-3 border-b pb-2">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-tight truncate">{dName}</h4>
                        {dStats.fullyAssigned && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                            <span className="text-red-700 uppercase">Centers</span>
                            <span className="font-black">{dStats.centers.assigned}/{dStats.centers.required}</span>
                          </div>
                          <Progress value={dStats.centers.progress} className="h-1" indicatorClassName="bg-red-500" />
                        </div>
                        <div>
                          <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                            <span className="text-blue-700 uppercase">Supervisors</span>
                            <span className="font-black">{dStats.supervisors.assigned}/{dStats.supervisors.required}</span>
                          </div>
                          <Progress value={dStats.supervisors.progress} className="h-1" indicatorClassName="bg-blue-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default SummaryAssignmentsPage;