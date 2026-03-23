import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UALIMU_CODES = ["GATCE", "DSEE", "GATSCCE", "DPEE", "DSPEE", "DPPEE"];

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getCentersTable(code: string) {
  const map: Record<string, string> = {
    "SFNA": "primarymastersummary",
    "SSNA": "primarymastersummary",
    "PSLE": "primarymastersummary",
    "FTNA": "secondarymastersummaries",
    "CSEE": "secondarymastersummaries",
    "ACSEE": "secondarymastersummaries",
    "DPEE": "ualimumastersummary",
    "DPNE": "dpnemastersummary",
    "GATCE": "ualimumastersummary",
    "DSEE": "ualimumastersummary",
    "GATSCCE": "ualimumastersummary",
    "DSPEE": "ualimumastersummary",
    "DPPEE": "ualimumastersummary",
    "UALIMU": "ualimumastersummary"
  };
  return map[code.toUpperCase()] || null;
}

function abbreviateSchoolName(name: string) {
  if (!name) return '';
  const abbreviations: Record<string, string> = {
    'SECONDARY SCHOOL': 'SS',
    'PRIMARY SCHOOL': 'PS',
    'TEACHERS COLLEGE': 'TC',
    'TECHNICAL COLLEGE': 'TEC',
    'UNIVERSITY': 'UNIV',
    'INSTITUTE': 'INST',
    'SEMINARY': 'SEM'
  };
  let abbreviated = name.toUpperCase();
  for (const [full, abbr] of Object.entries(abbreviations)) {
    abbreviated = abbreviated.replace(full, abbr);
  }
  return abbreviated.substring(0, 20);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { code, year, regions = [], districts = [], assigned_by, supervision_id } = await req.json();

    if (!supervision_id) throw new Error("supervision_id is required");

    // ── Get current supervision & master ────────────────────────────────────────
    const { data: supervision, error: supErr } = await supabase
      .from('supervisions')
      .select(`
        id, mid,
        mastersummaries!inner (id, Code, Year)
      `)
      .eq('id', supervision_id)
      .single();

    if (supErr || !supervision) throw new Error("Supervision not found");

    const master = supervision.mastersummaries;
    const currentYear = year ?? master.Year;
    
    // Ensure code is trimmed and standardized
    const rawCode = (code || master.Code || "").toString().trim().toUpperCase();
    const examCode = rawCode;

    console.log(`🚀 Assignment started: ${supervision_id} (${examCode}-${currentYear})`);

    const isUalimu = examCode === "UALIMU" || UALIMU_CODES.includes(examCode);
    const isAcsee = examCode === "ACSEE";

    // ── SYMMETRIC EXCLUSION: ACSEE ↔ Ualimu ─────────────────────────────────────
    const forbiddenNames = new Set<string>();

    if (isUalimu || isAcsee) {
      let conflictCodes: string[] = [];
      if (isUalimu) conflictCodes = ["ACSEE"];
      else if (isAcsee) conflictCodes = UALIMU_CODES;

      const { data: conflictMasters } = await supabase
        .from('mastersummaries')
        .select('id')
        .in('Code', conflictCodes)
        .eq('Year', currentYear);

      if (conflictMasters?.length) {
        const mids = conflictMasters.map(m => m.id);
        const { data: conflictSups } = await supabase
          .from('supervisions')
          .select('id')
          .in('mid', mids);

        if (conflictSups?.length) {
          const supIds = conflictSups.map(s => s.id);
          const { data: assigns } = await supabase
            .from('supervisorassignments')
            .select('supervisor_name')
            .in('supervision_id', supIds);

          assigns?.forEach(a => {
            if (a.supervisor_name) forbiddenNames.add(a.supervisor_name);
          });
        }
      }
    }

    // ── Prevent duplicate assignments in this supervision + area ────────────────
    let dupQ = supabase
      .from('supervisorassignments')
      .select('id', { count: 'exact', head: true })
      .eq('supervision_id', supervision_id);

    if (regions[0]) dupQ = dupQ.eq('region', regions[0]);
    if (districts[0]) dupQ = dupQ.eq('district', districts[0]);

    const { count: dupCount } = await dupQ;
    if (dupCount > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: `${dupCount} assignments already exist here. Clear them first.`
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Load centers ────────────────────────────────────────────────────────────
    let centers: any[] = [];

    if (isUalimu) {
      console.log("Processing Ualimu combined assignment...");
      const allUalimuData: any[] = [];
      
      // Fetch centers for each Ualimu code in a loop as requested
      for (const uCode of UALIMU_CODES) {
        const { data: uMaster } = await supabase
          .from('mastersummaries')
          .select('id')
          .eq('Code', uCode)
          .eq('Year', currentYear)
          .eq('is_latest', true)
          .maybeSingle();
        
        if (!uMaster) continue;

        let q = supabase
          .from('ualimumastersummary')
          .select('*')
          .eq('mid', uMaster.id)
          .eq('is_latest', 1);

        if (regions[0] && !districts[0]) q = q.eq('region', regions[0]);
        else if (districts[0] && !regions[0]) q = q.eq('district', districts[0]);
        else if (regions[0] && districts[0]) q = q.eq('region', regions[0]).eq('district', districts[0]);

        const { data: uData } = await q;
        if (uData) allUalimuData.push(...uData);
      }

      if (!allUalimuData.length) throw new Error("No Ualimu centers found for the specified criteria");

      // Group by center and calculate requirements
      const centerMap = new Map();
      allUalimuData.forEach(c => {
        const key = c.center_number;
        const subjectValues = Object.entries(c)
          .filter(([k]) => !['id','mid','region','district','center_name','center_number','is_latest','version','created_at'].includes(k) && typeof c[k] === 'number')
          .map(([, v]) => Number(v) || 0);
        
        const maxStudents = subjectValues.length > 0 ? Math.max(...subjectValues) : 0;
        
        if (!centerMap.has(key)) {
          centerMap.set(key, { ...c, totalStudents: maxStudents });
        } else {
          const existing = centerMap.get(key);
          // For combined Ualimu, we take the max students across all Ualimu exam types at that center
          existing.totalStudents = Math.max(existing.totalStudents, maxStudents);
        }
      });

      centers = Array.from(centerMap.values()).map(c => {
        const streams = Math.ceil(c.totalStudents / 40);
        return {
          ...c,
          required_supervisors: Math.ceil(streams / 10) || 1
        };
      });
    } else {
      const table = getCentersTable(examCode);
      if (!table) throw new Error(`Unknown exam code: ${examCode}`);

      let q = supabase
        .from(table)
        .select('region, district, center_name, center_number')
        .eq('mid', master.id)
        .eq('is_latest', true);

      if (regions[0] && !districts[0]) q = q.eq('region', regions[0]);
      else if (districts[0] && !regions[0]) q = q.eq('district', districts[0]);
      else if (regions[0] && districts[0]) q = q.eq('region', regions[0]).eq('district', districts[0]);

      const { data: cData, error: cErr } = await q;
      if (cErr) throw cErr;
      centers = (cData || []).map(c => ({ ...c, required_supervisors: 1 }));
    }

    if (!centers.length) throw new Error("No centers found");
    console.log(`Found ${centers.length} distinct centers`);

    // ── S/P grouping (only for FTNA/CSEE/ACSEE) ─────────────────────────────────
    const isSecondary = ["FTNA", "CSEE", "ACSEE"].includes(examCode);
    const centerGroups: Record<string, any> = {};

    if (isSecondary) {
      centers.forEach(c => {
        let no = c.center_number;
        let t: 'S'|'P'|null = null;
        if (no.startsWith('S')) { t = 'S'; no = no.slice(1); }
        else if (no.startsWith('P')) { t = 'P'; no = no.slice(1); }
        if (!centerGroups[no]) centerGroups[no] = { S: null, P: null, district: c.district, region: c.region };
        if (t) centerGroups[no][t] = c;
      });
    }

    // ── Load supervisors + apply exclusion ──────────────────────────────────────
    let supQ = supabase
      .from('supervisors')
      .select('id, region, district, center_no, center_type, first_name, middle_name, last_name, phone')
      .eq('status', 'ACTIVE')
      .eq('is_latest', true);

    if (regions[0] && !districts[0]) supQ = supQ.eq('region', regions[0]);
    else if (districts[0]) supQ = supQ.eq('district', districts[0]);

    const { data: rawSups, error: sErr } = await supQ;
    if (sErr) throw sErr;

    let supervisors = rawSups || [];

    if ((isUalimu || isAcsee) && forbiddenNames.size > 0) {
      supervisors = supervisors.filter(s => {
        const name = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.trim().replace(/\s+/g, ' ');
        return !forbiddenNames.has(name);
      });
    }

    if (!supervisors.length) throw new Error("No available supervisors after exclusions");

    // ── Existing assignment counts (global) ─────────────────────────────────────
    const { data: allAssigns } = await supabase
      .from('supervisorassignments')
      .select('supervisor_name');

    const assignmentCounts: Record<string, number> = {};
    allAssigns?.forEach(a => {
      const name = a.supervisor_name;
      assignmentCounts[name] = (assignmentCounts[name] || 0) + 1;
    });

    // ── Shuffle & prepare ───────────────────────────────────────────────────────
    const shuffled = shuffleArray([...supervisors]);
    const supervisorsWithCounts = shuffled.map(s => {
      const full = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.trim().replace(/\s+/g, ' ');
      return { ...s, full_name: full, assignment_count: assignmentCounts[full] || 0 };
    });

    // ── Supervisor home center names ────────────────────────────────────────────
    const centerNos = [...new Set(supervisorsWithCounts.map(s => s.center_no))];
    const supervisorCenterNames: Record<string, string> = {};

    if (centerNos.length) {
      const { data: sec } = await supabase.from('secondaryschools').select('center_no, name').in('center_no', centerNos);
      const { data: tc } = await supabase.from('teacherscolleges').select('center_no, name').in('center_no', centerNos);
      sec?.forEach(r => supervisorCenterNames[r.center_no] = r.name);
      tc?.forEach(r => supervisorCenterNames[r.center_no] = r.name);
    }

    // ── Group centers by district ───────────────────────────────────────────────
    const districtCenters: Record<string, any[]> = {};

    if (isSecondary) {
      const processed = new Set();
      Object.values(centerGroups).forEach((g: any) => {
        const d = g.district;
        if (!districtCenters[d]) districtCenters[d] = [];
        if (g.S && g.P) {
          if (!processed.has(g.S.center_number)) {
            districtCenters[d].push({ ...g.S, linked_center: g.P.center_number, required_supervisors: 1 });
            processed.add(g.S.center_number);
            processed.add(g.P.center_number);
          }
        } else if (g.S) {
          districtCenters[d].push({ ...g.S, required_supervisors: 1 });
        } else if (g.P) {
          districtCenters[d].push({ ...g.P, required_supervisors: 1 });
        }
      });
    } else {
      centers.forEach(c => {
        if (!districtCenters[c.district]) districtCenters[c.district] = [];
        districtCenters[c.district].push(c);
      });
    }

    // ── Group supervisors by district / type / center ───────────────────────────
    const districtSupervisors: Record<string, { PUBLIC: Record<string, any[]>, PRIVATE: Record<string, any[]> }> = {};

    supervisorsWithCounts.forEach(s => {
      if (!districtSupervisors[s.district]) districtSupervisors[s.district] = { PUBLIC: {}, PRIVATE: {} };
      const type = s.center_type?.toUpperCase().includes('PRIVATE') ? 'PRIVATE' : 'PUBLIC';
      if (!districtSupervisors[s.district][type][s.center_no]) {
        districtSupervisors[s.district][type][s.center_no] = [];
      }
      districtSupervisors[s.district][type][s.center_no].push(s);
    });

    // Sort each group by current load (lowest first)
    for (const d in districtSupervisors) {
      for (const t of ['PUBLIC', 'PRIVATE']) {
        for (const cn in districtSupervisors[d][t]) {
          districtSupervisors[d][t][cn].sort((a, b) => a.assignment_count - b.assignment_count);
        }
      }
    }

    // ── Assignment ──────────────────────────────────────────────────────────────
    const assignments: any[] = [];
    const reserves: any[] = [];
    const assignedSupervisorIds = new Set();

    for (const district in districtCenters) {
      const supMap = districtSupervisors[district] || { PUBLIC: {}, PRIVATE: {} };
      const allHomeCenters = [...Object.keys(supMap.PUBLIC || {}), ...Object.keys(supMap.PRIVATE || {})];
      const centerCapacities: Record<string, number> = {};
      const centerAssignmentCount: Record<string, number> = {};
      const centerPointers: Record<string, number> = {};

      allHomeCenters.forEach(cn => {
        centerCapacities[cn] = (supMap.PUBLIC?.[cn]?.length || 0) + (supMap.PRIVATE?.[cn]?.length || 0);
        centerAssignmentCount[cn] = 0;
        centerPointers[cn] = 0;
      });

      const getNextHomeCenter = () => {
        let minScore = Infinity;
        let candidates: string[] = [];
        const check = (nos: string[], key: 'PUBLIC' | 'PRIVATE') => {
          for (const cn of nos) {
            const currentList = supMap[key]?.[cn] || [];
            if (!currentList.length) continue;
            const currentAvail = currentList.filter(s => !assignedSupervisorIds.has(s.id)).length;
            if (currentAvail <= 0) continue;
            const done = centerAssignmentCount[cn] || 0;
            let score = done / centerCapacities[cn];
            if (centerCapacities[cn] <= 2 && done >= 1) score += 0.6;
            else if (centerCapacities[cn] <= 4 && done >= 2) score += 0.35;
            if (done === 0) score -= 0.15;
            if (score < minScore) { minScore = score; candidates = [cn]; }
            else if (score === minScore) candidates.push(cn);
          }
        };
        check(Object.keys(supMap.PUBLIC || {}), 'PUBLIC');
        if (candidates.length === 0) check(Object.keys(supMap.PRIVATE || {}), 'PRIVATE');
        return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
      };

      const getSupervisorFromHome = (homeCn: string, targetCn: string) => {
        for (const t of ['PUBLIC', 'PRIVATE'] as const) {
          const list = supMap[t]?.[homeCn] || [];
          let attempts = 0;
          while (attempts < list.length) {
            const idx = centerPointers[homeCn] % list.length;
            const candidate = list[idx];
            if (!assignedSupervisorIds.has(candidate.id) && candidate.center_no !== targetCn) {
              centerPointers[homeCn]++;
              return candidate;
            }
            centerPointers[homeCn]++;
            attempts++;
          }
        }
        return null;
      };

      for (const center of districtCenters[district]) {
        const needed = center.required_supervisors || 1;
        for (let i = 0; i < needed; i++) {
          let sup = null;
          let attempts = 0;
          while (!sup && attempts < allHomeCenters.length * 2) {
            const home = getNextHomeCenter();
            if (!home) break;
            sup = getSupervisorFromHome(home, center.center_number);
            if (!sup) centerAssignmentCount[home]++;
            attempts++;
          }

          if (sup) {
            const ws = `${sup.center_no}-${abbreviateSchoolName(supervisorCenterNames[sup.center_no] || sup.center_no)}`;
            const payload = {
              supervision_id,
              center_no: center.center_number,
              supervisor_name: sup.full_name,
              phone: sup.phone,
              region: center.region,
              district: center.district,
              workstation: ws,
              assigned_by: assigned_by || "system"
            };
            assignments.push(payload);
            if (center.linked_center) assignments.push({ ...payload, center_no: center.linked_center });
            assignedSupervisorIds.add(sup.id);
            centerAssignmentCount[sup.center_no] = (centerAssignmentCount[sup.center_no] || 0) + 1;
          }
        }
      }

      // ── Reserves (Skip for Ualimu) ────────────────────────────────────────────
      if (!isUalimu) {
        let resCount = 0;
        while (resCount < 5) {
          const home = getNextHomeCenter();
          if (!home) break;
          const pool = [...(supMap.PUBLIC?.[home] || []), ...(supMap.PRIVATE?.[home] || [])]
            .filter(s => !assignedSupervisorIds.has(s.id))
            .sort((a, b) => a.assignment_count - b.assignment_count);
          if (pool.length === 0) { centerAssignmentCount[home]++; continue; }
          const sup = pool[0];
          const ws = `${sup.center_no}-${abbreviateSchoolName(supervisorCenterNames[sup.center_no] || sup.center_no)}`;
          reserves.push({
            supervision_id, center_no: "RESERVE", supervisor_name: sup.full_name, phone: sup.phone,
            region: sup.region, district: sup.district, workstation: ws, assigned_by: assigned_by || "system"
          });
          assignedSupervisorIds.add(sup.id);
          centerAssignmentCount[home]++;
          resCount++;
        }
      }
    }

    // ── Save ────────────────────────────────────────────────────────────────────
    const allRecords = [...assignments, ...reserves];
    if (allRecords.length > 0) {
      const { error: insertErr } = await supabase.from('supervisorassignments').insert(allRecords);
      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({
      success: true,
      count: assignments.length,
      reserves: reserves.length,
      message: `Assigned ${assignments.length} supervisors ${isUalimu ? '' : `+ ${reserves.length} reserves`}`
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error("Assignment error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message || "Internal server error" }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});