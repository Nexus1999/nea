import React from 'react';
import { motion } from 'framer-motion';
import { Building, Users, GraduationCap, MapPin, Search, ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-2xl ${color} transition-transform group-hover:scale-110`}>
        <Icon className="h-6 w-6" />
      </div>
      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-900 transition-colors" />
    </div>
    <p className="text-3xl font-black text-gray-900 mb-1">{value}</p>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
  </motion.div>
);

const InstitutionsOverview = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Institutions Portal</h1>
        <p className="text-sm text-gray-500 font-medium">Registry and analytics for all examination centers across Tanzania.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/dashboard/institutions/primary">
          <StatCard 
            title="Primary Schools" 
            value="18,432" 
            icon={GraduationCap} 
            color="bg-emerald-50 text-emerald-600" 
            delay={0.1}
          />
        </Link>
        <Link to="/dashboard/institutions/secondary">
          <StatCard 
            title="Secondary Schools" 
            value="5,120" 
            icon={Building} 
            color="bg-blue-50 text-blue-600" 
            delay={0.2}
          />
        </Link>
        <Link to="/dashboard/institutions/colleges">
          <StatCard 
            title="Teachers Colleges" 
            value="38" 
            icon={BookOpen} 
            color="bg-purple-50 text-purple-600" 
            delay={0.3}
          />
        </Link>
        <StatCard 
          title="Active Centers" 
          value="23,590" 
          icon={MapPin} 
          color="bg-orange-50 text-orange-600" 
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Search className="h-5 w-5 text-gray-400" />
              Global Center Registry Search
            </h3>
            <div className="relative group">
              <input 
                type="text" 
                placeholder="Search by Center Name or Center Number (e.g. PS0101001)..." 
                className="w-full pl-12 pr-4 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-gray-900 outline-none transition-all font-medium"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-gray-900 transition-colors" />
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
               {['All Regions', 'All Districts', 'All Levels'].map(filter => (
                 <button key={filter} className="px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors flex justify-between items-center">
                   {filter}
                   <ArrowRight className="h-3 w-3 opacity-30" />
                 </button>
               ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <Users className="h-10 w-10 text-orange-400 mb-6" />
            <h3 className="text-xl font-black mb-2">Enrollment Stats</h3>
            <p className="text-slate-400 text-xs font-medium leading-relaxed mb-6">
              Live tracking of registered candidates per school category for the current examination cycle.
            </p>
            <div className="space-y-4">
              {[
                { label: 'PSLE', count: '1.4M', color: 'bg-emerald-500' },
                { label: 'CSEE', count: '580K', color: 'bg-blue-500' },
                { label: 'ACSEE', count: '110K', color: 'bg-purple-500' }
              ].map(stat => (
                <div key={stat.label}>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5">
                    <span>{stat.label}</span>
                    <span className="text-white">{stat.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${stat.color} rounded-full w-[70%]`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-white/5 rounded-full blur-3xl" />
        </div>
      </div>
    </div>
  );
};

export default InstitutionsOverview;
