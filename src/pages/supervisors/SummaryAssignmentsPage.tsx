"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronDown, ChevronUp, MapPin, Building, School, Users, AlertCircle, ArrowLeft, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SummaryStats {
  total: number;
  assigned: number;
  progress: number;
}

interface RegionSummary {
  name: string;
  centers: SummaryStats;
  supervisors: SummaryStats;
}

interface DistrictSummary {
  name: string;
  centers: SummaryStats;
  supervisors: SummaryStats & { available?: number };
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
            <span>Assigned</span>
            <span className="font-medium">
              {loading ? <Skeleton className="h-4 w-12 inline-block" /> : value.toLocaleString()}
            </span>
          </div>
          <Progress value={animatedProgress} className="h-2" indicatorClassName={color.replace("bg-", "")} />
          {total !== undefined && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Total: {total.toLocaleString()}</span>
              <span>Missing: {(total - value).toLocaleString()}</span>
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
    regions: SummaryStats;
    districts: SummaryStats;
    centers: SummaryStats;
    supervisors: SummaryStats;
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

        // 2. Get all assignments for this supervision
        const { data: assignments, error: assignErr } = await supabase
          .from("supervisorassignments")
          .select("region, district, center_no, supervisor_name")
          .eq("supervision_id", supervisionId);

        if (assignErr) throw assignErr;

        // 3. Get total centers from appropriate mastersummary table
        let centersTable: string;
        switch (code) {
          case "SFNA":
          case "SSNA":
          case "PSLE":
            centersTable = "primarymastersummary";
            break;
          case "FTNA":
          case "CSEE":
          case "ACSEE":
            centersTable = "secondarymastersummaries";
            break;
          case "DPEE":
            centersTable = "dpeemastersummary";
            break;
          case "DPNE":
            centersTable = "dpnemastersummary";
            break;
          default:
            centersTable = "secondarymastersummaries";
        }

        const { data: centers, error: centerErr } = await supabase
          .from(centersTable)
          .select("region, district, center_number")
          .eq("mid", mid)
          .eq("is_latest", 1);

        if (centerErr) throw centerErr;

        // 4. Process data
        const regionMap = new Map<string, { centers: Set<string>; supervisors: Set<string> }>();
        const districtMap = new Map<string, Map<string, { centers: Set<string>; supervisors: Set<string> }>>();

        // Process centers (total required)
        centers?.forEach((c: any) => {
          const reg = c.region?.trim();
          const dist = c.district?.trim();
          const center = c.center_number?.trim();

          if (!reg || !dist || !center) return;

          if (!regionMap.has(reg)) {
            regionMap.set(reg, { centers: new Set(), supervisors: new Set() });
          }
          regionMap.get(reg)!.centers.add(center);

          if (!districtMap.has(reg)) districtMap.set(reg, new Map());
          const distMap = districtMap.get(reg)!;
          if (!distMap.has(dist)) distMap.set(dist, { centers: new Set(), supervisors: new Set() });
          distMap.get(dist)!.centers.add(center);
        });

        // Process assignments (assigned supervisors)
        assignments?.forEach((a: any) => {
          const reg = a.region?.trim();
          const dist = a.district?.trim();
          const supervisor = a.supervisor_name?.trim();

          if (!reg || !dist || !supervisor) return;

          if (regionMap.has(reg)) {
            regionMap.get(reg)!.supervisors.add(supervisor);
          }

          if (districtMap.has(reg)) {
            const distMap = districtMap.get(reg)!;
            if (distMap.has(dist)) {
              distMap.get(dist)!.supervisors.add(supervisor);
            }
          }
        });

        // Build final region summaries
        const regionSummaries: RegionSummary[] = [];
        const districtsByReg: Record<string, DistrictSummary[]> = {};

        regionMap.forEach((stats, regName) => {
          const totalCenters = stats.centers.size;
          const assignedSupervisors = stats.supervisors.size;
          const requiredSupervisors = totalCenters;

          regionSummaries.push({
            name: regName,
            centers: {
              total: totalCenters,
              assigned: totalCenters,
              progress: 100,
            },
            supervisors: {
              total: requiredSupervisors,
              assigned: assignedSupervisors,
              progress: totalCenters > 0 ? Math.round((assignedSupervisors / requiredSupervisors) * 100) : 0,
            },
          });

          const districtSummaries: DistrictSummary[] = [];
          districtMap.get(regName)?.forEach((dStats, distName) => {
            const dTotalCenters = dStats.centers.size;
            const dAssigned = dStats.supervisors.size;
            const dRequired = dTotalCenters;

            districtSummaries.push({
              name: distName,
              centers: {
                total: dTotalCenters,
                assigned: dTotalCenters,
                progress: 100,
              },
              supervisors: {
                total: dRequired,
                assigned: dAssigned,
                progress: dTotalCenters > 0 ? Math.round((dAssigned / dRequired) * 100) : 0,
              },
            });
          });

          districtsByReg[regName] = districtSummaries.sort((a, b) => a.name.localeCompare(b.name));
        });

        // Overall totals
        let totalCenters = 0;
        let totalSupervisorsRequired = 0;
        let totalSupervisorsAssigned = 0;
        let totalDistricts = 0;

        regionSummaries.forEach(r => {
          totalCenters += r.centers.total;
          totalSupervisorsRequired += r.supervisors.total;
          totalSupervisorsAssigned += r.supervisors.assigned;
        });

        Object.values(districtsByReg).forEach(dists => {
          totalDistricts += dists.length;
        });

        setRegions(regionSummaries.sort((a, b) => a.name.localeCompare(b.name)));
        setDistrictsByRegion(districtsByReg);
        setOverall({
          regions: { total: regionSummaries.length, assigned: regionSummaries.length, progress: 100 },
          districts: { total: totalDistricts, assigned: totalDistricts, progress: 100 },
          centers: { total: totalCenters, assigned: totalCenters, progress: 100 },
          supervisors: {
            total: totalSupervisorsRequired,
            assigned: totalSupervisorsAssigned,
            progress: totalSupervisorsRequired > 0 ? Math.round((totalSupervisorsAssigned / totalSupervisorsRequired) * 100) : 0,
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
            Overview of centers and supervisors allocation
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
            title="Regions"
            value={overall.regions.assigned}
            total={overall.regions.total}
            progress={overall.regions.progress}
            icon={MapPin}
            color="bg-amber-500"
            loading={loading}
          />
          <SummaryCard
            title="Districts"
            value={overall.districts.assigned}
            total={overall.districts.total}
            progress={overall.districts.progress}
            icon={Building}
            color="bg-blue-500"
            loading={loading}
          />
          <SummaryCard
            title="Centers"
            value={overall.centers.assigned}
            total={overall.centers.total}
            progress={overall.centers.progress}
            icon={School}
            color="bg-red-500"
            loading={loading}
          />
          <SummaryCard
            title="Supervisors"
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
          <CardDescription>Centers and supervisors allocation details</CardDescription>
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
                      <span className="font-medium">{region.name}</span>
                    </div>
                    <Badge variant="secondary">
                      {districtsByRegion[region.name]?.length || 0} districts
                    </Badge>
                  </button>

                  {expandedRegion === region.name && (
                    <div className="p-5 pt-3 grid md:grid-cols-2 gap-6 bg-muted/30">
                      <div>
                        <div className="text-sm font-medium mb-2.5 flex items-center gap-2">
                          <School className="h-4 w-4 text-red-600" />
                          Centers
                        </div>
                        <div className="border rounded-lg p-4 bg-white shadow-sm">
                          <div className="flex justify-between text-sm mb-3">
                            <span>Total:</span>
                            <span className="font-medium">{region.centers.total}</span>
                          </div>
                          <Progress
                            value={region.centers.progress}
                            className="h-2 mb-2"
                            indicatorClassName="bg-red-500"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-2.5 flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-600" />
                          Supervisors
                        </div>
                        <div className="border rounded-lg p-4 bg-white shadow-sm">
                          <div className="flex justify-between text-sm mb-3">
                            <span>Required:</span>
                            <span className="font-medium">{region.supervisors.total}</span>
                          </div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Assigned:</span>
                            <span className="font-medium text-green-700">
                              {region.supervisors.assigned}
                            </span>
                          </div>
                          <Progress
                            value={region.supervisors.progress}
                            className="h-2 mb-2"
                            indicatorClassName="bg-green-500"
                          />
                          <div className="text-xs text-muted-foreground text-right">
                            {region.supervisors.total - region.supervisors.assigned} missing
                          </div>
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