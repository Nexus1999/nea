"use client";

export interface RegionDemand {
  region: string;
  boxes: number;
}

export interface SuggestedMsafara {
  msafaraNumber: number;
  name: string;
  loadingDate: string;
  startDate: string;
  startingPoint: string;
  regions: Array<{
    name: string;
    receivingPlace: string;
    deliveryDate: string;
    boxes: number;
  }>;
  vehicles: Array<{ type: string; quantity: number; label: string }>;
  totalBoxes: number;
  totalTons: number;
  totalKm: number;
  notes: string;
  pathDisplay: string[];
}

export const ALL_TANZANIAN_REGIONS = [
  "ARUSHA", "DAR ES SALAAM", "DODOMA", "GEITA", "IRINGA", "KAGERA", "KATAVI",
  "KIGOMA", "KILIMANJARO", "LINDI", "MANYARA", "MARA", "MBEYA", "MOROGORO",
  "MTWARA", "MWANZA", "NJOMBE", "PWANI", "RUKWA", "RUVUMA", "SHINYANGA",
  "SIMIYU", "SINGIDA", "SONGWE", "TABORA", "TANGA"
];

const MAX_BOXES_PER_TT = 950; // Truck & Trailer
const MAX_BOXES_PER_T  = 450; // Standard Truck

// Updated HUB_RULES based on regional towns
const HUB_RULES: Record<string, string> = {
  "ARUSHA": "ARUSHA",
  "DAR ES SALAAM": "DAR ES SALAAM",
  "DODOMA": "DODOMA",
  "GEITA": "GEITA",
  "IRINGA": "IRINGA",
  "KAGERA": "BUKOBA",
  "KATAVI": "MPANDA",
  "KIGOMA": "KIGOMA",
  "KILIMANJARO": "MOSHI",
  "LINDI": "LINDI",
  "MANYARA": "BABATI",
  "MARA": "MUSOMA",
  "MBEYA": "MBEYA",
  "MOROGORO": "MOROGORO",
  "MTWARA": "MTWARA",
  "MWANZA": "MWANZA",
  "NJOMBE": "NJOMBE",
  "PWANI": "KIBAHA",
  "RUKWA": "SUMBAWANGA",
  "RUVUMA": "SONGEA",
  "SHINYANGA": "SHINYANGA",
  "SIMIYU": "BARIADI",
  "SINGIDA": "SINGIDA",
  "SONGWE": "VWAWA",
  "TABORA": "TABORA",
  "TANGA": "TANGA"
};

// Predefined paths for sorting regions within a route
const PREDEFINED_PATHS = [
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "SINGIDA", "GEITA", "KAGERA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "GEITA", "KAGERA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "MARA", "SIMIYU"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "MARA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "SIMIYU", "MARA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "TABORA", "KIGOMA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "TABORA", "GEITA", "KAGERA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "TABORA", "SHINYANGA", "MWANZA"],
  ["DAR ES SALAAM", "LINDI", "MTWARA", "RUVUMA", "NJOMBE", "MBEYA", "SONGWE", "RUKWA", "KATAVI", "KIGOMA"],
  ["DAR ES SALAAM", "MOROGORO", "IRINGA", "NJOMBE", "MBEYA", "SONGWE", "RUKWA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "MANYARA"],
  ["DAR ES SALAAM", "TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"]
];

const TT_ONLY = [
  { type: "TT",     quantity: 1, label: "Truck & Trailer" },
  { type: "ESCORT", quantity: 1, label: "Escort Vehicle"  },
];

function ttPlusExtraTruck(extraLabel: string) {
  return [
    { type: "TT",     quantity: 1, label: "Truck & Trailer"      },
    { type: "T",      quantity: 1, label: `Truck (${extraLabel})` },
    { type: "ESCORT", quantity: 1, label: "Escort Vehicle"        },
  ];
}

type StagedRoute = {
  name:     string;
  path:     string[];
  list:     RegionDemand[];
  vehicles: typeof TT_ONLY;
  cluster:  number; 
};

