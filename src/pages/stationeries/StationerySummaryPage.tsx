"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2, Package, Calculator, TrendingUp, Eye, Globe, MapPin, BookOpen, Layers, Boxes, ClipboardList, Cpu, Palette } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

// Subject code lists for braille calculations in secondary exams
const CSEE_FTNA_SUBJECT_CODES = [
  '011','012','013','014','015','016','017','018','019','021','022','023','024','025','026',
  '031','032','033','034','035','036','041','042','050','051','052','061','062','071','072',
  '073','074','080','081','082','083','087','088','090','091'
];
const ACSEE_SUBJECT_CODES = [
  '111','112','113','114','115','116','118','121','122','123','125','126','131','132','133',
  '134','136','137','141','142','151','152','153','155','161'
];

// Compulsory subjects for TR/TWM logic (from supervisor report)
const SECONDARY_COMPULSORY_SUBJECTS: Record<string, string[]> = {
  FTNA: ['011'],
  CSEE: ['011'],
  ACSEE: ['111'],
};

// Double paper subjects (CSEE)
const CSEE_DOUBLE_PAPER_SUBJECTS = ['033', '032', '031', '034', '017'];

// BKM weights for ACSEE
const ACSEE_BKM_WEIGHTS: Record<string, number> = {
  "111": 1, "112": 2, "113": 2, "114": 2, "115": 2, "116": 2, "118": 2, "121": 2, "122": 2, "123": 2, "125": 2, "126": 2,
  "131": 5, "132": 5, "133": 5, "134": 5, "136": 5, "137": 2, "141": 1, "142": 6, "151": 2, "152": 2, "153": 2, "155": 3, "161": 2
};

// Subject-aware mapping for ICT/Arabic/Fine Arts
const getSubjectCodeForCategory = (code: string, category: "ICT Covers" | "Arabic Booklets" | "Fine Arts Booklets"): string | null => {
  if (category === "ICT Covers") return code === "ACSEE" ? "136" : "036";
  if (category === "Arabic Booklets") return code === "ACSEE" ? "125" : "025";
  if (category === "Fine Arts Booklets") {
    if (code === "ACSEE") return "116";
    if (code === "CSEE" || code === "FTNA") return "016";
  }
  return null;
};

