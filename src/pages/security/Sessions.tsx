"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, RefreshCw, Monitor, Smartphone, Globe, ShieldAlert, ShieldCheck, Clock, User
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import Spinner from "@/components/Spinner";
import { cn } from "@/lib/utils";
import PaginationControls from "@/components/ui/pagination-controls";

const parseUserAgent = (ua: string) => {
  if (!ua) return { browser: 'Unknown Browser', os: 'Unknown OS', isMobile: false };
  
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  const isMobile = /mobile|android|iphone|ipad|phone/i.test(ua);

  // Browser detection
  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr|opera/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/edge|edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/opr|opera/i.test(ua)) {
    browser = 'Opera';
  }

  // OS detection
  if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/linux/i.test(ua) && !/android/i.test(ua)) {
    os = 'Linux';
  } else if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
  }

  return { browser, os, isMobile };
};

const Sessions = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchSessionLogs();
  }, []);

  const fetchSessionLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('datachange_logs')
        .select('*')
        .eq('table_name', 'auth.sessions')
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching session logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const data = log.new_data || log.old_data || {};
      const user = data.user || '';
      const ip = data.ip_address || '';
      const event = data.event || '';
      
      return (
        user.toLowerCase().includes(search.toLowerCase()) ||
        ip.toLowerCase().includes(search.toLowerCase()) ||
        event.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [logs, search]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Session Management</h2>
        <p className="text-muted-foreground mt-1">Monitor active user sessions, logins, and authentication events.</p>
      </div>

      <Card className="w-full relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
            <Spinner label="Loading session logs..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="text-xl font-bold">Authentication History</CardTitle>
            <CardDescription>Real-time tracking of user sign-ins, sign-outs, and token refreshes.</CardDescription>
          </div>
          
          <Button 
            variant="outline" 
            onClick={fetchSessionLogs}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh Logs
          </Button>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by user email, IP address, or event..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 h-10"
              />
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[60px]">SN</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Device / OS</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No session logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentLogs.map((log, index) => {
                    const data = log.new_data || log.old_data || {};
                    const { browser, os, isMobile } = parseUserAgent(data.user_agent);

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground font-medium">
                          {((currentPage - 1) * itemsPerPage) + index + 1}
                        </TableCell>

                        <TableCell className="text-xs font-mono text-slate-600">
                          {format(new Date(log.changed_at), 'yyyy-MM-dd HH:mm:ss')}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">
                              <User className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <span className="font-medium text-sm">{data.user || 'Unknown User'}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge className={cn(
                            "font-medium text-xs uppercase tracking-wider border",
                            data.event === 'SIGNED_IN' && "bg-emerald-50 text-emerald-700 border-emerald-100",
                            data.event === 'SIGNED_OUT' && "bg-rose-50 text-rose-700 border-rose-100",
                            data.event === 'TOKEN_REFRESHED' && "bg-blue-50 text-blue-700 border-blue-100"
                          )}>
                            {data.event?.replace('_', ' ') || 'UNKNOWN'}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            {isMobile ? <Smartphone className="h-4 w-4 text-slate-400" /> : <Monitor className="h-4 w-4 text-slate-400" />}
                            <span>{os}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-sm text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-slate-400" />
                            <span>{browser}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs font-mono text-slate-500">
                          {data.ip_address || 'N/A'}
                        </TableCell>
                      </TableRow>
                    );
                  })
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
      </Card>
    </div>
  );
};

export default Sessions;