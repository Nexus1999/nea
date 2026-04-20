"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PlusCircle,
  Truck,
  Trash2,
  Edit,
  ArrowUpDown
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { showStyledSwal } from '@/utils/alerts';
import Spinner from "@/components/Spinner";

const ActionPlanPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<string>('name');
  const [order, setOrder] = useState<'desc' | 'asc'>('asc');

  const fetchPlanData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', id)
        .single();
      setBudget(budgetData);

      const { data: routesData } = await supabase
        .from('transportation_routes')
        .select(`
          *,
          transportation_route_vehicles (*),
          transportation_route_stops (*)
        `)
        .eq('budget_id', id)
        .order('created_at', { ascending: true });

      setRoutes(routesData || []);
    } catch (err: any) {
      showError("Failed to load action plan");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPlanData();
  }, [fetchPlanData]);

  const handleDeleteRoute = async (routeId: string, routeName: string) => {
    showStyledSwal({
      title: 'Confirm Deletion',
      html: `Delete route <b>${routeName}</b>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      confirmButtonColor: '#d32f2f',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await supabase.from('transportation_routes').delete().eq('id', routeId);
          showSuccess("Route deleted successfully");
          fetchPlanData();
        } catch (err: any) {
          showError(err.message);
        }
      }
    });
  };

  const handleSort = (columnId: string) => {
    if (orderBy === columnId) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(columnId);
      setOrder('asc');
    }
  };

  const processedRoutes = useMemo(() => {
    let result = [...routes];

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(route => 
        route.name?.toLowerCase().includes(term) ||
        route.transportation_route_stops?.some((stop: any) =>
          stop.region_name?.toLowerCase().includes(term) ||
          stop.receiving_place?.toLowerCase().includes(term)
        )
      );
    }

    result.sort((a, b) => {
      const aVal = a[orderBy] || '';
      const bVal = b[orderBy] || '';
      return order === 'asc'
        ? aVal.toString().localeCompare(bVal.toString(), undefined, { numeric: true })
        : bVal.toString().localeCompare(aVal.toString(), undefined, { numeric: true });
    });

    return result;
  }, [routes, search, orderBy, order]);

  if (loading && !budget) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Card className="w-full relative min-h-[500px]">
      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
          <Spinner label="Loading action plan..." size="lg" />
        </div>
      )}

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle className="text-2xl font-bold">{budget?.title}</CardTitle>
          
        </div>

        <Button 
          size="sm" 
          className="bg-black hover:bg-gray-800"
          onClick={() => navigate(`/dashboard/budgets/transportation/route-planner/${id}`)}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Route
        </Button>
      </CardHeader>

      <CardContent>
        <div className="mb-6">
          <Input
            placeholder="Search routes or destinations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[60px]">SN</TableHead>
                <TableHead 
                  onClick={() => handleSort('name')} 
                  className="cursor-pointer hover:bg-gray-100"
                >
                  Msafara <ArrowUpDown className="ml-2 h-3 w-3 inline" />
                </TableHead>
                
                {/* NEW COLUMN */}
                <TableHead className="text-center">Na</TableHead>
                
                <TableHead>Mkoa</TableHead>
                <TableHead>Mahali pa Kupokelea</TableHead>
                <TableHead>Tarehe ya Kupokea</TableHead>
                <TableHead>Makasha</TableHead>
                <TableHead>Uzito (T)</TableHead>
                <TableHead>Lori</TableHead>
                <TableHead>Escort</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedRoutes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Truck className="h-12 w-12 text-slate-200" />
                      <p className="text-slate-400 font-medium">No routes planned yet</p>
                      <Button 
                        onClick={() => navigate(`/dashboard/budgets/transportation/route-planner/${id}`)}
                        className="bg-black hover:bg-gray-800"
                      >
                        <PlusCircle className="w-4 h-4 mr-2" /> Create First Route
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                processedRoutes.map((route, rIdx) => {
                  const stops = route.transportation_route_stops?.sort(
                    (a: any, b: any) => a.sequence_order - b.sequence_order
                  ) || [];
                  
                  const vehicles = route.transportation_route_vehicles || [];
                  const truckLabel = vehicles.find((v: any) => 
                    v.vehicle_type.includes('TRUCK')
                  )?.vehicle_type === 'TRUCK_AND_TRAILER' ? 'TT' : 'T';
                  
                  const escortLabel = vehicles.find((v: any) => 
                    v.vehicle_type === 'ESCORT_VEHICLE'
                  ) ? 'HT' : 'C';

                  return stops.map((stop: any, sIdx: number) => (
                    <TableRow key={stop.id} className="hover:bg-slate-50/50">
                      {sIdx === 0 && (
                        <>
                          <TableCell rowSpan={stops.length} className="font-medium text-muted-foreground border-r">
                            {rIdx + 1}
                          </TableCell>
                          <TableCell rowSpan={stops.length} className="font-semibold border-r bg-slate-50/30">
                            {route.name}
                          </TableCell>
                        </>
                      )}

                      {/* NEW COLUMN - Serial Number of Regions (per route) */}
                      <TableCell className="text-center font-medium text-muted-foreground border-r">
                        {sIdx + 1}
                      </TableCell>

                      <TableCell className="font-medium">{stop.region_name}</TableCell>
                      <TableCell>{stop.receiving_place || stop.region_name}</TableCell>
                      <TableCell>{stop.delivery_date}</TableCell>
                      <TableCell className="font-semibold">{stop.boxes_count}</TableCell>
                      <TableCell>{((stop.boxes_count * 34) / 1000).toFixed(2)}</TableCell>

                      {sIdx === 0 && (
                        <>
                          <TableCell rowSpan={stops.length} className="text-center border-l">
                            <Badge variant="outline" className="font-bold">
                              {truckLabel}
                            </Badge>
                          </TableCell>
                          <TableCell rowSpan={stops.length} className="text-center border-l">
                            <Badge variant="outline" className="font-bold">
                              {escortLabel}
                            </Badge>
                          </TableCell>
                          <TableCell rowSpan={stops.length} className="text-right border-l">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => navigate(`/dashboard/budgets/transportation/route-planner/${id}?edit=${route.id}`)}
                                title="Edit Route"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:bg-red-50"
                                onClick={() => handleDeleteRoute(route.id, route.name)}
                                title="Delete Route"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ));
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActionPlanPage;