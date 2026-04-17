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
  "SIMIYU": "SHINYANGA", 
  "MARA": "MWANZA", 
  "KAGERA": "MWANZA", 
  "GEITA": "MWANZA", 
  "KATAVI": "TABORA", 
  "RUVUMA": "NJOMBE", 
  "TANGA": "SEGERA / TANGA TOWN"
};

export function generateIntelligentRoutes(demands: RegionDemand[], loadingDate: string, distances: any[] = []): SuggestedMsafara[] {
  const routes: SuggestedMsafara[] = [];
  const distanceMap = new Map();
  distances.forEach(d => {
    distanceMap.set(`${d.from_region_name.toUpperCase()}|${d.to_region_name.toUpperCase()}`, parseFloat(d.distance_km));
    distanceMap.set(`${d.to_region_name.toUpperCase()}|${d.from_region_name.toUpperCase()}`, parseFloat(d.distance_km));
  });

  let remainingDemands = demands.filter(d => d.boxes > 0).map(d => ({ ...d, region: d.region.toUpperCase() }));
  let msafaraCounter = 1;

  const getDemand = (reg: string) => remainingDemands.find(d => d.region === reg);
  const removeDemands = (regs: string[]) => {
    remainingDemands = remainingDemands.filter(d => !regs.includes(d.region));
  };

  // 1. NORTHERN CLUSTER LOGIC
  const northRegs = ["TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"];
  const northDemands = northRegs.map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
  
  if (northDemands.length > 0) {
    const totalNorthBoxes = northDemands.reduce((sum, d) => sum + d.boxes, 0);
    const arusha = getDemand("ARUSHA");
    const kili = getDemand("KILIMANJARO");
    const manyara = getDemand("MANYARA");
    const tanga = getDemand("TANGA");

    if (totalNorthBoxes <= MAX_BOXES_PER_TT) {
      routes.push(createRoute(msafaraCounter++, "Northern (Full)", northRegs, northDemands, loadingDate, distanceMap));
      removeDemands(northDemands.map(d => d.region));
    } else {
      // Scenario 2: Arusha, Kili, Manyara fit in TT, Tanga gets separate Truck in same Msafara
      const coreNorth = [manyara, kili, arusha].filter(Boolean) as RegionDemand[];
      const coreSum = coreNorth.reduce((sum, d) => sum + d.boxes, 0);
      
      if (coreSum <= MAX_BOXES_PER_TT && tanga) {
        routes.push(createRoute(
          msafaraCounter++, 
          "Northern (Split)", 
          ["TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"], 
          [...coreNorth, tanga], 
          loadingDate, 
          distanceMap, 
          [
            { type: "TT", quantity: 1, label: "Truck & Trailer (Core)" },
            { type: "T", quantity: 1, label: "Truck (Tanga)" },
            { type: "ESCORT", quantity: 1, label: "Escort Vehicle" }
          ]
        ));
        removeDemands([...coreNorth, tanga].map(d => d.region));
      } 
      // Scenario 3: Only Arusha & Kili fit in TT
      else if (arusha && kili && (arusha.boxes + kili.boxes) <= MAX_BOXES_PER_TT) {
        const combined = [kili, arusha];
        if (tanga) combined.push(tanga);
        
        routes.push(createRoute(
          msafaraCounter++, 
          "Northern (Arusha/Kili Focus)", 
          ["TANGA", "KILIMANJARO", "ARUSHA"], 
          combined, 
          loadingDate, 
          distanceMap,
          tanga ? [
            { type: "TT", quantity: 1, label: "Truck & Trailer" },
            { type: "T", quantity: 1, label: "Truck (Tanga)" },
            { type: "ESCORT", quantity: 1, label: "Escort Vehicle" }
          ] : undefined
        ));
        removeDemands(combined.map(d => d.region));
      }
    }
  }

  // 2. LAKE ZONE CLUSTER LOGIC
  // Kagera & Geita
  const kagera = getDemand("KAGERA");
  const geita = getDemand("GEITA");
  if (kagera || geita) {
    const kgSum = (kagera?.boxes || 0) + (geita?.boxes || 0);
    if (kgSum > 0 && kgSum <= MAX_BOXES_PER_TT) {
      const kgDemands = [kagera, geita].filter(Boolean) as RegionDemand[];
      // Try to add helper regions
      const helpers = ["SINGIDA", "DODOMA"].map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
      const toAdd = [];
      let currentSum = kgSum;
      for (const h of helpers) {
        if (currentSum + h.boxes <= MAX_BOXES_PER_TT) {
          toAdd.push(h);
          currentSum += h.boxes;
        }
      }
      routes.push(createRoute(msafaraCounter++, "Kagera/Geita Route", ["DODOMA", "SINGIDA", "GEITA", "KAGERA"], [...kgDemands, ...toAdd], loadingDate, distanceMap));
      removeDemands([...kgDemands, ...toAdd].map(d => d.region));
    } else {
      // Split Kagera and Geita
      if (kagera) {
        const helper = getDemand("SINGIDA") || getDemand("DODOMA");
        const routeDemands = [kagera];
        if (helper) routeDemands.push(helper);
        routes.push(createRoute(msafaraCounter++, "Kagera Direct", ["DODOMA", "SINGIDA", "KAGERA"], routeDemands, loadingDate, distanceMap));
        removeDemands(routeDemands.map(d => d.region));
      }
      if (geita) {
        const helper = getDemand("SINGIDA") || getDemand("DODOMA");
        const routeDemands = [geita];
        if (helper) routeDemands.push(helper);
        routes.push(createRoute(msafaraCounter++, "Geita Direct", ["DODOMA", "SINGIDA", "GEITA"], routeDemands, loadingDate, distanceMap));
        removeDemands(routeDemands.map(d => d.region));
      }
    }
  }

  // Mwanza
  const mwanza = getDemand("MWANZA");
  if (mwanza) {
    if (mwanza.boxes > 700) {
      // Large Mwanza - check for middle regions
      const middle = ["PWANI", "MOROGORO"].map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
      const routeDemands = [mwanza, ...middle];
      routes.push(createRoute(
        msafaraCounter++, 
        "Mwanza Heavy", 
        ["PWANI", "MOROGORO", "MWANZA"], 
        routeDemands, 
        loadingDate, 
        distanceMap,
        middle.length > 0 ? [
          { type: "TT", quantity: 1, label: "Truck & Trailer (Mwanza)" },
          { type: "T", quantity: 1, label: "Truck (Middle Regions)" },
          { type: "ESCORT", quantity: 1, label: "Escort Vehicle" }
        ] : undefined
      ));
      removeDemands(routeDemands.map(d => d.region));
    } else {
      // Try to combine with Mara or Shinyanga
      const mara = getDemand("MARA");
      const shinyanga = getDemand("SHINYANGA");
      const routeDemands = [mwanza];
      if (mara && (mwanza.boxes + mara.boxes <= MAX_BOXES_PER_TT)) {
        routeDemands.push(mara);
      } else if (shinyanga && (mwanza.boxes + shinyanga.boxes <= MAX_BOXES_PER_TT)) {
        routeDemands.push(shinyanga);
      }
      routes.push(createRoute(msafaraCounter++, "Mwanza Corridor", ["SHINYANGA", "MWANZA", "MARA"], routeDemands, loadingDate, distanceMap));
      removeDemands(routeDemands.map(d => d.region));
    }
  }

  // Mara & Simiyu & Shinyanga
  const mara = getDemand("MARA");
  const simiyu = getDemand("SIMIYU");
  const shinyanga = getDemand("SHINYANGA");
  if (mara || simiyu || shinyanga) {
    const lakeGroup = [shinyanga, simiyu, mara].filter(Boolean) as RegionDemand[];
    const lakeSum = lakeGroup.reduce((sum, d) => sum + d.boxes, 0);
    if (lakeSum <= MAX_BOXES_PER_TT) {
      routes.push(createRoute(msafaraCounter++, "Mara/Simiyu Route", ["SHINYANGA", "SIMIYU", "MARA"], lakeGroup, loadingDate, distanceMap));
      removeDemands(lakeGroup.map(d => d.region));
    } else {
      // Split if they don't fit
      if (mara && simiyu && (mara.boxes + simiyu.boxes <= MAX_BOXES_PER_TT)) {
        routes.push(createRoute(msafaraCounter++, "Mara/Simiyu Split", ["SIMIYU", "MARA"], [simiyu, mara], loadingDate, distanceMap));
        removeDemands(["MARA", "SIMIYU"]);
      }
    }
  }

  // 3. WESTERN CLUSTER LOGIC
  const westernRegs = ["MOROGORO", "DODOMA", "TABORA", "KATAVI", "KIGOMA"];
  const westernDemands = westernRegs.map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
  if (westernDemands.length > 0) {
    const westSum = westernDemands.reduce((sum, d) => sum + d.boxes, 0);
    if (westSum <= MAX_BOXES_PER_TT) {
      routes.push(createRoute(msafaraCounter++, "Western Corridor", westernRegs, westernDemands, loadingDate, distanceMap));
      removeDemands(westernDemands.map(d => d.region));
    }
  }

  // 4. SOUTHERN HIGHLANDS CLUSTER LOGIC
  const shRegs = ["IRINGA", "NJOMBE", "RUVUMA", "MBEYA", "SONGWE", "RUKWA"];
  const shDemands = shRegs.map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
  if (shDemands.length > 0) {
    const shSum = shDemands.reduce((sum, d) => sum + d.boxes, 0);
    if (shSum <= MAX_BOXES_PER_TT) {
      routes.push(createRoute(msafaraCounter++, "Southern Highlands (Full)", shRegs, shDemands, loadingDate, distanceMap));
      removeDemands(shDemands.map(d => d.region));
    } else {
      // Split into Group A and Group B
      const groupA = ["MBEYA", "SONGWE", "RUKWA"].map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
      const groupB = ["IRINGA", "NJOMBE", "RUVUMA"].map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
      
      if (groupA.length > 0) {
        routes.push(createRoute(msafaraCounter++, "Southern Highlands (West)", ["MBEYA", "SONGWE", "RUKWA"], groupA, loadingDate, distanceMap));
        removeDemands(groupA.map(d => d.region));
      }
      if (groupB.length > 0) {
        routes.push(createRoute(msafaraCounter++, "Southern Highlands (East)", ["IRINGA", "NJOMBE", "RUVUMA"], groupB, loadingDate, distanceMap));
        removeDemands(groupB.map(d => d.region));
      }
    }
  }

  // 5. SOUTH COAST CLUSTER LOGIC
  const southCoastRegs = ["LINDI", "MTWARA"];
  const scDemands = southCoastRegs.map(r => getDemand(r)).filter(Boolean) as RegionDemand[];
  if (scDemands.length > 0) {
    const scSum = scDemands.reduce((sum, d) => sum + d.boxes, 0);
    if (scSum <= MAX_BOXES_PER_TT) {
      routes.push(createRoute(msafaraCounter++, "South Coast Route", southCoastRegs, scDemands, loadingDate, distanceMap));
      removeDemands(scDemands.map(d => d.region));
    }
  }

  // 6. REMAINING REGIONS (DAR, PWANI, ETC)
  while (remainingDemands.length > 0) {
    const target = remainingDemands[0];
    const routeDemands = [target];
    // Try to fill the truck with other remaining regions
    let currentSum = target.boxes;
    for (let i = 1; i < remainingDemands.length; i++) {
      if (currentSum + remainingDemands[i].boxes <= MAX_BOXES_PER_TT) {
        routeDemands.push(remainingDemands[i]);
        currentSum += remainingDemands[i].boxes;
      }
    }
    routes.push(createRoute(msafaraCounter++, "Remaining/Special", routeDemands.map(d => d.region), routeDemands, loadingDate, distanceMap));
    removeDemands(routeDemands.map(d => d.region));
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
    const dist = distanceMap.get(`${lastPoint}|${reg}`) || 0;
    totalKm += dist;
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
    loadingDate, 
    startDate: loadingDate, 
    startingPoint: "DAR ES SALAAM",
    regions: routeRegions,
    totalBoxes,
    totalTons: Math.round(tons * 100) / 100,
    totalKm: Math.round(totalKm),
    vehicles: customVehicles || [
      { type: "TT", quantity: 1, label: "Truck & Trailer" },
      { type: "ESCORT", quantity: 1, label: "Escort Vehicle" }
    ],
    notes: `Destination: ${visited[visited.length - 1] || 'N/A'}`,
    pathDisplay: ["DAR", ...visited]
  };
}