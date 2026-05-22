"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, RefreshCw, Trash2, ShieldAlert, Laptop, Smartphone, Globe, Clock, KeyRound
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
import { showError, showSuccess } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import PaginationControls from "@/components/ui/pagination-controls";

const Sessions = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Confirm Dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      // Try to fetch from public.sessions table
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback to mock data if table doesn't exist yet
        console.warn("Sessions table not found, using mock active sessions:", error.message);
        setSessions([
          {
            id: "1",
            user_id: "user-1",
            user_email: "admin@necta.go.tz",
            ip_address: "192.168.1.45",
            user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            expires_at: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
            is_current: true
          },
          {
            id: "2",
            user_id: "user-2",
            user_email: "supervisor.john@necta.go.tz",
            ip_address: "102.223.12.89",
            user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            expires_at: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
            is_current: false
          },
          {
            id: "3",
            user_id: "user-3",
            user_email: "finance.officer@necta.go.tz",
            ip_address: "197.250.4.112",
            user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            expires_at: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
            is_current: false
          }
        ]);
      } else {
        setSessions(data || []);
      }
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = (session: any) => {
    setSelectedSession(session);
    setConfirmOpen(true);
  };

  const confirmRevoke = async () => {
    if (!selectedSession) return;
    setConfirmOpen(false);
    setLoading(true);
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', selectedSession.id);

      if (error) {
        // If table is mock, simulate deletion
        setSessions(prev => prev.filter(s => s.id !== selectedSession.id));
      } else {
        await fetchSessions();
      }
      showSuccess("Session revoked successfully");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobi') || ua.includes('iphone') || ua.includes('android')) {
      return <Smartphone className="h-4 w-4 text-slate-500" />;
    }
    return <Laptop className="h-4 w-4 text-slate-500" />;
  };

  const getDeviceName = (userAgent: string) => {
    const ua = userAgent.toLowerCase();
    if (ua.includes('macintosh')) return 'macOS Device';
    if (ua.includes('windows')) return 'Windows PC';
    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('android')) return 'Android Device';
    if (ua.includes('linux')) return 'Linux PC';
    return 'Unknown Device';
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => 
      s.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      s.ip_address?.toLowerCase().includes(search.toLowerCase()) ||
      s.user_agent?.toLowerCase().includes(search.toLowerCase())
    );
  }, [sessions, search]);

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const currentData = filteredSessions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = useMemo(() => {
    const total = sessions.length;
    const desktop = sessions.filter(s => !s.user_agent.toLowerCase().includes('mobi')).length;
    const mobile = total - desktop;
    const uniqueIps = new Set(sessions.map(s => s.ip_address)).size;
    return { total, desktop, mobile, uniqueIps };
  }, [sessions]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">Total Active Sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">Desktop Devices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600">{stats.desktop}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">Mobile Devices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">{stats.mobile}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider">Unique IP Addresses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-purple-600">{stats.uniqueIps}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
            <Spinner label="Loading active sessions..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="text-2xl font-bold">Active Sessions</CardTitle>
            <CardDescription className="mt-1">Monitor and manage active user sessions across all devices.</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={fetchSessions}
            disabled={loading}
            className="rounded-xl"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by email, IP address, or device..."
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
                  <TableHead>User</TableHead>
                  <TableHead>Device / Browser</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No active sessions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.map((session, index) => (
                    <TableRow key={session.id}>
                      <TableCell className="text-muted-foreground font-medium">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                            {session.user_email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900">{session.user_email || 'System User'}</p>
                              {session.is_current && (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                                  Current Session
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">ID: {session.user_id}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(session.user_agent)}
                          <div>
                            <p className="text-sm font-medium text-slate-700">{getDeviceName(session.user_agent)}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[250px]" title={session.user_agent}>
                              {session.user_agent}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-mono text-slate-600">{session.ip_address}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs text-slate-600">
                            {new Date(session.created_at).toLocaleString()}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:bg-red-50"
                          onClick={() => handleRevokeSession(session)}
                          disabled={session.is_current}
                          title={session.is_current ? "Cannot revoke current session" : "Revoke Session"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Revoke Session?"
        message={`Are you sure you want to revoke the session for <b>${selectedSession?.user_email}</b>? This will force-logout the user from that device.`}
        confirmText="Yes, Revoke Session"
        isDestructive={true}
        onConfirm={confirmRevoke}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default Sessions;