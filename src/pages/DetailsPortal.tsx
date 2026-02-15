import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, CheckCircle2, Users, FileText, Shield } from "lucide-react";

const Index = () => {
  const jobId = "48d88269-5fa4-4670-9704-dddef9303e29";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4 relative overflow-hidden font-sans selection:bg-orange-200 selection:text-orange-900">
      <div className="absolute top-20 left-20 w-72 h-72 bg-orange-300/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '700ms'}} />
      
      <div className="text-center max-w-2xl space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="space-y-6">
          <div className="inline-block relative">
            <div className="w-24 h-24 bg-gradient-to-br from-red-600 via-orange-600 to-yellow-500 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-orange-300/50 relative overflow-hidden mx-auto">
              <span className="font-black text-white text-4xl relative z-10">N</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/30 to-transparent" />
            </div>
            <div className="absolute -top-2 -right-2 text-yellow-400 text-2xl animate-bounce">✨</div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 tracking-tighter leading-none">
              NEAS PORTAL
            </h1>
            <p className="text-xs font-black text-orange-600 uppercase tracking-[0.3em]">
              Mfumo wa Uhakiki wa Taarifa za Walimu
            </p>
          </div>
        </div>

        <p className="text-lg md:text-xl text-slate-600 font-medium leading-relaxed px-4">
          Karibu kwenye mfumo wa uhakiki wa taarifa za walimu. 
          <span className="block mt-2 text-orange-600 font-bold">Tafadhali hakiki taarifa zako kwa umakini.</span>
        </p>

        <div className="bg-white/95 backdrop-blur-sm p-8 md:p-12 rounded-[2.5rem] shadow-2xl shadow-orange-200/50 border-2 border-orange-100 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 border border-orange-100">
              <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-orange-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-wider text-slate-600">Rahisi</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-100">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-wider text-slate-600">Salama</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-yellow-50 to-red-50 border border-orange-100">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-red-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-wider text-slate-600">Haraka</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Link to={`/portal/${jobId}`} className="block">
              <Button className="w-full h-16 bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 hover:from-red-700 hover:via-orange-700 hover:to-yellow-700 text-white rounded-[1.25rem] font-black uppercase tracking-widest shadow-2xl shadow-orange-300/50 active:scale-[0.98] transition-all group relative overflow-hidden">
                <div className="flex items-center justify-center gap-3 relative z-10">
                  <Sparkles className="h-5 w-5" />
                  <span>Fungua Portal</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Button>
            </Link>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <FileText className="h-4 w-4 text-orange-400" />
              <p className="font-medium">
                Utahitaji <span className="font-bold text-orange-600">Check Number</span> yako ili kuendelea
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 relative z-10">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;