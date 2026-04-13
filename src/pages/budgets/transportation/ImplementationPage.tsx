"use client";

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const ImplementationPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/budgets')} className="rounded-full">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Budget Implementation</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tracking execution for Budget #{id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-indigo-600 text-white">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Execution Status</p>
            <h3 className="text-2xl font-black">IN PROGRESS</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Routes</p>
            <h3 className="text-2xl font-black">12 / 15</h3>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Funds Disbursed</p>
            <h3 className="text-2xl font-black">85%</h3>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-black uppercase tracking-tight">Route Execution Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-2xl hover:border-indigo-200 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Truck className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Route Alpha-{i}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Last updated: 2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100">COMPLETED</Badge>
                  <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest">Details</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImplementationPage;