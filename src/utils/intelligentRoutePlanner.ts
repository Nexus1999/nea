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

const DESTINATION_ANCHORS = [
  "KAGERA", "GEITA", "MWANZA", "MARA", "SIMIYU", "TABORA", "SONGWE", "RUKWA", "NJOMBE", "MTWARA", "MANYARA", "ARUSHA", "KIGOMA"
];

const HUB_RULES: Record<string, string> = {
  "SIMIYU": "SHINYANGA",
  "MARA": "MWANZA",
  "KAGERA": "MWANZA",
  "GEITA": "MWANZA",
  "KATAVI": "TABORA", 
  "RUVUMA": "NJOMBE",
  "TANGA": "SEGERA / TANGA TOWN"
};

const MAX_BOXES_PER_TRUCK = 880;

export function generateIntelligentRoutes(
  demands: RegionDemand[],
  loadingDate: string,
  distances: any[] = []
): SuggestedMsafara[] {
  const routes: SuggestedMsafara[] = [];
  let msafaraCounter = 1;
  const distanceMap = new Map();
  
  distances.forEach(d => {
    distanceMap.set(`${d.from_region_name.toUpperCase()}|${d.to_region_name.toUpperCase()}`, parseFloat(d.distance_km));
  });

  let remainingDemands = demands
    .filter(d => d.boxes > 0)
    .map(d => ({ ...d, region: d.region.toUpperCase() }));

  const getDistFromDar = (reg: string) => distanceMap.get(`DAR ES SALAAM|${reg}`) || 0;

  const findDemand = (reg: string) => remainingDemands.find(d => d.region === reg);
  const removeDemands = (regs: string[]) => {
    remainingDemands = remainingDemands.filter(d => !regs.includes(d.region));
  };

  /**
   * Helper to create a route object
   */
  const createRoute = (name: string, regionsInOrder: string[], notes: string, customVehicles?: any[]) => {
    const routeRegions = regionsInOrder.map((regName, idx) => {
      const d = findDemand(regName)!;
      return {
        name: regName,
        receivingPlace: HUB_RULES[regName] || regName,
        deliveryDate: new Date(new Date(loadingDate).getTime() + (idx + 1) * 86400000).toISOString().split('T')[0],
        boxes: d.boxes
      };
    });

    const totalBoxes = routeRegions.reduce((sum, r) => sum + r.boxes, 0);
    const totalTons = (totalBoxes * 34) / 1000;
    
    let totalKm = 0;
    let lastPoint = "DAR ES SALAAM";
    routeRegions.forEach(r => {
      totalKm += (distanceMap.get(`${lastPoint}|${r.name}`) || 0);
      lastPoint = r.name;
    });

    const vehicles = customVehicles || [
      { type: "LORRY_HORSE_AND_TRAILER", quantity: Math.ceil(totalTons / 15) },
      { type: "ESCORT_COASTER", quantity: 1 }
    ];

    routes.push({
      msafaraNumber: msafaraCounter++,
      name,
      loadingDate,
      startDate: loadingDate,
      startingPoint: "DAR ES SALAAM",
      regions: routeRegions,
      totalBoxes,
      totalTons: Math.round(totalTons * 100) / 100,
      totalKm: Math.round(totalKm),
      vehicles,
      notes
    });
    removeDemands(regionsInOrder);
  };

  // 1. PRIORITY: NORTHERN ROUTES
  const northern1 = ["PWANI", "TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"];
  const northern2 = ["KILIMANJARO", "ARUSHA", "MANYARA"];
  
  const n1Demands = northern1.filter(r => findDemand(r));
  const n1Total = n1Demands.reduce((sum, r) => sum + findDemand(r)!.boxes, 0);

  if (n1Demands.length > 0 && n1Total <= MAX_BOXES_PER_TRUCK) {
    createRoute("Msafara - Northern Corridor (Full)", n1Demands, "Priority Northern-1 Route.");
  } else {
    const n2Demands = northern2.filter(r => findDemand(r));
    const n2Total = n2Demands.reduce((sum, r) => sum + findDemand(r)!.boxes, 0);
    const tangaDemand = findDemand("TANGA");

    if (n2Demands.length > 0 && n2Total <= MAX_BOXES_PER_TRUCK) {
      const vehicles = [
        { type: "LORRY_HORSE_AND_TRAILER", quantity: 1 },
        { type: "ESCORT_COASTER", quantity: 1 }
      ];
      if (tangaDemand) {
        vehicles.push({ type: "LORRY_7_TONS", quantity: 1 });
        createRoute("Msafara - Northern Corridor (Split)", [...n2Demands, "TANGA"], "Priority Northern-2 with separate Tanga truck.", vehicles);
      } else {
        createRoute("Msafara - Northern Corridor", n2Demands, "Priority Northern-2 Route.");
      }
    }
  }

  // 2. PRIORITY: LARGE KAGERA / GEITA
  const kagera = findDemand("KAGERA");
  const geita = findDemand("GEITA");

  if (kagera && kagera.boxes > 400) {
    const path = ["DODOMA", "SINGIDA", "KAGERA"].filter(r => findDemand(r));
    createRoute("Msafara - Kagera Direct", path, "High demand Kagera route via Central Corridor.");
  }

  if (geita && geita.boxes > 400) {
    const path = ["TABORA", "GEITA"].filter(r => findDemand(r));
    createRoute("Msafara - Geita Direct", path, "High demand Geita route via Tabora.");
  }

  // 3. PRIORITY: LAKE ZONE 1 & 2 (ONLY IF FITS)
  const lz1 = ["PWANI", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "GEITA", "KAGERA", "SIMIYU", "MARA"];
  const lz1Demands = lz1.filter(r => findDemand(r));
  const lz1Total = lz1Demands.reduce((sum, r) => sum + findDemand(r)!.boxes, 0);

  if (lz1Demands.length > 0 && lz1Total <= MAX_BOXES_PER_TRUCK) {
    createRoute("Msafara - Lake Zone Cluster", lz1Demands, "Full Lake Zone cluster fitting in one trip.");
  }

  // 4. PRIORITY: WESTERN (KATAVI ANCHOR)
  const katavi = findDemand("KATAVI");
  if (katavi) {
    const path = ["TABORA", "KIGOMA", "KATAVI"].filter(r => findDemand(r));
    createRoute("Msafara - Western Corridor", path, "Prioritized Katavi/Kigoma route via Tabora.");
  }

  // 5. REMAINING ANCHORS & CLUSTERS
  let safety = 0;
  while (remainingDemands.length > 0 && safety < 50) {
    safety++;
    remainingDemands.sort((a, b) => getDistFromDar(b.region) - getDistFromDar(a.region));
    const target = remainingDemands[0];

    // Define some standard fallback corridors
    const fallbackCorridors = [
      { name: "Southern Highlands", path: ["MOROGORO", "IRINGA", "NJOMBE", "MBEYA", "SONGWE", "RUKWA"] },
      { name: "Southern Coast", path: ["PWANI", "LINDI", "MTWARA", "RUVUMA"] },
      { name: "Central", path: ["MOROGORO", "DODOMA", "SINGIDA", "TABORA", "SHINYANGA", "MWANZA"] }
    ];

    const corridor = fallbackCorridors.find(c => c.path.includes(target.region)) || { name: "Custom", path: [target.region] };
    
    let currentGroup: string[] = [];
    let currentBoxes = 0;

    // Build group from the corridor path
    for (const reg of corridor.path) {
      const d = findDemand(reg);
      if (d && currentBoxes + d.boxes <= MAX_BOXES_PER_TRUCK) {
        currentGroup.push(reg);
        currentBoxes += d.boxes;
      }
    }

    // If target wasn't in a corridor or couldn't be grouped, force it
    if (!currentGroup.includes(target.region)) {
      currentGroup = [target.region];
    }

    createRoute(`Msafara - ${corridor.name}`, currentGroup, `Optimized route for ${target.region} direction.`);
  }

  return routes;
}