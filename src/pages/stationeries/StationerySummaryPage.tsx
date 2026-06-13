"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  FileText, 
  Loader2, 
  Package, 
  Calculator, 
  TrendingUp, 
  Eye, 
  Globe, 
  MapPin, 
  BookOpen, 
  Layers, 
  Boxes, 
  ClipboardList, 
  Cpu, 
  Palette,
  Sparkles,
  ShieldAlert,
  Printer,
  Download,
  ChevronRight,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import {
  fetchStationeryWithExamDetails,
  fetchReoDeoExtraSettings,
  fetchCenterMultipliers,
  fetchMultipliersSettings
} from "@/integrations/supabase/stationery-settings-api";
import {
  Stationery,
  StationeryReoDeoExtra,
  StationeryCenterMultiplier,
  StationeryMultiplier
} from "@/types/stationeries";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Spinner from "@/components/Spinner";

interface RegionData {
  regionName: string;
  totals: Record<string, number>;
  districts: DistrictData[];
}

interface DistrictData {
  districtName: string;
  totals: Record<string, number>;
}

interface SummaryCard {
  field: string;
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

// Subject code lists for braille calculations in secondary exams
const CSEE_FTNA_SUBJECT_CODES = [
  '011','012','013','014','015','016','017','018','019','021','022','023','024','025','026',
  '031','032','033','034','035','036','041','042','050','051','052','061','062','071','072',
  '073','074','080','081','082','083','087','088','090','091',
  '043','060','065','201','204','205','241','242','243','396','397','398',
  '403','404','405','406','412','463','464','465','481','483','485','801',
  '804','805','806','824','827','841','842','843','861','862','881','882'
];
const ACSEE_SUBJECT_CODES = [
  '111','112','113','114','115','116','118','121','122','123','125','126','131','132','133',
  '134','136','137','141','142','151','152','153','155','161'
];

// Compulsory subjects for TR/TWM logic (from supervisor report)
const SECONDARY_COMPULSORY_SUBJECTS: Record<string, string[]> = {
  FTNA: [
    "011","012","013","014","015","016","017","018","019","021","022","023","024","025","026",
    "031","032","033","034","035","036","041","042","050","051","052","061","062","071","072",
    "073","074","080","081","082","083","087","088","090","091",
    "043","060","065","201","204","205","241","242","243","396","397","398",
    "403","404","405","406","412","463","464","465","481","483","485","801",
    "804","805","806","824","827","841","842","843","861","862","881","882"
  ],
  CSEE: [
    "011","012","013","014","015","016","017","018","019","021","022","023","024","025","026",
    "031","032","033","034","035","036","041","042","050","051","052","061","062","071","072",
    "073","074","080","081","082","083","087","088","090","091",
    "043","060","065","201","204","205","241","242","243","396","397","398",
    "403","404","405","406","412","463","464","465","481","483","485","801",
    "804","805","806","824","827","841","842","843","861","862","881","882"
  ],
  ACSEE: [
    "111", "112", "113", "114", "115", "116", "118", "121", "122", "123", "125", "126",
    "131", "132", "133", "134", "136", "137", "141", "142", "151", "152", "153", "155", "161"
  ],
};

// Double paper subjects (CSEE & FTNA)
const CSEE_DOUBLE_PAPER_SUBJECTS = [
  "016", "017", "031", "032", "033", "034", "036", "051", "052"
];
const FTNA_DOUBLE_PAPER_SUBJECTS = [
  "016", "017", "201", "204", "205", "398", "403", "404", "405", "406", 
  "463", "464", "465", "481", "483", "485", "801", "804", "805", "806", 
  "824", "827", "841", "842", "843", "861", "862", "881", "882"
];

// BKM weights for ACSEE
const ACSEE_BKM_WEIGHTS: Record<string, number> = {
  "111": 1, "112": 2, "113": 2, "114": 2, "115": 2, "116": 2, "118": 2, "121": 2, "122": 2, "123": 2, "125": 2, "126": 2,
  "131": 5, "132": 5, "133": 5, "134": 5, "136": 5, "137": 2, "141": 1, "142": 6, "151": 2, "152": 2, "153": 2, "155": 3, "161": 2
};

// Subject-aware mapping for ICT/Arabic/Fine Arts
const getSubjectCodeForCategory = (code: string, category: "ICT Covers" | "Arabic Booklets" | "Fine Arts Booklets"): string | string[] | null => {
  if (category === "ICT Covers") {
    if (code === "ACSEE") return "136";
    if (code === "CSEE") return "036";
    if (code === "FTNA") return ["398", "841"];
  }
  if (category === "Arabic Booklets") {
    if (code === "ACSEE") return "125";
    if (code === "CSEE") return "025";
    if (code === "FTNA") return "025";
  }
  if (category === "Fine Arts Booklets") {
    if (code === "ACSEE") return "116";
    if (code === "CSEE") return "016";
    if (code === "FTNA") return "016";
  }
  return null;
};

// Helper to map field to icon and color classes
const getFieldVisual = (field: string) => {
  switch (field) {
    case 'normalbooklets':
      return { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50/60', border: 'border-blue-100' };
    case 'graphbooklets':
      return { icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50/60', border: 'border-indigo-100' };
    case 'normalloosesheets':
      return { icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50/60', border: 'border-amber-100' };
    case 'graphloosesheets':
      return { icon: Layers, color: 'text-violet-600', bg: 'bg-violet-50/60', border: 'border-violet-100' };
    case 'bkm':
      return { icon: Boxes, color: 'text-emerald-600', bg: 'bg-emerald-50/60', border: 'border-emerald-100' };
    case 'tr':
      return { icon: ClipboardList, color: 'text-rose-600', bg: 'bg-rose-50/60', border: 'border-rose-100' };
    case 'twm':
      return { icon: ClipboardList, color: 'text-pink-600', bg: 'bg-pink-50/60', border: 'border-pink-100' };
    case 'brsheets':
      return { icon: FileText, color: 'text-purple-700', bg: 'bg-purple-50/60', border: 'border-purple-100' };
    case 'brbkm':
      return { icon: Boxes, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50/60', border: 'border-fuchsia-100' };
    case 'arabicbooklets':
      return { icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50/60', border: 'border-teal-100' };
    case 'ictcovers':
      return { icon: Cpu, color: 'text-cyan-600', bg: 'bg-cyan-50/60', border: 'border-cyan-100' };
    case 'finearts':
      return { icon: Palette, color: 'text-orange-600', bg: 'bg-orange-50/60', border: 'border-orange-100' };
    case 'fbm1':
      return { icon: Package, color: 'text-lime-600', bg: 'bg-lime-50/60', border: 'border-lime-100' };
    case 'fbm2':
      return { icon: Package, color: 'text-green-600', bg: 'bg-green-50/60', border: 'border-green-100' };
    case 'timetables':
      return { icon: Calendar, color: 'text-green-600', bg: 'bg-green-50/60', border: 'border-green-100' };
    default:
      return { icon: TrendingUp, color: 'text-slate-600', bg: 'bg-slate-50/60', border: 'border-slate-100' };
  }
};

const StationerySummaryPage: React.FC = () => {
  const { stationeryId } = useParams<{ stationeryId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [stationery, setStationery] = useState<Stationery | null>(null);
  const [reoDeoExtra, setReoDeoExtra] = useState<StationeryReoDeoExtra | null>(null);
  const [centerMultipliers, setCenterMultipliers] = useState<StationeryCenterMultiplier | null>(null);
  const [subjectMultipliers, setSubjectMultipliers] = useState<StationeryMultiplier[]>([]);
  const [regionData, setRegionData] = useState<RegionData[]>([]);
  const [summaryCards, setSummaryCards] = useState<SummaryCard[]>([]);

  const getExamFields = (examCode: string) => {
    switch (examCode) {
      case 'ACSEE':
      case 'CSEE':
        return [
          'normalbooklets', 'graphbooklets', 'normalloosesheets', 'graphloosesheets',
          'bkm', 'tr', 'twm', 'brsheets', 'brbkm', 'arabicbooklets', 'ictcovers', 'finearts', 'timetables'
        ];
      case 'FTNA':
        return ['bkm', 'ictcovers', 'finearts', 'tr', 'twm', 'brsheets', 'brbkm', 'timetables'];
      case 'PSLE':
      case 'SSNA':
      case 'SFNA':
        return ['fbm1', 'fbm2', 'tr', 'twm', 'bkm', 'brsheets', 'brbkm', 'timetables'];
      default:
        return [];
    }
  };

  // Group fields into logical categories for a beautiful, structured layout
  const getFieldGroup = (field: string): 'core' | 'subject' | 'special' | 'logistics' => {
    if (['normalbooklets', 'graphbooklets', 'normalloosesheets', 'graphloosesheets', 'bkm', 'fbm1', 'fbm2'].includes(field)) {
      return 'core';
    }
    if (['arabicbooklets', 'ictcovers', 'finearts'].includes(field)) {
      return 'subject';
    }
    if (['brsheets', 'brbkm'].includes(field)) {
      return 'special';
    }
    return 'logistics';
  };

  const getFieldLabels = (field: string): string => {
    const labels: Record<string, string> = {
      'normalbooklets': 'Normal Booklets',
      'graphbooklets': 'Graph Booklets',
      'normalloosesheets': 'Normal Loose Sheets',
      'graphloosesheets': 'Graph Loose Sheets',
      'bkm': 'BKM',
      'tr': 'TR',
      'twm': 'TWM',
      'brsheets': 'Braille Sheets',
      'brbkm': 'Braille BKM',
      'arabicbooklets': 'Arabic Booklets',
      'ictcovers': 'ICT Covers',
      'finearts': 'Fine Arts Booklets',
      'fbm1': 'FBM1',
      'fbm2': 'FBM2',
      'timetables': 'Timetables'
    };
    return labels[field] || field;
  };

  const calculateStationeryTotals = async () => {
    if (!stationery || !centerMultipliers) return;

    setCalculating(true);
    try {
      const examCode = stationery.examination_code;
      const fields = getExamFields(examCode);
      const mid = stationery.mid;
      const isPrimary = ['PSLE', 'SSNA', 'SFNA'].includes(examCode);

      // Regions via RPC
      const { data: rpcRegions, error: rpcErr } = await supabase.rpc('get_distinct_regions_for_mastersummary', {
        p_mid: mid,
        p_code: examCode,
      });
      if (rpcErr) {
        showError(rpcErr.message || 'Failed to load regions.');
        setCalculating(false);
        return;
      }
      const regions: string[] = (rpcRegions || []) as string[];
      if (!regions || regions.length === 0) {
        showError('No regions found for this summary.');
        setCalculating(false);
        return;
      }

      // Subject multipliers (for ACSEE/CSEE booklets calc)
      const { data: subjects } = await supabase
        .from('subjects')
        .select('subject_code, normal_booklet_multiplier, graph_booklet_multiplier')
        .eq('exam_code', examCode)
        .eq('status', 'Active');

      const subjectMap = new Map<string, { nMul: number; gMul: number }>();
      for (const s of (subjects || [])) {
        subjectMap.set(String(s.subject_code), {
          nMul: Number(s.normal_booklet_multiplier || 0),
          gMul: Number(s.graph_booklet_multiplier || 0),
        });
      }

      const regionResults: RegionData[] = [];
      const grandTotals: Record<string, number> = {};
      fields.forEach(field => { grandTotals[field] = 0; });

      // Center multipliers (defaults as needed)
      const defaultStudentsPerStream = isPrimary ? 25 : 30;
      const studentsPerStream = centerMultipliers.students_in_a_stream && centerMultipliers.students_in_a_stream > 0
        ? centerMultipliers.students_in_a_stream
        : defaultStudentsPerStream;

      const bkmPct = centerMultipliers.bkm_percentage || 0;
      const nPct = centerMultipliers.bookletsnormal_center_percentage || 0;
      const gPct = centerMultipliers.bookletsgraph_center_percentage || 0;
      const lsnPct = centerMultipliers.loose_sheet_normal_percentage || 0;
      const lsgPct = centerMultipliers.loose_sheets_graph_percentage || 0;
      const brailleMultiplier = Number(centerMultipliers.braillesheets) > 0 ? Number(centerMultipliers.braillesheets) : 10; 
      const timetableMultiplier = Number(centerMultipliers.timetables) > 0 ? Number(centerMultipliers.timetables) : 1;

      const arabicPct = centerMultipliers.arabic_booklets_percentage || 0;
      const ictPct = centerMultipliers.ict_covers_percentage || 0;
      const fineArtsPct = centerMultipliers.fine_arts_booklets_percentage || 0;

      const extraArabicPct = Number(reoDeoExtra?.arabicbooklets || 0) / 100;
      const extraIctPct = Number(reoDeoExtra?.ictcovers || 0) / 100;
      const extraFineArtsPct = Number(reoDeoExtra?.finearts || 0) / 100;

      const brsheetsExtraPct = Number(reoDeoExtra?.brsheets || 0) / 100;
      const brbkmExtraPct = Number(reoDeoExtra?.brbkm || 0) / 100;

      const arabicCode = getSubjectCodeForCategory(examCode, "Arabic Booklets");
      const ictCode = getSubjectCodeForCategory(examCode, "ICT Covers");
      const fineArtsCode = getSubjectCodeForCategory(examCode, "Fine Arts Booklets");

      for (const regionName of regions) {
        // Load detailed (non-special-needs) data for region
        const tableName = isPrimary ? 'primarymastersummary' : 'secondarymastersummaries';
        const { data: detailedData, error: detErr } = await supabase
          .from(tableName)
          .select('*')
          .eq('mid', mid)
          .eq('region', regionName)
          .eq('is_latest', true);

        if (detErr) {
          showError(detErr.message || `Failed to load data for ${regionName}.`);
          continue;
        }

        const districtAggregates = new Map<string, {
          district: string;
          normalbooklets: number;
          graphbooklets: number;
          normalloosesheets: number;
          graphloosesheets: number;
          bkm: number;
          tr: number;
          twm: number;
          fbm1?: number;
          fbm2?: number;
          arabicbooklets?: number;
          ictcovers?: number;
          finearts?: number;
          timetables?: number;
        }>();

        let regionTotalTRTWM = 0;
        let regionBaseArabicQty = 0;
        let regionBaseIctQty = 0;
        let regionBaseFineArtsQty = 0;
        let regionBaseTotalBkm = 0;
        let regionBaseTotalFBM1 = 0;
        let regionBaseTotalFBM2 = 0;

        for (const school of (detailedData || [])) {
          const district = String(school.district || 'UNKNOWN');

          let maxRegisteredForTRTWM = 0;
          let totalNormal = 0;
          let totalGraph = 0;
          let totalWeightedStreamsForBKM = 0;
          let totalWeightedStreamsForFBM1 = 0;
          let totalWeightedStreamsForFBM2 = 0;

          // TR/TWM: supervisor logic using compulsory subjects
          if (isPrimary) {
            maxRegisteredForTRTWM = Number(school.registered || 0);
          } else {
            const compulsory = SECONDARY_COMPULSORY_SUBJECTS[examCode] || [];
            for (const subCode of compulsory) {
              const registered = Number(school[subCode] || 0);
              if (registered > maxRegisteredForTRTWM) maxRegisteredForTRTWM = registered;
            }
          }

          // Booklets/Loose sheets/BKM logic
          if (isPrimary) {
            const registered = Number(school.registered || 0);
            const subjects = Number(school.subjects || 0);
            
            let bkmStreams = 0;
            if (registered > 0) {
              const baseStreams = Math.floor(registered / studentsPerStream);
              const remainder = registered % studentsPerStream;
              if (baseStreams === 0) {
                bkmStreams = 1;
              } else {
                bkmStreams = remainder >= 5 ? baseStreams + 1 : baseStreams;
              }
            }

            let fbmStreams = 0;
            if (registered > 0) {
              const baseStreams = Math.floor(registered / 25);
              const remainder = registered % 25;
              if (baseStreams === 0) {
                fbmStreams = 1;
              } else {
                fbmStreams = remainder >= 5 ? baseStreams + 1 : baseStreams;
              }
            }
            
            totalWeightedStreamsForBKM = bkmStreams * subjects;
            totalWeightedStreamsForFBM1 = fbmStreams * subjects;
            totalWeightedStreamsForFBM2 = fbmStreams * subjects;
          } else if (examCode === 'CSEE' || examCode === 'FTNA') {
            const activeDoubleList = (examCode === 'CSEE') ? CSEE_DOUBLE_PAPER_SUBJECTS : FTNA_DOUBLE_PAPER_SUBJECTS;
            for (const subCode of CSEE_FTNA_SUBJECT_CODES) {
              const registered = Number(school[subCode] || 0);
              if (registered > 0) {
                const sm = subjectMap.get(subCode);
                if (sm) {
                  totalNormal += registered * sm.nMul;
                  totalGraph += registered * sm.gMul;
                }
                let streams = Math.ceil(registered / studentsPerStream);
                if (activeDoubleList.includes(subCode)) {
                  streams *= 2;
                }
                totalWeightedStreamsForBKM += streams;
              }
            }
          } else if (examCode === 'ACSEE') {
            for (const [subCode, weight] of Object.entries(ACSEE_BKM_WEIGHTS)) {
              const registered = Number((school as any)[subCode] || 0);
              if (registered > 0) {
                const sm = subjectMap.get(subCode);
                if (sm) {
                  totalNormal += registered * sm.nMul;
                  totalGraph += registered * sm.gMul;
                }
                const streams = Math.ceil(registered / studentsPerStream);
                totalWeightedStreamsForBKM += weight * streams;
              }
            }
          }

          // Final center computations
          const supervisors = maxRegisteredForTRTWM > 0 ? Math.ceil(maxRegisteredForTRTWM / 30) + 2 : 0;
          
          // BKM calculation matching edge function
          const centerBkm = !isPrimary && bkmPct > 0
            ? Math.ceil(totalWeightedStreamsForBKM * (1 + bkmPct / 100))
            : Math.ceil(totalWeightedStreamsForBKM);

          const normalWithPct = nPct > 0 ? Math.ceil(totalNormal + totalNormal * (nPct / 100)) : Math.ceil(totalNormal);
          const graphWithPct = gPct > 0 ? Math.ceil(totalGraph + totalGraph * (gPct / 100)) : Math.ceil(totalGraph);
          const lsNorm = lsnPct > 0 ? Math.ceil((normalWithPct + graphWithPct) * (lsnPct / 100)) : 0;
          const lsGraph = lsgPct > 0 ? Math.ceil(graphWithPct * (lsgPct / 100)) : 0;
          const centerFBM1 = isPrimary ? Math.ceil(totalWeightedStreamsForFBM1) : 0;
          const centerFBM2 = isPrimary ? Math.ceil(totalWeightedStreamsForFBM2) : 0;

          // Subject-aware quantities (ICT, Arabic, Fine Arts)
          if (!isPrimary) {
            if (arabicCode) {
              const regArabic = Number(school[arabicCode] || 0);
              if (regArabic > 0) {
                const qtyArabic = Math.ceil(regArabic + regArabic * (arabicPct / 100));
                regionBaseArabicQty += qtyArabic;
                if (!districtAggregates.has(district)) {
                  districtAggregates.set(district, { district, normalbooklets: 0, graphbooklets: 0, normalloosesheets: 0, graphloosesheets: 0, bkm: 0, tr: 0, twm: 0, fbm1: 0, fbm2: 0, arabicbooklets: 0, ictcovers: 0, finearts: 0, timetables: 0 });
                }
                districtAggregates.get(district)!.arabicbooklets = (districtAggregates.get(district)!.arabicbooklets || 0) + qtyArabic;
              }
            }
            if (ictCode) {
              let regIct = 0;
              if (examCode === 'FTNA') {
                regIct = Number(school["398"] || 0) + Number(school["841"] || 0);
              } else {
                regIct = Number(school[ictCode as string] || 0);
              }
              if (regIct > 0) {
                const qtyIct = Math.ceil(regIct + regIct * (ictPct / 100));
                regionBaseIctQty += qtyIct;
                if (!districtAggregates.has(district)) {
                  districtAggregates.set(district, { district, normalbooklets: 0, graphbooklets: 0, normalloosesheets: 0, graphloosesheets: 0, bkm: 0, tr: 0, twm: 0, fbm1: 0, fbm2: 0, arabicbooklets: 0, ictcovers: 0, finearts: 0, timetables: 0 });
                }
                districtAggregates.get(district)!.ictcovers = (districtAggregates.get(district)!.ictcovers || 0) + qtyIct;
              }
            }
            if (fineArtsCode) {
              const regFine = Number(school[fineArtsCode as string] || 0);
              if (regFine > 0) {
                const qtyFine = Math.ceil(regFine + regFine * (fineArtsPct / 100));
                regionBaseFineArtsQty += qtyFine;
                if (!districtAggregates.has(district)) {
                  districtAggregates.set(district, { district, normalbooklets: 0, graphbooklets: 0, normalloosesheets: 0, graphloosesheets: 0, bkm: 0, tr: 0, twm: 0, fbm1: 0, fbm2: 0, arabicbooklets: 0, ictcovers: 0, finearts: 0, timetables: 0 });
                }
                districtAggregates.get(district)!.finearts = (districtAggregates.get(district)!.finearts || 0) + qtyFine;
              }
            }
          }

          if (!districtAggregates.has(district)) {
            districtAggregates.set(district, {
              district,
              normalbooklets: 0,
              graphbooklets: 0,
              normalloosesheets: 0,
              graphloosesheets: 0,
              bkm: 0,
              tr: 0,
              twm: 0,
              fbm1: 0,
              fbm2: 0,
              arabicbooklets: districtAggregates.get(district)?.arabicbooklets || 0,
              ictcovers: districtAggregates.get(district)?.ictcovers || 0,
              finearts: districtAggregates.get(district)?.finearts || 0,
              timetables: 0
            });
          }

          const current = districtAggregates.get(district)!;
          current.tr += supervisors;
          current.twm += supervisors;
          current.bkm += centerBkm;
          current.normalbooklets += normalWithPct;
          current.graphbooklets += graphWithPct;
          current.normalloosesheets += lsNorm;
          current.graphloosesheets += lsGraph;
          if (isPrimary) {
            current.fbm1 = (current.fbm1 || 0) + centerFBM1;
            current.fbm2 = (current.fbm2 || 0) + centerFBM2;
          }

          regionBaseTotalBkm += centerBkm;
          regionBaseTotalFBM1 += centerFBM1;
          regionBaseTotalFBM2 += centerFBM2;
          regionTotalTRTWM += supervisors * 2;
        }

        // Apply buffers per district matching edge functions
        const finalDistrictData = Array.from(districtAggregates.values()).map(agg => {
          const tr_buffer = Math.ceil(agg.tr * 0.10);
          const twm_buffer = Math.ceil(agg.twm * 0.10);
          const bkm_buffer = isPrimary ? Math.ceil(agg.bkm * 0.05) : 0;
          const fbm1_buffer = isPrimary ? Math.ceil(agg.fbm1! * 0.10) : 0;
          const fbm2_buffer = isPrimary ? Math.ceil(agg.fbm2! * 0.10) : 0;

          // Timetables calculation: centerCount * multiplier + 5
          const centerCount = detailedData.filter(school => school.district === agg.district).length;
          const timetablesVal = centerCount * timetableMultiplier + 5;

          return { 
            ...agg, 
            tr: agg.tr + tr_buffer, 
            twm: agg.twm + twm_buffer,
            bkm: agg.bkm + bkm_buffer,
            fbm1: isPrimary ? agg.fbm1! + fbm1_buffer : 0,
            fbm2: isPrimary ? agg.fbm2! + fbm2_buffer : 0,
            timetables: timetablesVal
          };
        });

        // Base region totals (non-braille)
        let regionBaseTotalBkmBuffered = 0;
        let regionBaseFBM1Buffered = 0;
        let regionBaseFBM2Buffered = 0;
        let regionBaseNormalBooklets = 0;
        let regionBaseGraphBooklets = 0;
        let regionBaseNormalLooseSheets = 0;
        let regionBaseGraphLooseSheets = 0;
        let regionBaseTimetables = 0;

        finalDistrictData.forEach(d => {
          regionBaseTotalBkmBuffered += d.bkm;
          regionBaseFBM1Buffered += d.fbm1 || 0;
          regionBaseFBM2Buffered += d.fbm2 || 0;
          regionBaseNormalBooklets += d.normalbooklets;
          regionBaseGraphBooklets += d.graphbooklets;
          regionBaseNormalLooseSheets += d.normalloosesheets;
          regionBaseGraphLooseSheets += d.graphloosesheets;
          regionBaseTimetables += d.timetables || 0;
        });

        // Region-level REO extras for non-braille and subject-aware categories
        const baseRegionSupervisors = regionTotalTRTWM / 2;
        const reoExtraTR = Math.ceil(baseRegionSupervisors * (Number(reoDeoExtra?.tr || 0) / 100));
        const reoExtraTWM = Math.ceil(baseRegionSupervisors * (Number(reoDeoExtra?.twm || 0) / 100));
        const reoExtraBKM = Math.ceil(regionBaseTotalBkm * (Number(reoDeoExtra?.bkm || 0) / 100));
        const reoExtraNormalBooklets = Math.ceil(regionBaseNormalBooklets * (Number(reoDeoExtra?.normalbooklets || 0) / 100));
        const reoExtraGraphBooklets = Math.ceil(regionBaseGraphBooklets * (Number(reoDeoExtra?.graphbooklets || 0) / 100));
        const reoExtraNormalLooseSheets = Math.ceil(regionBaseNormalLooseSheets * (Number(reoDeoExtra?.normalloosesheets || 0) / 100));
        const reoExtraGraphLooseSheets = Math.ceil(regionBaseGraphLooseSheets * (Number(reoDeoExtra?.graphloosesheets || 0) / 100));

        // FBM extras (primary only)
        const reoExtraFBM1 = isPrimary ? Math.ceil(regionBaseTotalFBM1 * (Number(reoDeoExtra?.fbm1 || 0) / 100)) : 0;
        const reoExtraFBM2 = isPrimary ? Math.ceil(regionBaseTotalFBM2 * (Number(reoDeoExtra?.fbm2 || 0) / 100)) : 0;

        // Subject-aware NECTA EXTRAs (Arabic/ICT/Fine Arts)
        const extraArabicQty = Math.ceil(regionBaseArabicQty * extraArabicPct);
        const extraIctQty = Math.ceil(regionBaseIctQty * extraIctPct);
        const extraFineArtsQty = Math.ceil(regionBaseFineArtsQty * extraFineArtsPct);

        // Timetables NECTA EXTRA constant
        const nectaExtraTimetablesConstant = 4;

        // Braille special needs (from special needs tables)
        const brailleTable = isPrimary ? 'primarymastersummary_specialneeds' : 'secondarymastersummaries_specialneeds';
        const { data: brailleRows, error: brailleErr } = await supabase
          .from(brailleTable)
          .select('*')
          .eq('mid', mid)
          .eq('region', regionName)
          .eq('special_need', 'BR');

        if (brailleErr) {
          showError(brailleErr.message || 'Failed to fetch braille special needs.');
          setCalculating(false);
          return;
        }

        const brailleAggregates = new Map<string, { brsheets: number; brbkm: number }>();
        let regionBaseBrailleSheets = 0;
        let regionBaseBrailleBkm = 0;

        for (const r of (brailleRows || [])) {
          const district = String(r.district || 'UNKNOWN');
          let brSheets = 0;
          let bkm = 0;

          if (isPrimary) {
            const registered = Number(r.registered || 0);
            const numSubjects = Number(r.subjects || 6);
            const baseBrSheets = Math.ceil(registered * numSubjects * brailleMultiplier);
            brSheets = Math.ceil(baseBrSheets * 1.1);
            bkm = Math.ceil((registered * brailleMultiplier) / 25) * numSubjects;
          } else {
            const relevantCodes = (examCode === 'CSEE' || examCode === 'FTNA') ? CSEE_FTNA_SUBJECT_CODES : ACSEE_SUBJECT_CODES;
            let totalBrSheetsBase = 0;
            let totalBkmBase = 0;
            for (const key of relevantCodes) {
              const registered = Number(r[key] || 0);
              if (registered > 0) {
                const subBrSheets = Math.ceil(registered * brailleMultiplier);
                const subBkm = Math.ceil(subBrSheets / 25);
                totalBrSheetsBase += subBrSheets;
                totalBkmBase += subBkm;
              }
            }
            brSheets = Math.ceil(totalBrSheetsBase * 1.1);
            bkm = Math.ceil(totalBkmBase * 1.1);
          }

          if (!brailleAggregates.has(district)) {
            brailleAggregates.set(district, { brsheets: 0, brbkm: 0 });
          }
          const cur = brailleAggregates.get(district)!;
          cur.brsheets += brSheets;
          cur.brbkm += bkm;

          regionBaseBrailleSheets += brSheets;
          regionBaseBrailleBkm += bkm;
        }

        const extraBrSheets = Math.ceil(regionBaseBrailleSheets * brsheetsExtraPct);
        const extraBkmBraille = Math.ceil(regionBaseBrailleBkm * brbkmExtraPct);

        // Final region totals
        const regionTotals: Record<string, number> = {};
        fields.forEach(f => { regionTotals[f] = 0; });

        // TR/TWM/BKM
        regionTotals.tr = baseRegionSupervisors + reoExtraTR;
        regionTotals.twm = baseRegionSupervisors + reoExtraTWM;
        regionTotals.bkm = regionBaseTotalBkmBuffered + reoExtraBKM;

        // Booklets & Loose sheets
        if (!isPrimary) {
          regionTotals.normalbooklets = regionBaseNormalBooklets + reoExtraNormalBooklets;
          regionTotals.graphbooklets = regionBaseGraphBooklets + reoExtraGraphBooklets;
          regionTotals.normalloosesheets = regionBaseNormalLooseSheets + reoExtraNormalLooseSheets;
          regionTotals.graphloosesheets = regionBaseGraphLooseSheets + reoExtraGraphLooseSheets;
        }

        // FBM (primary only)
        if (isPrimary) {
          regionTotals.fbm1 = regionBaseFBM1Buffered + reoExtraFBM1;
          regionTotals.fbm2 = regionBaseFBM2Buffered + reoExtraFBM2;
        }

        // Subject-aware totals (Arabic / ICT / Fine Arts)
        if (!isPrimary) {
          regionTotals.arabicbooklets = regionBaseArabicQty + extraArabicQty;
          regionTotals.ictcovers = regionBaseIctQty + extraIctQty;
          regionTotals.finearts = regionBaseFineArtsQty + extraFineArtsQty;
        }

        // Braille totals (include region NECTA EXTRA)
        regionTotals.brsheets = regionBaseBrailleSheets + extraBrSheets;
        regionTotals.brbkm = regionBaseBrailleBkm + extraBkmBraille;

        // Timetables totals
        regionTotals.timetables = regionBaseTimetables + nectaExtraTimetablesConstant;

        // District results with base values (extras applied region-level only)
        const districtResults: DistrictData[] = finalDistrictData.map(d => {
          const totals: Record<string, number> = {};
          fields.forEach(f => { totals[f] = 0; });

          totals.bkm = d.bkm;
          totals.tr = d.tr;
          totals.twm = d.twm;
          totals.normalbooklets = d.normalbooklets;
          totals.graphbooklets = d.graphbooklets;
          totals.normalloosesheets = d.normalloosesheets;
          totals.graphloosesheets = d.graphloosesheets;

          if (isPrimary) {
            totals.fbm1 = d.fbm1 || 0;
            totals.fbm2 = d.fbm2 || 0;
          }

          totals.arabicbooklets = d.arabicbooklets || 0;
          totals.ictcovers = d.ictcovers || 0;
          totals.finearts = d.finearts || 0;

          const brAgg = brailleAggregates.get(d.district);
          totals.brsheets = brAgg ? brAgg.brsheets : 0;
          totals.brbkm = brAgg ? brAgg.brbkm : 0;

          totals.timetables = d.timetables || 0;

          return { districtName: d.district, totals };
        });

        // Append NECTA EXTRA as a district card in the breakdown
        const nectaExtraTotals: Record<string, number> = {};
        fields.forEach(f => { nectaExtraTotals[f] = 0; });

        nectaExtraTotals.tr = reoExtraTR;
        nectaExtraTotals.twm = reoExtraTWM;
        nectaExtraTotals.bkm = reoExtraBKM;
        nectaExtraTotals.normalbooklets = reoExtraNormalBooklets;
        nectaExtraTotals.graphbooklets = reoExtraGraphBooklets;
        nectaExtraTotals.normalloosesheets = reoExtraNormalLooseSheets;
        nectaExtraTotals.graphloosesheets = reoExtraGraphLooseSheets;
        nectaExtraTotals.fbm1 = reoExtraFBM1;
        nectaExtraTotals.fbm2 = reoExtraFBM2;
        nectaExtraTotals.arabicbooklets = extraArabicQty;
        nectaExtraTotals.ictcovers = extraIctQty;
        nectaExtraTotals.finearts = extraFineArtsQty;
        nectaExtraTotals.brsheets = extraBrSheets;
        nectaExtraTotals.brbkm = extraBkmBraille;
        nectaExtraTotals.timetables = nectaExtraTimetablesConstant;

        districtResults.push({
          districtName: "NECTA EXTRA",
          totals: nectaExtraTotals
        });

        // Update grand totals
        fields.forEach(field => {
          grandTotals[field] = (grandTotals[field] || 0) + (regionTotals[field] || 0);
        });

        regionResults.push({
          regionName,
          totals: regionTotals,
          districts: districtResults
        });
      }

      // SORT: arrange regions alphabetically by name
      const sortedRegions = [...regionResults].sort((a, b) => a.regionName.localeCompare(b.regionName));
      setRegionData(sortedRegions);

      const cards: SummaryCard[] = fields.map((field) => {
        const visual = getFieldVisual(field);
        return {
          field,
          title: getFieldLabels(field),
          value: grandTotals[field],
          icon: React.createElement(visual.icon, { className: `h-5 w-5 ${visual.color}` }),
          color: visual.color,
          bgColor: visual.bg,
          borderColor: visual.border
        };
      });
      setSummaryCards(cards);

    } catch (error: any) {
      showError(error.message || "Failed to calculate stationery totals.");
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    document.title = "Stationery Summary | NEAS";
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!stationeryId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const id = parseInt(stationeryId);
        if (isNaN(id)) {
          throw new Error("Invalid Stationery ID.");
        }

        const fetchedStationery = await fetchStationeryWithExamDetails(id);
        setStationery(fetchedStationery);

        if (fetchedStationery) {
          setReoDeoExtra(await fetchReoDeoExtraSettings(id));
          setCenterMultipliers(await fetchCenterMultipliers(id));
          setSubjectMultipliers(await fetchMultipliersSettings(id));
        }
      } catch (error: any) {
        showError(error.message || "Failed to load stationery summary details.");
        setStationery(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [stationeryId]);

  useEffect(() => {
    if (stationery && centerMultipliers && reoDeoExtra) {
      calculateStationeryTotals();
    }
  }, [stationery, centerMultipliers, reoDeoExtra]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner label="Loading stationery summary..." size="lg" />
      </div>
    );
  }

  if (!stationery) {
    return (
      <Card className="w-full max-w-4xl mx-auto mt-8 border-slate-200 shadow-xl rounded-2xl">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="text-2xl font-bold text-slate-800">Stationery Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-center text-slate-500">No stationery entry found for ID: {stationeryId}.</p>
          <div className="text-center mt-6">
            <Button variant="outline" onClick={() => navigate('/dashboard/stationeries')} className="rounded-xl">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stationeries
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Group summary cards for beautiful sectioning
  const coreCards = summaryCards.filter(c => getFieldGroup(c.field) === 'core');
  const subjectCards = summaryCards.filter(c => getFieldGroup(c.field) === 'subject');
  const specialCards = summaryCards.filter(c => getFieldGroup(c.field) === 'special');
  const logisticsCards = summaryCards.filter(c => getFieldGroup(c.field) === 'logistics');

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl space-y-8">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase tracking-wider px-3 py-1 rounded-full text-[10px]">
                {stationery.examination_code}
              </Badge>
              <Badge variant="outline" className="border-white/20 text-white/80 font-semibold px-3 py-1 rounded-full text-[10px]">
                Year {stationery.examination_year}
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Stationery Summary Dashboard
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl font-medium leading-relaxed">
              Comprehensive distribution and allocation parameters for {stationery.examination_name}. Grouped and calculated dynamically based on center multipliers and REO/DEO extra settings.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard/stationeries')} 
              className="rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white h-11 font-bold text-xs uppercase tracking-wider"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>
          </div>
        </div>
      </div>

      {/* Grouped Stationery Parameters */}
      <div className="space-y-8">
        {/* 1. Core Stationery Section */}
        {coreCards.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Package className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider text-xs">Core Stationery Parameters</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {coreCards.map((card, index) => (
                <Card key={index} className={`border ${card.borderColor} shadow-sm hover:shadow-md transition-all duration-200 ${card.bgColor} rounded-2xl overflow-hidden`}>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.title}</p>
                      <p className="text-2xl font-black text-slate-900">{formatNumber(card.value)}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                      {card.icon}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 2. Subject-Specific Section */}
        {subjectCards.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
                <BookOpen className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider text-xs">Subject-Specific Booklets</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectCards.map((card, index) => (
                <Card key={index} className={`border ${card.borderColor} shadow-sm hover:shadow-md transition-all duration-200 ${card.bgColor} rounded-2xl overflow-hidden`}>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.title}</p>
                      <p className="text-2xl font-black text-slate-900">{formatNumber(card.value)}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                      {card.icon}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 3. Special Needs Section */}
        {specialCards.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="p-1.5 bg-fuchsia-50 text-fuchsia-600 rounded-lg">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider text-xs">Special Needs (Braille)</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {specialCards.map((card, index) => (
                <Card key={index} className={`border ${card.borderColor} shadow-sm hover:shadow-md transition-all duration-200 ${card.bgColor} rounded-2xl overflow-hidden`}>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.title}</p>
                      <p className="text-2xl font-black text-slate-900">{formatNumber(card.value)}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                      {card.icon}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 4. Logistics & Supervision Section */}
        {logisticsCards.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <ClipboardList className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider text-xs">Logistics & Supervision</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {logisticsCards.map((card, index) => (
                <Card key={index} className={`border ${card.borderColor} shadow-sm hover:shadow-md transition-all duration-200 ${card.bgColor} rounded-2xl overflow-hidden`}>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.title}</p>
                      <p className="text-2xl font-black text-slate-900">{formatNumber(card.value)}</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                      {card.icon}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Region-wise Data Breakdown */}
      <Card className="shadow-xl border-slate-200 rounded-3xl overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Region-wise Breakdown</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Detailed stationery totals and district-wise allocations for each region
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {calculating ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Spinner label="Calculating region totals..." />
            </div>
          ) : (
            <Accordion type="multiple" className="w-full space-y-4">
              {regionData.map((region, index) => (
                <AccordionItem 
                  key={index} 
                  value={`region-${index}`} 
                  className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <AccordionTrigger className="hover:bg-slate-50/50 px-5 py-4 transition-colors">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="text-left">
                          <span className="font-bold text-slate-800 text-sm sm:text-base">{region.regionName}</span>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            {region.districts.filter(d => d.districtName !== "NECTA EXTRA").length} districts allocated
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-6 py-5 bg-slate-50/30 border-t border-slate-100 space-y-6">
                    {/* Region Totals */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Region Totals</h4>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Object.entries(region.totals)
                          .filter(([field]) => {
                            const allowedFields = getExamFields(stationery.examination_code);
                            return allowedFields.includes(field);
                          })
                          .map(([field, value]) => {
                            const visual = getFieldVisual(field);
                            const IconComp = visual.icon;
                            return (
                              <div key={field} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`p-1 rounded-lg ${visual.bg} ${visual.color}`}>
                                    <IconComp className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-xs font-semibold text-slate-600 truncate">{getFieldLabels(field)}</span>
                                </div>
                                <span className="font-bold text-slate-900 text-sm pl-2">{formatNumber(value)}</span>
                              </div>
                            );                     
                          })}
                      </div>
                    </div>

                    {/* District-wise Breakdown */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">District-wise Breakdown</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {region.districts.map((district, districtIndex) => (
                          <div 
                            key={districtIndex} 
                            className={`rounded-2xl border p-4 shadow-sm space-y-3 ${
                              district.districtName === "NECTA EXTRA" 
                                ? "border-blue-200 bg-blue-50/30" 
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                              <div className={`h-2 w-2 rounded-full ${district.districtName === "NECTA EXTRA" ? "bg-blue-500" : "bg-emerald-500"}`} />
                              <h5 className="font-bold text-slate-800 text-xs truncate uppercase tracking-wider">{district.districtName}</h5>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(district.totals)
                                .filter(([field]) => {
                                  const allowedFields = getExamFields(stationery.examination_code);
                                  return allowedFields.includes(field);
                                })
                                .map(([field, value]) => {
                                  const visual = getFieldVisual(field);
                                  return (
                                    <div key={field} className="flex items-center justify-between text-[11px] p-2 bg-slate-50/50 rounded-lg border border-slate-100">
                                      <span className="text-slate-500 font-medium truncate mr-1">{getFieldLabels(field)}</span>
                                      <span className="font-bold text-slate-800">{formatNumber(value)}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StationerySummaryPage;