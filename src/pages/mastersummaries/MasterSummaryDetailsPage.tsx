"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Search, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { cn } from "@/lib/utils";

// Components
import Spinner from "@/components/Spinner";
import PaginationControls from "@/components/ui/pagination-controls";
import SecondarySchoolDetailsDrawer from "@/components/mastersummaries/SecondarySchoolDetailsDrawer";

// Types
import { MasterSummary, MasterSummaryDetail, SecondaryMasterSummary } from "@/types/mastersummaries";
import abbreviateSchoolName from "@/utils/abbreviateSchoolName";

type DetailSortKey = keyof MasterSummaryDetail | 'center_name' | 'center_number' | 'region' | 'district';

const MasterSummaryDetailsPage: React.FC = () => {
const { id } = useParams<{ id: string }>();
const masterSummaryId = id;  const navigate = useNavigate();
  
  const [masterSummary, setMasterSummary] = useState<MasterSummary | null>(null);
  const [details, setDetails] = useState<MasterSummaryDetail[]>([]);
  
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [totalItems, setTotalItems] = useState(0);
  const [subjectsMap, setSubjectsMap] = useState<Map<string, string>>(new Map());

  const [isSecondaryDrawerOpen, setIsSecondaryDrawerOpen] = useState(false);
  const [viewingSecondarySchool, setViewingSecondarySchool] = useState<SecondaryMasterSummary | null>(null);

  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<DetailSortKey>('center_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(inputValue);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [inputValue]);

  const fetchMasterSummaryAndDetails = useCallback(async (isFirstLoad = false) => {
    if (!masterSummaryId) return;
    
    if (isFirstLoad) setIsInitialLoading(true);
    else setIsUpdating(true);

    try {
      if (!masterSummary) {
        const { data: summaryData } = await supabase.from('mastersummaries').select('*').eq('id', masterSummaryId).single();
        if (summaryData) setMasterSummary(summaryData as MasterSummary);
      }

      const currentMaster = masterSummary || (await supabase.from('mastersummaries').select('*').eq('id', masterSummaryId).single()).data;
      const code = currentMaster?.Code || "";
      const isSec = ["FTNA", "CSEE", "ACSEE"].includes(code);
      const tableName = isSec ? 'secondarymastersummaries' : 'primarymastersummary';
      const searchCols = isSec ? ['region', 'district', 'center_name', 'center_number'] : ['region', 'district', 'center_name', 'center_number', 'subjects', 'medium'];

      if (isSec && subjectsMap.size === 0) {
        const { data: subs } = await supabase.from('subjects').select('subject_code, subject_name').eq('exam_code', code);
        const map = new Map();
        subs?.forEach(s => map.set(s.subject_code, s.subject_name));
        setSubjectsMap(map);
      }

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase.from(tableName).select("*", { count: "exact" })
        .eq('mid', masterSummaryId)
        .eq('is_latest', true)
        .order(orderBy as string, { ascending: order === 'asc' });

      if (searchQuery) {
        query = query.or(searchCols.map(col => `${col}.ilike.%${searchQuery}%`).join(','));
      }

      const { data, count, error } = await query.range(from, to);
      if (error) throw error;

      setDetails((data as MasterSummaryDetail[]) || []);
      setTotalItems(count || 0);
    } catch (e: any) {
      showError(e.message);
    } finally {
      setIsInitialLoading(false);
      setIsUpdating(false);
    }
  }, [masterSummaryId, currentPage, itemsPerPage, orderBy, order, searchQuery, masterSummary, subjectsMap.size]);

  useEffect(() => {
    fetchMasterSummaryAndDetails(true);
  }, [masterSummaryId]);

  useEffect(() => {
    if (!isInitialLoading) {
        fetchMasterSummaryAndDetails(false);
    }
  }, [currentPage, orderBy, order, searchQuery]);

  const handleSort = (columnId: DetailSortKey) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
    setCurrentPage(1);
  };

  const isPrimary = masterSummary && ["SFNA", "SSNA", "PSLE"].includes(masterSummary.Code);
  const isSecondary = masterSummary && ["FTNA", "CSEE", "ACSEE"].includes(masterSummary.Code);

  if (isInitialLoading) {
    return (
        <div className="flex h-[400px] items-center justify-center">
            <Spinner label="Loading records..." size="lg" />
        </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/mastersummaries')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
        </Button>
      </div>

      <Card className="w-full relative border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <CardTitle className="text-xl font-bold">
           Registration records for {masterSummary?.Code} - {masterSummary?.Year} 
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Input
                placeholder="Search centers, regions..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                className="w-64 pl-10 h-9 text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            </div>
            <div className="text-xs font-medium text-muted-foreground bg-gray-100 px-3 py-1.5 rounded-md border">
              Total: {totalItems.toLocaleString()}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className={cn("border rounded-md overflow-hidden transition-opacity duration-200", isUpdating ? "opacity-50" : "opacity-100")}>
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[60px]">SN</TableHead>
                  
                  <TableHead onClick={() => handleSort('center_number')} className="cursor-pointer whitespace-nowrap">
                    Center No. <ArrowUpDown className={cn("ml-2 h-3 w-3 inline", orderBy === 'center_number' ? "text-blue-600" : "text-gray-400")} />
                  </TableHead>

                  <TableHead onClick={() => handleSort('center_name')} className="cursor-pointer whitespace-nowrap">
                    Center Name <ArrowUpDown className={cn("ml-2 h-3 w-3 inline", orderBy === 'center_name' ? "text-blue-600" : "text-gray-400")} />
                  </TableHead>

                  <TableHead onClick={() => handleSort('region')} className="cursor-pointer whitespace-nowrap">
                    Region <ArrowUpDown className={cn("ml-2 h-3 w-3 inline", orderBy === 'region' ? "text-blue-600" : "text-gray-400")} />
                  </TableHead>

                  <TableHead onClick={() => handleSort('district')} className="cursor-pointer whitespace-nowrap">
                    District <ArrowUpDown className={cn("ml-2 h-3 w-3 inline", orderBy === 'district' ? "text-blue-600" : "text-gray-400")} />
                  </TableHead>

                  {isPrimary && (
                    <>
                      <TableHead>Subjects</TableHead>
                      <TableHead>Medium</TableHead>
                      <TableHead onClick={() => handleSort('registered' as any)} className="cursor-pointer text-right">
                        Reg. <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                      </TableHead>
                    </>
                  )}

                  {isSecondary && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isPrimary ? 8 : 6} className="text-center py-12 text-muted-foreground">
                      No registration records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  details.map((detail: any, index) => (
                    <TableRow key={detail.id || index} className="hover:bg-gray-50/50">
                      <TableCell className="text-muted-foreground font-medium">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-blue-600">
                        {detail.center_number}
                      </TableCell>
                      <TableCell className="font-semibold text-gray-900">
                        {abbreviateSchoolName(detail.center_name)}
                      </TableCell>
                      <TableCell className="text-sm">{detail.region}</TableCell>
                      <TableCell className="text-sm">{detail.district}</TableCell>
                      
                      {isPrimary && (
                        <>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {detail.subjects || '---'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 font-medium">
                              {detail.medium}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">{detail.registered}</TableCell>
                        </>
                      )}

                      {isSecondary && (
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { 
                              setViewingSecondarySchool(detail); 
                              setIsSecondaryDrawerOpen(true); 
                            }}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Eye size={16} />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalItems > 0 && (
            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}</span> to{" "}
                <span className="font-medium text-foreground">{Math.min(totalItems, currentPage * itemsPerPage)}</span> of{" "}
                <span className="font-medium text-foreground">{totalItems}</span> results
              </p>
              <PaginationControls 
                currentPage={currentPage} 
                totalPages={Math.ceil(totalItems / itemsPerPage)} 
                onPageChange={setCurrentPage} 
              />
            </div>
          )}
        </CardContent>
      </Card>

      {isSecondary && viewingSecondarySchool && (
        <SecondarySchoolDetailsDrawer
          open={isSecondaryDrawerOpen}
          onOpenChange={setIsSecondaryDrawerOpen}
          schoolDetails={viewingSecondarySchool}
          examinationCode={masterSummary?.Code || ""}
          subjectsMap={subjectsMap}
        />
      )}
    </div>
  );
};

export default MasterSummaryDetailsPage;