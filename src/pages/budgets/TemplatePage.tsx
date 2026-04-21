"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Printer,
  CheckCircle2,
  Lock,
  Plus,
  ChevronDown,
  ChevronRight,
  Edit,
  History,
  Calculator,
  Loader2,
  Truck,
  Shield,
  BadgeCheck,
  UserCheck,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { generateTemplate, appendChangeLog } from "@/utils/generateTemplate";
import { useAuth } from "@/providers/AuthProvider";
import Spinner from "@/components/Spinner";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  if (!n) return "—";
  return Number(n).toLocaleString("sw-TZ");
}

const ROLE_LABELS: Record<string, string> = {
  exam_officer: "Afisa Mitihani",
  police_officer: "Askari Polisi",
  security_officer: "Afisa Usalama",
  driver: "Dereva",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  exam_officer: <BadgeCheck className="h-3.5 w-3.5 text-indigo-500" />,
  police_officer: <Shield className="h-3.5 w-3.5 text-blue-500" />,
  security_officer: <UserCheck className="h-3.5 w-3.5 text-teal-500" />,
  driver: <Truck className="h-3.5 w-3.5 text-amber-500" />,
  loading: <Package className="h-3.5 w-3.5 text-slate-400" />,
};

// ─── Two-row merged table header ─────────────────────────────────────────────

function TemplateTableHeader() {
  const th =
    "bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-2 border border-slate-200 whitespace-nowrap";
  const thC = th + " text-center";
  const thR = th + " text-right";

  return (
    <thead>
      {/* Row 1 — group headers */}
      <tr>
        <th rowSpan={2} className={thC + " w-9"}>
          Na
        </th>
        <th rowSpan={2} className={th + " min-w-[170px] text-left"}>
          Muhusika
        </th>

        {/* Siku group — spans 2 sub-cols */}
        <th
          colSpan={2}
          className={thC + " border-b-0"}
          style={{ borderBottom: "none" }}
        >
          Siku
        </th>

        <th rowSpan={2} className={thR}>
          Posho
        </th>

        {/* Mafuta group — spans 3 sub-cols */}
        <th
          colSpan={3}
          className={thC + " border-b-0"}
          style={{ borderBottom: "none" }}
        >
          Mafuta
        </th>

        <th rowSpan={2} className={thR}>
          Upakuaji
        </th>
        <th rowSpan={2} className={thR}>
          Tahadhari
        </th>
        <th rowSpan={2} className={thR}>
          Nauli
        </th>
        <th rowSpan={2} className={thR + " min-w-[100px]"}>
          Jumla
        </th>
        <th rowSpan={2} className={th + " w-9"}></th>
      </tr>

      {/* Row 2 — sub-column headers */}
      <tr>
        {/* Siku sub-cols */}
        <th className={thC}>Siku</th>
        <th className={thC}>Transit</th>
        {/* Mafuta sub-cols */}
        <th className={thR}>Km</th>
        <th className={thR}>Lita</th>
        <th className={thR}>Kiasi</th>
      </tr>
    </thead>
  );
}

// ─── Individual data row ──────────────────────────────────────────────────────

interface RowProps {
  item: any;
  rowNum: number;
  locked: boolean;
  onEdit: (item: any) => void;
}

