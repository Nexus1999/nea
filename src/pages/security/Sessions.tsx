"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, RefreshCw, Monitor, Smartphone, Globe, User, Trash2
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
import { showSuccess, showError } from "@/utils/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      // 1. Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .order('login_time', { ascending: false });

      if (sessionsError) throw sessionsError;

      if (!sessionsData || sessionsData.length === 0) {
        setSessions([]);
        return;
      }

      // 2. Fetch profiles for the user IDs in sessions
      const userIds = Array.from(new Set(sessionsData.map(s => s.user_id)));
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of profiles for quick lookup
      const profilesMap = (profilesData || []).reduce((acc: Record<string, any>, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});

      // 3. Merge sessions with profiles
      const mergedSessions = sessionsData.map(session => ({
        ...session,
        profiles: profilesMap[session.user_id] || { email: 'Unknown User', username: 'unknown' }
      }));

      setSessions(mergedSessions);
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
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          logout_time: new Date().toISOString()
        })
        .eq('id', selectedSession.id);

      if (error) throw error;
      showSuccess("Session revoked successfully");
      fetchSessions();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const userEmail = session.profiles?.email || '';
      const username = session.profiles?.username || '';
      const ip = session.ip_address || '';
      
      return (
        userEmail.toLowerCase().includes(search.toLowerCase()) ||
        username.toLowerCase().includes(search.toLowerCase()) ||
        ip.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [sessions, search]);

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const currentSessions = filteredSessions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Session Management</h2>
        <p className="text-muted-foreground mt-1">Monitor active user sessions, logins, and force-revoke sessions in real-time.</p>
      </div>

      <Card className="w-full relative min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-[50] rounded-lg">
            <Spinner label="Loading sessions..." size="lg" />
          </div>
        )}

        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="text-xl font-bold">Active Sessions & History</CardTitle>
            <CardDescription>Real-time tracking of user sign-ins, device details, and active connections.</CardDescription>
          </div>
          
          <Button 
            variant="outline" 
            onClick={fetchSessions}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh Sessions
          </Button>
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by user email, username, or IP address..."
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
                  <TableHead>Status</TableHead>
                  <TableHead>Login Time</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Device / OS</TableHead>
                  <TableHead>Browser</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      No sessions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentSessions.map((session, index) => {
                    const { browser, os, isMobile } = parseUserAgent(session.user_agent);
                    const isCurrentSession = session.id === localStorage.getItem("current_user_session_id");

                    return (
                      <TableRow key={session.id} className={cn(isCurrentSession && "bg-blue-50/30")}>
                        <TableCell className="text-muted-foreground font-medium">
                          {((currentPage - 1) * itemsPerPage) + index + 1}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">
                              <User className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <div>
                              <span className="font-medium text-sm block">{session.profiles?.email || 'Unknown User'}</span>
                              {session.profiles?.username && (
                                <span className="text-xs text-slate-400">@{session.profiles.username}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge className={cn(
                            "font-medium text-xs uppercase tracking-wider border",
                            session.is_active 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                              : "bg-slate-50 text-slate-500 border-slate-100"
                          )}>
                            {session.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {isCurrentSession && (
                            <span className="ml-2 text-[10px] font-bold text-blue-600 uppercase tracking-wider">Current</span>
                          )}
                        </TableCell>

                        <TableCell className="text-xs font-mono text-slate-600">
                          {format(new Date(session.login_time), 'yyyy-MM-dd HH:mm:ss')}
                        </TableCell>

                        <TableCell className="text-xs font-mono text-slate-600">
                          {format(new Date(session.last_seen), 'yyyy-MM-dd HH:mm:ss')}
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
                          {session.ip_address || 'N/A'}
                        </TableCell>

                        <TableCell className="text-right">
                          {session.is_active && !isCurrentSession && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              onClick={() => handleRevokeSession(session)}
                              title="Revoke Session"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Revoke User Session?"
        message={`Are you sure you want to force-terminate the session for <b>${selectedSession?.profiles?.email || 'this user'}</b>? They will be logged out immediately.`}
        confirmText="Yes, Revoke Session"
        isDestructive={true}
        onConfirm={confirmRevoke}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};

export default Sessions;