// Helper to sort regions based on predefined paths
function sortRegionsByPath(regions: string[]): string[] {
  if (regions.length <= 1) return regions;

  // Find the best matching path
  let bestPath: string[] = [];
  let maxMatches = -1;

  for (const path of PREDEFINED_PATHS) {
    const matches = regions.filter(r => path.includes(r)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestPath = path;
    }
  }

  if (maxMatches > 0) {
    // Sort based on the index in the best matching path
    return [...regions].sort((a, b) => {
      const idxA = bestPath.indexOf(a);
      const idxB = bestPath.indexOf(b);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }

  return regions;
}

export function generateIntelligentRoutes(
  demands:     RegionDemand[],
  loadingDate: string,
  distances:   any[] = []
): SuggestedMsafara[] {

  const distanceMap = new Map<string, number>();
  distances.forEach(d => {
    const a  = d.from_region_name.toUpperCase();
    const b  = d.to_region_name.toUpperCase();
    const km = parseFloat(d.distance_km);
    distanceMap.set(`${a}|${b}`, km);
    distanceMap.set(`${b}|${a}`, km);
  });

  const pool = new Map<string, number>(
    demands
      .filter(d => d.boxes > 0)
      .map(d => [d.region.toUpperCase(), d.boxes])
  );

  const staged: StagedRoute[] = [];

  const demand = (r: string): RegionDemand | undefined =>
    pool.has(r) ? { region: r, boxes: pool.get(r)! } : undefined;

  const take = (regs: string[]) => regs.forEach(r => pool.delete(r));

  const sum = (list: RegionDemand[]) => list.reduce((s, d) => s + d.boxes, 0);

  function stage(
    name:     string,
    path:     string[],
    list:     RegionDemand[],
    cluster:  number,
    vehicles: typeof TT_ONLY = TT_ONLY
  ) {
    if (list.length === 0) return;
    // Sort the path and list based on predefined sequences
    const sortedPath = sortRegionsByPath(path);
    const sortedList = [...list].sort((a, b) => sortedPath.indexOf(a.region) - sortedPath.indexOf(b.region));
    
    staged.push({ name, path: sortedPath, list: sortedList, cluster, vehicles });
    take(list.map(d => d.region));
  }

  // Clustering logic (simplified for brevity, keeping the core logic)
  {
    const lakeRegs = ["KAGERA", "GEITA", "MWANZA", "MARA", "SHINYANGA", "SIMIYU"];
    const lakeAll  = lakeRegs.map(r => demand(r)).filter(Boolean) as RegionDemand[];
    if (lakeAll.length > 0) {
      const lakeTotal = sum(lakeAll);
      if (lakeTotal <= MAX_BOXES_PER_TT) {
        stage("LAKE ZONE", lakeRegs, lakeAll, 1, TT_ONLY);
      } else {
        // Split logic...
        const grpA_regs = ["MWANZA", "SHINYANGA", "SIMIYU", "MARA"];
        const grpA = grpA_regs.map(r => demand(r)).filter(Boolean) as RegionDemand[];
        if (grpA.length > 0) stage("LAKE A", grpA_regs, grpA, 1, TT_ONLY);
        
        const grpB_regs = ["KAGERA", "GEITA"];
        const grpB = grpB_regs.map(r => demand(r)).filter(Boolean) as RegionDemand[];
        if (grpB.length > 0) stage("LAKE B", grpB_regs, grpB, 1, TT_ONLY);
      }
    }
  }

  // Western / Central
  {
    const westRegs = ["PWANI", "MOROGORO", "DODOMA", "TABORA", "KATAVI", "KIGOMA"];
    const westAll = westRegs.map(r => demand(r)).filter(Boolean) as RegionDemand[];
    if (westAll.length > 0) {
      if (sum(westAll) <= MAX_BOXES_PER_TT) {
        stage("WESTERN", westRegs, westAll, 2, TT_ONLY);
      } else {
        const kigomaGroup = ["TABORA", "KATAVI", "KIGOMA"].map(r => demand(r)).filter(Boolean) as RegionDemand[];
        if (kigomaGroup.length > 0) stage("KIGOMA", ["TABORA", "KATAVI", "KIGOMA"], kigomaGroup, 2, TT_ONLY);
        
        const centralGroup = ["PWANI", "MOROGORO", "DODOMA"].map(r => demand(r)).filter(Boolean) as RegionDemand[];
        if (centralGroup.length > 0) stage("CENTRAL", ["PWANI", "MOROGORO", "DODOMA"], centralGroup, 2, TT_ONLY);
      }
    }
  }

  // Southern Highlands
  {
    const shRegs = ["IRINGA", "NJOMBE", "RUVUMA", "MBEYA", "SONGWE", "RUKWA"];
    const shAll = shRegs.map(r => demand(r)).filter(Boolean) as RegionDemand[];
    if (shAll.length > 0) {
      if (sum(shAll) <= MAX_BOXES_PER_TT) {
        stage("SOUTHERN HIGHLANDS", shRegs, shAll, 3, TT_ONLY);
      } else {
        const rukwaGroup = ["MBEYA", "SONGWE", "RUKWA"].map(r => demand(r)).filter(Boolean) as RegionDemand[];
        if (rukwaGroup.length > 0) stage("RUKWA", ["MBEYA", "SONGWE", "RUKWA"], rukwaGroup, 3, TT_ONLY);
        
        const ruvumaGroup = ["IRINGA", "NJOMBE", "RUVUMA"].map(r => demand(r)).filter(Boolean) as RegionDemand[];
        if (ruvumaGroup.length > 0) stage("RUVUMA", ["IRINGA", "NJOMBE", "RUVUMA"], ruvumaGroup, 3, TT_ONLY);
      }
    }
  }

  // Northern
  {
    const northRegs = ["TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"];
    const northAll = northRegs.map(r => demand(r)).filter(Boolean) as RegionDemand[];
    if (northAll.length > 0) {
      if (sum(northAll) <= MAX_BOXES_PER_TT) {
        stage("NORTHERN", northRegs, northAll, 4, TT_ONLY);
      } else {
        const arushaGroup = ["KILIMANJARO", "ARUSHA"].map(r => demand(r)).filter(Boolean) as RegionDemand[];
        if (arushaGroup.length > 0) stage("ARUSHA", ["KILIMANJARO", "ARUSHA"], arushaGroup, 4, TT_ONLY);
        
        const manyaraGroup = ["TANGA", "MANYARA"].map(r => demand(r)).filter(Boolean) as RegionDemand[];
        if (manyaraGroup.length > 0) stage("MANYARA", ["TANGA", "MANYARA"], manyaraGroup, 4, TT_ONLY);
      }
    }
  }

  // Southern Coast
  {
    const scRegs = ["LINDI", "MTWARA"];
    const scAll = scRegs.map(r => demand(r)).filter(Boolean) as RegionDemand[];
    if (scAll.length > 0) stage("SOUTHERN COAST", scRegs, scAll, 5, TT_ONLY);
  }

  // Remaining
  while (pool.size > 0) {
    const entries = [...pool.entries()];
    const [firstReg, firstBoxes] = entries[0];
    const batch: RegionDemand[] = [{ region: firstReg, boxes: firstBoxes }];
    let   running = firstBoxes;

    for (const [reg, bxs] of entries.slice(1)) {
      if (running + bxs <= MAX_BOXES_PER_TT) {
        batch.push({ region: reg, boxes: bxs });
        running += bxs;
      }
    }

    stage(
      batch.length === 1 ? `${firstReg} Route` : "Mixed Route",
      batch.map(d => d.region),
      batch,
      99,
      TT_ONLY
    );
  }

  const merged = postProcess(staged);
  merged.sort((a, b) => a.cluster - b.cluster);

  return merged.map((r, idx) =>
    buildRoute(idx + 1, r.name, r.path, r.list, loadingDate, distanceMap, r.vehicles)
  );
}

function postProcess(routes: StagedRoute[]): StagedRoute[] {
  const MAX  = 950;
  const sum  = (list: RegionDemand[]) => list.reduce((s, d) => s + d.boxes, 0);

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].list.length !== 1) continue; 
      const solo = routes[i].list[0];

      let bestIdx   = -1;
      let bestScore = -1;

      for (let j = 0; j < routes.length; j++) {
        if (j === i) continue;
        const space = MAX - sum(routes[j].list);
        if (space < solo.boxes) continue;
        const score = space + (routes[j].cluster === routes[i].cluster ? 1000 : 0);
        if (score > bestScore) { bestScore = score; bestIdx = j; }
      }

      if (bestIdx >= 0) {
        routes[bestIdx].list.push(solo);
        routes[bestIdx].path.push(solo.region);
        // Re-sort after merging
        routes[bestIdx].path = sortRegionsByPath(routes[bestIdx].path);
        routes[bestIdx].list.sort((a, b) => routes[bestIdx].path.indexOf(a.region) - routes[bestIdx].path.indexOf(b.region));
        
        routes.splice(i, 1);
        changed = true;
        break;
      }
    }
  }

  return routes;
}

