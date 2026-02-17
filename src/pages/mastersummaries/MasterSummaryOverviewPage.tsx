"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import { ArrowLeft, MapPin, School, Users, Building2, Layers, Landmark, Hash, GraduationCap, MapPinned } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// --- Helper Component: Running Numbers ---
const CountUp = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    const totalDuration = 1000;
    const increment = end / (totalDuration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
};

const MasterSummaryOverviewPage = () => {
  const { masterSummaryId: summaryId } = useParams<{ masterSummaryId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [masterSummary, setMasterSummary] = useState<any>(null);
  const [summaryDetails, setSummaryDetails] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const SECONDARY_CODES = ["FTNA", "CSEE", "ACSEE"];

  useEffect(() => {
    document.title = "Overview | NEAS";
    if (summaryId) fetchMasterSummaryData();
  }, [summaryId]);

  const fetchMasterSummaryData = async () => {
    setLoading(true);
    try {
      const { data: msData } = await supabase.from('mastersummaries').select('*').eq('id', summaryId).maybeSingle();
      if (!msData) return;
      setMasterSummary(msData);

      const isSec = SECONDARY_CODES.includes(msData.Code);
      const { data } = await supabase.from(isSec ? 'secondarymastersummaries' : 'primarymastersummary')
        .select('*').eq('mid', summaryId).eq('is_latest', true);
      setSummaryDetails(data || []);
    } catch (e: any) { showError(e.message); } finally { setLoading(false); }
  };

  const totals = useMemo(() => {
    const isSec = SECONDARY_CODES.includes(masterSummary?.Code);
    const breakdown: Record<string, any> = {};

    summaryDetails.forEach(detail => {
      const regName = detail.region || "Unknown";
      const distName = detail.district || "Unknown";
      let reg = 0;
      let streams = 0;
      const isP = detail.center_number?.startsWith('P');

      if (isSec) {
        const subCode = (masterSummary?.Code === "ACSEE") ? "111" : "011";
        reg = isP ? Math.max(...Object.keys(detail).filter(k => !['id','mid','region','district','center_name','center_number','is_latest','version','created_at'].includes(k)).map(k => Number(detail[k]) || 0), 0) : (Number(detail[subCode]) || 0);
        streams = Math.ceil(reg / 40);
      } else {
        reg = detail.registered || 0;
        const base = Math.floor(reg / 25);
        streams = (reg % 25) >= 5 ? base + 1 : Math.max(base, reg > 0 ? 1 : 0);
      }

      if (!breakdown[regName]) breakdown[regName] = { name: regName, totalRegistered: 0, totalStreams: 0, totalCenters: 0, districts: {} };
      if (!breakdown[regName].districts[distName]) breakdown[regName].districts[distName] = { totalRegistered: 0, totalCenters: 0, totalStreams: 0, sCount: 0, pCount: 0, sRegistered: 0, pRegistered: 0 };

      const d = breakdown[regName].districts[distName];
      d.totalRegistered += reg; d.totalCenters += 1; d.totalStreams += streams;
      if (isSec) { if (isP) { d.pCount++; d.pRegistered += reg; } else { d.sCount++; d.sRegistered += reg; } }
      breakdown[regName].totalRegistered += reg; breakdown[regName].totalStreams += streams; breakdown[regName].totalCenters += 1;
    });

    return Object.values(breakdown).sort((a,b) => a.name.localeCompare(b.name));
  }, [summaryDetails, masterSummary]);

  const stats = useMemo(() => {
    return {
      regions: totals.length,
      districts: totals.reduce((a, b) => a + Object.keys(b.districts).length, 0),
      centers: summaryDetails.length,
      sCenters: totals.reduce((a, b) => a + Object.values(b.districts).reduce((x,y:any) => x + y.sCount, 0), 0),
      pCenters: totals.reduce((a, b) => a + Object.values(b.districts).reduce((x,y:any) => x + y.pCount, 0), 0),
      registered: totals.reduce((a, b) => a + b.totalRegistered, 0),
      streams: totals.reduce((a, b) => a + b.totalStreams, 0),
    };
  }, [totals, summaryDetails]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Spinner size="lg" /></div>;

  const isSec = SECONDARY_CODES.includes(masterSummary?.Code);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 space-y-10 max-w-[1700px] mx-auto pb-32">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Master Summary Overview for {masterSummary?.Code}-{masterSummary?.Year}
          </h1>
          
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Input 
              className="w-full md:w-72 bg-slate-50 border-none h-11 rounded-xl pl-10 focus:ring-2 focus:ring-blue-500 transition-all" 
              placeholder="Filter regions..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
            />
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>        
        </div>
      </div>

      {/* TOP KPI DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        {/* Regions & Districts */}
        <div className="lg:col-span-3 grid grid-rows-2 gap-4">
          <Card className="border-none shadow-sm bg-indigo-600 text-white rounded-[1.5rem] overflow-hidden relative group">
             <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">Total Regions</p>
                    <h3 className="text-3xl font-black"><CountUp value={stats.regions} /></h3>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform">
                    <Landmark size={24} />
                </div>
             </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-slate-900 text-white rounded-[1.5rem] overflow-hidden relative group">
             <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Districts</p>
                    <h3 className="text-3xl font-black"><CountUp value={stats.districts} /></h3>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md group-hover:scale-110 transition-transform">
                    <MapPinned size={24} />
                </div>
             </CardContent>
          </Card>
        </div>

        {/* CENTERS CARD - CONDITIONAL WIDTH */}
        <Card className="lg:col-span-5 border-none bg-white shadow-xl shadow-blue-900/5 rounded-[2rem] overflow-hidden ring-1 ring-slate-200/50">
          <CardContent className="p-0 flex flex-col sm:flex-row h-full">
            <div className={`${isSec ? 'sm:w-1/2' : 'w-full'} p-8 flex flex-col justify-between bg-gradient-to-br from-blue-600 to-blue-700 text-white relative overflow-hidden transition-all duration-500`}>
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><School size={120} /></div>
                <div>
                    <Badge className="bg-white/20 hover:bg-white/20 border-none text-white mb-4">Examination Centers</Badge>
                    <h2 className="text-6xl font-black tracking-tighter"><CountUp value={stats.centers} /></h2>
                </div>
                <div className="text-[10px] font-medium text-blue-200"></div>
            </div>

            {isSec && (
                <div className="sm:w-1/2 p-8 flex flex-col justify-center gap-6 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><GraduationCap size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">School (S)</p>
                            <p className="text-3xl font-black text-slate-900"><CountUp value={stats.sCenters}/></p>
                        </div>
                    </div>
                    <div className="h-px bg-slate-100 w-full" />
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600"><Building2 size={24} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Private (P)</p>
                            <p className="text-3xl font-black text-slate-900"><CountUp value={stats.pCenters}/></p>
                        </div>
                    </div>
                </div>
            )}
          </CardContent>
        </Card>

        {/* PRO REGISTERED & STREAMS CARDS */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-4 h-full">
          <Card className="border-none shadow-sm bg-white rounded-[2rem] p-8 flex flex-col justify-between hover:shadow-xl transition-all border border-slate-100 group">
             <div className="p-4 bg-emerald-500 text-white w-fit rounded-2xl shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                <Users size={24} />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">Candidates</p>
                <h3 className="text-3xl font-[1000] text-slate-900 tracking-tighter leading-none"><CountUp value={stats.registered}/></h3>
             </div>
          </Card>
          <Card className="border-none shadow-sm bg-white rounded-[2rem] p-8 flex flex-col justify-between hover:shadow-xl transition-all border border-slate-100 group">
             <div className="p-4 bg-purple-600 text-white w-fit rounded-2xl shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                <Layers size={24} />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">Streams</p>
                <h3 className="text-3xl font-[1000] text-slate-900 tracking-tighter leading-none"><CountUp value={stats.streams}/></h3>
             </div>
          </Card>
        </div>
      </div>

      {/* REGIONAL ACCORDIONS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                <div className="h-1 w-6 bg-blue-600 rounded-full" /> Regional Data Breakdown
            </h2>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {totals.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(region => (
            <AccordionItem key={region.name} value={region.name} className="border-none bg-white rounded-[2rem] shadow-sm hover:shadow-md transition-all overflow-hidden ring-1 ring-slate-200/50">
              <AccordionTrigger className="px-8 py-7 hover:no-underline [&[data-state=open]]:bg-slate-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between w-full pr-6 gap-6">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-3xl bg-slate-900 flex items-center justify-center text-xl font-black text-white shadow-lg">{region.name[0]}</div>
                    <div className="text-left">
                      <span className="font-black text-2xl text-slate-900">{region.name}</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{Object.keys(region.districts).length} Districts</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 lg:gap-14">
                    <RegionIndicator label="Centers" value={region.totalCenters} icon={<School size={14}/>} color="blue" />
                    <RegionIndicator label="Candidates" value={region.totalRegistered} icon={<Users size={14}/>} color="emerald" />
                    <RegionIndicator label="Streams" value={region.totalStreams} icon={<Layers size={14}/>} color="purple" />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-8 pb-10 pt-4 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                  {Object.entries(region.districts).map(([dName, dStats]: [string, any]) => (
                    <div key={dName} className="p-7 rounded-[2.5rem] bg-white border border-slate-200/60 shadow-sm hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300">
                      <div className="flex items-center gap-3 mb-6">
                         <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><MapPin size={16} /></div>
                         <h4 className="font-black text-slate-900 uppercase text-sm tracking-tight">{dName}</h4>
                      </div>
                      
                      <div className="space-y-6">
                        {isSec ? (
                          <div className="grid grid-cols-2 gap-4">
                            <MiniPill label="School (S)" value={dStats.sCount} total={dStats.sRegistered} color="blue" />
                            <MiniPill label="Private (P)" value={dStats.pCount} total={dStats.pRegistered} color="orange" />
                          </div>
                        ) : (
                          <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Centers</span>
                            <span className="font-black text-blue-600 text-lg">{dStats.totalCenters}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between px-1 pt-2 border-t border-slate-50">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5 tracking-tighter">Registered</p>
                                <p className="text-2xl font-black text-emerald-600 tracking-tighter"><CountUp value={dStats.totalRegistered}/></p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5 tracking-tighter">Streams</p>
                                <p className="text-2xl font-black text-purple-600 tracking-tighter"><CountUp value={dStats.totalStreams}/></p>
                            </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

// --- Sub-components ---
const RegionIndicator = ({ label, value, icon, color }: any) => {
    const colors: any = { blue: "text-blue-600", emerald: "text-emerald-600", purple: "text-purple-600" };
    return (
        <div className="hidden sm:flex flex-col items-end">
            <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-slate-300">{icon}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            </div>
            <p className={`font-black text-xl tracking-tight ${colors[color]}`}><CountUp value={value} /></p>
        </div>
    );
};

const MiniPill = ({ label, value, total, color }: any) => {
    const accents: any = { 
        blue: "bg-blue-50/50 text-blue-600 border-blue-100/50", 
        orange: "bg-orange-50/50 text-orange-600 border-orange-100/50" 
    };
    return (
        <div className={`p-4 rounded-3xl border ${accents[color]} flex flex-col gap-1.5 shadow-sm transition-transform hover:scale-[1.02]`}>
            <div className="flex justify-between items-center">
                <span className="text-[11px] font-black uppercase tracking-tight">{label}</span>
                <span className="text-lg font-black">{value}</span>
            </div>
            <div className="text-[10px] font-bold opacity-70 border-t border-current/10 pt-1.5">
                <CountUp value={total} /> <span className="opacity-60">Candidates</span>
            </div>
        </div>
    );
};

export default MasterSummaryOverviewPage;