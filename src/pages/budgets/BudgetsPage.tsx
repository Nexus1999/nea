"use client";

import React, { useState } from 'react';
import { Plus, MoreVertical, FileText, Map, CheckCircle2, Clock, AlertCircle, Search } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';

const MOCK_BUDGETS = [
  { id: '1', title: 'National Examination Transport 2024', year: 2024, type: 'TRANSPORT_EXAMS', status: 'Draft' },
  { id: '2', title: 'Primary School Stationery Supply', year: 2024, type: 'STATIONERY', status: 'Template Generated' },
  { id: '3', title: 'Regional Monitoring Phase 1', year: 2023, type: 'MONITORING', status: 'Implemented' },
];

const BudgetsPage = () => {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState(MOCK_BUDGETS);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newBudget, setNewBudget] = useState({ title: '', year: new Date().getFullYear(), type: 'TRANSPORT_EXAMS' });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Draft':
        return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200"><Clock className="w-3 h-3 mr-1" /> Draft</Badge>;
      case 'Template Generated':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><FileText className="w-3 h-3 mr-1" /> Template Generated</Badge>;
      case 'Implemented':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Implemented</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateBudget = () => {
    const budget = {
      id: Math.random().toString(36).substr(2, 9),
      ...newBudget,
      status: 'Draft'
    };
    setBudgets([budget, ...budgets]);
    setIsCreateModalOpen(false);
    navigate(`/dashboard/budgets/action-plan/${budget.id}`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Budgets</h1>
          <p className="text-slate-500 mt-1">Manage and track examination administration budgets.</p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input 
                  placeholder="e.g. National Exam Transport 2024" 
                  value={newBudget.title}
                  onChange={(e) => setNewBudget({...newBudget, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
                  <Input 
                    type="number" 
                    value={newBudget.year}
                    onChange={(e) => setNewBudget({...newBudget, year: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select 
                    value={newBudget.type} 
                    onValueChange={(value) => setNewBudget({...newBudget, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRANSPORT_EXAMS">Transport of Exams</SelectItem>
                      <SelectItem value="STATIONERY">Stationery</SelectItem>
                      <SelectItem value="MONITORING">Monitoring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateBudget} disabled={!newBudget.title}>Save Budget</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9 bg-white" placeholder="Search budgets..." />
          </div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead className="font-semibold">Title</TableHead>
              <TableHead className="font-semibold">Year</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <AlertCircle className="w-8 h-8 mb-2 text-slate-300" />
                    <p>No budgets found. Create one to get started.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              budgets.map((budget) => (
                <TableRow key={budget.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium text-slate-900">{budget.title}</TableCell>
                  <TableCell>{budget.year}</TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {budget.type.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(budget.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => navigate(`/dashboard/budgets/action-plan/${budget.id}`)}
                      >
                        <Map className="w-4 h-4 mr-1" /> Action Plan
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => navigate(`/dashboard/budgets/template/${budget.id}`)}
                      >
                        <FileText className="w-4 h-4 mr-1" /> Template
                      </Button>
                      <Button variant="ghost" size="icon" className="text-slate-400">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BudgetsPage;