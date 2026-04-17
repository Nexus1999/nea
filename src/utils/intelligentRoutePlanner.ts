"use client";

/**
 * 1. OFFICIAL CORRIDORS WITH ANCHOR DESTINATIONS
 * The last item in 'path' is the primary destination.
 */
const CORRIDORS = [
  {
    name: "Lake Zone (Direct Kagera via Mwanza)",
    path: ["PWANI", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "GEITA", "KAGERA"],
    branches: ["SIMIYU", "MARA"]
  },
  {
    name: "Lake Zone (Mara/Simiyu Focus)",
    path: ["PWANI", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "MARA", "SIMIYU"],
    branches: ["KAGERA", "GEITA"]
  },
  {
    name: "Lake Zone (Short Geita/Kagera)",
    path: ["PWANI", "MOROGORO", "DODOMA", "SINGIDA", "GEITA", "KAGERA"],
    branches: []
  },
  {
    name: "Lake Zone (Via Tabora)",
    path: ["PWANI", "MOROGORO", "DODOMA", "TABORA", "GEITA", "KAGERA"],
    branches: []
  },
  {
    name: "Western (Kigoma)",
    path: ["PWANI", "MOROGORO", "DODOMA", "TABORA", "KIGOMA"],
    branches: ["KATAVI"]
  },
  {
    name: "Southern Highlands (Katavi Anchor)",
    path: ["PWANI", "MOROGORO", "IRINGA", "NJOMBE", "MBEYA", "SONGWE", "RUKWA", "KATAVI"],
    branches: ["RUVUMA"]
  },
  {
    name: "Southern Highlands (Rukwa Anchor)",
    path: ["PWANI", "MOROGORO", "IRINGA", "NJOMBE", "MBEYA", "SONGWE", "RUKWA"],
    branches: ["RUVUMA"]
  },
  {
    name: "Southern Highlands (Highlands Focus)",
    path: ["PWANI", "MOROGORO", "IRINGA", "NJOMBE", "MBEYA", "SONGWE"],
    branches: ["RUVUMA"]
  },
  {
    name: "Southern Highlands (Ruvuma Focus)",
    path: ["PWANI", "MOROGORO", "IRINGA", "NJOMBE", "RUVUMA"],
    branches: []
  },
  {
    name: "South Coast",
    path: ["PWANI", "LINDI", "MTWARA"],
    branches: ["RUVUMA"]
  },
  {
    name: "Northern (Manyara Anchor)",
    path: ["TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"],
    branches: []
  },
  {
    name: "Northern (Manyara via Dodoma)",
    path: ["PWANI", "MOROGORO", "DODOMA", "MANYARA"],
    branches: []
  }
];

const HUB_RULES: Record<string, string> = {
  "SIMIYU": "SHINYANGA",
  "MARA": "MWANZA",
  "KAGERA": "MWANZA",
  "GEITA": "MWANZA",
  "KATAVI": "TABORA", 
  "RUVUMA": "NJOMBE",
};

const MAX_BOXES = 880;

export function generateIntelligentRoutes(
  demands: { region: string; boxes: number }[],
  loadingDate: string,
  distances: any[] = []
): any[] {
  const routes: any[] = [];
  let msafaraCounter = 1;
  const distanceMap = new Map();
  
  distances.forEach(d => {
    distanceMap.set(`${d.from_region_name.toUpperCase()}|${d.to_region_name.toUpperCase()}`, parseFloat(d.distance_km));
  });

  let remainingDemands = demands
    .filter(d => d.boxes > 0)
    .map(d => ({ ...d, region: d.region.toUpperCase() }));

  // Helper to get distance from Dar
  const getDist = (reg: string) => distanceMap.get(`DAR ES SALAAM|${reg}`) || 0;

  // 1. SORT ALL DEMANDS BY DISTANCE (Farthest regions first)
  remainingDemands.sort((a, b) => getDist(b.region) - getDist(a.region));

  while (remainingDemands.length > 0) {
    const farthestTarget = remainingDemands[0];
    
    // 2. FIND BEST CORRIDOR for the farthest target
    const bestCorridor = CORRIDORS.find(c => 
        c.path[c.path.length - 1] === farthestTarget.region || 
        c.path.includes(farthestTarget.region) || 
        c.branches.includes(farthestTarget.region)
    ) || CORRIDORS[0];

    let currentGroup: any[] = [];
    let currentBoxes = 0;

    // 3. FILL TRUCK with regions strictly on this path or its branches
    // We prioritize the farthest target, then look for others in the corridor
    const potentialItems = remainingDemands.filter(d => 
        bestCorridor.path.includes(d.region) || bestCorridor.branches.includes(d.region)
    );

    for (const item of potentialItems) {
      if (currentBoxes + item.boxes <= MAX_BOXES) {
        currentGroup.push(item);
        currentBoxes += item.boxes;
      }
    }

    // Remove selected from total pool
    const selectedIds = currentGroup.map(g => g.region);
    remainingDemands = remainingDemands.filter(r => !selectedIds.includes(r.region));

    // 4. SEQUENCE THE ROUTE (Dar -> Stop 1 -> Stop 2 -> Farthest)
    // We sort the current group by distance from Dar (ascending)
    currentGroup.sort((a, b) => getDist(a.region) - getDist(b.region));

    const routeRegions = currentGroup.map((d, idx) => {
      let receiving = d.region;
      
      // If region is a branch or specifically listed in HUB_RULES, it's a "Receive At"
      const isBranch = bestCorridor.branches.includes(d.region);
      if (isBranch || HUB_RULES[d.region]) {
        receiving = HUB_RULES[d.region] || d.region;
      }

      // Special Tanga Logic
      if (d.region === "TANGA") {
        receiving = "SEGERA / TANGA TOWN";
      }

      return {
        name: d.region,
        receivingPlace: receiving,
        deliveryDate: new Date(new Date(loadingDate).getTime() + (idx + 1) * 86400000).toISOString().split('T')[0],
        boxes: d.boxes
      };
    });

    // 5. CALCULATE KMS
    let totalKm = 0;
    let lastPoint = "DAR ES SALAAM";
    routeRegions.forEach(r => {
      totalKm += distanceMap.get(`${lastPoint}|${r.name}`) || 0;
      lastPoint = r.name;
    });

    const totalTons = (currentBoxes * 34) / 1000;

    routes.push({
      msafaraNumber: msafaraCounter++,
      name: `Msafara - Destination ${farthestTarget.region}`,
      loadingDate,
      startDate: loadingDate,
      startingPoint: "DAR ES SALAAM",
      regions: routeRegions,
      totalBoxes: currentBoxes,
      totalTons: Math.round(totalTons * 100) / 100,
      totalKm: Math.round(totalKm),
      vehicles: [
        { type: "LORRY_HORSE_AND_TRAILER", quantity: Math.ceil(totalTons / 15) },
        { type: "ESCORT_COASTER", quantity: 1 }
      ],
      notes: `Path: ${bestCorridor.name}. Farthest point: ${farthestTarget.region}`
    });
  }

  return routes;
}