"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Users, Lock, FileText, Activity, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const SecurityOverview = () => {
  const stats = [
    { title: "Total Users", value: "24", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Active Roles", value: "5", icon: Shield, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Permissions", value: "42", icon: Lock, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Audit Logs", value: "1.2k", icon: FileText, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Security Overview</h2>
        <p className="text-muted-foreground mt-1">Monitor system access and security configurations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
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
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Activity className="h-3 w-3 text-emerald-500" />
                  System active
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Recent Security Alerts
            </CardTitle>
            <CardDescription>Critical events requiring attention.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="h-2 w-2 rounded-full bg-orange-500 mt-2 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">Failed Login Attempt</p>
                    <p className="text-xs text-gray-500">Multiple failed attempts from IP 192.168.1.{i}</p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              System Health
            </CardTitle>
            <CardDescription>Current status of security modules.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { label: "Authentication Service", status: "Operational", value: 100 },
                { label: "Database Encryption", status: "Active", value: 100 },
                { label: "Audit Logging", status: "Operational", value: 98 },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-gray-700">{item.label}</span>
                    <span className="text-emerald-600 font-bold">{item.status}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SecurityOverview;