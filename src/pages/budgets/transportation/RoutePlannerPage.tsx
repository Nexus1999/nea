"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, Save, Plus, Trash2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";

const RoutePlannerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<any>(null);

  useEffect(() => {
    const fetchBudget = async () => {
      try {
        const { data, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        setBudget(data);
      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchBudget();
  }, [id]);

  if (loading) return <div className="flex h-[400px] items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/budgets')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6 text-blue-600" />
              Route Planner
            </h1>
            <p className="text-sm text-muted-foreground">{budget?.title} ({budget?.year})</p>
          </div>
        </div>
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Save Routes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Active Routes</CardTitle>
            <Button variant="outline" size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add Route
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-xl bg-slate-50/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <Truck className="h-4 w-4" />
                    </div>
                    <span className="font-bold">Route 1: Northern Corridor</span>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground italic">
                  No regions assigned to this route yet. Drag regions from the sidebar to begin.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unassigned Regions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['Arusha', 'Kilimanjaro', 'Manyara', 'Tanga'].map(region => (
                <div key={region} className="p-3 border rounded-lg bg-white hover:border-blue-400 cursor-move transition-colors flex items-center justify-between">
                  <span className="text-sm font-medium">{region}</span>
                  <Badge variant="secondary">120 Boxes</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoutePlannerPage;