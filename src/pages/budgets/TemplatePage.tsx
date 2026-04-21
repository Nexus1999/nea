"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Printer,
  CheckCircle2,
  Lock,
  Unlock,
  Plus,
  ChevronDown,
  ChevronRight,
  Edit,
  History,
  Calculator,
  AlertTriangle,
  X,
  Save,
  Loader2,
  Truck,
  Shield,
  BadgeCheck,
  UserCheck,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { generateTemplate, appendChangeLog } from "@/utils/generateTemplate";
import { useAuth } from "@/providers/AuthProvider";
import Spinner from "@/components/Spinner";

const ROLE_LABELS: Record<string, string> = {
  exam_officer: "Afisa Mitihani",
  police_officer: "Askari Polisi",
  security_officer: "Afisa Usalama",
  driver: "Dereva",
  loading: "Upakiaji (Vibarua)",
  padlock: "Padlocks & Seals",
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  exam_officer: <BadgeCheck className="h-3.5 w-3.5" />,
  police_officer: <Shield className="h-3.5 w-3.5" />,
  security_officer: <UserCheck className="h-3.5 w-3.5" />,
  driver: <Truck className="h-3.5 w-3.5" />,
  loading: <Package className="h-3.5 w-3.5" />,
  padlock: <Lock className="h-3.5 w-3.5" />,
};

