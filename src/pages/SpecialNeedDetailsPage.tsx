"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Search, Accessibility } from "lucide-react";
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
import { MasterSummary, SpecialNeedType } from "@/types/mastersummaries";

// We use the same type for secondary & ualimu since they have the same wide-column structure
type WideSpecialNeedsDetail = {
  id: number;
  mid: number;
  special_need: SpecialNeedType;
  region: string | null;
  district: string | null;
  center_number: string;
  center_name: string;
  is_latest: boolean;
  version: number;
  created_at: string;
  [subjectCode: string]: number | string | boolean | null; // dynamic subject columns
};

const specialNeedFullNames: Record<string, string> = {
  HI: 'Hearing Impairment',
  BR: 'Braille',
  LV: 'Low Vision',
  PI: 'Physical Impairment',
  // add more as needed
};

function abbreviateSchoolName(name: string): string {
  if (!name) return "";
  return name
    .replace(/\bPRIMARY SCHOOL\b/gi, "PS")
    .replace(/\bSECONDARY SCHOOL\b/gi, "SS")
    .replace(/\bHIGH SCHOOL\b/gi, "HS")
    .trim();
}

const SpecialNeedDetailsPage: React.FC = () => {
  const { id, specialNeedType } = useParams<{ id: string; specialNeedType: SpecialNeedType }>();
  const navigate = useNavigate();

  const [masterSummary, setMasterSummary] = useState<MasterSummary | null>(null);
  const [details, setDetails] = useState<WideSpecialNeedsDetail[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Map<string, string>>(new Map());

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewingSchool, setViewingSchool] = useState<WideSpecialNeedsDetail | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<'center_name' | 'center_number' | 'region' | 'district'>('center_name');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setCurrentPage(1);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchData = useCallback(async (initial = false) => {
    if (initial) setIsInitialLoading(true);
    else setIsUpdating(true);

    try {
      // Load master summary if missing
      let summary = masterSummary;
      if (!summary) {
        const { data, error } = await supabase
          .from('mastersummaries')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) throw new Error(error?.message || "Master summary not found");
        summary = data as MasterSummary;
        setMasterSummary(summary);
      }

      const code = summary.Code;

      // Determine table name
      let tableName: string;
      if (["SFNA", "SSNA", "PSLE"].includes(code)) {
        tableName = 'primarymastersummary_specialneeds';
      } else if (["FTNA", "CSEE", "ACSEE", "DSEE", "GATCE", "GATSCCE", "DPEE", "DSPEE", "DPPEE"].includes(code)) {
        tableName = ["DSEE", "GATCE", "GATSCCE", "DPEE", "DSPEE", "DPPEE"].includes(code)
          ? 'ualimumastersummary_specialneeds'
          : 'secondarymastersummaries_specialneeds';
      } else {
        throw new Error(`Unsupported examination code: ${code}`);
      }

      // Load subjects map (for secondary & ualimu) — only once
      if (!["SFNA", "SSNA", "PSLE"].includes(code) && subjectsMap.size === 0) {
        const { data: subjects } = await supabase
          .from('subjects')
          .select('subject_code, subject_name')
          .eq('exam_code', code);

        const map = new Map<string, string>();
        subjects?.forEach(s => map.set(s.subject_code, s.subject_name));
        setSubjectsMap(map);
      }

      // Pagination & sorting
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from(tableName)
        .select("*", { count: "exact" })
        .eq('mid', id)
        .eq('special_need', specialNeedType)
        .order(orderBy, { ascending: orderDirection === 'asc' });

      if (searchQuery) {
        query = query.or(
          ['region', 'district', 'center_name', 'center_number']
            .map(col => `${col}.ilike.%${searchQuery}%`)
            .join(',')
        );
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      setDetails((data as WideSpecialNeedsDetail[]) || []);
      setTotalItems(count ?? 0);
    } catch (err: any) {
      showError(err.message || "Failed to load details");
      console.error(err);
    } finally {
      setIsInitialLoading(false);
      setIsUpdating(false);
    }
  }, [
    id, specialNeedType, currentPage, itemsPerPage,
    orderBy, orderDirection, searchQuery,
    masterSummary, subjectsMap.size
  ]);

  useEffect(() => {
    fetchData(true);
  }, [id, specialNeedType]);

  useEffect(() => {
    if (!isInitialLoading) fetchData(false);
  }, [currentPage, orderBy, orderDirection, searchQuery]);

  const handleSort = (column: 'center_name' | 'center_number' | 'region' | 'district') => {
    if (orderBy === column) {
      setOrderDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(column);
      setOrderDirection('asc');
    }
    setCurrentPage(1);
  };

  const code = masterSummary?.Code || "";
  const isPrimary = ["SFNA", "SSNA", "PSLE"].includes(code);
  const isWideFormat = ["FTNA", "CSEE", "ACSEE", "DSEE", "GATCE", "GATSCCE", "DPEE", "DSPEE", "DPPEE"].includes(code);

  if (isInitialLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Spinner label="Loading special needs details..." size="lg" />
      </div>
    );
  }

  if (!masterSummary) {
    return (
      <Card className="p-8 text-center">
        <p className="text-lg text-muted-foreground">Master summary not found</p>
      </Card>
    );
  }

  return (
    <div className="p-2 md:p-4 space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {specialNeedFullNames[specialNeedType] || specialNeedType} Details
          <span className="ml-3 text-lg font-normal text-muted-foreground">
            {masterSummary.Code} — {masterSummary.Year}
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
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
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

                  {isWideFormat && <TableHead className="w-20 text-right">View</TableHead>}
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
                    <TableRow key={detail.id} className="hover:bg-gray-50/70 transition-colors">
                      <TableCell className="text-muted-foreground font-medium">
                        {((currentPage - 1) * itemsPerPage) + idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-blue-700">
                        {detail.center_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {abbreviateSchoolName(detail.center_name)}
                      </TableCell>
                      <TableCell className="text-sm">{detail.region || '—'}</TableCell>
                      <TableCell className="text-sm">{detail.district || '—'}</TableCell>

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

                      {isWideFormat && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              setViewingSchool(detail);
                              setIsDrawerOpen(true);
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
                </span> – <span className="font-medium text-foreground">
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

      {isWideFormat && viewingSchool && (
        <SecondarySchoolDetailsDrawer
          open={isDrawerOpen}
          onOpenChange={setIsDrawerOpen}
          schoolDetails={viewingSchool}
          examinationCode={masterSummary.Code}
          subjectsMap={subjectsMap}
        />
      )}
    </div>
  );
};

export default SpecialNeedDetailsPage;