"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ChevronDown, ChevronUp, MapPin, Building, School, Users, 
  AlertCircle, ArrowLeft, BarChart3, CheckCircle2, XCircle 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SummaryStats {
  required: number;
  assigned: number;
  missing: number;
  progress: number;
  fullyAssigned: boolean;
}

interface RegionSummary {
  name: string;
  centers: SummaryStats;
  supervisors: SummaryStats;
  fullyAssigned: boolean;
}

interface DistrictSummary {
  name: string;
  centers: SummaryStats;
  supervisors: SummaryStats & { available: number };
  fullyAssigned: boolean;
}

function useAnimatedValue(target: number, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const percentage = Math.min(progress / duration, 1);
      const eased = 1 - Math.pow(1 - percentage, 3);
      setValue(Math.floor(eased * target));
      if (progress < duration) requestAnimationFrame(step);
      else setValue(target);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return value;
}

const SummaryCard = ({
  title,
  value,
  total,
  progress,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: number;
  total?: number;
  progress: number;
  icon: any;
  color: string;
  loading: boolean;
}) => {
  const animatedValue = useAnimatedValue(value);
  const animatedProgress = useAnimatedValue(progress);

  return (
    <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300">
      <div className={cn("h-2 w-full", color)} />
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className={cn("p-3 rounded-lg bg-opacity-10", color.replace("bg-", "bg-"))}>
            <Icon className={cn("h-6 w-6", color.replace("bg-", "text-"))} />
          </div>
          {loading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <Badge variant="outline" className="font-mono">
              {animatedProgress}%
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          {loading ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <p className="text-3xl font-bold tracking-tight">{animatedValue.toLocaleString()}</p>
          )}
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Completed</span>
            <span className="font-medium">
              {loading ? <Skeleton className="h-4 w-12 inline-block" /> : value.toLocaleString()}
            </span>
          </div>
          <Progress value={animatedProgress} className="h-2" indicatorClassName={color.replace("bg-", "")} />
          {total !== undefined && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Total: {total.toLocaleString()}</span>
              <span>Remaining: {Math.max(0, total - value).toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const SummaryAssignmentsPage = () => {
  const navigate = useNavigate();
  const { id: supervisionId } = useParams();

  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [districtsByRegion, setDistrictsByRegion] = useState<Record<string, DistrictSummary[]>>({});
  const [overall, setOverall] = useState<{
    regions: { total: number; assigned: number; progress: number };
    districts: { total: number; assigned: number; progress: number };
    centers: { total: number; assigned: number; progress: number };
    supervisors: { total: number; assigned: number; progress: number };
  } | null>(null);

  const [examInfo, setExamInfo] = useState<{ code: string; year: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  useEffect(() => {
    if (!supervisionId) {
      setError("Invalid supervision ID");
      setLoading(false);
      return;
    }

    const loadSummary = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Get supervision details
        const { data: supervision, error: supErr } = await supabase
          .from("supervisions")
          .select(`
            mid,
            mastersummaries ( Examination, Code, Year )
          `)
          .eq("id", supervisionId)
          .single();

        if (supErr) throw supErr;
        if (!supervision) throw new Error("Supervision session not found");

        const code = supervision.mastersummaries.Code;
        const year = supervision.mastersummaries.Year;
        const mid = supervision.mid;

        setExamInfo({ code, year });

        // 2. Define centers table mapping
        const centersTableMap: Record<string, string> = {
          "SFNA": "primarymastersummary",
          "SSNA": "primarymastersummary",
          "PSLE": "primarymastersummary",
          "FTNA": "secondarymastersummaries",
          "CSEE": "secondarymastersummaries",
          "ACSEE": "secondarymastersummaries",
          "DPEE": "dpeemastersummary",
          "DPNE": "dpnemastersummary"
        };

        const centersTable = centersTableMap[code];
        if (!centersTable) throw new Error("Unsupported exam code");

        // 3. Execute all data queries in parallel (Replicating backend logic)
        const [centersRes, availableSupsRes, assignedSupsRes] = await Promise.all([
          // Get centers grouped by region/district
          supabase.from(centersTable).select("region, district, center_number").eq("mid", mid).eq("is_latest", 1),
          // Get available supervisors count by district
          supabase.from("supervisors").select("region, district").eq("status", "ACTIVE").eq("is_latest", 1),
          // Get assigned supervisors count by district
          supabase.from("supervisorassignments").select("region, district, center_no, supervisor_name").eq("supervision_id", supervisionId)
        ]);

        if (centersRes.error) throw centersRes.error;
        if (availableSupsRes.error) throw availableSupsRes.error;
        if (assignedSupsRes.error) throw assignedSupsRes.error;

        // 4. Process Data into District Map
        const districtMap = new Map<string, DistrictSummary & { region: string }>();

        // Initialize districts from centers table
        centersRes.data.forEach((c: any) => {
          const key = `${c.region}-${c.district}`;
          if (!districtMap.has(key)) {
            districtMap.set(key, {
              region: c.region,
              name: c.district,
              centers: { required: 0, assigned: 0, missing: 0, progress: 0, fullyAssigned: false },
              supervisors: { required: 0, assigned: 0, missing: 0, progress: 0, fullyAssigned: false, available: 0 },
              fullyAssigned: false
            });
          }
          districtMap.get(key)!.centers.required++;
        });

        // Map available supervisors
        availableSupsRes.data.forEach((s: any) => {
          const key = `${s.region}-${s.district}`;
          if (districtMap.has(key)) {
            districtMap.get(key)!.supervisors.available++;
          }
        });

        // Map assigned supervisors and centers
        assignedSupsRes.data.forEach((a: any) => {
          const key = `${a.region}-${a.district}`;
          if (districtMap.has(key)) {
            const d = districtMap.get(key)!;
            d.supervisors.assigned++;
            // If center_no is not 'RESERVE', it counts as a center assignment
            if (a.center_no !== 'RESERVE') {
              d.centers.assigned++;
            }
          }
        });

        // 5. Calculate Progress and Fully Assigned Status for Districts
        districtMap.forEach((d) => {
          // Required supervisors = centers + 5 (Reserve logic)
          d.supervisors.required = d.centers.required + 5;
          
          d.centers.missing = Math.max(0, d.centers.required - d.centers.assigned);
          d.centers.progress = d.centers.required > 0 ? Math.round((d.centers.assigned / d.centers.required) * 100) : 0;
          d.centers.fullyAssigned = d.centers.assigned >= d.centers.required;

          d.supervisors.missing = Math.max(0, d.supervisors.required - d.supervisors.assigned);
          d.supervisors.progress = d.supervisors.required > 0 ? Math.round((d.supervisors.assigned / d.supervisors.required) * 100) : 0;
          d.supervisors.fullyAssigned = d.supervisors.assigned >= d.supervisors.required;

          // District is fully assigned only if BOTH centers and supervisors (including reserve) are met
          d.fullyAssigned = d.centers.fullyAssigned && d.supervisors.fullyAssigned;
        });

        // 6. Build Region Map
        const regionMap = new Map<string, RegionSummary>();
        const districtsByReg: Record<string, DistrictSummary[]> = {};

        districtMap.forEach((d) => {
          if (!regionMap.has(d.region)) {
            regionMap.set(d.region, {
              name: d.region,
              centers: { required: 0, assigned: 0, missing: 0, progress: 0, fullyAssigned: true },
              supervisors: { required: 0, assigned: 0, missing: 0, progress: 0, fullyAssigned: true },
              fullyAssigned: true
            });
            districtsByReg[d.region] = [];
          }

          const r = regionMap.get(d.region)!;
          r.centers.required += d.centers.required;
          r.centers.assigned += d.centers.assigned;
          r.centers.missing += d.centers.missing;

          r.supervisors.required += d.supervisors.required;
          r.supervisors.assigned += d.supervisors.assigned;
          r.supervisors.missing += d.supervisors.missing;

          if (!d.fullyAssigned) r.fullyAssigned = false;
          
          districtsByReg[d.region].push(d);
        });

        // Calculate Region Progress
        regionMap.forEach((r) => {
          r.centers.progress = r.centers.required > 0 ? Math.round((r.centers.assigned / r.centers.required) * 100) : 0;
          r.supervisors.progress = r.supervisors.required > 0 ? Math.round((r.supervisors.assigned / r.supervisors.required) * 100) : 0;
          r.centers.fullyAssigned = r.centers.assigned >= r.centers.required;
          r.supervisors.fullyAssigned = r.supervisors.assigned >= r.supervisors.required;
        });

        // 7. Calculate Overall Totals
        const districtValues = Array.from(districtMap.values());
        const regionValues = Array.from(regionMap.values());

        const fullyAssignedDistricts = districtValues.filter(d => d.fullyAssigned).length;
        const fullyAssignedRegions = regionValues.filter(r => r.fullyAssigned).length;

        const totalCenters = districtValues.reduce((a, d) => a + d.centers.required, 0);
        const assignedCenters = districtValues.reduce((a, d) => a + d.centers.assigned, 0);

        const totalSups = districtValues.reduce((a, d) => a + d.supervisors.required, 0);
        const assignedSups = districtValues.reduce((a, d) => a + d.supervisors.assigned, 0);

        setRegions(regionValues.sort((a, b) => a.name.localeCompare(b.name)));
        setDistrictsByRegion(districtsByReg);
        setOverall({
          regions: { 
            total: regionValues.length, 
            assigned: fullyAssignedRegions, 
            progress: regionValues.length > 0 ? Math.round((fullyAssignedRegions / regionValues.length) * 100) : 0 
          },
          districts: { 
            total: districtValues.length, 
            assigned: fullyAssignedDistricts, 
            progress: districtValues.length > 0 ? Math.round((fullyAssignedDistricts / districtValues.length) * 100) : 0 
          },
          centers: { 
            total: totalCenters, 
            assigned: assignedCenters, 
            progress: totalCenters > 0 ? Math.round((assignedCenters / totalCenters) * 100) : 0 
          },
          supervisors: { 
            total: totalSups, 
            assigned: assignedSups, 
            progress: totalSups > 0 ? Math.round((assignedSups / totalSups) * 100) : 0 
          },
        });

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load summary data");
      } finally {
        setLoading(false);
      }
    };

    loadSummary();
  }, [supervisionId]);

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Assignments Summary {examInfo ? `— ${examInfo.code} ${examInfo.year}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of centers and supervisors allocation (including +5 reserve per district)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-8 w-16 mb-4" />
              <Skeleton className="h-10 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-2 w-full mt-6" />
            </Card>
          ))}
        </div>
      ) : overall ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
          <SummaryCard
            title="Regions (Fully Assigned)"
            value={overall.regions.assigned}
            total={overall.regions.total}
            progress={overall.regions.progress}
            icon={MapPin}
            color="bg-amber-500"
            loading={loading}
          />
          <SummaryCard
            title="Districts (Fully Assigned)"
            value={overall.districts.assigned}
            total={overall.districts.total}
            progress={overall.districts.progress}
            icon={Building}
            color="bg-blue-500"
            loading={loading}
          />
          <SummaryCard
            title="Centers Assigned"
            value={overall.centers.assigned}
            total={overall.centers.total}
            progress={overall.centers.progress}
            icon={School}
            color="bg-red-500"
            loading={loading}
          />
          <SummaryCard
            title="Supervisors Assigned"
            value={overall.supervisors.assigned}
            total={overall.supervisors.total}
            progress={overall.supervisors.progress}
            icon={Users}
            color="bg-green-500"
            loading={loading}
          />
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Region & District Breakdown</CardTitle>
          <CardDescription>Detailed allocation status per region and district</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-8 w-48 mb-4" />
                  <div className="grid md:grid-cols-2 gap-4">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : regions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No assignment data found for this session.
            </div>
          ) : (
            <div className="space-y-3">
              {regions.map((region) => (
                <div key={region.name} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full px-5 py-4 text-left flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors"
                    onClick={() => setExpandedRegion(expandedRegion === region.name ? null : region.name)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedRegion === region.name ? (
                        <ChevronUp className="h-5 w-5 text-primary" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-primary" />
                      )}
                      <span className="font-bold">{region.name}</span>
                      {region.fullyAssigned && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Fully Assigned
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary">
                      {districtsByRegion[region.name]?.length || 0} districts
                    </Badge>
                  </button>

                  {expandedRegion === region.name && (
                    <div className="p-5 pt-3 space-y-6 bg-muted/30">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <School className="h-4 w-4 text-red-600" /> Centers Summary
                          </div>
                          <div className="border rounded-xl p-4 bg-white shadow-sm">
                            <div className="flex justify-between text-sm mb-3">
                              <span className="font-medium">Total Required:</span>
                              <span className="font-bold">{region.centers.required}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">Assigned:</span>
                              <span className="font-bold text-red-600">{region.centers.assigned}</span>
                            </div>
                            <Progress value={region.centers.progress} className="h-2 mb-2" indicatorClassName="bg-red-500" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-600" /> Supervisors Summary
                          </div>
                          <div className="border rounded-xl p-4 bg-white shadow-sm">
                            <div className="flex justify-between text-sm mb-3">
                              <span className="font-medium">Total Required (+5):</span>
                              <span className="font-bold">{region.supervisors.required}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">Assigned:</span>
                              <span className="font-bold text-green-600">{region.supervisors.assigned}</span>
                            </div>
                            <Progress value={region.supervisors.progress} className="h-2 mb-2" indicatorClassName="bg-green-500" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">District Details</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {districtsByRegion[region.name].map((dist) => (
                            <div key={dist.name} className={cn(
                              "p-4 rounded-xl border bg-white shadow-sm transition-all",
                              dist.fullyAssigned ? "border-green-200 bg-green-50/30" : "border-slate-100"
                            )}>
                              <div className="flex justify-between items-start mb-3">
                                <h5 className="text-sm font-bold uppercase tracking-tight truncate pr-2">{dist.name}</h5>
                                {dist.fullyAssigned ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-slate-300 shrink-0" />
                                )}
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-1">
                                    <span>Centers</span>
                                    <span>{dist.centers.assigned}/{dist.centers.required}</span>
                                  </div>
                                  <Progress value={dist.centers.progress} className="h-1" indicatorClassName="bg-red-500" />
                                </div>
                                <div>
                                  <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-1">
                                    <span>Supervisors</span>
                                    <span>{dist.supervisors.assigned}/{dist.supervisors.required}</span>
                                  </div>
                                  <Progress value={dist.supervisors.progress} className="h-1" indicatorClassName="bg-green-500" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SummaryAssignmentsPage;