"use client";

export const ALL_TANZANIAN_REGIONS = [
  "ARUSHA", "DAR ES SALAAM", "DODOMA", "GEITA", "IRINGA", "KAGERA", "KATAVI", 
  "KIGOMA", "KILIMANJARO", "LINDI", "MANYARA", "MARA", "MBEYA", "MOROGORO", 
  "MTWARA", "MWANZA", "NJOMBE", "PWANI", "RUKWA", "RUVUMA", "SHINYANGA", 
  "SIMIYU", "SINGIDA", "SONGWE", "TABORA", "TANGA"
];

export interface DistanceRecord {
  id: number;
  from_region_name: string;
  to_region_name: string;
  distance_km: number;
  via: string | null;
}

export const DISTANCES: DistanceRecord[] = [
  {"id":1,"from_region_name":"DAR ES SALAAM","to_region_name":"ARUSHA","distance_km":758,"via":"TANGA"},
  {"id":4,"from_region_name":"DAR ES SALAAM","to_region_name":"ARUSHA","distance_km":616,"via":null},
  {"id":5,"from_region_name":"DAR ES SALAAM","to_region_name":"MANYARA","distance_km":927,"via":"TANGA"},
  {"id":6,"from_region_name":"DAR ES SALAAM","to_region_name":"MANYARA","distance_km":785,"via":"ARUSHA"},
  {"id":7,"from_region_name":"DAR ES SALAAM","to_region_name":"MANYARA","distance_km":710,"via":"DODOMA"},
  {"id":8,"from_region_name":"DAR ES SALAAM","to_region_name":"DAR ES SALAAM","distance_km":0,"via":null},
  {"id":9,"from_region_name":"DAR ES SALAAM","to_region_name":"DODOMA","distance_km":452,"via":"MOROGORO"},
  {"id":10,"from_region_name":"DAR ES SALAAM","to_region_name":"GEITA","distance_km":1163,"via":null},
  {"id":11,"from_region_name":"DAR ES SALAAM","to_region_name":"GEITA","distance_km":1274,"via":"MWANZA"},
  {"id":12,"from_region_name":"DAR ES SALAAM","to_region_name":"IRINGA","distance_km":495,"via":null},
  {"id":13,"from_region_name":"DAR ES SALAAM","to_region_name":"KAGERA","distance_km":1453,"via":null},
  {"id":14,"from_region_name":"DAR ES SALAAM","to_region_name":"KAGERA","distance_km":1462,"via":"GEITA"},
  {"id":15,"from_region_name":"DAR ES SALAAM","to_region_name":"KAGERA","distance_km":1573,"via":"MWANZA"},
  {"id":17,"from_region_name":"DAR ES SALAAM","to_region_name":"KATAVI","distance_km":1119,"via":"TABORA"},
  {"id":18,"from_region_name":"DAR ES SALAAM","to_region_name":"KATAVI","distance_km":1403,"via":"MBEYA"},
  {"id":19,"from_region_name":"DAR ES SALAAM","to_region_name":"KATAVI","distance_km":1483,"via":"NJOMBE"},
  {"id":20,"from_region_name":"DAR ES SALAAM","to_region_name":"KATAVI","distance_km":1995,"via":"RUVUMA"},
  {"id":21,"from_region_name":"DAR ES SALAAM","to_region_name":"KIGOMA","distance_km":1370,"via":null},
  {"id":22,"from_region_name":"DAR ES SALAAM","to_region_name":"KILIMANJARO","distance_km":536,"via":null},
  {"id":23,"from_region_name":"DAR ES SALAAM","to_region_name":"LINDI","distance_km":459,"via":null},
  {"id":24,"from_region_name":"DAR ES SALAAM","to_region_name":"MBEYA","distance_km":833,"via":null},
  {"id":25,"from_region_name":"DAR ES SALAAM","to_region_name":"MBEYA","distance_km":913,"via":"NJOMBE"},
  {"id":26,"from_region_name":"DAR ES SALAAM","to_region_name":"MBEYA","distance_km":1425,"via":"RUVUMA"},
  {"id":27,"from_region_name":"DAR ES SALAAM","to_region_name":"MOROGORO","distance_km":193,"via":null},
  {"id":28,"from_region_name":"DAR ES SALAAM","to_region_name":"MTWARA","distance_km":558,"via":null},
  {"id":29,"from_region_name":"DAR ES SALAAM","to_region_name":"MWANZA","distance_km":1154,"via":null},
  {"id":30,"from_region_name":"DAR ES SALAAM","to_region_name":"MWANZA","distance_km":1522,"via":"MARA"},
  {"id":31,"from_region_name":"DAR ES SALAAM","to_region_name":"NJOMBE","distance_km":714,"via":null},
  {"id":32,"from_region_name":"DAR ES SALAAM","to_region_name":"PWANI","distance_km":28,"via":null},
  {"id":33,"from_region_name":"DAR ES SALAAM","to_region_name":"RUKWA","distance_km":1166,"via":null},
  {"id":34,"from_region_name":"DAR ES SALAAM","to_region_name":"RUKWA","distance_km":1246,"via":"NJOMBE"},
  {"id":35,"from_region_name":"DAR ES SALAAM","to_region_name":"RUKWA","distance_km":1758,"via":"RUVUMA"},
  {"id":36,"from_region_name":"DAR ES SALAAM","to_region_name":"RUVUMA","distance_km":950,"via":null},
  {"id":37,"from_region_name":"DAR ES SALAAM","to_region_name":"RUVUMA","distance_km":1222,"via":"MTWARA"},
  {"id":38,"from_region_name":"DAR ES SALAAM","to_region_name":"SHINYANGA","distance_km":991,"via":null},
  {"id":39,"from_region_name":"DAR ES SALAAM","to_region_name":"SIMIYU","distance_km":1152,"via":null},
  {"id":40,"from_region_name":"DAR ES SALAAM","to_region_name":"SINGIDA","distance_km":691,"via":null},
  {"id":41,"from_region_name":"DAR ES SALAAM","to_region_name":"MARA","distance_km":1376,"via":null},
  {"id":42,"from_region_name":"DAR ES SALAAM","to_region_name":"MARA","distance_km":1321,"via":"SIMIYU"},
  {"id":43,"from_region_name":"DAR ES SALAAM","to_region_name":"SONGWE","distance_km":895,"via":null},
  {"id":44,"from_region_name":"DAR ES SALAAM","to_region_name":"SONGWE","distance_km":975,"via":"NJOMBE"},
  {"id":45,"from_region_name":"DAR ES SALAAM","to_region_name":"SONGWE","distance_km":1487,"via":"RUVUMA"},
  {"id":46,"from_region_name":"DAR ES SALAAM","to_region_name":"TABORA","distance_km":832,"via":null},
  {"id":47,"from_region_name":"DAR ES SALAAM","to_region_name":"TANGA","distance_km":347,"via":null},
  {"id":48,"from_region_name":"KAGERA","to_region_name":"GEITA","distance_km":299,"via":null},
  {"id":49,"from_region_name":"KAGERA","to_region_name":"MWANZA","distance_km":419,"via":null},
  {"id":50,"from_region_name":"PWANI","to_region_name":"MOROGORO","distance_km":165,"via":null},
  {"id":51,"from_region_name":"MOROGORO","to_region_name":"DODOMA","distance_km":259,"via":null},
  {"id":52,"from_region_name":"DODOMA","to_region_name":"SINGIDA","distance_km":239,"via":null},
  {"id":53,"from_region_name":"SINGIDA","to_region_name":"SHINYANGA","distance_km":300,"via":null},
  {"id":54,"from_region_name":"SHINYANGA","to_region_name":"MWANZA","distance_km":163,"via":null},
  {"id":55,"from_region_name":"MWANZA","to_region_name":"MARA","distance_km":222,"via":null},
  {"id":56,"from_region_name":"MARA","to_region_name":"SIMIYU","distance_km":169,"via":null},
  {"id":57,"from_region_name":"SHINYANGA","to_region_name":"SIMIYU","distance_km":161,"via":null},
  {"id":58,"from_region_name":"MWANZA","to_region_name":"GEITA","distance_km":120,"via":null},
  {"id":59,"from_region_name":"SINGIDA","to_region_name":"TABORA","distance_km":330,"via":null},
  {"id":60,"from_region_name":"SHINYANGA","to_region_name":"GEITA","distance_km":283,"via":null},
  {"id":61,"from_region_name":"TABORA","to_region_name":"SHINYANGA","distance_km":194,"via":null},
  {"id":62,"from_region_name":"DODOMA","to_region_name":"TABORA","distance_km":380,"via":null},
  {"id":63,"from_region_name":"TABORA","to_region_name":"KIGOMA","distance_km":413,"via":null},
  {"id":64,"from_region_name":"TABORA","to_region_name":"KATAVI","distance_km":367,"via":null},
  {"id":65,"from_region_name":"KATAVI","to_region_name":"KIGOMA","distance_km":314,"via":null},
  {"id":66,"from_region_name":"KILIMANJARO","to_region_name":"TANGA","distance_km":356,"via":null},
  {"id":67,"from_region_name":"ARUSHA","to_region_name":"KILIMANJARO","distance_km":80,"via":null},
  {"id":68,"from_region_name":"ARUSHA","to_region_name":"MANYARA","distance_km":169,"via":null},
  {"id":69,"from_region_name":"MANYARA","to_region_name":"SINGIDA","distance_km":163,"via":null},
  {"id":70,"from_region_name":"DODOMA","to_region_name":"MANYARA","distance_km":258,"via":null},
  {"id":71,"from_region_name":"LINDI","to_region_name":"MTWARA","distance_km":99,"via":null},
  {"id":72,"from_region_name":"MTWARA","to_region_name":"RUVUMA","distance_km":664,"via":null},
  {"id":73,"from_region_name":"RUVUMA","to_region_name":"NJOMBE","distance_km":236,"via":null},
  {"id":74,"from_region_name":"MOROGORO","to_region_name":"IRINGA","distance_km":302,"via":null},
  {"id":75,"from_region_name":"IRINGA","to_region_name":"DODOMA","distance_km":257,"via":null},
  {"id":76,"from_region_name":"IRINGA","to_region_name":"NJOMBE","distance_km":219,"via":null},
  {"id":77,"from_region_name":"NJOMBE","to_region_name":"MBEYA","distance_km":236,"via":null},
  {"id":78,"from_region_name":"MBEYA","to_region_name":"SONGWE","distance_km":62,"via":null},
  {"id":79,"from_region_name":"SONGWE","to_region_name":"RUKWA","distance_km":221,"via":null},
  {"id":80,"from_region_name":"RUKWA","to_region_name":"KATAVI","distance_km":237,"via":null}
];

