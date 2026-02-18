"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Search, Accessibility, ArrowLeft } from "lucide-react";
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
import { MasterSummary, PrimaryMasterSummarySpecialNeeds, SecondaryMasterSummarySpecialNeeds, SpecialNeedType } from "@/types/mastersummaries";

type SpecialNeedsDetail = PrimaryMasterSummarySpecialNeeds | SecondaryMasterSummarySpecialNeeds;
type DetailSortKey = 'center_name' | 'center_number' | 'region' | 'district';

function abbreviateSchoolName(name: string): string {
  if (!name) return "";
  return name
    .replace(/\bPRIMARY SCHOOL\b/gi, "PS")
    .replace(/\bSECONDARY SCHOOL\b/gi, "SS")
    .replace(/\bHIGH SCHOOL\b/gi, "HS")
    .trim();
}

const specialNeedFullNames: Record<string, string> = {
  HI: 'Hearing Impairment',
  BR: 'Braille',
  LV: 'Low Vision',
  PI: 'Physical Impairment',
  // Add more if needed
};

const SpecialNeedDetailsPage: React.FC = () => {
  const { id, specialNeedType } = useParams<{ id: string; specialNeedType: SpecialNeedType }>();
  const navigate = useNavigate();

  const [masterSummary, setMasterSummary] = useState<MasterSummary | null>(null);
  const [details, setDetails] = useState<SpecialNeedsDetail[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Map<string, string>>(new Map());

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  const [isSecondaryDrawerOpen, setIsSecondaryDrawerOpen] = useState(false);
  const [viewingSecondarySchool, setViewingSecondarySchool] = useState<any>(null);

  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<DetailSortKey>('center_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(inputValue.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [inputValue]);

  // Guard clause - missing params
  if (!id || !specialNeedType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <Card className="max-w-md w-full text-center p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-slate-600 mb-6">
            Missing master summary ID or special need type in the URL.
          </p>
          <Button onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const fetchData = useCallback(async (isFirstLoad = false) => {
    if (isFirstLoad) setIsInitialLoading(true);
    else setIsUpdating(true);

    try {
      // Fetch master summary if not already loaded
      if (!masterSummary) {
        const { data, error } = await supabase
          .from('mastersummaries')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) throw new Error(error?.message || "Master summary not found");
        setMasterSummary(data as MasterSummary);
      }

      const code = masterSummary?.Code || "";
      const isPrimary = ["SFNA", "SSNA", "PSLE"].includes(code);
      const tableName = isPrimary
        ? 'primarymastersummary_specialneeds'
        : 'secondarymastersummaries_specialneeds';

      // Load subjects map for secondary (only once)
      if (!isPrimary && subjectsMap.size === 0) {
        const { data: subjects } = await supabase
          .from('subjects')
          .select('subject_code, subject_name')
          .eq('exam_code', code);

        const map = new Map<string, string>();
        subjects?.forEach(s => map.set(s.subject_code, s.subject_name));
        setSubjectsMap(map);
      }

      // Main data query with pagination + sorting + search
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from(tableName)
        .select("*", { count: "exact" })
        .eq('mid', id)
        .eq('special_need', specialNeedType)
        .order(orderBy, { ascending: order === 'asc' });

      if (searchQuery) {
        query = query.or(
          ['region', 'district', 'center_name', 'center_number']
            .map(col => `${col}.ilike.%${searchQuery}%`)
            .join(',')
        );
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      setDetails((data as SpecialNeedsDetail[]) || []);
      setTotalItems(count ?? 0);
    } catch (err: any) {
      showError(err.message || "Failed to load special needs details");
      console.error(err);
    } finally {
      setIsInitialLoading(false);
      setIsUpdating(false);
    }
  }, [
    id,
    specialNeedType,
    currentPage,
    itemsPerPage,
    orderBy,
    order,
    searchQuery,
    masterSummary,
    subjectsMap.size
  ]);

  useEffect(() => {
    fetchData(true);
  }, [id, specialNeedType]);

  useEffect(() => {
    if (!isInitialLoading) fetchData(false);
  }, [currentPage, orderBy, order, searchQuery]);

  const handleSort = (column: DetailSortKey) => {
    const isAsc = orderBy === column && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(column);
    setCurrentPage(1);
  };

  const isPrimary = masterSummary && ["SFNA", "SSNA", "PSLE"].includes(masterSummary.Code);
  const isSecondary = masterSummary && ["FTNA", "CSEE", "ACSEE"].includes(masterSummary.Code);

  if (isInitialLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Spinner label="Loading special needs details..." size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {specialNeedFullNames[specialNeedType] || specialNeedType} Details
          <span className="ml-3 text-lg font-normal text-muted-foreground">
            {masterSummary?.Code} — {masterSummary?.Year}
          </span>
        </h1>
      </div>

      <Card className="border shadow-sm relative min-h-[500px]">
        <CardHeader className="pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Accessibility className="h-5 w-5 text-blue-600" />
              {specialNeedFullNames[specialNeedType] || specialNeedType}
            </CardTitle>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Input
                  placeholder="Search center, region, district..."
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  className="w-64 pl-9 h-9"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Badge variant="secondary" className="h-9 px-4">
                Total: {totalItems.toLocaleString()}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className={cn("border rounded-md overflow-hidden", isUpdating && "opacity-60 pointer-events-none")}>
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-14">SN</TableHead>
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort('center_number')}
                  >
                    Center No.
                    <ArrowUpDown className={cn("ml-2 h-3.5 w-3.5 inline", orderBy === 'center_number' && "text-blue-600")} />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort('center_name')}
                  >
                    Center Name
                    <ArrowUpDown className={cn("ml-2 h-3.5 w-3.5 inline", orderBy === 'center_name' && "text-blue-600")} />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort('region')}
                  >
                    Region
                    <ArrowUpDown className={cn("ml-2 h-3.5 w-3.5 inline", orderBy === 'region' && "text-blue-600")} />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => handleSort('district')}
                  >
                    District
                    <ArrowUpDown className={cn("ml-2 h-3.5 w-3.5 inline", orderBy === 'district' && "text-blue-600")} />
                  </TableHead>

                  {isPrimary && (
                    <>
                      <TableHead>Subjects</TableHead>
                      <TableHead>Medium</TableHead>
                      <TableHead className="text-right">Registered</TableHead>
                    </>
                  )}

                  {isSecondary && <TableHead className="w-20 text-right">View</TableHead>}
                </TableRow>
              </TableHeader>

              <TableBody>
                {details.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isPrimary ? 8 : 6} className="text-center py-16 text-muted-foreground">
                      No records found for this special need type.
                    </TableCell>
                  </TableRow>
                ) : (
                  details.map((detail, idx) => (
                    <TableRow key={detail.id || idx} className="hover:bg-gray-50/70 transition-colors">
                      <TableCell className="text-muted-foreground font-medium">
                        {((currentPage - 1) * itemsPerPage) + idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-blue-700">
                        {detail.center_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {abbreviateSchoolName(detail.center_name)}
                      </TableCell>
                      <TableCell className="text-sm">{detail.region}</TableCell>
                      <TableCell className="text-sm">{detail.district}</TableCell>

                      {isPrimary && (
                        <>
                          <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                            {detail.subjects || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {detail.medium || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {detail.registered ?? '—'}
                          </TableCell>
                        </>
                      )}

                      {isSecondary && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              setViewingSecondarySchool(detail);
                              setIsSecondaryDrawerOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
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
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-muted-foreground">
              <div>
                Showing <span className="font-medium text-foreground">
                  {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}
                </span>–<span className="font-medium text-foreground">
                  {Math.min(totalItems, currentPage * itemsPerPage)}
                </span> of <span className="font-medium text-foreground">{totalItems}</span>
              </div>

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

export default SpecialNeedDetailsPage;