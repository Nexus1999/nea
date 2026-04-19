"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Trash2, 
  ArrowUpDown, 
  AlertTriangle,
  Search,
  RefreshCw,
  LayoutDashboard,
  Eye,
  FileText,
  ClipboardList
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
import { useNavigate } from 'react-router-dom';
import Spinner from "@/components/Spinner";
import PaginationControls from "@/components/ui/pagination-controls";
import AddBudgetDrawer from "@/components/budgets/AddBudgetDrawer";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const BudgetsPage = () => {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<string>('created_at');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [deleteConfig, setDeleteConfig] = useState<{
    open: boolean;
    id: string | number | null;
    title: string;
  }>({
    open: false,
    id: null,
    title: '',
  });

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .order(orderBy, { ascending: order === 'asc' });

      if (error) throw error;
      setBudgets(data || []);
    } catch (err: any) {
      showError(err.message || "Failed to fetch budgets");
    } finally {
      setLoading(false);
    }
  }, [orderBy, order]);

  useEffect(() => {
    document.title = "Budgets | NEAS";
    fetchBudgets();
  }, [fetchBudgets]);

  const handleSort = (columnId: string) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
    setCurrentPage(1);
  };

  const filteredBudgets = useMemo(() => {
    if (!search.trim()) return budgets;
    const term = search.toLowerCase();
    return budgets.filter(b =>
      b.title.toLowerCase().includes(term) ||
      b.type.toLowerCase().includes(term) ||
      String(b.year).includes(term)
    );
  }, [budgets, search]);

  const totalPages = Math.ceil(filteredBudgets.length / itemsPerPage);
  const currentItems = filteredBudgets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-medium px-2 py-0 h-5">DRAFT</Badge>;
      case 'IMPLEMENTED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-medium px-2 py-0 h-5">IMPLEMENTED</Badge>;
      default:
        return <Badge variant="outline" className="font-medium px-2 py-0 h-5">{status}</Badge>;
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfig.id) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', deleteConfig.id);

      if (error) throw error;
      
      showSuccess("Budget deleted successfully");
      fetchBudgets();
    } catch (err: any) {
      showError(err.message || "Failed to delete budget");
    } finally {
      setLoading(false);
      setDeleteConfig({ open: false, id: null, title: '' });
    }
  };

  return (
    <Card className="relative min-h-[600px]">
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-lg">
          <Spinner label="Loading budgets..." size="lg" />
        </div>
      )}

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Budgets</CardTitle>
        <Button size="sm" className="h-8 gap-1" onClick={() => setIsDrawerOpen(true)} disabled={loading}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Create Budget</span>
        </Button>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search budgets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-sm"
            disabled={loading}
          />
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('title')} className="px-0 hover:bg-transparent">
                    Budget Title
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'title' ? 'opacity-100' : 'opacity-50')} />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('year')} className="px-0 hover:bg-transparent">
                    Year
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'year' ? 'opacity-100' : 'opacity-50')} />
                  </Button>
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No budget records found.
                  </TableCell>
                </TableRow>
              ) : (
                currentItems.map(budget => (
                  <TableRow key={budget.id}>
                    <TableCell className="font-medium">{budget.title}</TableCell>
                    <TableCell>{budget.year}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                        {budget.type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(budget.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(budget.created_at), 'PPP')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          title="Action Plan"
                          onClick={() => navigate(`/dashboard/budgets/action-plan/${budget.id}`)}
                        >
                          <ClipboardList className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="View Overview"
                          onClick={() => navigate(`/dashboard/budgets/overview/${budget.id}`)}
                        >
                          <LayoutDashboard className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="View Details"
                          onClick={() => navigate(`/dashboard/budgets/template/${budget.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-red-700 hover:bg-red-50"
                          title="Delete"
                          onClick={() => setDeleteConfig({ open: true, id: budget.id, title: budget.title })}
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

        {!loading && totalPages > 1 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </CardContent>

      <AddBudgetDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={fetchBudgets}
      />

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
              Are you sure you want to delete the budget plan{" "}
              <span className="font-bold text-red-700">
                "{deleteConfig.title}"
              </span>
              ? This action cannot be undone.
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

export default BudgetsPage;