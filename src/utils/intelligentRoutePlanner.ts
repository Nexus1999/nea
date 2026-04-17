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

const MAX_BOXES_PER_TT = 880; // Truck and Trailer
const MAX_BOXES_PER_T = 400;  // Standard Truck

const HUB_RULES: Record<string, string> = {
  "SIMIYU": "SHINYANGA", "MARA": "MWANZA", "KAGERA": "MWANZA", "GEITA": "MWANZA", 
  "KATAVI": "TABORA", "RUVUMA": "NJOMBE", "TANGA": "SEGERA / TANGA TOWN"
};

export function generateIntelligentRoutes(demands: RegionDemand[], loadingDate: string, distances: any[] = []): SuggestedMsafara[] {
  const routes: SuggestedMsafara[] = [];
  const distanceMap = new Map();
  distances.forEach(d => distanceMap.set(`${d.from_region_name.toUpperCase()}|${d.to_region_name.toUpperCase()}`, parseFloat(d.distance_km)));

  let remainingDemands = demands.filter(d => d.boxes > 0).map(d => ({ ...d, region: d.region.toUpperCase() }));
  let msafaraCounter = 1;

  const getDemand = (reg: string) => remainingDemands.find(d => d.region === reg);
  const removeDemands = (regs: string[]) => {
    remainingDemands = remainingDemands.filter(d => !regs.includes(d.region));
  };

  // 1. NORTHERN PRIORITIZATION
  const northernRegs = ["PWANI", "TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"];
  const northDemands = northernRegs.map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
  
  if (northDemands.length > 0) {
    const totalNorthBoxes = northDemands.reduce((sum, d) => sum + d.boxes, 0);
    
    if (totalNorthBoxes <= MAX_BOXES_PER_TT) {
      routes.push(createRoute(msafaraCounter++, "Northern-1", northernRegs, northDemands, loadingDate, distanceMap, [{ type: "TT", quantity: 1, label: "Truck & Trailer" }]));
      removeDemands(northDemands.map(d => d.region));
    } 
    else {
      const coreNorth = ["KILIMANJARO", "ARUSHA", "MANYARA"];
      const coreDemands = coreNorth.map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
      const tangaDemand = getDemand("TANGA");
      const pwaniDemand = getDemand("PWANI");

      if (coreDemands.length > 0 && coreDemands.reduce((sum, d) => sum + d.boxes, 0) <= MAX_BOXES_PER_TT) {
        const combinedDemands = [...coreDemands];
        if (tangaDemand) combinedDemands.push(tangaDemand);
        if (pwaniDemand) combinedDemands.push(pwaniDemand);

        routes.push(createRoute(
          msafaraCounter++, 
          "Northern-2 (Multi-Vehicle)", 
          northernRegs, 
          combinedDemands, 
          loadingDate, 
          distanceMap, 
          [
            { type: "TT", quantity: 1, label: "Truck & Trailer (Core)" },
            { type: "T", quantity: 1, label: "Truck (Tanga)" }
          ]
        ));
        removeDemands(combinedDemands.map(d => d.region));
      }
    }
  }

  // 2. GEITA & KAGERA LARGE LOAD SPLITTING
  const kagera = getDemand("KAGERA");
  const geita = getDemand("GEITA");

  if (kagera && kagera.boxes > 400) {
    const helpers = ["DODOMA", "SINGIDA", "TABORA"].map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
    const selectedHelper = helpers[0];
    const routeRegs = selectedHelper ? ["PWANI", "MOROGORO", selectedHelper.region, "KAGERA"] : ["PWANI", "MOROGORO", "KAGERA"];
    const routeDemands = [kagera];
    if (selectedHelper) routeDemands.push(selectedHelper);
    
    routes.push(createRoute(msafaraCounter++, "Kagera Direct", routeRegs, routeDemands, loadingDate, distanceMap));
    removeDemands(routeDemands.map(d => d.region));
  }

  if (geita && geita.boxes > 400) {
    const helpers = ["DODOMA", "SINGIDA", "TABORA"].map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
    const selectedHelper = helpers[0];
    const routeRegs = selectedHelper ? ["PWANI", "MOROGORO", selectedHelper.region, "GEITA"] : ["PWANI", "MOROGORO", "GEITA"];
    const routeDemands = [geita];
    if (selectedHelper) routeDemands.push(selectedHelper);

    routes.push(createRoute(msafaraCounter++, "Geita Direct", routeRegs, routeDemands, loadingDate, distanceMap));
    removeDemands(routeDemands.map(d => d.region));
  }

  // 3. KATAVI / WESTERN PRIORITIZATION
  const katavi = getDemand("KATAVI");
  if (katavi) {
    const westernPath = ["PWANI", "MOROGORO", "DODOMA", "TABORA", "KIGOMA", "KATAVI"];
    const westernDemands = westernPath.map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
    if (westernDemands.reduce((sum, d) => sum + d.boxes, 0) <= MAX_BOXES_PER_TT) {
      routes.push(createRoute(msafaraCounter++, "Western (Katavi Focus)", westernPath, westernDemands, loadingDate, distanceMap));
      removeDemands(westernDemands.map(d => d.region));
    }
  }

  // 4. REMAINING CORRIDORS
  const corridors = [
    { name: "Lake Zone-1", path: ["PWANI", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "GEITA", "KAGERA"], branches: ["SIMIYU", "MARA"] },
    { name: "Lake Zone-2", path: ["PWANI", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "MARA", "SIMIYU"], branches: ["KAGERA", "GEITA"] },
    { name: "Southern-1", path: ["PWANI", "MOROGORO", "IRINGA", "NJOMBE", "MBEYA", "SONGWE", "RUKWA"], branches: ["RUVUMA"] },
    { name: "Southern-2 (Ruvuma)", path: ["PWANI", "MOROGORO", "IRINGA", "NJOMBE", "RUVUMA"], branches: [] },
    { name: "Coastal South", path: ["PWANI", "LINDI", "MTWARA"], branches: [] }
  ];

  for (const corridor of corridors) {
    const possible = [...corridor.path, ...corridor.branches].map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
    if (possible.length === 0) continue;

    const totalBoxes = possible.reduce((sum, d) => sum + d.boxes, 0);
    
    if (corridor.name.startsWith("Lake Zone")) {
      if (totalBoxes <= MAX_BOXES_PER_TT) {
        routes.push(createRoute(msafaraCounter++, corridor.name, [...corridor.path, ...corridor.branches], possible, loadingDate, distanceMap));
        removeDemands(possible.map(d => d.region));
      }
    } else {
      let currentGroup: RegionDemand[] = [];
      let currentSum = 0;
      for (const p of possible) {
        if (currentSum + p.boxes <= MAX_BOXES_PER_TT) {
          currentGroup.push(p);
          currentSum += p.boxes;
        }
      }
      if (currentGroup.length > 0) {
        routes.push(createRoute(msafaraCounter++, corridor.name, [...corridor.path, ...corridor.branches], currentGroup, loadingDate, distanceMap));
        removeDemands(currentGroup.map(d => d.region));
      }
    }
  }

  while (remainingDemands.length > 0) {
    const target = remainingDemands[0];
    routes.push(createRoute(msafaraCounter++, "Direct/Special", [target.region], [target], loadingDate, distanceMap));
    remainingDemands.shift();
  }

  return routes;
}

