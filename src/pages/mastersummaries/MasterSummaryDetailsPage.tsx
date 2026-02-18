"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Search, X } from "lucide-react";
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
import { showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import Spinner from "@/components/Spinner";
import PaginationControls from "@/components/ui/pagination-controls";
import SecondarySchoolDetailsDrawer from "@/components/mastersummaries/SecondarySchoolDetailsDrawer";
import { MasterSummary, MasterSummaryDetail, SecondaryMasterSummary } from "@/types/mastersummaries";
import abbreviateSchoolName from "@/utils/abbreviateSchoolName";

type DetailSortKey = keyof MasterSummaryDetail | 'center_name' | 'center_number' | 'region' | 'district';

const MasterSummaryDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [masterSummary, setMasterSummary] = useState<MasterSummary | null>(null);
  const [allDetails, setAllDetails] = useState<MasterSummaryDetail[]>([]); // ← all fetched rows
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [subjectsMap, setSubjectsMap] = useState<Map<string, string>>(new Map());

  const [isSecondaryDrawerOpen, setIsSecondaryDrawerOpen] = useState(false);
  const [viewingSecondarySchool, setViewingSecondarySchool] = useState<SecondaryMasterSummary | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState<DetailSortKey>('center_name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const isSecondary = masterSummary && ["FTNA", "CSEE", "ACSEE"].includes(masterSummary.Code);

  // Fetch all data once (client-side filtering from now on)
  useEffect(() => {
     document.title = "Summary Details | NEAS";
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Load master summary
        const { data: summary, error: sumErr } = await supabase
          .from('mastersummaries')
          .select('*')
          .eq('id', id)
          .single();
        if (sumErr) throw sumErr;
        if (summary) setMasterSummary(summary);

        const code = summary?.Code || "";
        const table = ["FTNA", "CSEE", "ACSEE"].includes(code) ? 'secondarymastersummaries' : 'primarymastersummary';

        // Load subjects for secondary
        if (["FTNA", "CSEE", "ACSEE"].includes(code)) {
          const { data: subs } = await supabase
            .from('subjects')
            .select('subject_code, subject_name')
            .eq('exam_code', code);
          const map = new Map(subs?.map(s => [s.subject_code, s.subject_name]) || []);
          setSubjectsMap(map);
        }

        // Fetch ALL matching rows (no pagination here)
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('mid', id)
          .eq('is_latest', true);

        if (error) throw error;

        setAllDetails(data || []);
        setTotalItems(data?.length || 0);
      } catch (err: any) {
        showError(err.message || "Failed to load records");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Client-side filtering + sorting + pagination
  const filteredAndSortedData = useMemo(() => {
    let result = [...allDetails];

    // Filter
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter((item) =>
        item.region?.toLowerCase().includes(term) ||
        item.district?.toLowerCase().includes(term) ||
        item.center_name?.toLowerCase().includes(term) ||
        item.center_number?.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[orderBy as keyof typeof a] ?? '';
      let bVal = b[orderBy as keyof typeof b] ?? '';

      // Special handling for numeric center_number if needed
      if (orderBy === 'center_number') {
        aVal = String(aVal).padStart(10, '0');
        bVal = String(bVal).padStart(10, '0');
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allDetails, search, orderBy, order]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(start, start + itemsPerPage);
  }, [filteredAndSortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  const handleSort = (column: DetailSortKey) => {
    const isAsc = orderBy === column && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(column);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearch('');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Spinner label="Loading records..." size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <Card className="w-full relative min-h-[600px] border-none shadow-sm">

        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 pb-6 border-b mb-4">
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">
              Registration Records – {masterSummary?.Code} {masterSummary?.Year}
            </CardTitle>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">
                TOTAL RECORDS
              </p>
              <Badge variant="secondary" className="text-xs font-medium px-2.5 py-0.5">
                {filteredAndSortedData.length.toLocaleString()}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Search – exact match to JobAssignmentsPage */}
          <div className="mb-6">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search center, region, district, number..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-10 text-sm border-slate-200 focus:ring-slate-100"
              />
              {search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-slate-700"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-b border-slate-200">
                  <TableHead className="w-[60px] text-[10px] font-black uppercase text-slate-500">SN</TableHead>

                  <TableHead className="text-[10px] font-black uppercase text-slate-500">
                    <button
                      onClick={() => handleSort('center_number')}
                      className="flex items-center gap-1 hover:opacity-80"
                    >
                      Center No.
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>

                  <TableHead className="text-[10px] font-black uppercase text-slate-500">
                    <button
                      onClick={() => handleSort('center_name')}
                      className="flex items-center gap-1 hover:opacity-80"
                    >
                      Center Name
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>

                  <TableHead className="text-[10px] font-black uppercase text-slate-500">
                    <button
                      onClick={() => handleSort('region')}
                      className="flex items-center gap-1 hover:opacity-80"
                    >
                      Region
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>

                  <TableHead className="text-[10px] font-black uppercase text-slate-500">
                    <button
                      onClick={() => handleSort('district')}
                      className="flex items-center gap-1 hover:opacity-80"
                    >
                      District
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>

                  {masterSummary && ["SFNA", "SSNA", "PSLE"].includes(masterSummary.Code) && (
                    <>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Subjects</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-slate-500">Medium</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase text-slate-500">
                        <button
                          onClick={() => handleSort('registered' as any)}
                          className="flex items-center gap-1 justify-end hover:opacity-80 w-full"
                        >
                          Registered
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                    </>
                  )}

                  {isSecondary && (
                    <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 px-6">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isSecondary ? 6 : 8}
                      className="text-center py-20 text-slate-400 text-[10px] font-bold uppercase tracking-widest"
                    >
                      {search.trim()
                        ? "No matching registration records found."
                        : "No registration records found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((detail: any, index: number) => (
                    <TableRow
                      key={detail.id || index}
                      className="hover:bg-slate-50/30 border-b border-slate-100 transition-colors"
                    >
                      <TableCell className="text-slate-400 text-xs font-mono">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </TableCell>

                      <TableCell className="font-mono text-sm font-bold text-blue-600">
                        {detail.center_number}
                      </TableCell>

                      <TableCell className="text-sm text-slate-800 font-medium">
                        {abbreviateSchoolName(detail.center_name)}
                      </TableCell>

                      <TableCell className="text-sm text-slate-600 font-medium">{detail.region}</TableCell>
                      <TableCell className="text-sm text-slate-600 font-medium">{detail.district}</TableCell>

                      {masterSummary && ["SFNA", "SSNA", "PSLE"].includes(masterSummary.Code) && (
                        <>
                          <TableCell className="text-sm text-slate-500 max-w-[180px] truncate">
                            {detail.subjects || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-medium">
                              {detail.medium || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium text-slate-700">
                            {detail.registered?.toLocaleString() || '0'}
                          </TableCell>
                        </>
                      )}

                      {isSecondary && (
                        <TableCell className="text-right px-6">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg border-slate-200 hover:border-slate-900 transition-all"
                            onClick={() => {
                              setViewingSecondarySchool(detail);
                              setIsSecondaryDrawerOpen(true);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredAndSortedData.length > 0 && (
            <div className="mt-6 flex justify-center">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
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