// ADD: helper to map field to icon and color classes
const getFieldVisual = (field: string) => {
  switch (field) {
    case 'normalbooklets':
      return { icon: BookOpen, color: 'text-sky-600', bg: 'bg-sky-50' };
    case 'graphbooklets':
      return { icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' };
    case 'normalloosesheets':
      return { icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50' };
    case 'graphloosesheets':
      return { icon: Layers, color: 'text-violet-600', bg: 'bg-violet-50' };
    case 'bkm':
      return { icon: Boxes, color: 'text-emerald-600', bg: 'bg-emerald-50' };
    case 'tr':
      return { icon: ClipboardList, color: 'text-rose-600', bg: 'bg-rose-50' };
    case 'twm':
      return { icon: ClipboardList, color: 'text-pink-600', bg: 'bg-pink-50' };
    case 'brsheets':
      return { icon: FileText, color: 'text-indigo-700', bg: 'bg-indigo-50' };
    case 'brbkm':
      return { icon: Boxes, color: 'text-purple-600', bg: 'bg-purple-50' };
    case 'arabicbooklets':
      return { icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50' };
    case 'ictcovers':
      return { icon: Cpu, color: 'text-blue-600', bg: 'bg-blue-50' };
    case 'finearts':
      return { icon: Palette, color: 'text-orange-600', bg: 'bg-orange-50' };
    case 'fbm1':
      return { icon: Package, color: 'text-lime-600', bg: 'bg-lime-50' };
    case 'fbm2':
      return { icon: Package, color: 'text-green-600', bg: 'bg-green-50' };
    default:
      return { icon: TrendingUp, color: 'text-gray-700', bg: 'bg-gray-50' };
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
          'bkm', 'tr', 'twm', 'brsheets', 'brbkm', 'arabicbooklets', 'ictcovers', 'finearts'
        ];
      case 'FTNA':
        return ['bkm', 'ictcovers', 'finearts', 'tr', 'twm', 'brsheets', 'brbkm'];
      case 'PSLE':
      case 'SSNA':
      case 'SFNA':
        return ['fbm1', 'fbm2', 'tr', 'twm', 'bkm', 'brsheets', 'brbkm'];
      default:
        return [];
    }
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
      'fbm2': 'FBM2'
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
      const studentsPerStream = centerMultipliers.students_in_a_stream || 30;
      const bkmPct = centerMultipliers.bkm_percentage || 0;
      const nPct = centerMultipliers.bookletsnormal_center_percentage || 0;
      const gPct = centerMultipliers.bookletsgraph_center_percentage || 0;
      const lsnPct = centerMultipliers.loose_sheet_normal_percentage || 0;
      const lsgPct = centerMultipliers.loose_sheets_graph_percentage || 0;
      const brailleMultiplier = Number(centerMultipliers.braillesheets) > 0 ? Number(centerMultipliers.braillesheets) : 2; // default 2 if missing

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
        }>();

        let regionTotalTRTWM = 0;
        let regionBaseArabicQty = 0;
        let regionBaseIctQty = 0;
        let regionBaseFineArtsQty = 0;

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
            const streams = Math.ceil(registered / studentsPerStream);
            totalWeightedStreamsForBKM = streams * subjects;
            totalWeightedStreamsForFBM1 = Math.ceil(registered / 25) * subjects;
            totalWeightedStreamsForFBM2 = Math.ceil(registered / 25) * subjects;
          } else if (examCode === 'CSEE' || examCode === 'FTNA') {
            for (const subCode of CSEE_FTNA_SUBJECT_CODES) {
              const registered = Number(school[subCode] || 0);
              if (registered > 0) {
                const sm = subjectMap.get(subCode);
                if (sm) {
                  totalNormal += registered * sm.nMul;
                  totalGraph += registered * sm.gMul;
                }
                let streams = Math.ceil(registered / studentsPerStream);
                if (examCode === 'CSEE' && CSEE_DOUBLE_PAPER_SUBJECTS.includes(subCode)) {
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
          const centerBkm = Math.ceil(totalWeightedStreamsForBKM * (1 + bkmPct / 100));
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
                  districtAggregates.set(district, { district, normalbooklets: 0, graphbooklets: 0, normalloosesheets: 0, graphloosesheets: 0, bkm: 0, tr: 0, twm: 0, fbm1: 0, fbm2: 0, arabicbooklets: 0, ictcovers: 0, finearts: 0 });
                }
                districtAggregates.get(district)!.arabicbooklets = (districtAggregates.get(district)!.arabicbooklets || 0) + qtyArabic;
              }
            }
            if (ictCode) {
              const regIct = Number(school[ictCode] || 0);
              if (regIct > 0) {
                const qtyIct = Math.ceil(regIct + regIct * (ictPct / 100));
                regionBaseIctQty += qtyIct;
                if (!districtAggregates.has(district)) {
                  districtAggregates.set(district, { district, normalbooklets: 0, graphbooklets: 0, normalloosesheets: 0, graphloosesheets: 0, bkm: 0, tr: 0, twm: 0, fbm1: 0, fbm2: 0, arabicbooklets: 0, ictcovers: 0, finearts: 0 });
                }
                districtAggregates.get(district)!.ictcovers = (districtAggregates.get(district)!.ictcovers || 0) + qtyIct;
              }
            }
            if (fineArtsCode) {
              const regFine = Number(school[fineArtsCode] || 0);
              if (regFine > 0) {
                const qtyFine = Math.ceil(regFine + regFine * (fineArtsPct / 100));
                // Fine Arts BKM exists in report, but summary shows qty only
                regionBaseFineArtsQty += qtyFine;
                if (!districtAggregates.has(district)) {
                  districtAggregates.set(district, { district, normalbooklets: 0, graphbooklets: 0, normalloosesheets: 0, graphloosesheets: 0, bkm: 0, tr: 0, twm: 0, fbm1: 0, fbm2: 0, arabicbooklets: 0, ictcovers: 0, finearts: 0 });
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

          regionTotalTRTWM += supervisors * 2;
        }

        // Apply 10% buffer to TR/TWM per district
        const finalDistrictData = Array.from(districtAggregates.values()).map(agg => {
          const tr_buffer = Math.ceil(agg.tr * 0.10);
          const twm_buffer = Math.ceil(agg.twm * 0.10);
          return { ...agg, tr: agg.tr + tr_buffer, twm: agg.twm + twm_buffer };
        });

        // Base region totals (non-braille)
        let regionBaseTotalBkm = 0;
        let regionBaseFBM1 = 0;
        let regionBaseFBM2 = 0;
        let regionBaseNormalBooklets = 0;
        let regionBaseGraphBooklets = 0;
        let regionBaseNormalLooseSheets = 0;
        let regionBaseGraphLooseSheets = 0;

        finalDistrictData.forEach(d => {
          regionBaseTotalBkm += d.bkm;
          regionBaseFBM1 += d.fbm1 || 0;
          regionBaseFBM2 += d.fbm2 || 0;
          regionBaseNormalBooklets += d.normalbooklets;
          regionBaseGraphBooklets += d.graphbooklets;
          regionBaseNormalLooseSheets += d.normalloosesheets;
          regionBaseGraphLooseSheets += d.graphloosesheets;
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

        // Subject-aware NECTA EXTRAs (Arabic/ICT/Fine Arts)
        const extraArabicQty = Math.ceil(regionBaseArabicQty * extraArabicPct);
        const extraIctQty = Math.ceil(regionBaseIctQty * extraIctPct);
        const extraFineArtsQty = Math.ceil(regionBaseFineArtsQty * extraFineArtsPct);

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
            const subjectsString = String(r.subjects || '');
            const numSubjects = subjectsString ? subjectsString.split(',').filter(s => s.trim()).length : 1;
            const baseBrSheets = Math.ceil(registered * numSubjects * brailleMultiplier);
            brSheets = Math.ceil(baseBrSheets * 1.1);
            bkm = Math.ceil((registered * brailleMultiplier) / 25);
          } else {
            const relevantCodes = (examCode === 'CSEE' || examCode === 'FTNA') ? CSEE_FTNA_SUBJECT_CODES : ACSEE_SUBJECT_CODES;
            let totalBrSheetsBase = 0;
            let totalBkmBase = 0;
            for (const key of relevantCodes) {
              const registered = Number((r as any)[key] || 0);
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
        regionTotals.bkm = regionBaseTotalBkm + reoExtraBKM;

        // Booklets & Loose sheets
        if (!isPrimary) {
          regionTotals.normalbooklets = regionBaseNormalBooklets + reoExtraNormalBooklets;
          regionTotals.graphbooklets = regionBaseGraphBooklets + reoExtraGraphBooklets;
          regionTotals.normalloosesheets = regionBaseNormalLooseSheets + reoExtraNormalLooseSheets;
          regionTotals.graphloosesheets = regionBaseGraphLooseSheets + reoExtraGraphLooseSheets;
        }

        // FBM (primary only)
        if (isPrimary) {
          const fbm1Pct = Number(reoDeoExtra?.fbm1 || 0) / 100;
          const fbm2Pct = Number(reoDeoExtra?.fbm2 || 0) / 100;
          regionTotals.fbm1 = regionBaseFBM1 + Math.ceil(regionBaseFBM1 * fbm1Pct);
          regionTotals.fbm2 = regionBaseFBM2 + Math.ceil(regionBaseFBM2 * fbm2Pct);
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

          return { districtName: d.district, totals };
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
          title: getFieldLabels(field),
          value: grandTotals[field],
          icon: React.createElement(visual.icon, { className: `h-6 w-6 ${visual.color}` }),
          color: visual.color,
          bgColor: visual.bg
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
      <Card className="w-full max-w-4xl mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Stationery Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500">No stationery entry found for ID: {stationeryId}.</p>
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => navigate('/dashboard/stationeries')}>
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

  return (
    <div className="container mx-auto py-4 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Stationery Summary
          </h1>
          <p className="text-gray-600 mt-1">
            {stationery.examination_code} - {stationery.examination_year}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/stationeries')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stationeries
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card, index) => (
          <Card
            key={index}
            className={`border-0 shadow-md hover:shadow-lg transition-shadow ${card.bgColor}`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/70 flex items-center justify-center ring-1 ring-black/5">
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {card.title}
                    </p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">
                      {formatNumber(card.value)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Region-wise Data */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Eye className="h-5 w-5 text-neas-green" /> Region-wise Breakdown
          </CardTitle>
          <CardDescription>
            Detailed stationery totals for each region
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calculating ? (
            <div className="flex items-center justify-center py-8">
              <Spinner label="Calculating region totals..." />
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {regionData.map((region, index) => (
                <AccordionItem key={index} value={`region-${index}`} className="border rounded-xl mb-3 overflow-hidden">
                  <AccordionTrigger className="hover:bg-gray-50 px-4 py-3">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-neas-green/10 flex items-center justify-center">
                          <Globe className="h-5 w-5 text-neas-green" />
                        </div>
                        <div>
                          <span className="font-semibold text-gray-800">{region.regionName}</span>
                          <div className="text-xs text-gray-500">
                            {region.districts.length} districts
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 py-4 bg-white">
                    {/* Region Totals */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-gray-700" />
                        <h4 className="font-semibold text-gray-800">Region Totals</h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                         {Object.entries(region.totals)
                        .filter(([field]) => {
                          const hideFields = ['normalbooklets', 'graphbooklets', 'normalloosesheets', 'graphloosesheets'];
                          const primaryExams = ['PSLE', 'SSNA', 'SFNA', 'FTNA'];
                          return !(primaryExams.includes(stationery.examination_code) && hideFields.includes(field));
                        })
                        .map(([field, value]) => {
                          const visual = getFieldVisual(field);
                          const IconComp = visual.icon;
                          return (
                            <div key={field} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2">
                                <IconComp className={`h-4 w-4 ${visual.color}`} />
                                <span className="text-sm font-medium text-gray-700">{getFieldLabels(field)}</span>
                              </div>
                              <span className="font-bold text-gray-900">{formatNumber(value)}</span>
                            </div>
                          );                     

                        })}
                      </div>
                    </div>

                    {/* District-wise Breakdown */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-5 w-5 text-gray-700" />
                        <h4 className="font-semibold text-gray-800">District-wise Breakdown</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {region.districts.map((district, districtIndex) => (
                          <div key={districtIndex} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-2 w-2 rounded-full bg-gray-400" />
                              <h5 className="font-medium text-gray-700 truncate">{district.districtName}</h5>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(district.totals).map(([field, value]) => {
                                const visual = getFieldVisual(field);
                                const IconComp = visual.icon;
                                return (
                                  <div key={field} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-md">
                                    <div className="flex items-center gap-2">
                                      <IconComp className={`h-4 w-4 ${visual.color}`} />
                                      <span className="text-gray-700">{getFieldLabels(field)}</span>
                                    </div>
                                    <span className="font-semibold">{formatNumber(value)}</span>
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