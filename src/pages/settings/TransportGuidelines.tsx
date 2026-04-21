"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { 
  PlusCircle, 
  Trash2, 
  Edit2, 
  MapPinned, 
  ArrowUpDown,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import TransportGuidelineForm from "@/components/settings/TransportGuidelineForm";

const TransportGuidelines = () => {
  const [guidelines, setGuidelines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<string>("created_at");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedGuideline, setSelectedGuideline] = useState<any>(null);

  const [deleteConfig, setDeleteConfig] = useState<{
    open: boolean;
    id: number | null;
    title: string;
  }>({
    open: false,
    id: null,
    title: "",
  });

  const fetchGuidelines = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transportation_days_guideline")
        .select(`
          *,
          regions (region_name)
        `)
        .order(orderBy, { ascending: order === "asc" });

      if (error) throw error;
      setGuidelines(data || []);
    } catch (err: any) {
      showError(err.message || "Failed to fetch guidelines");
    } finally {
      setLoading(false);
    }
  }, [orderBy, order]);

  useEffect(() => {
    fetchGuidelines();
  }, [fetchGuidelines]);

  const handleSort = (columnId: string) => {
    const isAsc = orderBy === columnId && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(columnId);
  };

  const filteredGuidelines = useMemo(() => {
    if (!search.trim()) return guidelines;
    const term = search.toLowerCase();
    return guidelines.filter((g) =>
      g.regions?.region_name?.toLowerCase().includes(term) ||
      (g.via || "").toLowerCase().includes(term)
    );
  }, [guidelines, search]);

  const openEdit = (guideline: any) => {
    setSelectedGuideline(guideline);
    setIsFormOpen(true);
  };

  const openDelete = (id: number, title: string) => {
    setDeleteConfig({
      open: true,
      id,
      title,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfig.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("transportation_days_guideline")
        .delete()
        .eq("id", deleteConfig.id);

      if (error) throw error;

      showSuccess("Guideline deleted successfully");
      fetchGuidelines();
    } catch (err: any) {
      showError(err.message || "Failed to delete guideline");
    } finally {
      setLoading(false);
      setDeleteConfig({ open: false, id: null, title: "" });
    }
  };

  const getViaText = (via: string | null) => {
    return via ? via : "Direct Route";
  };

  return (
    <Card className="relative min-h-[600px]">
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-lg">
          <Spinner label="Loading guidelines..." size="lg" />
        </div>
      )}

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
            <MapPinned className="w-5 h-5" />
          </div>
          Transport Guidelines
        </CardTitle>

        <Button 
          size="sm" 
          className="h-8 gap-1" 
          onClick={() => {
            setSelectedGuideline(null);
            setIsFormOpen(true);
          }}
          disabled={loading}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Add Guideline
        </Button>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search regions or via..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
            disabled={loading}
          />
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              {/* GROUPED HEADER ROW 1 */}
              <TableRow>
                <TableHead className="w-[60px]">S/N</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort("regions.region_name")} 
                    className="px-0 hover:bg-transparent"
                  >
                    Region
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === "regions.region_name" ? "opacity-100" : "opacity-50")} />
                  </Button>
                </TableHead>
                <TableHead>Via</TableHead>

                {/* Examination Documents - spans 2 columns */}
                <TableHead colSpan={2} className="text-center border-r border-slate-200 bg-slate-50 font-semibold">
                  Examination Documents
                </TableHead>

                {/* Non Examination Documents - spans 2 columns */}
                <TableHead colSpan={2} className="text-center font-semibold">
                  Non Examination Documents
                </TableHead>

                <TableHead className="text-right">Actions</TableHead>
              </TableRow>

              {/* GROUPED HEADER ROW 2 - Subcolumns */}
              <TableRow>
                <TableHead className="border-t-0 h-8"></TableHead>
                <TableHead className="border-t-0 h-8"></TableHead>
                <TableHead className="border-t-0 h-8"></TableHead>

                {/* Examination subcolumns */}
                <TableHead className="text-xs font-medium text-center border-r border-slate-200 bg-slate-50">
                  Gari Ndogo
                </TableHead>
                <TableHead className="text-xs font-medium text-center border-r border-slate-200 bg-slate-50">
                  Lori
                </TableHead>

                {/* Non-Examination subcolumns */}
                <TableHead className="text-xs font-medium text-center">
                  Gari Ndogo
                </TableHead>
                <TableHead className="text-xs font-medium text-center">
                  Lori
                </TableHead>

                <TableHead className="border-t-0 h-8"></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredGuidelines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No guidelines found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredGuidelines.map((g, index) => (
                  <TableRow key={g.id} className="hover:bg-slate-50">
                    <TableCell className="text-xs font-medium text-slate-400">
                      {index + 1}
                    </TableCell>

                    <TableCell className="font-medium">
                      {g.regions?.region_name || "—"}
                    </TableCell>

                    <TableCell className="text-slate-600">
                      {getViaText(g.via)}
                    </TableCell>

                    {/* Examination Documents - Gari Ndogo (Light) */}
                    <TableCell className="border-r border-slate-200">
                      <div className="text-sm">
                        <div className="font-medium">{g.days_light || 0} days</div>
                        <div className="text-xs text-slate-500">
                          P:{g.police_light || 0} • S:{g.security_light || 0} • E:{g.exam_officers_light || 0}
                        </div>
                      </div>
                    </TableCell>

                    {/* Examination Documents - Lori (Truck) */}
                    <TableCell className="border-r border-slate-200">
                      <div className="text-sm">
                        <div className="font-medium">{g.days_truck || 0} days</div>
                        <div className="text-xs text-slate-500">
                          P:{g.police_truck || 0} • S:{g.security_truck || 0} • E:{g.exam_officers_truck || 0}
                        </div>
                      </div>
                    </TableCell>

                    {/* Non Examination Documents - Gari Ndogo (Light) */}
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{g.days_light || 0} days</div>
                        <div className="text-xs text-slate-500">
                          P:{g.police_light || 0} • S:{g.security_light || 0}
                        </div>
                      </div>
                    </TableCell>

                    {/* Non Examination Documents - Lori (Truck) */}
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{g.days_truck || 0} days</div>
                        <div className="text-xs text-slate-500">
                          P:{g.police_truck || 0} • S:{g.security_truck || 0}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          onClick={() => openEdit(g)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-red-700 hover:bg-red-50"
                          onClick={() => openDelete(g.id, g.regions?.region_name || "Unknown Region")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Form Drawer */}
      <TransportGuidelineForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        guideline={selectedGuideline}
        onSuccess={fetchGuidelines}
      />

      {/* Delete Confirmation Dialog - exact same style as BudgetsPage */}
      <AlertDialog
        open={deleteConfig.open}
        onOpenChange={(open) => setDeleteConfig(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent className="max-w-[420px] rounded-2xl border border-slate-200 shadow-2xl p-6">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <AlertDialogTitle className="font-black text-xl uppercase tracking-tight text-slate-900">
                Are you sure?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-slate-700 text-center font-medium leading-relaxed mt-3">
              Are you sure you want to delete the guideline for{" "}
              <span className="font-bold text-red-700">"{deleteConfig.title}"</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-row items-center gap-3 mt-8">
            <AlertDialogCancel className="flex-1 h-11 font-bold uppercase text-xs tracking-wider rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loading}
              className="flex-[1.5] h-11 font-black uppercase text-xs tracking-wider rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                "Yes, Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default TransportGuidelines;