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
  vehicles: Array<{ type: string; quantity: number }>;
  totalBoxes: number;
  totalTons: number;
  totalKm: number;
  notes: string;
}

export const ALL_TANZANIAN_REGIONS = [
  "ARUSHA", "DAR ES SALAAM", "DODOMA", "GEITA", "IRINGA", "KAGERA", "KATAVI", 
  "KIGOMA", "KILIMANJARO", "LINDI", "MANYARA", "MARA", "MBEYA", "MOROGORO", 
  "MTWARA", "MWANZA", "NJOMBE", "PWANI", "RUKWA", "RUVUMA", "SHINYANGA", 
  "SIMIYU", "SINGIDA", "SONGWE", "TABORA", "TANGA"
];

const CORRIDORS = [
  { name: "Lake Zone-1", path: ["PWANI", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "GEITA", "KAGERA"], branches: ["SIMIYU", "MARA"] },
  { name: "Lake Zone-2", path: ["PWANI", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "MARA", "SIMIYU"], branches: ["KAGERA", "GEITA"] },
  { name: "Lake Zone-3 (Direct)", path: ["PWANI", "MOROGORO", "DODOMA", "SINGIDA", "GEITA", "KAGERA"], branches: [] },
  { name: "Lake Zone-4 (Via Tabora)", path: ["PWANI", "MOROGORO", "DODOMA", "TABORA", "GEITA", "KAGERA"], branches: [] },
  { name: "Lake Zone-5 (Via Tabora)", path: ["PWANI", "MOROGORO", "DODOMA", "TABORA", "SHINYANGA", "MWANZA"], branches: [] },
  { name: "Western (Kigoma Anchor)", path: ["PWANI", "MOROGORO", "DODOMA", "TABORA", "KIGOMA"], branches: ["KATAVI"] },
  { name: "Southern-1 (Katavi Anchor)", path: ["PWANI", "MOROGORO", "IRINGA", "NJOMBE", "MBEYA", "SONGWE", "RUKWA", "KATAVI"], branches: ["RUVUMA"] },
  { name: "Southern-2 (Rukwa Anchor)", path: ["PWANI", "MOROGORO", "IRINGA", "NJOMBE", "MBEYA", "SONGWE", "RUKWA"], branches: ["RUVUMA"] },
  { name: "Southern-3", path: ["PWANI", "MOROGORO", "IRINGA", "NJOMBE", "MBEYA", "SONGWE"], branches: ["RUVUMA"] },
  { name: "Southern-4 (Ruvuma Focus)", path: ["PWANI", "MOROGORO", "IRINGA", "NJOMBE", "RUVUMA"], branches: [] },
  { name: "Coastal to South", path: ["PWANI", "LINDI", "MTWARA"], branches: ["RUVUMA"] },
  { name: "Northern-1", path: ["PWANI", "TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"], branches: [] },
  { name: "Northern-2", path: ["KILIMANJARO", "ARUSHA", "MANYARA"], branches: ["TANGA"] },
  { name: "Northern-3 (Via Dodoma)", path: ["PWANI", "MOROGORO", "DODOMA", "MANYARA"], branches: [] }
];

const HUB_RULES: Record<string, string> = {
  "SIMIYU": "SHINYANGA", "MARA": "MWANZA", "KAGERA": "MWANZA", "GEITA": "MWANZA", "KATAVI": "TABORA", "RUVUMA": "NJOMBE",
};

const MAX_BOXES = 880;

export function generateIntelligentRoutes(demands: RegionDemand[], loadingDate: string, distances: any[] = []): SuggestedMsafara[] {
  const routes: SuggestedMsafara[] = [];
  const distanceMap = new Map();
  distances.forEach(d => distanceMap.set(`${d.from_region_name.toUpperCase()}|${d.to_region_name.toUpperCase()}`, parseFloat(d.distance_km)));

  let remainingDemands = demands.filter(d => d.boxes > 0).map(d => ({ ...d, region: d.region.toUpperCase() }));
  const getDistFromDar = (reg: string) => distanceMap.get(`DAR ES SALAAM|${reg}`) || 0;

  let msafaraCounter = 1;
  let safety = 0;

  while (remainingDemands.length > 0 && safety < 100) {
    safety++;
    remainingDemands.sort((a, b) => getDistFromDar(b.region) - getDistFromDar(a.region));
    const target = remainingDemands[0];

    // Find all corridors that can reach this target
    const possibleCorridors = CORRIDORS.filter(c => c.path.includes(target.region) || c.branches.includes(target.region));
    
    // Pick the corridor that accommodates the most boxes from remainingDemands
    let bestCorridor = possibleCorridors[0] || CORRIDORS[0];
    let maxLoad = 0;

    possibleCorridors.forEach(corridor => {
      const load = remainingDemands
        .filter(d => corridor.path.includes(d.region) || corridor.branches.includes(d.region))
        .reduce((sum, d) => sum + d.boxes, 0);
      if (load > maxLoad && load <= MAX_BOXES) {
        maxLoad = load;
        bestCorridor = corridor;
      }
    });

    // Collect items for this corridor
    let currentGroup: RegionDemand[] = [];
    let currentBoxes = 0;
    const itemsInCorridor = remainingDemands.filter(d => bestCorridor.path.includes(d.region) || bestCorridor.branches.includes(d.region));

    for (const item of itemsInCorridor) {
      if (currentBoxes + item.boxes <= MAX_BOXES) {
        currentGroup.push(item);
        currentBoxes += item.boxes;
      }
    }

    if (currentGroup.length === 0) { remainingDemands.shift(); continue; }

    // Remove selected
    const selectedIds = currentGroup.map(g => g.region);
    remainingDemands = remainingDemands.filter(r => !selectedIds.includes(r.region));

    // UI SEQUENCE: We filter the bestCorridor.path to show only the regions we are actually visiting
    const visitedInPath = bestCorridor.path.filter(reg => currentGroup.some(g => g.region === reg));
    const visitedInBranches = bestCorridor.branches.filter(reg => currentGroup.some(g => g.region === reg));
    
    // Delivery Order: Path items first (in order), then branches
    const deliveryOrder = [...visitedInPath, ...visitedInBranches];

    const routeRegions = deliveryOrder.map((regName, idx) => {
      const demandItem = currentGroup.find(g => g.region === regName)!;
      return {
        name: regName,
        receivingPlace: regName === "TANGA" ? "SEGERA / TANGA TOWN" : (HUB_RULES[regName] || regName),
        deliveryDate: new Date(new Date(loadingDate).getTime() + (idx + 1) * 86400000).toISOString().split('T')[0],
        boxes: demandItem.boxes
      };
    });

    const tons = (currentBoxes * 34) / 1000;
    let totalKm = 0;
    let lastPoint = "DAR ES SALAAM";
    routeRegions.forEach(r => {
      totalKm += (distanceMap.get(`${lastPoint}|${r.name}`) || 0);
      lastPoint = r.name;
    });

    routes.push({
      msafaraNumber: msafaraCounter++,
      name: `Msafara: ${bestCorridor.name}`,
      loadingDate, startDate: loadingDate, startingPoint: "DAR ES SALAAM",
      regions: routeRegions,
      totalBoxes: currentBoxes,
      totalTons: Math.round(tons * 100) / 100,
      totalKm: Math.round(totalKm),
      vehicles: [
        { type: "LORRY_HORSE_AND_TRAILER", quantity: Math.ceil(tons / 15) },
        { type: "ESCORT_COASTER", quantity: 1 }
      ],
      notes: `Strict Route: ${bestCorridor.path.join(" -> ")}`
    });
  }
  return routes;
}