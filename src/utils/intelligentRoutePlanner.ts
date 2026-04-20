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

type StagedRoute = {
  name:     string;
  path:     string[];
  list:     RegionDemand[];
  vehicles: typeof TT_ONLY;
  cluster:  number; 
};

export function generateIntelligentRoutes(
  demands:     RegionDemand[],
  loadingDate: string,
  distances:   any[] = []
): SuggestedMsafara[] {

  const distanceMap = new Map<string, number>();
  distances.forEach(d => {
    const a  = d.from_region_name.toUpperCase();
    const b  = d.to_region_name.toUpperCase();
    const km = parseFloat(d.distance_km);
    distanceMap.set(`${a}|${b}`, km);
    distanceMap.set(`${b}|${a}`, km);
  });

  const pool = new Map<string, number>(
    demands
      .filter(d => d.boxes > 0)
      .map(d => [d.region.toUpperCase(), d.boxes])
  );

  const staged: StagedRoute[] = [];

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

  {
    const lakeRegs = ["KAGERA", "GEITA", "MWANZA", "MARA", "SHINYANGA", "SIMIYU"];
    const lakeAll  = lakeRegs.map(r => demand(r)).filter(Boolean) as RegionDemand[];

    if (lakeAll.length > 0) {
      const lakeTotal = sum(lakeAll);

      if (lakeTotal <= MAX_BOXES_PER_TT) {
        stage("SIMIYU", lakeRegs, lakeAll, 1, TT_ONLY);
      } else {
        const grpA_regs = ["MWANZA", "SHINYANGA", "SIMIYU", "MARA"];
        const grpB_regs = ["KAGERA", "GEITA"];

        const grpA    = grpA_regs.map(r => demand(r)).filter(Boolean) as RegionDemand[];
        const grpB    = grpB_regs.map(r => demand(r)).filter(Boolean) as RegionDemand[];
        const grpASum = sum(grpA);
        const grpBSum = sum(grpB);

        if (grpA.length > 0 && grpASum <= MAX_BOXES_PER_TT) {
          stage("SIMIYU", grpA_regs, grpA, 1, TT_ONLY);
        }

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
          stage("KAGERA", listB.map(d => d.region), listB, 1, TT_ONLY);
        } else if (grpB.length > 0) {
          handleKageraGeita();
        }

        handleMwanza();
        handleMaraSimiyu();
        handleShinyanga();
      }
    }

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
          stage("KAGERA", list.map(d => d.region), list, 1, TT_ONLY);
        } else {
          const hK   = demand("SINGIDA") ?? demand("DODOMA");
          const kList = hK && kagera.boxes + hK.boxes <= MAX_BOXES_PER_TT ? [hK, kagera] : [kagera];
          stage("KAGERA", kList.map(d => d.region), kList, 1, TT_ONLY);

          const hG   = demand("MOROGORO") ?? demand("DODOMA") ?? demand("SINGIDA");
          const gList = hG && geita.boxes + hG.boxes <= MAX_BOXES_PER_TT ? [hG, geita] : [geita];
          stage("GEITA", gList.map(d => d.region), gList, 1, TT_ONLY);
        }
      } else if (kagera) {
        const h    = demand("SINGIDA") ?? demand("DODOMA");
        const list = h && kagera.boxes + h.boxes <= MAX_BOXES_PER_TT ? [h, kagera] : [kagera];
        stage("KAGERA", list.map(d => d.region), list, 1, TT_ONLY);
      } else if (geita) {
        const h    = demand("MOROGORO") ?? demand("DODOMA") ?? demand("SINGIDA");
        const list = h && geita.boxes + h.boxes <= MAX_BOXES_PER_TT ? [h, geita] : [geita];
        stage("GEITA", list.map(d => d.region), list, 1, TT_ONLY);
      }
    }

    function handleMwanza() {
      const mwanza = demand("MWANZA");
      if (!mwanza) return;

      if (mwanza.boxes >= MAX_BOXES_PER_TT) {
        const mid = demand("SINGIDA") ?? demand("DODOMA") ?? demand("PWANI") ?? demand("MOROGORO");
        if (mid) {
          stage("MWANZA", [mid.region, "MWANZA"], [mid, mwanza], 1, ttPlusExtraTruck(mid.region));
        } else {
          stage("MWANZA", ["MWANZA"], [mwanza], 1, TT_ONLY);
        }
      } else {
        const mara      = demand("MARA");
        const shinyanga = demand("SHINYANGA");
        const simiyu    = demand("SIMIYU");

        if (mara && mwanza.boxes + mara.boxes <= MAX_BOXES_PER_TT) {
          const list: RegionDemand[] = [mwanza, mara];
          if (simiyu && sum(list) + simiyu.boxes <= MAX_BOXES_PER_TT) list.push(simiyu);
          stage("MARA", list.map(d => d.region), list, 1, TT_ONLY);
        } else if (shinyanga && mwanza.boxes + shinyanga.boxes <= MAX_BOXES_PER_TT) {
          stage("MWANZA", ["SHINYANGA", "MWANZA"], [shinyanga, mwanza], 1, TT_ONLY);
        } else {
          stage("MWANZA", ["MWANZA"], [mwanza], 1, TT_ONLY);
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
      const singida = demand("SINGIDA");
      if (singida && total + singida.boxes <= MAX_BOXES_PER_TT) {
        list.unshift(singida);
      }

      if (sum(list) <= MAX_BOXES_PER_TT) {
        stage("MARA", list.map(d => d.region), list, 1, TT_ONLY);
      } else {
        if (mara)   stage("MARA",   ["MARA"],   [mara],   1, TT_ONLY);
        if (simiyu) stage("SIMIYU", ["SIMIYU"], [simiyu], 1, TT_ONLY);
      }
    }

    function handleShinyanga() {
      const shinyanga = demand("SHINYANGA");
      if (!shinyanga) return;
      const h    = demand("SINGIDA") ?? demand("DODOMA") ?? demand("PWANI") ?? demand("MOROGORO");
      const list = h && shinyanga.boxes + h.boxes <= MAX_BOXES_PER_TT ? [h, shinyanga] : [shinyanga];
      stage("SHINYANGA", list.map(d => d.region), list, 1, TT_ONLY);
    }
  }

  {
    const morInPool   = demand("MOROGORO");
    const njombeCheck = demand("NJOMBE");
    const ruvimaCheck = demand("RUVUMA");
    const shEastP2Viable =
      !!morInPool && !!njombeCheck && !!ruvimaCheck &&
      morInPool.boxes + njombeCheck.boxes + ruvimaCheck.boxes <= MAX_BOXES_PER_TT;
    const iringaCheck = demand("IRINGA");
    const mbeyaCheck  = demand("MBEYA");
    const songweCheck = demand("SONGWE");
    const rukwaCheck  = demand("RUKWA");
    const shWestP2List = [iringaCheck, mbeyaCheck, songweCheck, rukwaCheck].filter(Boolean) as RegionDemand[];
    const shWestP2Viable = shWestP2List.length > 0 && sum(shWestP2List) <= MAX_BOXES_PER_TT;
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
        stage("KIGOMA", ["PWANI", "MOROGORO", "DODOMA", "TABORA", "KATAVI", "KIGOMA"], western, 2, TT_ONLY);
      } else {
        const westernNoPwani = [morogoro, dodoma, tabora, katavi, kigoma].filter(Boolean) as RegionDemand[];
        const noPwaniTotal   = sum(westernNoPwani);

        if (noPwaniTotal <= MAX_BOXES_PER_TT) {
          stage("KIGOMA", ["MOROGORO", "DODOMA", "TABORA", "KATAVI", "KIGOMA"], westernNoPwani, 2, TT_ONLY);
          const pwaniLeft = demand("PWANI");
          if (pwaniLeft) {
            const partner = demand("DODOMA"); 
            const pList   = partner && pwaniLeft.boxes + partner.boxes <= MAX_BOXES_PER_TT
              ? [pwaniLeft, partner] : [pwaniLeft];
            stage("PWANI", pList.map(d => d.region), pList, 2, TT_ONLY);
          }
        } else {
          const far    = [dodoma, tabora, katavi, kigoma].filter(Boolean) as RegionDemand[];
          const farSum = sum(far);

          if (far.length > 0 && farSum <= MAX_BOXES_PER_TT) {
            stage("KIGOMA", ["DODOMA", "TABORA", "KATAVI", "KIGOMA"], far, 2, TT_ONLY);
          } else {
            const kigGroup = [tabora, katavi, kigoma].filter(Boolean) as RegionDemand[];
            if (kigGroup.length > 0 && sum(kigGroup) <= MAX_BOXES_PER_TT) {
              stage("KIGOMA", ["TABORA", "KATAVI", "KIGOMA"], kigGroup, 2, TT_ONLY);
            } else {
              kigGroup.forEach(nd => stage(`${nd.region} Direct`, [nd.region], [nd], 2, TT_ONLY));
            }
            const dod = demand("DODOMA");
            if (dod) {
              const p     = demand("PWANI") ?? demand("MOROGORO");
              const dList = p && dod.boxes + p.boxes <= MAX_BOXES_PER_TT ? [p, dod] : [dod];
              stage("DODOMA", dList.map(d => d.region), dList, 2, TT_ONLY);
            }
          }

          const nearList = [demand("PWANI"), demand("MOROGORO")].filter(Boolean) as RegionDemand[];
          if (nearList.length > 0) {
            if (sum(nearList) <= MAX_BOXES_PER_TT) {
              stage("PWANI", nearList.map(d => d.region), nearList, 2, TT_ONLY);
            } else {
              nearList.forEach(nd => stage(`${nd.region} Route`, [nd.region], [nd], 2, TT_ONLY));
            }
          }
        }
      }
    }
  }

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

      if (total <= MAX_BOXES_PER_TT) {
        stage(
          "RUKWA",
          ["IRINGA", "NJOMBE", "RUVUMA", "MBEYA", "SONGWE", "RUKWA"],
          allSH,
          3,
          TT_ONLY
        );
      } else {
        const morogoro = demand("MOROGORO");

        const westP2     = [iringa, mbeya, songwe, rukwa].filter(Boolean) as RegionDemand[];
        const eastP2     = [morogoro, njombe, ruvuma].filter(Boolean) as RegionDemand[];
        const westP2fits = westP2.length > 0 && sum(westP2) <= MAX_BOXES_PER_TT;
        const eastP2fits =
          !!morogoro &&
          eastP2.length >= 2 &&
          sum(eastP2) <= MAX_BOXES_PER_TT;

        if (westP2fits && eastP2fits) {
          stage(
            "RUKWA",
            ["IRINGA", "MBEYA", "SONGWE", "RUKWA"],
            westP2,
            3,
            TT_ONLY
          );
          stage(
            "RUVUMA",
            eastP2.map(d => d.region),
            eastP2,
            3,
            TT_ONLY
          );
        } else {
          const westP3 = [mbeya, songwe, rukwa].filter(Boolean) as RegionDemand[];
          const eastP3 = [iringa, njombe, ruvuma].filter(Boolean) as RegionDemand[];

          if (westP3.length > 0 && sum(westP3) <= MAX_BOXES_PER_TT) {
            stage("RUKWA", ["MBEYA", "SONGWE", "RUKWA"], westP3, 3, TT_ONLY);
          } else {
            westP3.forEach(nd => stage(`${nd.region} Direct`, [nd.region], [nd], 3, TT_ONLY));
          }

          if (eastP3.length > 0 && sum(eastP3) <= MAX_BOXES_PER_TT) {
            stage("RUVUMA", ["IRINGA", "NJOMBE", "RUVUMA"], eastP3, 3, TT_ONLY);
          } else {
            eastP3.forEach(nd => stage(`${nd.region} Direct`, [nd.region], [nd], 3, TT_ONLY));
          }
        }
      }
    }
  }

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
        stage("MANYARA", ["TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"], present, 4, TT_ONLY);
      } else if (coreSum <= MAX_BOXES_PER_TT && tanga && tanga.boxes <= MAX_BOXES_PER_T) {
        stage(
          "MANYARA",
          ["TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"],
          [...coreList, tanga],
          4,
          ttPlusExtraTruck("TANGA")
        );
      } else if (akSum <= MAX_BOXES_PER_TT) {
        if (tanga) {
          stage(
            "ARUSHA",
            ["TANGA", "KILIMANJARO", "ARUSHA"],
            [...akList, tanga],
            4,
            ttPlusExtraTruck("TANGA")
          );
        } else {
          stage("ARUSHA", ["KILIMANJARO", "ARUSHA"], akList, 4, TT_ONLY);
        }
        const manyD = demand("MANYARA");
        if (manyD) {
          const mid      = demand("MOROGORO") ?? demand("PWANI") ?? demand("DODOMA");
          const manyList = mid ? [mid, manyD] : [manyD];
          stage("MANYARA", manyList.map(d => d.region), manyList, 4, TT_ONLY);
        }
      } else {
        present.forEach(nd => stage(`${nd.region} Direct`, [nd.region], [nd], 4, TT_ONLY));
      }
    }
  }

  {
    const lindi  = demand("LINDI");
    const mtwara = demand("MTWARA");
    const sc     = [lindi, mtwara].filter(Boolean) as RegionDemand[];

    if (sc.length > 0) {
      if (sum(sc) <= MAX_BOXES_PER_TT) {
        stage("MTWARA", ["LINDI", "MTWARA"], sc, 5, TT_ONLY);
      } else {
        sc.forEach(nd => stage(`${nd.region} Direct`, [nd.region], [nd], 5, TT_ONLY));
      }
    }
  }

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

  {
    const dar = demand("DAR ES SALAAM");
    if (dar) stage("DAR ES SALAAM", ["DAR ES SALAAM"], [dar], 7, TT_ONLY);
  }

  {
    const dodoma = demand("DODOMA");
    if (dodoma) {
      const partner = demand("PWANI") ??
        [...pool.entries()]
          .filter(([r]) => r !== "DODOMA")
          .map(([r, b]) => ({ region: r, boxes: b }))
          .find(d => dodoma.boxes + d.boxes <= MAX_BOXES_PER_TT);
      if (partner && dodoma.boxes + partner.boxes <= MAX_BOXES_PER_TT) {
        stage("DODOMA", [partner.region, "DODOMA"], [partner as RegionDemand, dodoma], 99, TT_ONLY);
      } else {
        stage("DODOMA", ["DODOMA"], [dodoma], 99, TT_ONLY);
      }
    }
  }

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

  const merged = postProcess(staged);

  merged.sort((a, b) => a.cluster - b.cluster);

  return merged.map((r, idx) =>
    buildRoute(idx + 1, r.name, r.path, r.list, loadingDate, distanceMap, r.vehicles)
  );
}

function postProcess(routes: StagedRoute[]): StagedRoute[] {
  const MAX  = 950;
  const sum  = (list: RegionDemand[]) => list.reduce((s, d) => s + d.boxes, 0);

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < routes.length; i++) {
      if (routes[i].list.length !== 1) continue; 
      const solo = routes[i].list[0];

      let bestIdx   = -1;
      let bestScore = -1;

      for (let j = 0; j < routes.length; j++) {
        if (j === i) continue;
        const space = MAX - sum(routes[j].list);
        if (space < solo.boxes) continue;
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
    name:         name,
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