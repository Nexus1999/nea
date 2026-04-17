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
const MAX_BOXES_PER_T  = 400; // Standard Truck

const HUB_RULES: Record<string, string> = {
  "SIMIYU":  "SHINYANGA",
  "MARA":    "MWANZA",
  "KAGERA":  "MWANZA",
  "GEITA":   "MWANZA",
  "KATAVI":  "TABORA",
  "RUVUMA":  "NJOMBE",
  "TANGA":   "SEGERA / TANGA TOWN",
};

// ---------------------------------------------------------------------------
// VEHICLE CONFIG HELPERS
// ---------------------------------------------------------------------------
const TT_ONLY = [
  { type: "TT",     quantity: 1, label: "Truck & Trailer" },
  { type: "ESCORT", quantity: 1, label: "Escort Vehicle"  },
];

function ttPlusExtraTruck(extraLabel: string) {
  return [
    { type: "TT",     quantity: 1, label: "Truck & Trailer"       },
    { type: "T",      quantity: 1, label: `Truck (${extraLabel})`  },
    { type: "ESCORT", quantity: 1, label: "Escort Vehicle"         },
  ];
}

// ---------------------------------------------------------------------------
// MAIN EXPORT
// ---------------------------------------------------------------------------
export function generateIntelligentRoutes(
  demands: RegionDemand[],
  loadingDate: string,
  distances: any[] = []
): SuggestedMsafara[] {

  // Build distance lookup (bidirectional)
  const distanceMap = new Map<string, number>();
  distances.forEach(d => {
    const a  = d.from_region_name.toUpperCase();
    const b  = d.to_region_name.toUpperCase();
    const km = parseFloat(d.distance_km);
    distanceMap.set(`${a}|${b}`, km);
    distanceMap.set(`${b}|${a}`, km);
  });

  // Pool — every region is deleted once assigned
  const pool = new Map<string, number>(
    demands
      .filter(d => d.boxes > 0)
      .map(d => [d.region.toUpperCase(), d.boxes])
  );

  const routes: SuggestedMsafara[] = [];
  let counter = 1;

  // ── Pool helpers ──────────────────────────────────────────────────────────
  const demand = (r: string): RegionDemand | undefined =>
    pool.has(r) ? { region: r, boxes: pool.get(r)! } : undefined;

  const take = (regs: string[]) => regs.forEach(r => pool.delete(r));

  function push(
    name:      string,
    path:      string[],
    list:      RegionDemand[],
    vehicles?: typeof TT_ONLY
  ) {
    if (list.length === 0) return;
    routes.push(buildRoute(counter++, name, path, list, loadingDate, distanceMap, vehicles));
    take(list.map(d => d.region));
  }

  // =========================================================================
  // 1. NORTHERN CLUSTER
  //    Regions: TANGA, KILIMANJARO, ARUSHA, MANYARA
  //
  //  Scenario A: All four fit in one TT.
  //  Scenario B: MANYARA + KILI + ARUSHA fit in TT; TANGA gets its own Truck
  //              in the SAME Msafara (two vehicles, one Msafara).
  //  Scenario C: Only KILI + ARUSHA fit in TT; TANGA gets its own Truck in
  //              the SAME Msafara; MANYARA goes to a SEPARATE Msafara paired
  //              with the best available middle region (MOROGORO > PWANI > DODOMA).
  //  Scenario D: Nothing combines sensibly → each region sent individually.
  // =========================================================================
  {
    const tanga  = demand("TANGA");
    const kili   = demand("KILIMANJARO");
    const arusha = demand("ARUSHA");
    const many   = demand("MANYARA");

    const present = [tanga, kili, arusha, many].filter(Boolean) as RegionDemand[];

    if (present.length > 0) {
      const totalAll = present.reduce((s, d) => s + d.boxes, 0);
      const coreList = [many, kili, arusha].filter(Boolean) as RegionDemand[];
      const coreSum  = coreList.reduce((s, d) => s + d.boxes, 0);
      const akSum    = (kili?.boxes ?? 0) + (arusha?.boxes ?? 0);

      if (totalAll <= MAX_BOXES_PER_TT) {
        // A: all fit
        push(
          "Northern (Full)",
          ["TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"],
          present,
          TT_ONLY
        );

      } else if (coreSum <= MAX_BOXES_PER_TT && tanga && tanga.boxes <= MAX_BOXES_PER_T) {
        // B: MANYARA+KILI+ARUSHA in TT, TANGA in extra Truck, same Msafara
        push(
          "Northern (Core TT + Tanga Truck)",
          ["TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"],
          [...coreList, tanga],
          ttPlusExtraTruck("TANGA")
        );

      } else if (akSum <= MAX_BOXES_PER_TT) {
        // C: KILI+ARUSHA in TT, TANGA in extra Truck (same Msafara)
        //    MANYARA → separate Msafara with a middle region
        const akList = [kili, arusha].filter(Boolean) as RegionDemand[];
        if (tanga) {
          push(
            "Northern (Arusha/Kili TT + Tanga Truck)",
            ["TANGA", "KILIMANJARO", "ARUSHA"],
            [...akList, tanga],
            ttPlusExtraTruck("TANGA")
          );
        } else {
          push("Northern (Arusha/Kili)", ["KILIMANJARO", "ARUSHA"], akList, TT_ONLY);
        }

        // MANYARA — own Msafara, paired with best available middle region
        const manyD = demand("MANYARA");
        if (manyD) {
          const mid = demand("MOROGORO") ?? demand("PWANI") ?? demand("DODOMA");
          const manyList = mid ? [mid, manyD] : [manyD];
          push(
            "Manyara Route",
            manyList.map(d => d.region),
            manyList,
            TT_ONLY
          );
        }

      } else {
        // D: cannot combine — send each individually
        present.forEach(nd =>
          push(`${nd.region} Direct`, [nd.region], [nd], TT_ONLY)
        );
      }
    }
  }

  // =========================================================================
  // 2. LAKE ZONE
  // =========================================================================

  // 2a. KAGERA + GEITA
  //     These two are the farthest, so always prioritise putting them together.
  //     Helpers for topping-up or individual pairing: DODOMA, SINGIDA.
  {
    const kagera = demand("KAGERA");
    const geita  = demand("GEITA");

    if (kagera && geita) {
      const kgSum = kagera.boxes + geita.boxes;

      if (kgSum <= MAX_BOXES_PER_TT) {
        // Fit together — optionally top up with one helper
        const helper = demand("DODOMA") ?? demand("SINGIDA");
        const list: RegionDemand[] = [geita, kagera];
        if (helper && kgSum + helper.boxes <= MAX_BOXES_PER_TT) list.unshift(helper);
        push("Kagera/Geita Route", list.map(d => d.region), list, TT_ONLY);

      } else {
        // Too heavy together — send separately, each paired with a helper
        const hK = demand("SINGIDA") ?? demand("DODOMA");
        const kList = hK && kagera.boxes + hK.boxes <= MAX_BOXES_PER_TT
          ? [hK, kagera] : [kagera];
        push("Kagera Direct", kList.map(d => d.region), kList, TT_ONLY);

        const hG = demand("DODOMA") ?? demand("SINGIDA");
        const gList = hG && geita.boxes + hG.boxes <= MAX_BOXES_PER_TT
          ? [hG, geita] : [geita];
        push("Geita Direct", gList.map(d => d.region), gList, TT_ONLY);
      }

    } else if (kagera) {
      const h = demand("SINGIDA") ?? demand("DODOMA");
      const list = h && kagera.boxes + h.boxes <= MAX_BOXES_PER_TT
        ? [h, kagera] : [kagera];
      push("Kagera Direct", list.map(d => d.region), list, TT_ONLY);

    } else if (geita) {
      const h = demand("DODOMA") ?? demand("SINGIDA");
      const list = h && geita.boxes + h.boxes <= MAX_BOXES_PER_TT
        ? [h, geita] : [geita];
      push("Geita Direct", list.map(d => d.region), list, TT_ONLY);
    }
  }

  // 2b. MWANZA
  //     Heavy (fills TT): independent TT route + ONE extra Truck for ONE
  //     middle region (SINGIDA > DODOMA > PWANI > MOROGORO).
  //     Normal: combine with MARA (preferred) or SHINYANGA.
  {
    const mwanza = demand("MWANZA");
    if (mwanza) {

      if (mwanza.boxes >= MAX_BOXES_PER_TT) {
        // Heavy Mwanza — add exactly ONE extra Truck for ONE middle region
        const mid = demand("SINGIDA") ?? demand("DODOMA") ?? demand("PWANI") ?? demand("MOROGORO");
        if (mid) {
          push(
            "Mwanza Heavy",
            [mid.region, "MWANZA"],
            [mid, mwanza],
            ttPlusExtraTruck(mid.region)
          );
        } else {
          push("Mwanza", ["MWANZA"], [mwanza], TT_ONLY);
        }

      } else {
        // Normal Mwanza — try MARA first, then SHINYANGA
        const mara      = demand("MARA");
        const shinyanga = demand("SHINYANGA");
        const simiyu    = demand("SIMIYU");

        if (mara && mwanza.boxes + mara.boxes <= MAX_BOXES_PER_TT) {
          const list: RegionDemand[] = [mwanza, mara];
          // Optionally add SIMIYU if it fits
          if (simiyu && list.reduce((s, d) => s + d.boxes, 0) + simiyu.boxes <= MAX_BOXES_PER_TT) {
            list.push(simiyu);
          }
          push("Mwanza/Mara Corridor", list.map(d => d.region), list, TT_ONLY);

        } else if (shinyanga && mwanza.boxes + shinyanga.boxes <= MAX_BOXES_PER_TT) {
          push("Mwanza/Shinyanga", ["SHINYANGA", "MWANZA"], [shinyanga, mwanza], TT_ONLY);

        } else {
          push("Mwanza", ["MWANZA"], [mwanza], TT_ONLY);
        }
      }
    }
  }

  // 2c. MARA + SIMIYU (and optionally SHINYANGA)
  {
    const mara      = demand("MARA");
    const simiyu    = demand("SIMIYU");
    const shinyanga = demand("SHINYANGA");

    if (mara || simiyu) {
      const list: RegionDemand[] = [simiyu, mara].filter(Boolean) as RegionDemand[];
      let total = list.reduce((s, d) => s + d.boxes, 0);

      // Add SHINYANGA if there's room
      if (shinyanga && total + shinyanga.boxes <= MAX_BOXES_PER_TT) {
        list.unshift(shinyanga);
        total += shinyanga.boxes;
      }

      if (total <= MAX_BOXES_PER_TT) {
        push("Mara/Simiyu Route", list.map(d => d.region), list, TT_ONLY);
      } else {
        // Cannot fit together — send separately
        if (mara)   push("Mara Direct",   ["MARA"],   [mara],   TT_ONLY);
        if (simiyu) push("Simiyu Direct", ["SIMIYU"], [simiyu], TT_ONLY);
      }
    }
  }

  // 2d. SHINYANGA (if still in pool after being skipped above)
  {
    const shinyanga = demand("SHINYANGA");
    if (shinyanga) {
      const h = demand("SINGIDA") ?? demand("DODOMA") ?? demand("PWANI") ?? demand("MOROGORO");
      const list = h && shinyanga.boxes + h.boxes <= MAX_BOXES_PER_TT
        ? [h, shinyanga] : [shinyanga];
      push("Shinyanga Route", list.map(d => d.region), list, TT_ONLY);
    }
  }

  // =========================================================================
  // 3. WESTERN CORRIDOR
  //    Path: MOROGORO → DODOMA → TABORA → KATAVI → KIGOMA
  //    KIGOMA is always the endpoint and always travels with TABORA & KATAVI.
  //    If all regions fit in one TT → single route.
  //    Otherwise → TABORA+KATAVI+KIGOMA in one TT, MOROGORO+DODOMA in another.
  // =========================================================================
  {
    const morogoro = demand("MOROGORO");
    const dodoma   = demand("DODOMA");
    const tabora   = demand("TABORA");
    const katavi   = demand("KATAVI");
    const kigoma   = demand("KIGOMA");

    const western = [morogoro, dodoma, tabora, katavi, kigoma].filter(Boolean) as RegionDemand[];

    if (western.length > 0) {
      const total = western.reduce((s, d) => s + d.boxes, 0);

      if (total <= MAX_BOXES_PER_TT) {
        push("Western Corridor", ["MOROGORO", "DODOMA", "TABORA", "KATAVI", "KIGOMA"], western, TT_ONLY);

      } else {
        // Far-west: TABORA + KATAVI + KIGOMA
        const far    = [tabora, katavi, kigoma].filter(Boolean) as RegionDemand[];
        const farSum = far.reduce((s, d) => s + d.boxes, 0);
        if (far.length > 0 && farSum <= MAX_BOXES_PER_TT) {
          push("Western (Kigoma Focus)", ["TABORA", "KATAVI", "KIGOMA"], far, TT_ONLY);
        } else {
          far.forEach(nd => push(`${nd.region} Direct`, [nd.region], [nd], TT_ONLY));
        }

        // Near-west: MOROGORO + DODOMA
        const near    = [morogoro, dodoma].filter(Boolean) as RegionDemand[];
        const nearSum = near.reduce((s, d) => s + d.boxes, 0);
        if (near.length > 0 && nearSum <= MAX_BOXES_PER_TT) {
          push("Western (Near)", ["MOROGORO", "DODOMA"], near, TT_ONLY);
        } else {
          near.forEach(nd => push(`${nd.region} Direct`, [nd.region], [nd], TT_ONLY));
        }
      }
    }
  }

  // =========================================================================
  // 4. SOUTHERN HIGHLANDS
  //    Regions: IRINGA, NJOMBE, RUVUMA, MBEYA, SONGWE, RUKWA
  //    • All fit in one TT → single route.
  //    • Split West: MBEYA + SONGWE + RUKWA
  //    • Split East: IRINGA + NJOMBE + RUVUMA
  // =========================================================================
  {
    const iringa = demand("IRINGA");
    const njombe = demand("NJOMBE");
    const ruvuma = demand("RUVUMA");
    const mbeya  = demand("MBEYA");
    const songwe = demand("SONGWE");
    const rukwa  = demand("RUKWA");

    const allSH = [iringa, njombe, ruvuma, mbeya, songwe, rukwa].filter(Boolean) as RegionDemand[];

    if (allSH.length > 0) {
      const total = allSH.reduce((s, d) => s + d.boxes, 0);

      if (total <= MAX_BOXES_PER_TT) {
        push("Southern Highlands (Full)", ["IRINGA", "NJOMBE", "RUVUMA", "MBEYA", "SONGWE", "RUKWA"], allSH, TT_ONLY);

      } else {
        // West sub-group: MBEYA + SONGWE + RUKWA
        const west    = [mbeya, songwe, rukwa].filter(Boolean) as RegionDemand[];
        const westSum = west.reduce((s, d) => s + d.boxes, 0);
        if (west.length > 0 && westSum <= MAX_BOXES_PER_TT) {
          push("Southern Highlands (West)", ["MBEYA", "SONGWE", "RUKWA"], west, TT_ONLY);
        } else {
          west.forEach(nd => push(`${nd.region} Direct`, [nd.region], [nd], TT_ONLY));
        }

        // East sub-group: IRINGA + NJOMBE + RUVUMA
        const east    = [iringa, njombe, ruvuma].filter(Boolean) as RegionDemand[];
        const eastSum = east.reduce((s, d) => s + d.boxes, 0);
        if (east.length > 0 && eastSum <= MAX_BOXES_PER_TT) {
          push("Southern Highlands (East)", ["IRINGA", "NJOMBE", "RUVUMA"], east, TT_ONLY);
        } else {
          east.forEach(nd => push(`${nd.region} Direct`, [nd.region], [nd], TT_ONLY));
        }
      }
    }
  }

  // =========================================================================
  // 5. SOUTH COAST
  //    LINDI + MTWARA. Combine if they fit; otherwise split.
  // =========================================================================
  {
    const lindi  = demand("LINDI");
    const mtwara = demand("MTWARA");
    const sc     = [lindi, mtwara].filter(Boolean) as RegionDemand[];

    if (sc.length > 0) {
      const total = sc.reduce((s, d) => s + d.boxes, 0);
      if (total <= MAX_BOXES_PER_TT) {
        push("South Coast (Lindi/Mtwara)", ["LINDI", "MTWARA"], sc, TT_ONLY);
      } else {
        sc.forEach(nd => push(`${nd.region} Direct`, [nd.region], [nd], TT_ONLY));
      }
    }
  }

  // =========================================================================
  // 6. CATCH-ALL — guarantees every remaining region is assigned.
  //    This covers: DAR ES SALAAM, PWANI, SINGIDA, DODOMA, MOROGORO, etc.
  //    Greedy fill: anchor on the first remaining region and pack as many
  //    others as fit within TT capacity.
  // =========================================================================
  while (pool.size > 0) {
    const [firstReg, firstBoxes] = [...pool.entries()][0];
    const batch: RegionDemand[]  = [{ region: firstReg, boxes: firstBoxes }];
    let running = firstBoxes;

    for (const [reg, bxs] of pool.entries()) {
      if (reg === firstReg) continue;
      if (running + bxs <= MAX_BOXES_PER_TT) {
        batch.push({ region: reg, boxes: bxs });
        running += bxs;
      }
    }

    push(
      batch.length === 1 ? `${firstReg} Route` : "Mixed Route",
      batch.map(d => d.region),
      batch,
      TT_ONLY
    );
  }

  return routes;
}

// ---------------------------------------------------------------------------
// ROUTE BUILDER
// ---------------------------------------------------------------------------
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
    name:          `Msafara ${num}: ${name}`,
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