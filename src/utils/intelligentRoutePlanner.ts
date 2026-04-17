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
  notes: string;
  estimatedExtraKm?: number;
}

const HUBS: Record<string, string> = {
  "KAGERA": "MWANZA",
  "GEITA": "MWANZA",
  "MARA": "MWANZA",
  "SIMIYU": "SHINYANGA",
  "RUVUMA": "NJOMBE",
  "KATAVI": "TABORA", // Default preference (paved road)
};

export const CLUSTERS = [
  { name: "Lake Zone", regions: ["KAGERA", "GEITA", "MARA", "SIMIYU", "SHINYANGA", "MWANZA"] },
  { name: "Southern Highlands", regions: ["IRINGA", "NJOMBE", "RUVUMA", "MBEYA", "SONGWE", "RUKWA", "KATAVI"] },
  { name: "Western", regions: ["KIGOMA", "TABORA", "SINGIDA", "DODOMA", "MOROGORO"] },
  { name: "Northern", regions: ["MANYARA", "ARUSHA", "KILIMANJARO", "TANGA"] },
  { name: "South Coast", regions: ["LINDI", "MTWARA"] },
  { name: "Near DSM", regions: ["PWANI"] },
];

const MAX_BOXES_PER_MSAFARA = 880;

export function generateIntelligentRoutes(
  demands: RegionDemand[],
  loadingDate: string
): SuggestedMsafara[] {
  const routes: SuggestedMsafara[] = [];
  let msafaraCounter = 1;
  let currentDate = new Date(loadingDate);

  // Filter only regions with boxes
  let activeDemands = demands.filter(d => d.boxes > 0);

  for (const cluster of CLUSTERS) {
    let clusterDemands = activeDemands.filter(d => cluster.regions.includes(d.region));
    if (clusterDemands.length === 0) continue;

    let remaining = [...clusterDemands];

    while (remaining.length > 0) {
      let currentGroup: RegionDemand[] = [];
      let currentBoxes = 0;

      // Smart grouping with special rules
      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i];
        
        // Special Katavi logic: Prefer Tabora (Western)
        if (item.region === "KATAVI" && cluster.name !== "Western" && cluster.name !== "Southern Highlands") {
          continue;
        }

        if (currentBoxes + item.boxes <= MAX_BOXES_PER_MSAFARA) {
          currentGroup.push(item);
          currentBoxes += item.boxes;
        }
      }

      if (currentGroup.length === 0) break;

      remaining = remaining.filter(r => !currentGroup.some(g => g.region === r.region));

      const totalTons = (currentBoxes * 34) / 1000;
      const lorries = Math.ceil(totalTons / 15);
      const escorts = Math.max(1, Math.ceil(lorries * 0.7));

      const routeRegions = currentGroup.map((d, idx) => {
        let receiving = HUBS[d.region] || d.region;
        
        // Special receiving logic
        if (d.region === "RUVUMA" && !currentGroup.some(r => ["MBEYA", "SONGWE", "RUKWA"].includes(r.region))) {
          receiving = "RUVUMA"; // Direct if ending here
        }
        if (d.region === "KATAVI" && currentGroup.some(r => r.region === "TABORA")) {
          receiving = "TABORA";
        }

        return {
          name: d.region,
          receivingPlace: receiving,
          deliveryDate: new Date(currentDate.getTime() + (1 + idx) * 86400000)
            .toISOString().split('T')[0],
          boxes: d.boxes
        };
      });

      routes.push({
        msafaraNumber: msafaraCounter++,
        name: `Msafara ${msafaraCounter - 1} - ${cluster.name}`,
        loadingDate,
        startDate: new Date(currentDate.getTime() + 86400000).toISOString().split('T')[0],
        startingPoint: "DAR ES SALAAM",
        regions: routeRegions,
        vehicles: [
          { type: "LORRY_HORSE_AND_TRAILER", quantity: lorries },
          { type: "ESCORT_COASTER", quantity: escorts }
        ],
        totalBoxes: currentBoxes,
        totalTons: Math.round(totalTons * 100) / 100,
        notes: `${currentGroup.length} regions • ${lorries} Lorry unit(s)`,
      });
    }

    // Stagger cluster batches
    currentDate = new Date(currentDate.getTime() + 2 * 86400000);
  }

  return routes;
}

export const ALL_TANZANIAN_REGIONS = [
  "ARUSHA", "DAR ES SALAAM", "DODOMA", "GEITA", "IRINGA",
  "KAGERA", "KATAVI", "KIGOMA", "KILIMANJARO", "LINDI",
  "MANYARA", "MARA", "MBEYA", "MOROGORO", "MTWARA",
  "MWANZA", "NJOMBE", "PWANI", "RUKWA", "RUVUMA",
  "SHINYANGA", "SIMIYU", "SINGIDA", "SONGWE", "TABORA",
  "TANGA"
];