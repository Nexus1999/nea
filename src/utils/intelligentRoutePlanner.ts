"use client";

// PURPOSE: Given a list of regions and their box counts, automatically group
// them into Msafara (routes) that respect vehicle capacity limits and
// geographic proximity.

export interface RegionDemand {
  region: string;   // Region name in ALL CAPS (e.g., "KAGERA")
  boxes: number;    // Total number of boxes
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
  vehicles: Array<{
    type: string;
    quantity: number;
  }>;
  totalBoxes: number;
  totalTons: number;
  estimatedLorries: number;
  estimatedEscorts: number;
  notes: string;
}

const HUB_MAP: Record<string, string> = {
  "KAGERA": "MWANZA",
  "GEITA": "MWANZA",
  "MARA": "MWANZA",
  "SIMIYU": "SHINYANGA",
  "RUVUMA": "NJOMBE",
  "KATAVI": "RUKWA",
};

export const GEO_CLUSTERS: Array<{ name: string; regions: string[] }> = [
  {
    name: "Lake Zone",
    regions: ["SINGIDA", "SHINYANGA", "MWANZA", "GEITA", "KAGERA", "MARA", "SIMIYU"]
  },
  {
    name: "Southern Highlands",
    regions: ["IRINGA", "NJOMBE", "RUVUMA", "MBEYA", "SONGWE", "RUKWA", "KATAVI"]
  },
  {
    name: "Western / Central",
    regions: ["PWANI", "MOROGORO", "DODOMA", "TABORA", "KIGOMA"]
  },
  {
    name: "Northern Zone",
    regions: ["TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"]
  },
  {
    name: "South Coast",
    regions: ["LINDI", "MTWARA"]
  },
];

const BOX_WEIGHT_KG = 34;
const SINGLE_LORRY_TONS = 15;
const TRAILER_LORRY_TONS = 30;
const MAX_BOXES_PER_MSAFARA = 880;

function boxesToTons(boxes: number): number {
  return Math.round((boxes * BOX_WEIGHT_KG) / 1000 * 100) / 100;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function assignVehicles(totalTons: number): { vehicles: Array<{ type: string; quantity: number }>; lorries: number; escorts: number } {
  let lorries: number;
  let vehicleType: string;

  if (totalTons <= SINGLE_LORRY_TONS) {
    lorries = 1;
    vehicleType = "LORRY_HORSE";
  } else if (totalTons <= TRAILER_LORRY_TONS) {
    lorries = 1;
    vehicleType = "LORRY_HORSE_AND_TRAILER";
  } else {
    lorries = Math.ceil(totalTons / TRAILER_LORRY_TONS);
    vehicleType = "LORRY_HORSE_AND_TRAILER";
  }

  const escorts = Math.max(1, Math.ceil(lorries * 0.7));

  return {
    vehicles: [
      { type: vehicleType, quantity: lorries },
      { type: "ESCORT_COASTER", quantity: escorts }
    ],
    lorries,
    escorts
  };
}

export function generateIntelligentRoutes(
  demands: RegionDemand[],
  loadingDate: string
): SuggestedMsafara[] {
  const results: SuggestedMsafara[] = [];
  let msafaraCounter = 1;
  let batchOffset = 0;

  for (const cluster of GEO_CLUSTERS) {
    const clusterDemands = cluster.regions
      .map(region => demands.find(d => d.region === region && d.boxes > 0))
      .filter(Boolean) as RegionDemand[];

    if (clusterDemands.length === 0) continue;

    const remaining = [...clusterDemands];

    while (remaining.length > 0) {
      const currentGroup: RegionDemand[] = [];
      let currentBoxes = 0;

      for (let i = remaining.length - 1; i >= 0; i--) {
        if (currentBoxes + remaining[i].boxes <= MAX_BOXES_PER_MSAFARA) {
          currentGroup.unshift(remaining[i]);
          currentBoxes += remaining[i].boxes;
          remaining.splice(i, 1);
        }
      }

      if (currentGroup.length === 0) {
        currentGroup.push(remaining.shift()!);
        currentBoxes = currentGroup[0].boxes;
      }

      const currentLoadDate = addDays(loadingDate, batchOffset);
      const currentStartDate = addDays(loadingDate, batchOffset + 1);
      const totalTons = boxesToTons(currentBoxes);
      const { vehicles, lorries, escorts } = assignVehicles(totalTons);

      const routeRegions = currentGroup.map((demand, idx) => ({
        name: demand.region,
        receivingPlace: HUB_MAP[demand.region] || demand.region,
        deliveryDate: addDays(currentStartDate, idx),
        boxes: demand.boxes,
      }));

      results.push({
        msafaraNumber: msafaraCounter++,
        name: `Msafara ${msafaraCounter - 1} — ${cluster.name}`,
        loadingDate: currentLoadDate,
        startDate: currentStartDate,
        startingPoint: "DAR ES SALAAM",
        regions: routeRegions,
        vehicles,
        totalBoxes: currentBoxes,
        totalTons,
        estimatedLorries: lorries,
        estimatedEscorts: escorts,
        notes: `${currentGroup.length} stop${currentGroup.length > 1 ? 's' : ''} • ${totalTons} tons • ${lorries} lorry unit(s)`,
      });
    }

    batchOffset += 2;
  }

  return results;
}

export const ALL_TANZANIAN_REGIONS = [
  "ARUSHA", "DAR ES SALAAM", "DODOMA", "GEITA", "IRINGA",
  "KAGERA", "KATAVI", "KIGOMA", "KILIMANJARO", "LINDI",
  "MANYARA", "MARA", "MBEYA", "MOROGORO", "MTWARA",
  "MWANZA", "NJOMBE", "PWANI", "RUKWA", "RUVUMA",
  "SHINYANGA", "SIMIYU", "SINGIDA", "SONGWE", "TABORA",
  "TANGA"
];