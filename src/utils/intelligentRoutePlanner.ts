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

const MAX_BOXES_PER_TT = 950; // Truck & Trailer (practical estimate)
const MAX_BOXES_PER_T  = 450; // Standard Truck  (practical estimate)

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
    { type: "TT",     quantity: 1, label: "Truck & Trailer"      },
    { type: "T",      quantity: 1, label: `Truck (${extraLabel})` },
    { type: "ESCORT", quantity: 1, label: "Escort Vehicle"        },
  ];
}

// ---------------------------------------------------------------------------
// STAGED ROUTE TYPE (pre-numbered)
// ---------------------------------------------------------------------------
type StagedRoute = {
  name:     string;
  path:     string[];
  list:     RegionDemand[];
  vehicles: typeof TT_ONLY;
  cluster:  number; // sort order: 1=Lake, 2=Western, 3=SouthernHighlands, 4=Northern, 5=SouthCoast, 6=Islands, 7=DSM, 99=misc
};

// ---------------------------------------------------------------------------
// MAIN EXPORT
// ---------------------------------------------------------------------------
export function generateIntelligentRoutes(
  demands:     RegionDemand[],
  loadingDate: string,
  distances:   any[] = []
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

  // Pool — every region deleted once assigned; guarantees nothing is skipped
  const pool = new Map<string, number>(
    demands
      .filter(d => d.boxes > 0)
      .map(d => [d.region.toUpperCase(), d.boxes])
  );

  const staged: StagedRoute[] = [];

  // ── Pool helpers ──────────────────────────────────────────────────────────
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
    staged.push({ name, path, list, cluster, vehicles });
    take(list.map(d => d.region));
  }

  // =========================================================================
  // CLUSTER 1 — LAKE ZONE
  //   Regions: KAGERA, GEITA, MWANZA, MARA, SHINYANGA, SIMIYU
  //
  //  Step 1: All six fit in one TT → single route.
  //  Step 2: Split into two groups:
  //    Group A: MWANZA + SHINYANGA + SIMIYU + MARA   (NO SINGIDA here)
  //    Group B: KAGERA + GEITA + SINGIDA + MOROGORO  (helpers in that order)
  //  Step 3: If Group A or B is still too heavy → individual handlers below.
  //
  //  Individual handlers (fallback):
  //   • Kagera/Geita: always try together first; helpers = SINGIDA, MOROGORO
  //   • Mwanza heavy (≥ MAX_TT): TT for Mwanza + ONE extra Truck for ONE middle region
  //   • Mwanza normal: pair with MARA (+ SIMIYU if fits), else SHINYANGA
  //   • Mara/Simiyu: pair together, add SHINYANGA then SINGIDA if space
  //   • Shinyanga alone: pair with SINGIDA > DODOMA > PWANI > MOROGORO
  // =========================================================================
  {
    const lakeRegs = ["KAGERA", "GEITA", "MWANZA", "MARA", "SHINYANGA", "SIMIYU"];
    const lakeAll  = lakeRegs.map(r => demand(r)).filter(Boolean) as RegionDemand[];

    if (lakeAll.length > 0) {
      const lakeTotal = sum(lakeAll);

      // ── Step 1: all fit ───────────────────────────────────────────────────
      if (lakeTotal <= MAX_BOXES_PER_TT) {
        stage("Lake Zone (Full)", lakeRegs, lakeAll, 1, TT_ONLY);

      } else {
        // ── Step 2: two-group split ──────────────────────────────────────────
        const grpA_regs = ["MWANZA", "SHINYANGA", "SIMIYU", "MARA"];
        const grpB_regs = ["KAGERA", "GEITA"];

        const grpA    = grpA_regs.map(r => demand(r)).filter(Boolean) as RegionDemand[];
        const grpB    = grpB_regs.map(r => demand(r)).filter(Boolean) as RegionDemand[];
        const grpASum = sum(grpA);
        const grpBSum = sum(grpB);

        // Group A: MWANZA + SHINYANGA + SIMIYU + MARA  (SINGIDA stays out of this group)
        if (grpA.length > 0 && grpASum <= MAX_BOXES_PER_TT) {
          stage("Lake Zone (Mwanza/Shinyanga/Simiyu/Mara)", grpA_regs, grpA, 1, TT_ONLY);
        }

        // Group B: KAGERA + GEITA + SINGIDA (preferred helper) + MOROGORO (if still fits)
        if (grpB.length > 0 && grpBSum <= MAX_BOXES_PER_TT) {
          const singida  = demand("SINGIDA");
          const morogoro = demand("MOROGORO");
          const listB: RegionDemand[] = [...grpB];
          let   bSum = grpBSum;

          if (singida && bSum + singida.boxes <= MAX_BOXES_PER_TT) {
            listB.push(singida); bSum += singida.boxes;
          }
          if (morogoro && bSum + morogoro.boxes <= MAX_BOXES_PER_TT) {
            listB.unshift(morogoro);
          }
          stage("Kagera/Geita Route", listB.map(d => d.region), listB, 1, TT_ONLY);

        } else if (grpB.length > 0) {
          // Group B too heavy → handle Kagera/Geita individually
          handleKageraGeita();
        }

        // Handle any lake region Group A couldn't absorb
        handleMwanza();
        handleMaraSimiyu();
        handleShinyanga();
      }
    }

    // ── Individual lake handlers ─────────────────────────────────────────────

    function handleKageraGeita() {
      const kagera = demand("KAGERA");
      const geita  = demand("GEITA");

      if (kagera && geita) {
        const kgSum = kagera.boxes + geita.boxes;
        if (kgSum <= MAX_BOXES_PER_TT) {
          const singida  = demand("SINGIDA");
          const morogoro = demand("MOROGORO");
          const list: RegionDemand[] = [geita, kagera];
          let   cur = kgSum;
          if (singida  && cur + singida.boxes  <= MAX_BOXES_PER_TT) { list.unshift(singida);  cur += singida.boxes; }
          if (morogoro && cur + morogoro.boxes <= MAX_BOXES_PER_TT) { list.unshift(morogoro); }
          stage("Kagera/Geita Route", list.map(d => d.region), list, 1, TT_ONLY);
        } else {
          // Split each
          const hK   = demand("SINGIDA") ?? demand("DODOMA");
          const kList = hK && kagera.boxes + hK.boxes <= MAX_BOXES_PER_TT ? [hK, kagera] : [kagera];
          stage("Kagera Direct", kList.map(d => d.region), kList, 1, TT_ONLY);

          const hG   = demand("MOROGORO") ?? demand("DODOMA") ?? demand("SINGIDA");
          const gList = hG && geita.boxes + hG.boxes <= MAX_BOXES_PER_TT ? [hG, geita] : [geita];
          stage("Geita Direct", gList.map(d => d.region), gList, 1, TT_ONLY);
        }
      } else if (kagera) {
        const h    = demand("SINGIDA") ?? demand("DODOMA");
        const list = h && kagera.boxes + h.boxes <= MAX_BOXES_PER_TT ? [h, kagera] : [kagera];
        stage("Kagera Direct", list.map(d => d.region), list, 1, TT_ONLY);
      } else if (geita) {
        const h    = demand("MOROGORO") ?? demand("DODOMA") ?? demand("SINGIDA");
        const list = h && geita.boxes + h.boxes <= MAX_BOXES_PER_TT ? [h, geita] : [geita];
        stage("Geita Direct", list.map(d => d.region), list, 1, TT_ONLY);
      }
    }

    function handleMwanza() {
      const mwanza = demand("MWANZA");
      if (!mwanza) return;

      if (mwanza.boxes >= MAX_BOXES_PER_TT) {
        // Heavy Mwanza: TT for Mwanza + ONE extra Truck for ONE middle region
        const mid = demand("SINGIDA") ?? demand("DODOMA") ?? demand("PWANI") ?? demand("MOROGORO");
        if (mid) {
          stage("Mwanza Heavy", [mid.region, "MWANZA"], [mid, mwanza], 1, ttPlusExtraTruck(mid.region));
        } else {
          stage("Mwanza", ["MWANZA"], [mwanza], 1, TT_ONLY);
        }
      } else {
        const mara      = demand("MARA");
        const shinyanga = demand("SHINYANGA");
        const simiyu    = demand("SIMIYU");

        if (mara && mwanza.boxes + mara.boxes <= MAX_BOXES_PER_TT) {
          const list: RegionDemand[] = [mwanza, mara];
          if (simiyu && sum(list) + simiyu.boxes <= MAX_BOXES_PER_TT) list.push(simiyu);
          stage("Mwanza/Mara Corridor", list.map(d => d.region), list, 1, TT_ONLY);
        } else if (shinyanga && mwanza.boxes + shinyanga.boxes <= MAX_BOXES_PER_TT) {
          stage("Mwanza/Shinyanga", ["SHINYANGA", "MWANZA"], [shinyanga, mwanza], 1, TT_ONLY);
        } else {
          stage("Mwanza", ["MWANZA"], [mwanza], 1, TT_ONLY);
        }
      }
    }

    function handleMaraSimiyu() {
      const mara      = demand("MARA");
      const simiyu    = demand("SIMIYU");
      const shinyanga = demand("SHINYANGA");
      if (!mara && !simiyu) return;

      const list: RegionDemand[] = [simiyu, mara].filter(Boolean) as RegionDemand[];
      let   total = sum(list);

      if (shinyanga && total + shinyanga.boxes <= MAX_BOXES_PER_TT) {
        list.unshift(shinyanga); total += shinyanga.boxes;
      }
      // Add SINGIDA if still space (but NOT if it was already used by Kagera/Geita)
      const singida = demand("SINGIDA");
      if (singida && total + singida.boxes <= MAX_BOXES_PER_TT) {
        list.unshift(singida);
      }

      if (sum(list) <= MAX_BOXES_PER_TT) {
        stage("Mara/Simiyu Route", list.map(d => d.region), list, 1, TT_ONLY);
      } else {
        if (mara)   stage("Mara Direct",   ["MARA"],   [mara],   1, TT_ONLY);
        if (simiyu) stage("Simiyu Direct", ["SIMIYU"], [simiyu], 1, TT_ONLY);
      }
    }

    function handleShinyanga() {
      const shinyanga = demand("SHINYANGA");
      if (!shinyanga) return;
      const h    = demand("SINGIDA") ?? demand("DODOMA") ?? demand("PWANI") ?? demand("MOROGORO");
      const list = h && shinyanga.boxes + h.boxes <= MAX_BOXES_PER_TT ? [h, shinyanga] : [shinyanga];
      stage("Shinyanga Route", list.map(d => d.region), list, 1, TT_ONLY);
    }
  }

  // =========================================================================
  // CLUSTER 2 — WESTERN CORRIDOR
  //   Path: PWANI → MOROGORO → DODOMA → TABORA → KATAVI → KIGOMA
  //
  //  KEY RULE: Before consuming MOROGORO here, check whether Southern Highlands
  //  needs it for Priority 2 (MOROGORO+NJOMBE+RUVUMA). If SH Priority 2 is
  //  viable AND it's a better use of MOROGORO, leave it for SH and proceed
  //  with Western using PWANI only in the near-west slot.
  //
  //  • DODOMA always stays with the Kigoma group (far-west), never solo.
  //  • PWANI: try to include in western route; else pair with remaining regions.
  //  • KIGOMA is always the endpoint; TABORA and KATAVI always go with it.
  //  • If all fit in one TT → single route.
  //  • Otherwise → far-west (DODOMA+TABORA+KATAVI+KIGOMA) + near-west (PWANI+MOROGORO).
  // =========================================================================
  {
    // ── Pre-check: should MOROGORO be reserved for Southern Highlands P2? ──
    // SH Priority 2 needs: MOROGORO + NJOMBE + RUVUMA all still in pool AND fitting in TT.
    // If yes, mark MOROGORO as reserved so Western doesn't consume it.
    const morInPool   = demand("MOROGORO");
    const njombeCheck = demand("NJOMBE");
    const ruvimaCheck = demand("RUVUMA");
    const shEastP2Viable =
      !!morInPool && !!njombeCheck && !!ruvimaCheck &&
      morInPool.boxes + njombeCheck.boxes + ruvimaCheck.boxes <= MAX_BOXES_PER_TT;
    // Also check that the SH west group (IRINGA+MBEYA+SONGWE+RUKWA) fits on its own
    const iringaCheck = demand("IRINGA");
    const mbeyaCheck  = demand("MBEYA");
    const songweCheck = demand("SONGWE");
    const rukwaCheck  = demand("RUKWA");
    const shWestP2List = [iringaCheck, mbeyaCheck, songweCheck, rukwaCheck].filter(Boolean) as RegionDemand[];
    const shWestP2Viable = shWestP2List.length > 0 && sum(shWestP2List) <= MAX_BOXES_PER_TT;
    // Reserve MOROGORO for SH only when BOTH halves of SH P2 work
    const reserveMorogoroForSH = shEastP2Viable && shWestP2Viable;

    const pwani    = demand("PWANI");
    const morogoro = reserveMorogoroForSH ? undefined : demand("MOROGORO");
    const dodoma   = demand("DODOMA");
    const tabora   = demand("TABORA");
    const katavi   = demand("KATAVI");
    const kigoma   = demand("KIGOMA");

    const western = [pwani, morogoro, dodoma, tabora, katavi, kigoma].filter(Boolean) as RegionDemand[];

    if (western.length > 0) {
      const total = sum(western);

      if (total <= MAX_BOXES_PER_TT) {
        stage("Western Corridor", ["PWANI", "MOROGORO", "DODOMA", "TABORA", "KATAVI", "KIGOMA"], western, 2, TT_ONLY);

      } else {
        // Try without PWANI (PWANI most optional in western group)
        const westernNoPwani = [morogoro, dodoma, tabora, katavi, kigoma].filter(Boolean) as RegionDemand[];
        const noPwaniTotal   = sum(westernNoPwani);

        if (noPwaniTotal <= MAX_BOXES_PER_TT) {
          stage("Western Corridor", ["MOROGORO", "DODOMA", "TABORA", "KATAVI", "KIGOMA"], westernNoPwani, 2, TT_ONLY);
          // PWANI pairs with whatever is left
          const pwaniLeft = demand("PWANI");
          if (pwaniLeft) {
            const partner = demand("DODOMA"); // MOROGORO already consumed above
            const pList   = partner && pwaniLeft.boxes + partner.boxes <= MAX_BOXES_PER_TT
              ? [pwaniLeft, partner] : [pwaniLeft];
            stage("Pwani Route", pList.map(d => d.region), pList, 2, TT_ONLY);
          }

        } else {
          // Far-west: DODOMA + TABORA + KATAVI + KIGOMA
          const far    = [dodoma, tabora, katavi, kigoma].filter(Boolean) as RegionDemand[];
          const farSum = sum(far);

          if (far.length > 0 && farSum <= MAX_BOXES_PER_TT) {
            stage("Western (Kigoma Focus)", ["DODOMA", "TABORA", "KATAVI", "KIGOMA"], far, 2, TT_ONLY);
          } else {
            // Far still too heavy — keep TABORA+KATAVI+KIGOMA together; DODOMA pairs separately
            const kigGroup = [tabora, katavi, kigoma].filter(Boolean) as RegionDemand[];
            if (kigGroup.length > 0 && sum(kigGroup) <= MAX_BOXES_PER_TT) {
              stage("Western (Kigoma)", ["TABORA", "KATAVI", "KIGOMA"], kigGroup, 2, TT_ONLY);
            } else {
              kigGroup.forEach(nd => stage(`${nd.region} Direct`, [nd.region], [nd], 2, TT_ONLY));
            }
            // DODOMA — never solo
            const dod = demand("DODOMA");
            if (dod) {
              const p     = demand("PWANI") ?? demand("MOROGORO");
              const dList = p && dod.boxes + p.boxes <= MAX_BOXES_PER_TT ? [p, dod] : [dod];
              stage("Dodoma Route", dList.map(d => d.region), dList, 2, TT_ONLY);
            }
          }

          // Near-west: PWANI + MOROGORO (re-read from pool in case not yet consumed)
          const nearList = [demand("PWANI"), demand("MOROGORO")].filter(Boolean) as RegionDemand[];
          if (nearList.length > 0) {
            if (sum(nearList) <= MAX_BOXES_PER_TT) {
              stage("Western (Near)", nearList.map(d => d.region), nearList, 2, TT_ONLY);
            } else {
              nearList.forEach(nd => stage(`${nd.region} Route`, [nd.region], [nd], 2, TT_ONLY));
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // CLUSTER 3 — SOUTHERN HIGHLANDS
  //   Regions: IRINGA, NJOMBE, RUVUMA, MBEYA, SONGWE, RUKWA
  //   MOROGORO may join here if it was reserved (not consumed by Western).
  //
  //  Priority 1 — All six core regions fit in one TT → single route.
  //
  //  Priority 2 — MOROGORO is still in pool AND both halves fit:
  //      West: IRINGA + MBEYA + SONGWE + RUKWA  (fits in TT)
  //      East: MOROGORO + NJOMBE + RUVUMA        (fits in TT)
  //      MOROGORO must NOT go to Lindi/Mtwara or any non-SH route.
  //
  //  Priority 3 — Classic split (MOROGORO not available / P2 doesn't fit):
  //      West: MBEYA + SONGWE + RUKWA
  //      East: IRINGA + NJOMBE + RUVUMA
  //
  //  If any sub-group is still too heavy → send those regions individually.
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
      const total = sum(allSH);

      // ── Priority 1: all six fit ────────────────────────────────────────────
      if (total <= MAX_BOXES_PER_TT) {
        stage(
          "Southern Highlands (Full)",
          ["IRINGA", "NJOMBE", "RUVUMA", "MBEYA", "SONGWE", "RUKWA"],
          allSH,
          3,
          TT_ONLY
        );

      } else {
        // ── Priority 2: MOROGORO-assisted split ───────────────────────────────
        // MOROGORO may be in the pool if Western reserved it or didn't need it.
        const morogoro = demand("MOROGORO");

        const westP2     = [iringa, mbeya, songwe, rukwa].filter(Boolean) as RegionDemand[];
        const eastP2     = [morogoro, njombe, ruvuma].filter(Boolean) as RegionDemand[];
        const westP2fits = westP2.length > 0 && sum(westP2) <= MAX_BOXES_PER_TT;
        // East P2 requires MOROGORO + at least one SH region
        const eastP2fits =
          !!morogoro &&
          eastP2.length >= 2 &&
          sum(eastP2) <= MAX_BOXES_PER_TT;

        if (westP2fits && eastP2fits) {
          // Priority 2 — both halves fit
          stage(
            "Southern Highlands (West)",
            ["IRINGA", "MBEYA", "SONGWE", "RUKWA"],
            westP2,
            3,
            TT_ONLY
          );
          stage(
            "Southern Highlands (East + Morogoro)",
            eastP2.map(d => d.region),
            eastP2,
            3,
            TT_ONLY
          );

        } else {
          // ── Priority 3: classic split ──────────────────────────────────────
          // If MOROGORO is in the pool but P2 didn't work, keep it available
          // for catch-all — DO NOT attach to Lindi/Mtwara.

          const westP3 = [mbeya, songwe, rukwa].filter(Boolean) as RegionDemand[];
          const eastP3 = [iringa, njombe, ruvuma].filter(Boolean) as RegionDemand[];

          if (westP3.length > 0 && sum(westP3) <= MAX_BOXES_PER_TT) {
            stage("Southern Highlands (West)", ["MBEYA", "SONGWE", "RUKWA"], westP3, 3, TT_ONLY);
          } else {
            westP3.forEach(nd => stage(`${nd.region} Direct`, [nd.region], [nd], 3, TT_ONLY));
          }

          if (eastP3.length > 0 && sum(eastP3) <= MAX_BOXES_PER_TT) {
            stage("Southern Highlands (East)", ["IRINGA", "NJOMBE", "RUVUMA"], eastP3, 3, TT_ONLY);
          } else {
            eastP3.forEach(nd => stage(`${nd.region} Direct`, [nd.region], [nd], 3, TT_ONLY));
          }
        }
      }
    }
  }

  // =========================================================================
  // CLUSTER 4 — NORTHERN
  //   Regions: TANGA, KILIMANJARO, ARUSHA, MANYARA
  //
  //  Scenario A: All four fit in one TT.
  //  Scenario B: MANYARA+KILI+ARUSHA fit in TT; TANGA gets its own Truck
  //              in the SAME Msafara.
  //  Scenario C: Only KILI+ARUSHA fit in TT; TANGA gets its own Truck
  //              (same Msafara); MANYARA → separate Msafara paired with
  //              MOROGORO > PWANI > DODOMA.
  //  Scenario D: Cannot combine → send each individually.
  // =========================================================================
  {
    const tanga  = demand("TANGA");
    const kili   = demand("KILIMANJARO");
    const arusha = demand("ARUSHA");
    const many   = demand("MANYARA");

    const present  = [tanga, kili, arusha, many].filter(Boolean) as RegionDemand[];
    const coreList = [many, kili, arusha].filter(Boolean) as RegionDemand[];
    const coreSum  = sum(coreList);
    const akList   = [kili, arusha].filter(Boolean) as RegionDemand[];
    const akSum    = sum(akList);

    if (present.length > 0) {
      if (sum(present) <= MAX_BOXES_PER_TT) {
        // A
        stage("Northern (Full)", ["TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"], present, 4, TT_ONLY);

      } else if (coreSum <= MAX_BOXES_PER_TT && tanga && tanga.boxes <= MAX_BOXES_PER_T) {
        // B
        stage(
          "Northern (Core TT + Tanga Truck)",
          ["TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"],
          [...coreList, tanga],
          4,
          ttPlusExtraTruck("TANGA")
        );

      } else if (akSum <= MAX_BOXES_PER_TT) {
        // C
        if (tanga) {
          stage(
            "Northern (Arusha/Kili TT + Tanga Truck)",
            ["TANGA", "KILIMANJARO", "ARUSHA"],
            [...akList, tanga],
            4,
            ttPlusExtraTruck("TANGA")
          );
        } else {
          stage("Northern (Arusha/Kili)", ["KILIMANJARO", "ARUSHA"], akList, 4, TT_ONLY);
        }
        // MANYARA → own Msafara with best available middle region
        const manyD = demand("MANYARA");
        if (manyD) {
          const mid      = demand("MOROGORO") ?? demand("PWANI") ?? demand("DODOMA");
          const manyList = mid ? [mid, manyD] : [manyD];
          stage("Manyara Route", manyList.map(d => d.region), manyList, 4, TT_ONLY);
        }

      } else {
        // D
        present.forEach(nd => stage(`${nd.region} Direct`, [nd.region], [nd], 4, TT_ONLY));
      }
    }
  }

  // =========================================================================
  // CLUSTER 5 — SOUTH COAST
  //   LINDI + MTWARA — combine if they fit; otherwise split.
  //   MOROGORO must NEVER be grouped with Lindi/Mtwara.
  // =========================================================================
  {
    const lindi  = demand("LINDI");
    const mtwara = demand("MTWARA");
    const sc     = [lindi, mtwara].filter(Boolean) as RegionDemand[];

    if (sc.length > 0) {
      if (sum(sc) <= MAX_BOXES_PER_TT) {
        stage("South Coast (Lindi/Mtwara)", ["LINDI", "MTWARA"], sc, 5, TT_ONLY);
      } else {
        sc.forEach(nd => stage(`${nd.region} Direct`, [nd.region], [nd], 5, TT_ONLY));
      }
    }
  }

  // =========================================================================
  // CLUSTER 6 — ISLANDS
  //   PEMBA  : KASKAZINI PEMBA + KUSINI PEMBA
  //   UNGUJA : KASKAZINI UNGUJA + KUSINI UNGUJA + MJINI MAGHARIBI
  // =========================================================================
  {
    const kp = demand("KASKAZINI PEMBA");
    const sp = demand("KUSINI PEMBA");
    const pembaList = [kp, sp].filter(Boolean) as RegionDemand[];
    if (pembaList.length > 0) stage("Pemba", pembaList.map(d => d.region), pembaList, 6, TT_ONLY);
  }
  {
    const ku  = demand("KASKAZINI UNGUJA");
    const su  = demand("KUSINI UNGUJA");
    const mjm = demand("MJINI MAGHARIBI");
    const ungujaList = [ku, su, mjm].filter(Boolean) as RegionDemand[];
    if (ungujaList.length > 0) stage("Unguja", ungujaList.map(d => d.region), ungujaList, 6, TT_ONLY);
  }

  // =========================================================================
  // CLUSTER 7 — DAR ES SALAAM
  // =========================================================================
  {
    const dar = demand("DAR ES SALAAM");
    if (dar) stage("Dar es Salaam", ["DAR ES SALAAM"], [dar], 7, TT_ONLY);
  }

  // =========================================================================
  // CLUSTER 99 — CATCH-ALL
  //   Any remaining region that hasn't been assigned yet.
  //   Rules:
  //   • DODOMA never solo — pair with PWANI first, then any other region.
  //   • PWANI never solo — pair with MOROGORO or DODOMA.
  //   • Greedy fill: anchor on first region, pack as many as fit in TT.
  //   • Never leave a solo route when another remaining region can fill it.
  // =========================================================================

  // Resolve DODOMA solo prevention first
  {
    const dodoma = demand("DODOMA");
    if (dodoma) {
      const partner = demand("PWANI") ??
        [...pool.entries()]
          .filter(([r]) => r !== "DODOMA")
          .map(([r, b]) => ({ region: r, boxes: b }))
          .find(d => dodoma.boxes + d.boxes <= MAX_BOXES_PER_TT);
      if (partner && dodoma.boxes + partner.boxes <= MAX_BOXES_PER_TT) {
        stage("Dodoma/Pwani Route", [partner.region, "DODOMA"], [partner as RegionDemand, dodoma], 99, TT_ONLY);
      } else {
        stage("DODOMA Route", ["DODOMA"], [dodoma], 99, TT_ONLY);
      }
    }
  }

  // Greedy catch-all
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

  // =========================================================================
  // POST-PROCESSING
  //  Pass 1: Merge solo-region routes into routes that have spare capacity,
  //          preferring same-cluster partners.
  //  Pass 2: Sort by cluster order (1→7→99), then number sequentially.
  // =========================================================================
  const merged = postProcess(staged);

  merged.sort((a, b) => a.cluster - b.cluster);

  return merged.map((r, idx) =>
    buildRoute(idx + 1, r.name, r.path, r.list, loadingDate, distanceMap, r.vehicles)
  );
}

// ---------------------------------------------------------------------------
// POST-PROCESSING: merge solo routes into routes with available capacity
// ---------------------------------------------------------------------------
function postProcess(routes: StagedRoute[]): StagedRoute[] {
  const MAX  = 950;
  const sum  = (list: RegionDemand[]) => list.reduce((s, d) => s + d.boxes, 0);

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].list.length !== 1) continue; // only solo routes
      const solo = routes[i].list[0];

      // Prefer same-cluster partners, then any cluster
      let bestIdx   = -1;
      let bestScore = -1;

      for (let j = 0; j < routes.length; j++) {
        if (j === i) continue;
        const space = MAX - sum(routes[j].list);
        if (space < solo.boxes) continue;
        // Score: same cluster = +1000 bonus
        const score = space + (routes[j].cluster === routes[i].cluster ? 1000 : 0);
        if (score > bestScore) { bestScore = score; bestIdx = j; }
      }

      if (bestIdx >= 0) {
        routes[bestIdx].list.push(solo);
        routes[bestIdx].path.push(solo.region);
        routes.splice(i, 1);
        changed = true;
        break;
      }
    }
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