function TemplateRow({ item, rowNum, locked, onEdit }: RowProps) {
  const isDriver = item.role === "driver";
  const isExam = item.role === "exam_officer";

  const td = "px-3 py-2 border border-slate-200 text-xs align-middle";
  const tdR = td + " text-right";
  const tdC = td + " text-center";
  const dim = " text-slate-400";

  return (
    <tr className="hover:bg-slate-50/50 group">
      {/* Na */}
      <td className={tdC + dim}>{rowNum}</td>

      {/* Muhusika */}
      <td className={td}>
        <div className="flex items-center gap-2">
          <span className="shrink-0">{ROLE_ICONS[item.role]}</span>
          <div>
            <div className="font-medium text-slate-800">
              {ROLE_LABELS[item.role] || item.role}
            </div>
            {item.region_name && (
              <div className="text-[10px] text-slate-400">{item.region_name}</div>
            )}
            {isDriver && item.vehicle_label && (
              <div className="text-[10px] text-slate-400">
                {item.vehicle_label}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Siku */}
      <td className={tdC}>{item.days || "—"}</td>
      {/* Transit */}
      <td className={tdC + dim}>{item.transit_days || "—"}</td>

      {/* Posho */}
      <td className={tdR}>{item.posho ? fmt(item.posho) : "—"}</td>

      {/* Mafuta: Km */}
      <td className={tdR + dim}>{item.distance_km ? fmt(item.distance_km) : "—"}</td>
      {/* Mafuta: Lita */}
      <td className={tdR + dim}>{item.fuel_liters ? fmt(item.fuel_liters) : "—"}</td>
      {/* Mafuta: Kiasi */}
      <td className={tdR}>{item.fuel_cost ? fmt(item.fuel_cost) : "—"}</td>

      {/* Upakuaji — only on exam officer row */}
      <td className={tdR}>
        {isExam && item.unloading_cash ? fmt(item.unloading_cash) : "—"}
      </td>

      {/* Tahadhari — only on driver rows */}
      <td className={tdR}>
        {isDriver && item.emergency_allowance
          ? fmt(item.emergency_allowance)
          : "—"}
      </td>

      {/* Nauli — only on exam officer */}
      <td className={tdR}>
        {isExam && item.fare_return ? fmt(item.fare_return) : "—"}
      </td>

      {/* Jumla */}
      <td className={tdR + " font-semibold text-slate-900"}>
        {fmt(item.total_cost)}
      </td>

      {/* Edit */}
      <td className={td + " text-center"}>
        {!locked && (
          <button
            onClick={() => onEdit(item)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200"
          >
            <Edit className="h-3 w-3 text-slate-500" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Route group ──────────────────────────────────────────────────────────────

interface RouteGroupProps {
  route: any;
  items: any[];
  total: number;
  locked: boolean;
  startRowNum: number;
  onEdit: (item: any) => void;
}

function RouteGroup({
  route,
  items,
  total,
  locked,
  startRowNum,
  onEdit,
}: RouteGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Sub-totals for the route subtotal row
  const sums = useMemo(
    () =>
      items.reduce(
        (acc, i) => ({
          posho:
            acc.posho +
            (i.posho || 0) * ((i.days || 0) + (i.transit_days || 0)),
          kiasi: acc.kiasi + (i.fuel_cost || 0),
          upakuaji: acc.upakuaji + (i.unloading_cash || 0),
          tahadhari: acc.tahadhari + (i.emergency_allowance || 0),
          nauli: acc.nauli + (i.fare_return || 0),
        }),
        { posho: 0, kiasi: 0, upakuaji: 0, tahadhari: 0, nauli: 0 }
      ),
    [items]
  );

  const tdBase =
    "px-3 py-2 border border-slate-200 text-xs align-middle";
  const tdR = tdBase + " text-right font-semibold text-slate-700";

  return (
    <>
      {/* Route header row */}
      <tr
        className="cursor-pointer bg-slate-100/70 hover:bg-slate-100"
        onClick={() => setCollapsed((c) => !c)}
      >
        <td className={tdBase + " text-center text-slate-400"}>
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 inline" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 inline" />
          )}
        </td>
        <td
          colSpan={11}
          className={
            tdBase +
            " font-bold text-[11px] uppercase tracking-wider text-slate-600"
          }
        >
          Msafara: {route.name || route.id}
        </td>
        <td className={tdR}>TZS {fmt(total)}</td>
        <td className={tdBase}></td>
      </tr>

      {/* Item rows */}
      {!collapsed &&
        items.map((item, idx) => (
          <TemplateRow
            key={item.id}
            item={item}
            rowNum={startRowNum + idx}
            locked={locked}
            onEdit={onEdit}
          />
        ))}

      {/* Route subtotal */}
      {!collapsed && (
        <tr className="bg-indigo-50/60">
          <td className={tdBase}></td>
          <td
            className={
              tdBase +
              " text-[10px] font-bold uppercase tracking-wider text-indigo-600"
            }
          >
            Jumla – {route.name || route.id}
          </td>
          <td colSpan={2} className={tdBase}></td>
          <td className={tdR}>{fmt(sums.posho)}</td>
          <td colSpan={2} className={tdBase}></td>
          <td className={tdR}>{fmt(sums.kiasi)}</td>
          <td className={tdR}>{fmt(sums.upakuaji)}</td>
          <td className={tdR}>{fmt(sums.tahadhari)}</td>
          <td className={tdR}>{fmt(sums.nauli)}</td>
          <td className={tdR + " text-indigo-700"}>TZS {fmt(total)}</td>
          <td className={tdBase}></td>
        </tr>
      )}
    </>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function TotalCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        highlight
          ? "bg-slate-900 border-slate-900 text-white"
          : "bg-white border-slate-200"
      }`}
    >
      <div
        className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${
          highlight ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {label}
      </div>
      <div className="text-sm font-bold">TZS {fmt(value)}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TemplatePage = () => {
  const { id: budgetId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const userId = session?.user?.id || "";
  const userEmail = session?.user?.email || "";

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [budget, setBudget] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [version, setVersion] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [allVersions, setAllVersions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [routeMap, setRouteMap] = useState<Map<string, any>>(new Map());
  const [editItem, setEditItem] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: budgetData } = await supabase
        .from("budgets")
        .select("*")
        .eq("id", budgetId)
        .single();
      setBudget(budgetData);

      const { data: templateData } = await supabase
        .from("transportation_templates")
        .select("*")
        .eq("budget_id", budgetId)
        .maybeSingle();
      setTemplate(templateData);

      if (templateData) {
        const { data: versions } = await supabase
          .from("transportation_template_versions")
          .select("*")
          .eq("template_id", templateData.id)
          .order("version_num", { ascending: false });
        setAllVersions(versions || []);
        const current = (versions || []).find((v: any) => v.is_current);
        setVersion(current || null);

        if (current) {
          const { data: items } = await supabase
            .from("transportation_template_line_items")
            .select("*")
            .eq("template_version_id", current.id)
            .order("created_at", { ascending: true });
          setLineItems(items || []);

          const routeIds = [
            ...new Set((items || []).map((i: any) => i.route_id)),
          ];
          const { data: routes } = await supabase
            .from("transportation_routes")
            .select("*")
            .in("id", routeIds);
          setRouteMap(new Map((routes || []).map((r: any) => [r.id, r])));
        }
      }
    } catch {
      showError("Imeshindwa kupakia template");
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group items by route, preserving insertion order
  const routeGroups = useMemo(() => {
    const order: string[] = [];
    const groups = new Map<string, any[]>();
    lineItems.forEach((item) => {
      if (!groups.has(item.route_id)) {
        order.push(item.route_id);
        groups.set(item.route_id, []);
      }
      groups.get(item.route_id)!.push(item);
    });
    return order.map((routeId) => {
      const items = groups.get(routeId)!;
      return {
        route: routeMap.get(routeId) || { id: routeId, name: "Unknown Route" },
        items,
        total: items.reduce((s, i) => s + (i.total_cost || 0), 0),
      };
    });
  }, [lineItems, routeMap]);

  // Running row number that resets across groups
  const groupsWithRowStart = useMemo(() => {
    let cursor = 1;
    return routeGroups.map((g) => {
      const start = cursor;
      cursor += g.items.length;
      return { ...g, startRowNum: start };
    });
  }, [routeGroups]);

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await generateTemplate({
      budgetId: budgetId!,
      currentVersionNum: version?.version_num || 0,
      currentTemplateId: template?.id,
      userId,
      userEmail,
    });
    if (res.success) {
      showSuccess("Template imezalishwa upya!");
      fetchData();
    } else {
      showError(res.error || "Imeshindwa kuzalisha template");
    }
    setGenerating(false);
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" label="Inapakia template..." />
      </div>
    );

  if (!template || !version) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center gap-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <Calculator className="w-16 h-16 text-indigo-600" />
        <div className="text-center">
          <h2 className="text-2xl font-bold">Hakuna Template</h2>
          <p className="text-slate-500 text-sm">
            Zindua template ya kifedha kulingana na Mpango wa Utekelezaji.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl"
        >
          {generating ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Plus className="w-5 h-5 mr-2" />
          )}
          Zindua Template
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center">
            <Calculator className="text-white w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              v{version.version_num}
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span
                className={
                  version.locked ? "text-red-500" : "text-emerald-500"
                }
              >
                {version.locked ? "IMEFUNGWA" : "RASIMU"}
              </span>
            </div>
            <h1 className="text-lg font-bold">{budget?.title}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-4 h-4 mr-2" /> Historia
          </Button>
          {!version.locked && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${generating ? "animate-spin" : ""}`}
              />
              Sasisha
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" /> Chapisha
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <TotalCard label="Jumla Kuu" value={version.grand_total} highlight />
        <TotalCard label="Wafanyakazi" value={version.total_personnel} />
        <TotalCard label="Mafuta" value={version.total_fuel} />
        <TotalCard label="Upakuaji" value={version.total_upakiaji} />
        <TotalCard label="Tahadhari" value={version.total_tahadhari} />
        <TotalCard label="Nauli" value={version.total_nauli} />
      </div>

      {/* Main table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full border-collapse">
          <TemplateTableHeader />
          <tbody>
            {groupsWithRowStart.map((group) => (
              <RouteGroup
                key={group.route.id}
                route={group.route}
                items={group.items}
                total={group.total}
                locked={version.locked}
                startRowNum={group.startRowNum}
                onEdit={setEditItem}
              />
            ))}

            {/* Grand total row */}
            <tr className="bg-slate-900 text-white">
              <td className="px-3 py-3 border border-slate-700 text-center text-xs">
              </td>
              <td className="px-3 py-3 border border-slate-700 text-[11px] font-bold uppercase tracking-wider">
                Jumla Kuu
              </td>
              <td
                colSpan={2}
                className="px-3 py-3 border border-slate-700"
              ></td>
              <td className="px-3 py-3 border border-slate-700 text-right text-xs font-bold">
                {fmt(version.total_personnel)}
              </td>
              <td
                colSpan={2}
                className="px-3 py-3 border border-slate-700"
              ></td>
              <td className="px-3 py-3 border border-slate-700 text-right text-xs font-bold">
                {fmt(version.total_fuel)}
              </td>
              <td className="px-3 py-3 border border-slate-700 text-right text-xs font-bold">
                {fmt(version.total_upakiaji)}
              </td>
              <td className="px-3 py-3 border border-slate-700 text-right text-xs font-bold">
                {fmt(version.total_tahadhari)}
              </td>
              <td className="px-3 py-3 border border-slate-700 text-right text-xs font-bold">
                {fmt(version.total_nauli)}
              </td>
              <td className="px-3 py-3 border border-slate-700 text-right text-sm font-bold">
                TZS {fmt(version.grand_total)}
              </td>
              <td className="px-3 py-3 border border-slate-700"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Submit button */}
      <div className="flex justify-center pt-8">
        <Button
          size="lg"
          disabled={version.locked}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 rounded-2xl shadow-xl font-bold h-14"
          onClick={() => {
            showSuccess("Bajeti imekamilishwa!");
            navigate("/dashboard/budgets");
          }}
        >
          <CheckCircle2 className="w-5 h-5 mr-2" /> Kamilisha na Wasilisha
        </Button>
      </div>
    </div>
  );
};

export default TemplatePage;