function buildRoute(
  num:           number,
  name:          string,
  path:          string[],
  demands:       RegionDemand[],
  loadingDate:   string,
  distanceMap:   Map<string, number>,
  customVehicles?: typeof TT_ONLY
): SuggestedMsafara {

  const demandSet  = new Set(demands.map(d => d.region));
  const visited    = path.filter(p => demandSet.has(p));
  const totalBoxes = demands.reduce((s, d) => s + d.boxes, 0);
  const tons       = (totalBoxes * 34) / 1000;

  let totalKm   = 0;
  let lastPoint = "DAR ES SALAAM";

  const routeRegions = visited.map((reg, idx) => {
    const d    = demands.find(dem => dem.region === reg)!;
    const dist = distanceMap.get(`${lastPoint}|${reg}`) ?? 0;
    totalKm   += dist;
    lastPoint  = reg;
    return {
      name:           reg,
      receivingPlace: HUB_RULES[reg] ?? reg,
      deliveryDate:   new Date(
        new Date(loadingDate).getTime() + (idx + 1) * 86_400_000
      ).toISOString().split("T")[0],
      boxes: d.boxes,
    };
  });

  return {
    msafaraNumber: num,
    name:         name,
    loadingDate,
    startDate:     loadingDate,
    startingPoint: "DAR ES SALAAM",
    regions:       routeRegions,
    totalBoxes,
    totalTons:     Math.round(tons * 100) / 100,
    totalKm:       Math.round(totalKm),
    vehicles:      customVehicles ?? TT_ONLY,
    notes:         `Destination: ${visited[visited.length - 1] ?? "N/A"}`,
    pathDisplay:   ["DAR", ...visited],
  };
}