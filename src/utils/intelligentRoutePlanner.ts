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

// Special single-truck regions (as specified)
const SINGLE_TRUCK_REGIONS = ["PWANI", "MOROGORO", "DODOMA", "TANGA"];

const HUBS: Record<string, string> = {
  "KAGERA": "MWANZA",
  "GEITA": "MWANZA",
  "MARA": "MWANZA",
  "SIMIYU": "SHINYANGA",
  "RUVUMA": "NJOMBE",
  "KATAVI": "TABORA",           // Preferred (paved road)
};

const CLUSTERS = [
  { name: "Lake Zone", regions: ["KAGERA", "GEITA", "MARA", "SIMIYU", "SHINYANGA", "MWANZA"] },
  { name: "Southern Highlands", regions: ["IRINGA", "NJOMBE", "RUVUMA", "MBEYA", "SONGWE", "RUKWA"] },
  { name: "Western", regions: ["KIGOMA", "TABORA", "SINGIDA", "DODOMA", "MOROGORO"] },
  { name: "Northern", regions: ["MANYARA", "ARUSHA", "KILIMANJARO", "TANGA"] },
  { name: "South Coast", regions: ["LINDI", "MTWARA"] },
  { name: "Near DSM", regions: ["PWANI"] },
];

const MAX_BOXES_PER_MSAFARA = 880;

function buildDistanceMap(distances: any[]): Map<string, number> {
  const map = new Map<string, number>();
  distances.forEach(d => {
    const key1 = `${d.from_region_name.toUpperCase()}|${d.to_region_name.toUpperCase()}`;
    const key2 = `${d.to_region_name.toUpperCase()}|${d.from_region_name.toUpperCase()}`;
    const km = parseFloat(d.distance_km);
    map.set(key1, km);
    map.set(key2, km);
  });
  return map;
}

function calculateRouteDistance(path: string[], distanceMap: Map<string, number>): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const key = `${path[i].toUpperCase()}|${path[i + 1].toUpperCase()}`;
    total += distanceMap.get(key) || 0;
  }
  return Math.round(total);
}

export function generateIntelligentRoutes(
  demands: RegionDemand[],
  loadingDate: string,
  distances: any[] = []   // Pass the full region_distances array
): SuggestedMsafara[] {
  const routes: SuggestedMsafara[] = [];
  let msafaraCounter = 1;
  let currentDate = new Date(loadingDate);
  const distanceMap = buildDistanceMap(distances);

  // Only consider regions with boxes > 0
  let activeDemands = demands.filter(d => d.boxes > 0);

  for (const cluster of CLUSTERS) {
    let remaining = activeDemands.filter(d => cluster.regions.includes(d.region.toUpperCase()));
    if (remaining.length === 0) continue;

    while (remaining.length > 0) {
      let currentGroup: RegionDemand[] = [];
      let currentBoxes = 0;

      // Greedy fill with special rules
      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];

        // Katavi prefers Tabora (Western)
        if (item.region.toUpperCase() === "KATAVI" && cluster.name !== "Western") {
          continue;
        }

        if (currentBoxes + item.boxes <= MAX_BOXES_PER_MSAFARA) {
          currentGroup.push(item);
          currentBoxes += item.boxes;
        }
      }

      if (currentGroup.length === 0) {
        if (remaining.length > 0) {
           const forcedItem = remaining[0];
           currentGroup.push(forcedItem);
           currentBoxes += forcedItem.boxes;
        } else {
          break;
        }
      }

      remaining = remaining.filter(r => !currentGroup.some(g => g.region === r.region));

      const totalTons = (currentBoxes * 34) / 1000;
      let lorries = Math.ceil(totalTons / 15);
      let escorts = Math.max(1, Math.ceil(lorries * 0.7));

      const isSingleTruckRegion = currentGroup.length === 1 && SINGLE_TRUCK_REGIONS.includes(currentGroup[0].region.toUpperCase());
      if (isSingleTruckRegion) {
        lorries = 1;
        escorts = 1;
      }

      const routeRegions = currentGroup.map((d, idx) => {
        let receiving = HUBS[d.region.toUpperCase()] || d.region.toUpperCase();

        if (d.region.toUpperCase() === "RUVUMA") {
          const continuesSouth = currentGroup.some(r => ["MBEYA", "SONGWE", "RUKWA"].includes(r.region.toUpperCase()));
          receiving = continuesSouth ? "NJOMBE" : "RUVUMA";
        }

        return {
          name: d.region.toUpperCase(),
          receivingPlace: receiving,
          deliveryDate: new Date(currentDate.getTime() + (1 + idx) * 86400000).toISOString().split('T')[0],
          boxes: d.boxes
        };
      });

      const pathForDistance = ["DAR ES SALAAM", ...routeRegions.map(r => r.name)];
      const totalKm = calculateRouteDistance(pathForDistance, distanceMap);

      routes.push({
        msafaraNumber: msafaraCounter++,
        name: `Msafara ${msafaraCounter - 1} - ${cluster.name}`,
        loadingDate,
        startDate: new Date(currentDate.getTime() + 86400000).toISOString().split('T')[0],
        startingPoint: "DAR ES SALAAM",
        regions: routeRegions,
        vehicles: [
          { type: isSingleTruckRegion ? "LORRY_HORSE" : "LORRY_HORSE_AND_TRAILER", quantity: lorries },
          { type: "ESCORT_COASTER", quantity: escorts }
        ],
        totalBoxes: currentBoxes,
        totalTons: Math.round(totalTons * 100) / 100,
        totalKm,
        notes: `${currentGroup.length} regions • ${totalKm} km`
      });
    }

    currentDate = new Date(currentDate.getTime() + 2 * 86400000);
  }

  return routes;
}