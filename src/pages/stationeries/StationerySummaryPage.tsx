"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  FileText, 
  Package, 
  Calculator, 
  TrendingUp, 
  Globe, 
  MapPin, 
  BookOpen, 
  Layers, 
  Boxes, 
  ClipboardList, 
  Cpu, 
  Palette,
  Sparkles,
  Calendar,
  Search,
  CheckCircle2,
  Info,
  ChevronRight
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
import { Input } from "@/components/ui/input";
import Spinner from "@/components/Spinner";
import { cn } from "@/lib/utils";

interface RegionData {
  regionName: string;
  totals: Record<string, number>;
  districts: DistrictData[];
}

interface DistrictData {
  districtName: string;
  totals: Record<string, number>;
}

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  gradient: string;
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
  "131": 5, "132": 5, "133": 5, "134": 5, "136": 2, "137": 1, "141": 1, "142": 6, "151": 2, "152": 2, "153": 2, "155": 3, "161": 1
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
      return { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50/60', border: 'border-blue-100', gradient: 'from-blue-400 to-indigo-500' };
    case 'graphbooklets':
      return { icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50/60', border: 'border-indigo-100', gradient: 'from-indigo-400 to-purple-500' };
    case 'normalloosesheets':
      return { icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50/60', border: 'border-amber-100', gradient: 'from-amber-400 to-orange-500' };
    case 'graphloosesheets':
      return { icon: Layers, color: 'text-violet-600', bg: 'bg-violet-50/60', border: 'border-violet-100', gradient: 'from-violet-400 to-fuchsia-500' };
    case 'bkm':
      return { icon: Boxes, color: 'text-emerald-600', bg: 'bg-emerald-50/60', border: 'border-emerald-100', gradient: 'from-emerald-400 to-teal-500' };
    case 'tr':
      return { icon: ClipboardList, color: 'text-rose-600', bg: 'bg-rose-50/60', border: 'border-rose-100', gradient: 'from-rose-400 to-red-500' };
    case 'twm':
      return { icon: ClipboardList, color: 'text-pink-600', bg: 'bg-pink-50/60', border: 'border-pink-100', gradient: 'from-pink-400 to-rose-500' };
    case 'brsheets':
      return { icon: FileText, color: 'text-purple-700', bg: 'bg-purple-50/60', border: 'border-purple-100', gradient: 'from-purple-400 to-indigo-600' };
    case 'brbkm':
      return { icon: Boxes, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50/60', border: 'border-fuchsia-100', gradient: 'from-fuchsia-400 to-pink-500' };
    case 'arabicbooklets':
      return { icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50/60', border: 'border-teal-100', gradient: 'from-teal-400 to-emerald-500' };
    case 'ictcovers':
      return { icon: Cpu, color: 'text-cyan-600', bg: 'bg-cyan-50/60', border: 'border-cyan-100', gradient: 'from-cyan-400 to-blue-500' };
    case 'finearts':
      return { icon: Palette, color: 'text-orange-600', bg: 'bg-orange-50/60', border: 'border-orange-100', gradient: 'from-orange-400 to-amber-500' };
    case 'fbm1':
      return { icon: Package, color: 'text-lime-600', bg: 'bg-lime-50/60', border: 'border-lime-100', gradient: 'from-lime-400 to-green-500' };
    case 'fbm2':
      return { icon: Package, color: 'text-green-600', bg: 'bg-green-50/60', border: 'border-green-100', gradient: 'from-green-400 to-emerald-500' };
    case 'timetables':
      return { icon: Calendar, color: 'text-sky-600', bg: 'bg-sky-50/60', border: 'border-sky-100', gradient: 'from-sky-400 to-blue-500' };
    default:
      return { icon: TrendingUp, color: 'text-slate-600', bg: 'bg-slate-50/60', border: 'border-slate-100', gradient: 'from-slate-400 to-slate-600' };
  }
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon: Icon, colorClass, gradient }) => {
  return (
    <Card className="relative overflow-hidden border-none shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group bg-white">
      <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${gradient}`} />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="p-3 rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            <Icon className={`h-6 w-6 ${colorClass}`} />
          </div>
          <Badge className={cn("bg-white border-current font-bold text-[10px]", colorClass)}>
            TOTAL
          </Badge>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <h3 className="text-3xl font-black tracking-tight text-slate-900">
            {formatNumber(value)}
          </h3>
        </div>
      </CardContent>
    </Card>
  );
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
  const [summaryCards, setSummaryCards] = useState<SummaryCardProps[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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

      const cards: SummaryCardProps[] = fields.map((field) => {
        const visual = getFieldVisual(field);
        return {
          title: getFieldLabels(field),
          value: grandTotals[field],
          icon: visual.icon,
          colorClass: visual.color,
          gradient: visual.gradient
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

  const filteredRegions = useMemo(() => {
    if (!searchQuery.trim()) return regionData;
    return regionData.filter(r => r.regionName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [regionData, searchQuery]);

  if (loading || calculating) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-6 bg-slate-50">
        <Spinner size="lg" />
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-slate-800">Syncing Stationery Summary...</h2>
        </div>
      </div>
    );
  }

  if (!stationery) {
    return (
      <Card className="w-full max-w-4xl mx-auto mt-8 border-slate-200 shadow-xl rounded-2xl">
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6 space-y-10 max-w-[1600px] mx-auto pb-32">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard/stationeries')} 
              className="h-8 px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 py-1 px-3 rounded-full">
              <Info className="h-3 w-3 mr-2" /> {stationery.examination_code} {stationery.examination_year}
            </Badge>
          </div>
          <h4 className="text-4xl font-black text-slate-900 tracking-tight">Stationery Summary</h4>
        </div>
        
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search regions..." 
            className="pl-10 h-12 bg-white border-slate-200 shadow-sm rounded-xl focus:ring-2 focus:ring-blue-500/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, index) => (
          <SummaryCard 
            key={index}
            title={card.title}
            value={card.value}
            icon={card.icon}
            colorClass={card.colorClass}
            gradient={card.gradient}
          />
        ))}
      </div>

      {/* Regional Breakdown Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg text-white">
              <Globe className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Regional Breakdown</h2>
          </div>
          <Badge className="bg-slate-100 text-slate-600 border-none px-4 py-1">
            {filteredRegions.length} Regions tracked
          </Badge>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {filteredRegions.map((region, index) => (
            <AccordionItem 
              key={index} 
              value={region.regionName} 
              className="border-none bg-white rounded-2xl shadow-sm overflow-hidden group"
            >
              <AccordionTrigger className="hover:no-underline px-6 py-5 group-data-[state=open]:bg-slate-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between w-full text-left gap-4 pr-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold bg-blue-100 text-blue-700">
                      {region.regionName.charAt(0)}
                    </div>
                    <div>
                      <span className="font-extrabold text-lg text-slate-800">{region.regionName}</span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {region.districts.filter(d => d.districtName !== "NECTA EXTRA").length} Districts
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-8">
                    {Object.entries(region.totals)
                      .filter(([field]) => {
                        const allowedFields = getExamFields(stationery.examination_code);
                        // Show up to 2 key parameters in the header row for quick glance
                        return allowedFields.slice(0, 2).includes(field);
                      })
                      .map(([field, value]) => (
                        <div key={field} className="text-center">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{getFieldLabels(field)}</p>
                          <p className="font-black text-slate-800">
                            {formatNumber(value)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-6 pb-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {region.districts.map((district, dIdx) => (
                    <div 
                      key={dIdx} 
                      className={cn(
                        "p-4 rounded-xl border transition-all cursor-default",
                        district.districtName === "NECTA EXTRA" 
                          ? "border-blue-100 bg-blue-50/30" 
                          : "border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md"
                      )}
                    >
                      <div className="flex justify-between items-center mb-3 border-b pb-2">
                        <h4 className="text-xs font-black text-slate-600 uppercase tracking-tight truncate">
                          {district.districtName}
                        </h4>
                        {district.districtName === "NECTA EXTRA" && (
                          <Badge className="bg-blue-100 text-blue-700 border-none text-[9px] font-bold">EXTRA</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(district.totals)
                          .filter(([field]) => {
                            const allowedFields = getExamFields(stationery.examination_code);
                            return allowedFields.includes(field);
                          })
                          .map(([field, value]) => (
                            <div key={field} className="flex flex-col p-2 bg-white rounded-lg border border-slate-100/80">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight truncate">
                                {getFieldLabels(field)}
                              </span>
                              <span className="text-sm font-black text-slate-800 mt-0.5">
                                {formatNumber(value)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default StationerySummaryPage;