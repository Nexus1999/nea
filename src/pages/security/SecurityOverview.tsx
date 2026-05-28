"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shield, Users, Lock, FileText, Activity,
  ShieldCheck, Terminal, History
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, delay, href, subtitle }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
  >
    <Link to={href || '#'} className="group block h-full">
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-500 p-8 h-full flex flex-col justify-between overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
          <Icon className="w-24 h-24 -mr-4 -mt-4 rotate-12" />
        </div>
        <div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110 ${color.replace('text-', 'bg-').replace('600', '50')}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{title}</p>
          <p className="text-4xl font-black text-gray-900 mt-2 tracking-tight">{value ?? '0'}</p>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{subtitle}</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>
    </Link>
  </motion.div>
);

const SecurityOverview = () => {
  const { data: totalUsers } = useQuery({
    queryKey: ['security-users-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: totalRoles } = useQuery({
    queryKey: ['security-roles-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('roles')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: totalPerms } = useQuery({
    queryKey: ['security-perms-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('permissions')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: totalLogs } = useQuery({
    queryKey: ['security-logs-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('datachange_logs')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            <ShieldCheck className="w-3 h-3" />
            Infrastructure Node 01
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Security Command</h2>
          <p className="text-gray-400 font-medium mt-2 text-lg">Centralized monitoring of system authorization and access vectors.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Status</p>
            <p className="text-sm font-black text-emerald-600 uppercase">Operational</p>
          </div>
          <div className="h-12 w-px bg-gray-100 hidden md:block" />
          <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
            <Activity className="w-6 h-6 text-blue-600 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="System Personnel" value={totalUsers} icon={Users} color="text-blue-600" subtitle="Authorized Users" delay={0.05} href="/dashboard/security/users" />
        <StatCard title="Audit Trail" value={totalLogs} icon={History} color="text-emerald-600" subtitle="Change Logs" delay={0.1} href="/dashboard/security/audit-logs" />
        <StatCard title="Policy Roles" value={totalRoles} icon={Shield} color="text-purple-600" subtitle="RBAC Groups" delay={0.15} href="/dashboard/security/roles" />
        <StatCard title="Authorization Keys" value={totalPerms} icon={Terminal} color="text-orange-600" subtitle="Permissions" delay={0.2} href="/dashboard/security/permissions" />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Real-time Integrity */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">System Integrity</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Authorization Layer Health</p>
            </div>
            <Link to="/dashboard/security/audit-logs" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View Audit Log</Link>
          </div>
          <div className="p-8 grid md:grid-cols-2 gap-10">
            <div className="space-y-6">
              {[
                { label: 'Authentication Vector', value: 100, status: 'Stable' },
                { label: 'JWT Authorization', value: 100, status: 'Active' },
                { label: 'RBAC Enforcement', value: 100, status: 'Strict' },
                { label: 'Audit Trail Pipeline', value: 98, status: 'Live' },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{item.label}</span>
                    <span className="text-[10px] font-black text-emerald-600 uppercase">{item.status}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-blue-600 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-950 rounded-[2rem] p-8 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                <ShieldCheck className="w-32 h-32" />
              </div>
              <h4 className="text-lg font-black tracking-tight mb-4">Security Protocol</h4>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                NEAS v2 employs stateful JWT tracking with real-time session invalidation. 
                Our infrastructure ensures zero-trust access across all examination vectors.
              </p>
              <div className="mt-8 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">AES-256 Encrypted</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Access */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-50 rounded-[2.5rem] border border-gray-200/50 p-8"
        >
          <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">Quick Management</h3>
          <div className="space-y-4">
            {[
              { label: 'Personnel Directory', href: '/dashboard/security/users', icon: Users, desc: 'Manage access nodes' },
              { label: 'Role Architect', href: '/dashboard/security/roles', icon: Shield, desc: 'Define access policies' },
              { label: 'Permission Matrix', href: '/dashboard/security/permissions', icon: Lock, desc: 'Fine-grained control' },
              { label: 'Audit Trail Logs', href: '/dashboard/security/audit-logs', icon: FileText, desc: 'System change logs' },
            ].map((item) => (
              <Link key={item.label} to={item.href} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 transition-all group shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <item.icon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 tracking-tight">{item.label}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SecurityOverview;