function fmt(n: number) {
  return (n || 0).toLocaleString("sw-TZ");
}

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
  const [collapsedRoutes, setCollapsedRoutes] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: budgetData } = await supabase.from("budgets").select("*").eq("id", budgetId).single();
      setBudget(budgetData);

      const { data: templateData } = await supabase.from("transportation_templates").select("*").eq("budget_id", budgetId).maybeSingle();
      setTemplate(templateData);

      if (templateData) {
        const { data: versions } = await supabase.from("transportation_template_versions").select("*").eq("template_id", templateData.id).order("version_num", { ascending: false });
        setAllVersions(versions || []);
        const current = (versions || []).find((v: any) => v.is_current);
        setVersion(current || null);

        if (current) {
          const { data: items } = await supabase.from("transportation_template_line_items").select("*").eq("template_version_id", current.id).order("created_at", { ascending: true });
          setLineItems(items || []);
          
          const routeIds = [...new Set((items || []).map(i => i.route_id))];
          const { data: routes } = await supabase.from("transportation_routes").select("*").in("id", routeIds);
          setRouteMap(new Map((routes || []).map(r => [r.id, r])));
        }
      }
    } catch (err) {
      showError("Imeshindwa kupakia template");
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const routeGroups = useMemo(() => {
    const groups = new Map<string, any[]>();
    lineItems.forEach(item => {
      const arr = groups.get(item.route_id) || [];
      arr.push(item);
      groups.set(item.route_id, arr);
    });
    return Array.from(groups.entries()).map(([routeId, items]) => ({
      route: routeMap.get(routeId) || { name: "Unknown Route" },
      items,
      total: items.reduce((sum, i) => sum + i.total_cost, 0)
    }));
  }, [lineItems, routeMap]);

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await generateTemplate({ budgetId: budgetId!, currentVersionNum: version?.version_num || 0, currentTemplateId: template?.id, userId, userEmail });
    if (res.success) { showSuccess("Template imezalishwa upya!"); fetchData(); }
    else showError(res.error || "Imeshindwa kuzalisha template");
    setGenerating(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" label="Inapakia template..." /></div>;

  if (!template || !version) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center gap-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <Calculator className="w-16 h-16 text-indigo-600" />
        <div className="text-center"><h2 className="text-2xl font-bold">Hakuna Template</h2><p className="text-slate-500 text-sm">Zindua template ya kifedha kulingana na Mpango wa Utekelezaji.</p></div>
        <Button onClick={handleGenerate} disabled={generating} className="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl">
          {generating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />} Zindua Template
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center"><Calculator className="text-white w-5 h-5" /></div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              v{version.version_num} <span className="w-1 h-1 bg-slate-300 rounded-full" /> 
              <span className={version.locked ? "text-red-500" : "text-emerald-500"}>{version.locked ? "IMEFUNGWA" : "RASIMU"}</span>
            </div>
            <h1 className="text-lg font-bold">{budget?.title}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}><History className="w-4 h-4 mr-2" /> Historia</Button>
          {!version.locked && <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}><RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} /> Sasisha</Button>}
          <Button variant="outline" size="sm"><Printer className="w-4 h-4 mr-2" /> Chapisha</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <TotalCard label="Jumla Kuu" value={version.grand_total} highlight />
        <TotalCard label="Wafanyakazi" value={version.total_personnel} />
        <TotalCard label="Mafuta" value={version.total_fuel} />
        <TotalCard label="Upakuaji" value={version.total_upakiaji} />
        <TotalCard label="Tahadhari" value={version.total_tahadhari} />
        <TotalCard label="Nauli" value={version.total_nauli} />
        <TotalCard label="Uendeshaji" value={version.total_operational} />
      </div>

      <Card className="overflow-hidden border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="text-[10px] uppercase font-bold">Muhusika</TableHead>
              <TableHead className="text-center text-[10px] uppercase font-bold">Idadi</TableHead>
              <TableHead className="text-center text-[10px] uppercase font-bold">Siku</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold">Posho</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold">Mafuta</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold">Upakuaji</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold">Tahadhari</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold">Nauli</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold">Jumla</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routeGroups.map(group => (
              <React.Fragment key={group.route.id}>
                <TableRow className="bg-slate-50/50 cursor-pointer" onClick={() => {
                  const next = new Set(collapsedRoutes);
                  if (next.has(group.route.id)) next.delete(group.route.id); else next.add(group.route.id);
                  setCollapsedRoutes(next);
                }}>
                  <TableCell>{collapsedRoutes.has(group.route.id) ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</TableCell>
                  <TableCell colSpan={8} className="font-bold text-xs uppercase tracking-wider">Msafara: {group.route.name}</TableCell>
                  <TableCell className="text-right font-bold text-xs">TZS {fmt(group.total)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
                {!collapsedRoutes.has(group.route.id) && group.items.map(item => (
                  <TableRow key={item.id} className="hover:bg-slate-50/30 group">
                    <TableCell></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{ROLE_ICONS[item.role]}</span>
                        <div>
                          <div className="text-xs font-medium">{ROLE_LABELS[item.role] || item.role}</div>
                          {item.region_name && <div className="text-[10px] text-slate-400">{item.region_name}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs">{item.quantity || item.item_quantity || "—"}</TableCell>
                    <TableCell className="text-center text-xs">{item.days ? `${item.days}d` : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{item.posho ? fmt(item.posho) : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{item.fuel_cost ? fmt(item.fuel_cost) : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{item.unloading_cash || item.role === 'loading' ? fmt(item.role === 'loading' ? item.operational_total : item.unloading_cash) : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{item.emergency_allowance || item.role === 'padlock' ? fmt(item.role === 'padlock' ? item.operational_total : item.emergency_allowance) : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{item.fare_return ? fmt(item.fare_return) : "—"}</TableCell>
                    <TableCell className="text-right text-xs font-bold">TZS {fmt(item.total_cost)}</TableCell>
                    <TableCell>
                      {!version.locked && <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => setEditItem(item)}><Edit className="h-3 w-3" /></Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex justify-center pt-8">
        <Button size="lg" disabled={version.locked} className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 rounded-2xl shadow-xl font-bold h-14" onClick={() => { showSuccess("Bajeti imekamilishwa!"); navigate("/dashboard/budgets"); }}>
          <CheckCircle2 className="w-5 h-5 mr-2" /> Kamilisha na Wasilisha
        </Button>
      </div>
    </div>
  );
};

function TotalCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200'}`}>
      <div className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${highlight ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
      <div className="text-sm font-bold">TZS {fmt(value)}</div>
    </div>
  );
}

export default TemplatePage;