function createRoute(
  num: number, 
  name: string, 
  path: string[], 
  demands: RegionDemand[], 
  loadingDate: string, 
  distanceMap: Map<string, number>,
  customVehicles?: any[]
): SuggestedMsafara {
  const visited = path.filter(p => demands.some(d => d.region === p));
  const totalBoxes = demands.reduce((sum, d) => sum + d.boxes, 0);
  const tons = (totalBoxes * 34) / 1000;

  let totalKm = 0;
  let lastPoint = "DAR ES SALAAM";
  const routeRegions = visited.map((reg, idx) => {
    const d = demands.find(dem => dem.region === reg)!;
    totalKm += (distanceMap.get(`${lastPoint}|${reg}`) || 0);
    lastPoint = reg;
    return {
      name: reg,
      receivingPlace: HUB_RULES[reg] || reg,
      deliveryDate: new Date(new Date(loadingDate).getTime() + (idx + 1) * 86400000).toISOString().split('T')[0],
      boxes: d.boxes
    };
  });

  return {
    msafaraNumber: num,
    name: `Msafara ${num}: ${name}`,
    loadingDate, startDate: loadingDate, startingPoint: "DAR ES SALAAM",
    regions: routeRegions,
    totalBoxes,
    totalTons: Math.round(tons * 100) / 100,
    totalKm: Math.round(totalKm),
    vehicles: customVehicles || [
      { type: "TT", quantity: 1, label: "Truck & Trailer" },
      { type: "ESCORT", quantity: 1, label: "Escort Vehicle" }
    ],
    notes: `Destination: ${visited[visited.length - 1]}`,
    pathDisplay: ["DAR", ...visited]
  };
}