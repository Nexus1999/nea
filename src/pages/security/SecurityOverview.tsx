"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Users, Lock, FileText, Activity, AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { showError } from "@/utils/toast";

const SecurityOverview = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeRoles: 0,
    totalPermissions: 0,
    totalLogs: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      // Fetch counts in parallel
      const [
        usersRes,
        rolesRes,
        permissionsRes,
        logsCountRes,
        recentLogsRes
      ] = await Promise.all([
        supabase.from('profiles').select('id, status', { count: 'exact' }),
        supabase.from('roles').select('id', { count: 'exact' }),
        supabase.from('permissions').select('id', { count: 'exact' }),
        supabase.from('datachange_logs').select('id', { count: 'exact', head: true }),
        supabase.from('datachange_logs').select('*').order('changed_at', { ascending: false }).limit(5)
      ]);

      if (usersRes.error) throw usersRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (permissionsRes.error) throw permissionsRes.error;
      if (logsCountRes.error) throw logsCountRes.error;
      if (recentLogsRes.error) throw recentLogsRes.error;

      const totalUsers = usersRes.data?.length || 0;
      const activeUsers = usersRes.data?.filter(u => u.status !== 'blocked').length || 0;

      setStats({
        totalUsers,
        activeRoles: rolesRes.count || 0,
        totalPermissions: permissionsRes.count || 0,
        totalLogs: logsCountRes.count || 0,
      });

      setActiveUsersCount(activeUsers);
      setRecentLogs(recentLogsRes.data || []);
    } catch (err: any) {
      showError("Failed to load security overview data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: "Total Users", value: stats.totalUsers.toString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Active Roles", value: stats.activeRoles.toString(), icon: Shield, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Permissions", value: stats.totalPermissions.toString(), icon: Lock, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Audit Logs", value: stats.totalLogs >= 1000 ? `${(stats.totalLogs / 1000).toFixed(1)}k` : stats.totalLogs.toString(), icon: FileText, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  const activeUsersPercentage = stats.totalUsers > 0 ? Math.round((activeUsersCount / stats.totalUsers) * 100) : 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Security Overview</h2>
          <p className="text-muted-foreground mt-1">Monitor system access and security configurations with live metrics.</p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Refreshing...
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loading ? "..." : stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Activity className="h-3 w-3 text-emerald-500" />
                  Live database count
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity Logs */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Recent Security & Data Changes
            </CardTitle>
            <CardDescription>Latest audit trail entries recorded in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-500">Loading recent logs...</div>
              ) : recentLogs.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">No recent activity logs found.</div>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
                      log.action_type === 'DELETE' ? 'bg-rose-500' :
                      log.action_type === 'INSERT' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {log.action_type} on {log.table_name}
                        </p>
                        <span className="text-[10px] text-gray-400 font-semibold whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(log.changed_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        Performed by: <span className="font-medium text-slate-700">{log.changed_by || 'System'}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Record ID: {log.record_id}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Health & Security Status */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              System Health & Security Status
            </CardTitle>
            <CardDescription>Current status of security modules and user accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-gray-700">Active User Accounts</span>
                  <span className="text-emerald-600 font-bold">{loading ? "..." : `${activeUsersPercentage}%`}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${activeUsersPercentage}%` }} 
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  {activeUsersCount} out of {stats.totalUsers} user accounts are active and unblocked.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-gray-700">Database Encryption</span>
                  <span className="text-emerald-600 font-bold">Active</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: "100%" }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-gray-700">Audit Logging Service</span>
                  <span className="text-emerald-600 font-bold">Operational</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: "100%" }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityOverview;