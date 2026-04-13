"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Trash2, 
  ArrowUpDown, 
  FileText, 
  Map, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Search
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
import AddBudgetForm, { BudgetFormValues } from "@/components/budgets/AddBudgetForm";
import { cn } from "@/lib/utils";
import { showSuccess } from "@/utils/toast";

const MOCK_BUDGETS = [
  { id: '1', title: 'National Examination Transport 2024', year: 2024, type: 'TRANSPORT_EXAMS', status: 'Draft', created_at: new Date().toISOString() },
  { id: '2', title: 'Primary School Stationery Supply', year: 2024, type: 'STATIONERY', status: 'Template Generated', created_at: new Date().toISOString() },
  { id: '3', title: 'Regional Monitoring Phase 1', year: 2023, type: 'MONITORING', status: 'Implemented', created_at: new Date().toISOString() },
];

const BudgetsPage = () => {
  const [budgets, setBudgets] = useState(MOCK_BUDGETS);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<string>('year');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [deleteConfig, setDeleteConfig] = useState<{
    open: boolean;
    id: string | null;
    title: string;
  }>({
    open: false,
    id: null,
    title: '',
  });

  useEffect(() => {
    document.title = "Budgets | NEAS";
  }, []);

  const handleAddBudget = (values: BudgetFormValues) => {
    const newBudget = {
      id: Math.random().toString(36).substr(2, 9),
      ...values,
      status: 'Draft',
      created_at: new Date().toISOString()
    };
    setBudgets([newBudget, ...budgets]);
    showSuccess("Budget created successfully");
    setIsFormOpen(false);
  };

  const handleSort = (columnId: string) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
    setCurrentPage(1);
  };

  const filteredAndSortedBudgets = useMemo(() => {
    let list = [...budgets];
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(b =>
        b.title.toLowerCase().includes(term) ||
        b.type.toLowerCase().includes(term) ||
        String(b.year).includes(term)
      );
    }
    list.sort((a: any, b: any) => {
      const aVal = a[orderBy];
      const bVal = b[orderBy];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    return list;
  }, [budgets, search, orderBy, order]);

  const totalPages = Math.ceil(filteredAndSortedBudgets.length / itemsPerPage);
  const currentItems = filteredAndSortedBudgets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 gap-1"><Clock className="w-3 h-3" /> Draft</Badge>;
      case 'Template Generated':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1"><FileText className="w-3 h-3" /> Template Generated</Badge>;
      case 'Implemented':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1"><CheckCircle2 className="w-3 h-3" /> Implemented</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const confirmDelete = () => {
    setBudgets(budgets.filter(b => b.id !== deleteConfig.id));
    setDeleteConfig({ open: false, id: null, title: '' });
    showSuccess("Budget deleted successfully");
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
        <Button size="sm" className="h-8 gap-1" onClick={() => setIsFormOpen(true)} disabled={loading}>
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
                    Title
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'title' ? 'opacity-100' : 'opacity-50')} />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('year')} className="px-0 hover:bg-transparent">
                    Year
                    <ArrowUpDown className={cn("ml-2 h-4 w-4", orderBy === 'year' ? 'opacity-100' : 'opacity-50')} />
                  </Button>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No budgets found.
                  </TableCell>
                </TableRow>
              ) : (
                currentItems.map(budget => (
                  <TableRow key={budget.id}>
                    <TableCell className="font-medium">{budget.title}</TableCell>
                    <TableCell>{budget.year}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground uppercase">
                        {budget.type.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(budget.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          title="Action Plan"
                          onClick={() => navigate(`/dashboard/budgets/action-plan/${budget.id}`)}
                        >
                          <Map className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Template"
                          onClick={() => navigate(`/dashboard/budgets/template/${budget.id}`)}
                        >
                          <FileText className="h-4 w-4" />
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
          <div className="mt-4">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </CardContent>

      <AddBudgetForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={handleAddBudget}
      />

      <AlertDialog
        open={deleteConfig.open}
        onOpenChange={(open) => setDeleteConfig(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent className="max-w-[420px]">
          <AlertDialogHeader>
            <div className="flex flex-col items-center text-center mb-2">
               <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">
                Confirm Deletion
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-center">
              Are you sure you want to delete the budget: <br/>
              <span className="font-semibold text-foreground">"{deleteConfig.title}"</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex items-center gap-2 mt-4">
            <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default BudgetsPage;