export const PREDEFINED_ROUTES = [
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "SINGIDA", "GEITA", "KAGERA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "GEITA", "KAGERA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "MARA", "SIMIYU"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "MARA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "MWANZA", "MARA", "SIMIYU"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "SINGIDA", "SHINYANGA", "SIMIYU", "MARA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "TABORA", "KIGOMA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "TABORA", "GEITA", "KAGERA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "TABORA", "SHINYANGA", "MWANZA"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "TABORA", "SHINYANGA", "MWANZA", "MARA", "SIMIYU"],
  ["DAR ES SALAAM", "LINDI", "MTWARA"],
  ["DAR ES SALAAM", "LINDI", "MTWARA", "RUVUMA"],
  ["DAR ES SALAAM", "LINDI", "MTWARA", "RUVUMA", "NJOMBE"],
  ["DAR ES SALAAM", "LINDI", "MTWARA", "RUVUMA", "NJOMBE", "MBEYA", "SONGWE", "RUKWA"],
  ["DAR ES SALAAM", "LINDI", "MTWARA", "RUVUMA", "NJOMBE", "MBEYA", "SONGWE", "RUKWA", "KATAVI"],
  ["DAR ES SALAAM", "LINDI", "MTWARA", "RUVUMA", "NJOMBE", "MBEYA", "SONGWE", "RUKWA", "KATAVI", "KIGOMA"],
  ["DAR ES SALAAM", "MOROGORO", "IRINGA", "NJOMBE", "MBEYA", "SONGWE", "RUKWA"],
  ["DAR ES SALAAM", "MOROGORO", "IRINGA", "NJOMBE", "MBEYA", "SONGWE", "RUKWA"],
  ["DAR ES SALAAM", "MOROGORO", "IRINGA", "NJOMBE"],
  ["DAR ES SALAAM", "MOROGORO", "IRINGA", "NJOMBE", "MBEYA", "SONGWE"],
  ["DAR ES SALAAM", "MOROGORO", "DODOMA", "MANYARA"],
  ["DAR ES SALAAM", "TANGA", "KILIMANJARO", "ARUSHA", "MANYARA"]
];

export const getDistance = (from: string, to: string): number => {
  const record = DISTANCES.find(d => 
    (d.from_region_name === from && d.to_region_name === to) ||
    (d.from_region_name === to && d.to_region_name === from)
  );
  return record ? record.distance_km : 0;
};

export const calculateRouteDistance = (route: string[]): number => {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += getDistance(route[i], route[i+1]);
  }
  return total;
};