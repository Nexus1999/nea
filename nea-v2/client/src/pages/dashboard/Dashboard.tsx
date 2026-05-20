import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Users, Truck, BookOpen, Briefcase, TrendingUp, Activity, Database } from 'lucide-react';
import { masterSummariesService, supervisorsService, budgetsService, stationeriesService } from '../../services/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';

const StatCard = ({ label, value, icon: Icon, color, href, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <Link to={href} className="block group">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group-hover:border-red-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value ?? '—'}</p>
          </div>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>
    </Link>
  </motion.div>
);

const Dashboard = () => {
  const { user } = useAuth();

  const { data: summaries } = useQuery({
    queryKey: ['master-summaries', 1],
    queryFn: () => masterSummariesService.list({ page: 1, limit: 5 }).then(r => r.data),
  });

  const { data: supervisors } = useQuery({
    queryKey: ['supervisors', 1, ''],
    queryFn: () => supervisorsService.list({ page: 1, limit: 5 }).then(r => r.data),
  });

  const { data: budgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => budgetsService.list().then(r => r.data),
  });

  const { data: stationeries } = useQuery({
    queryKey: ['stationeries'],
    queryFn: () => stationeriesService.list().then(r => r.data),
  });

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 rounded-2xl p-8 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 blur-xl pointer-events-none" />
        <div className="relative z-10">
          <p className="text-red-100 text-sm font-medium mb-1">{greeting},</p>
          <h2 className="text-3xl font-bold mb-2 capitalize">{user?.username}</h2>
          <p className="text-red-100/80 text-sm">Welcome to the National Examinations Administration System (NEAS) v2</p>
          <div className="mt-4 inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-1.5 text-sm backdrop-blur-sm">
            <Activity className="w-4 h-4" />
            <span>System Online</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Master Summaries" value={summaries?.total ?? 0} icon={FileText} color="bg-red-500" href="/dashboard/master-summaries" delay={0.1} />
        <StatCard label="Supervisors" value={supervisors?.total ?? 0} icon={Users} color="bg-blue-500" href="/dashboard/supervisors" delay={0.15} />
        <StatCard label="Budgets" value={budgets?.data?.length ?? 0} icon={Truck} color="bg-purple-500" href="/dashboard/budgets" delay={0.2} />
        <StatCard label="Stationeries" value={stationeries?.data?.length ?? 0} icon={BookOpen} color="bg-emerald-500" href="/dashboard/stationeries" delay={0.25} />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Summaries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Master Summaries</h3>
            <Link to="/dashboard/master-summaries" className="text-xs text-red-600 hover:text-red-700 font-medium transition-colors">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {summaries?.data?.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">No summaries yet</div>
            )}
            {summaries?.data?.map((ms: any, i: number) => (
              <motion.div
                key={ms.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{ms.examination}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ms.year} · v{ms.version} · {Number(ms.centerCount ?? 0).toLocaleString()} centers</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  {Number(ms.totalRegistered ?? 0).toLocaleString()} registered
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* System Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-3">
            {[
              { label: 'Upload Summary', icon: FileText, href: '/dashboard/master-summaries', color: 'text-red-600 bg-red-50' },
              { label: 'Add Supervisor', icon: Users, href: '/dashboard/supervisors', color: 'text-blue-600 bg-blue-50' },
              { label: 'New Budget', icon: Truck, href: '/dashboard/budgets', color: 'text-purple-600 bg-purple-50' },
              { label: 'Stationery Plan', icon: BookOpen, href: '/dashboard/stationeries', color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Add Teacher', icon: Briefcase, href: '/dashboard/teachers', color: 'text-orange-600 bg-orange-50' },
              { label: 'Settings', icon: Database, href: '/dashboard/settings', color: 'text-gray-600 bg-gray-100' },
            ].map(({ label, icon: Icon, href, color }) => (
              <Link
                key={label}
                to={href}
                className="flex items-center space-x-3 p-3 rounded-xl border border-gray-100 hover:border-red-200 hover:shadow-sm transition-all group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
