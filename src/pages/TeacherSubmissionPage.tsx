"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Loader2, CheckCircle2, Search, User, CreditCard, 
  ChevronRight, ArrowLeft, MapPin, Hash, Phone, Building2, AlertCircle,
  Check, ListRestart, GraduationCap, Sparkles
} from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";

const TeacherSubmissionPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [region, setRegion] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [invalidId, setInvalidId] = useState(false);

  const TARGET_REGION_CODE = 2;

  const [formData, setFormData] = useState({
    teacher_name: '',
    check_number: '',
    district_number: '',
    workstation: '',
    index_no: '',
    csee_year: '',
    phone: '',
    account_name: '',
    account_number: '',
    bank_name: '',
    region_code: TARGET_REGION_CODE
  });

  const isValidUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!jobId || !isValidUUID(jobId)) {
        setInvalidId(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data: rData } = await supabase
          .from('regions')
          .select('region_code, region_name')
          .eq('region_code', TARGET_REGION_CODE)
          .maybeSingle();
        
        setRegion(rData || { region_code: TARGET_REGION_CODE, region_name: "Region 2" });

        const { data: tData, error: tError } = await supabase
          .from('teacher_assignments')
          .select(`
            teacher_id,
            primaryteachers (
              id,
              teacher_name,
              check_number,
              district_number,
              region_code,
              workstation,
              index_no,
              csee_year,
              phone,
              account_name,
              account_number,
              bank_name
            )
          `)
          .eq('job_id', jobId);

        if (tError) throw tError;

        if (tData) {
          const validTeachers = tData
            .map((d: any) => d.primaryteachers)
            .filter(Boolean);
          setTeachers(validTeachers);
        }

        const targetDistricts = [201, 202, 203, 204, 205];
        const { data: dData, error: dError } = await supabase
          .from('districts')
          .select('district_number, district_name, region_number')
          .in('district_number', targetDistricts)
          .order('district_name', { ascending: true });

        if (dError) throw dError;
        setDistricts(dData || []);

      } catch (err: any) {
        showError(`Imeshindwa kupata taarifa: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId]);

  const handleSelect = (t: any) => {
    setSelectedTeacher(t);
    setFormData({
      teacher_name: t.teacher_name || '',
      check_number: t.check_number || '',
      district_number: t.district_number?.toString() || '',
      workstation: t.workstation || '',
      index_no: t.index_no || '',
      csee_year: t.csee_year?.toString() || '',
      phone: t.phone || '',
      account_name: t.account_name || '',
      account_number: t.account_number || '',
      bank_name: t.bank_name || '',
      region_code: t.region_code || TARGET_REGION_CODE
    });
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('primaryteachers')
        .update({
          teacher_name: formData.teacher_name.toUpperCase(),
          district_number: parseInt(formData.district_number),
          region_code: formData.region_code,
          workstation: formData.workstation,
          index_no: formData.index_no,
          csee_year: formData.csee_year ? parseInt(formData.csee_year) : null,
          phone: formData.phone,
          account_name: formData.account_name,
          account_number: formData.account_number,
          bank_name: formData.bank_name,
          status: 'active'
        })
        .eq('id', selectedTeacher.id);

      if (error) throw error;
      showSuccess("Taarifa zimehakikiwa kikamilifu!");
      setStep(3);
    } catch (err) {
      showError("Imeshindwa kuhifadhi. Tafadhali jaribu tena.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentDistrictName = districts.find(d => d.district_number.toString() === formData.district_number)?.district_name;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 relative overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-orange-300/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="relative z-10">
          <div className="relative">
            <div className="h-28 w-28 rounded-full border-4 border-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 animate-spin shadow-2xl shadow-orange-300/50" style={{maskImage: 'linear-gradient(transparent 40%, black)', WebkitMaskImage: 'linear-gradient(transparent 40%, black)'}} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-white rounded-full shadow-xl flex items-center justify-center">
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 text-2xl">N</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 text-center space-y-2 relative z-10">
          <p className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 tracking-tight animate-pulse">
            NEAS PORTAL
          </p>
          <p className="text-sm font-bold text-slate-600">Inapakia mfumo wa uhakiki...</p>
        </div>
      </div>
    );
  }

  if (invalidId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-6">
        <Card className="max-w-sm w-full border-none shadow-2xl rounded-[2rem] overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
          <CardContent className="p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-orange-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto rotate-3">
              <AlertCircle className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Kiungo Batili</h2>
              <p className="text-slate-500 text-sm leading-relaxed">Samahani, kiungo ulichotumia hakitambuliki kwenye mfumo wetu wa uhakiki.</p>
            </div>
            <Button onClick={() => navigate('/')} className="w-full h-14 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white font-bold shadow-lg">
              Rudi Nyumbani
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 font-sans selection:bg-orange-200 selection:text-orange-900">
      <header className="bg-white/90 backdrop-blur-xl border-b border-orange-100 px-6 py-4 sticky top-0 z-50 shadow-lg shadow-orange-100/50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-red-600 via-orange-600 to-yellow-500 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-300/50 relative overflow-hidden">
              <span className="font-black text-white text-base relative z-10">N</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/30 to-transparent" />
            </div>
            <div>
              <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 text-xl leading-none tracking-tighter">
                NEAS PORTAL
              </h1>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">
                 Uhakiki wa Walimu              </p>
            </div>
          </div>
          {step === 2 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setStep(1)} 
              className="rounded-xl font-bold text-slate-600 hover:text-orange-600 hover:bg-orange-50 transition-all"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Orodha
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 pb-32">
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-orange-500" />
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 tracking-tight">
                  Tafuta Taarifa Zako
                </h2>
              </div>
              <p className="text-slate-600 font-medium">Ingiza jina lako au  Check Number ili kuhakiki taarifa zako.</p>
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none z-10">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
              </div>
              <Input 
                placeholder="Andika Jina au Check Number..." 
                className="pl-14 h-16 bg-white border-2 border-orange-100 rounded-[1.25rem] shadow-lg shadow-orange-100/50 focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 text-lg font-medium transition-all hover:border-orange-200"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="grid gap-4">
              {teachers.length === 0 ? (
                <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-orange-200 shadow-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="h-8 w-8 text-orange-400" />
                  </div>
                  <p className="text-slate-500 font-bold">Hakuna walimu waliopatikana.</p>
                </div>
              ) : (
                teachers
                  .filter(t => 
                    t.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    t.check_number.includes(searchTerm)
                  )
                  .map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => handleSelect(t)} 
                      className="w-full bg-white/90 backdrop-blur-sm p-6 rounded-[1.5rem] border-2 border-orange-100 hover:border-orange-400 hover:shadow-2xl hover:shadow-orange-200/50 transition-all flex items-center justify-between group text-left relative overflow-hidden"
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-2xl flex items-center justify-center group-hover:from-orange-200 group-hover:to-yellow-200 transition-all shadow-md">
                          <User className="h-7 w-7 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 uppercase text-sm tracking-tight">{t.teacher_name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                              <Hash className="h-3 w-3" /> {t.check_number}
                            </span>
                            <span className="w-1.5 h-1.5 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full" />
                            <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
                              {t.workstation || "Kituo hakijatambuliwa"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-100 to-yellow-100 flex items-center justify-center group-hover:from-orange-600 group-hover:to-yellow-600 group-hover:text-white transition-all shadow-md relative z-10">
                        <ChevronRight className="h-5 w-5" />
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 tracking-tight">
                Hakiki Taarifa
              </h2>
              <p className="text-slate-600 font-medium">Tafadhali kagua na urekebishe taarifa zako hapa chini.</p>
            </div>

            <Card className="border-none shadow-2xl shadow-orange-200/50 rounded-[2.5rem] overflow-hidden bg-white/95 backdrop-blur-sm">
              <CardContent className="p-8 md:p-12 space-y-12">
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl flex items-center justify-center shadow-md">
                      <Building2 className="h-5 w-5 text-orange-600" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Taarifa za Kikazi</h3>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700 ml-1">Majina Kamili</Label>
                      <Input 
                        required 
                        value={formData.teacher_name} 
                        onChange={e => setFormData({...formData, teacher_name: e.target.value})} 
                        className="h-14 rounded-2xl border-2 border-orange-100 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 focus:bg-white focus:border-orange-400 font-bold uppercase text-slate-900 shadow-sm" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700 ml-1">Check Number</Label>
                        <div className="relative">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
                          <Input 
                            required
                            value={formData.check_number} 
                            onChange={e => setFormData({...formData, check_number: e.target.value})}
                            className="h-14 pl-11 rounded-2xl border-2 border-orange-100 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 focus:bg-white focus:border-orange-400 font-mono font-black text-slate-900 shadow-sm" 
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-700 ml-1">
                          Halmashauri
                          {formData.district_number && currentDistrictName && (
                            <span className="ml-2 text-xs text-orange-600 font-normal">
                              ({currentDistrictName})
                            </span>
                          )}
                        </Label>
                        
                        <Select 
                          required
                          value={formData.district_number} 
                          onValueChange={(val) => setFormData({...formData, district_number: val})}
                        >
                          <SelectTrigger className="h-14 rounded-2xl border-2 border-orange-100 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 font-bold hover:border-orange-300 focus:border-orange-400 shadow-sm">
                            <SelectValue placeholder="Chagua Wilaya" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-2 border-orange-100 shadow-2xl max-h-[300px]">
                            {districts.map(d => (
                              <SelectItem 
                                key={d.district_number} 
                                value={d.district_number.toString()} 
                                className="rounded-xl py-3 font-medium"
                              >
                                <span className="font-bold">{d.district_name}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700 ml-1">Kituo cha Kazi (Shule)</Label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
                        <Input 
                          required 
                          value={formData.workstation} 
                          onChange={e => setFormData({...formData, workstation: e.target.value})} 
                          className="h-14 pl-11 rounded-2xl border-2 border-orange-100 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 focus:bg-white focus:border-orange-400 font-bold shadow-sm" 
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl flex items-center justify-center shadow-md">
                      <GraduationCap className="h-5 w-5 text-orange-600" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Elimu & Mawasiliano</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700 ml-1">Namba ya Mtihani (CSEE)</Label>
                      <Input 
                        value={formData.index_no} 
                        onChange={e => setFormData({...formData, index_no: e.target.value})} 
                        placeholder="S0000/0000" 
                        className="h-14 rounded-2xl border-2 border-orange-100 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 focus:border-orange-400 font-bold shadow-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700 ml-1">Mwaka wa Kuhitimu</Label>
                      <Input 
                        type="number" 
                        value={formData.csee_year} 
                        onChange={e => setFormData({...formData, csee_year: e.target.value})} 
                        className="h-14 rounded-2xl border-2 border-orange-100 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 focus:border-orange-400 font-bold shadow-sm" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700 ml-1">Namba ya Simu</Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-400" />
                      <Input 
                        required 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                        placeholder="07XXXXXXXX" 
                        className="h-14 pl-11 rounded-2xl border-2 border-orange-100 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 focus:border-orange-400 font-bold shadow-sm" 
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl flex items-center justify-center shadow-md">
                      <CreditCard className="h-5 w-5 text-orange-600" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Taarifa za Malipo</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700 ml-1">Jina la Benki</Label>
                      <Input 
                        required 
                        placeholder="Mfano: CRDB, NMB, NBC..." 
                        value={formData.bank_name} 
                        onChange={e => setFormData({...formData, bank_name: e.target.value})} 
                        className="h-14 rounded-2xl border-2 border-orange-100 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 focus:bg-white focus:border-orange-400 font-bold shadow-sm" 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700 ml-1">Jina la Akaunti</Label>
                      <Input 
                        required 
                        value={formData.account_name} 
                        onChange={e => setFormData({...formData, account_name: e.target.value})} 
                        className="h-14 rounded-2xl border-2 border-orange-100 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 focus:bg-white focus:border-orange-400 font-bold shadow-sm" 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-slate-700 ml-1">Namba ya Akaunti</Label>
                      <Input 
                        required 
                        value={formData.account_number} 
                        onChange={e => setFormData({...formData, account_number: e.target.value})} 
                        className="h-14 rounded-2xl border-2 border-orange-100 bg-gradient-to-r from-orange-50/50 to-yellow-50/50 focus:bg-white focus:border-orange-400 font-mono font-black text-xl shadow-sm" 
                      />
                    </div>
                  </div>
                </section>

                <Button 
                  type="submit"
                  disabled={submitting} 
                  className="w-full h-16 bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white rounded-[1.25rem] font-black uppercase tracking-widest shadow-2xl shadow-orange-300/50 active:scale-[0.98] transition-all relative overflow-hidden group"
                >
                  {submitting ? (
                    <div className="flex items-center gap-3 relative z-10">
                      <Loader2 className="animate-spin h-5 w-5" />
                      <span>Inahifadhi...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 relative z-10">
                      <Check className="h-5 w-5" />
                      <span>Kamilisha Uhakiki</span>
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        )}

        {step === 3 && (
          <div className="text-center py-20 animate-in zoom-in-95 duration-700">
            <div className="relative inline-block mb-12">
              <div className="w-32 h-40 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-[2rem] mx-auto relative overflow-hidden shadow-2xl">
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-to-br from-orange-200 to-yellow-200 rounded-full shadow-inner">
                  <div className="absolute top-6 left-4 flex gap-3">
                    <div className="w-3 h-3 bg-slate-800 rounded-full" />
                    <div className="w-3 h-3 bg-slate-800 rounded-full" />
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-4 border-b-2 border-slate-800 rounded-full" />
                </div>
              </div>
              <div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full shadow-2xl flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 tracking-tight">
                Hongera! 🎉
              </h2>
              <p className="text-lg text-slate-600 font-medium leading-relaxed">
                Taarifa zako zimehakikiwa na kuhifadhiwa kikamilifu. 
                <span className="block mt-2 text-orange-600 font-bold">Asante!</span>
              </p>
            </div>

            <div className="mt-12 flex flex-col gap-4 max-w-xs mx-auto">
              <Button 
                onClick={() => { setStep(1); setSearchTerm(""); setSelectedTeacher(null); }} 
                className="h-16 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white font-black uppercase tracking-widest shadow-2xl shadow-orange-300/50 transition-all hover:scale-105"
              >
                <ListRestart className="h-5 w-5 mr-3" />
                Rudi Kwenye Orodha
              </Button>
              <Button 
                variant="ghost"
                onClick={() => navigate('/')} 
                className="h-14 rounded-2xl text-slate-500 font-bold hover:text-orange-600 hover:bg-orange-50"
              >
                Toka Kwenye Mfumo
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeacherSubmissionPage;