"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Calendar, Package, ArrowRight, Info } from "lucide-react";
import { SuggestedMsafara } from "@/utils/intelligentRoutePlanner";

interface SmartRouteSuggesterProps {
  routes: SuggestedMsafara[];
}

const SmartRouteSuggester: React.FC<SmartRouteSuggesterProps> = ({ routes }) => {
  if (routes.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
          <Truck className="w-5 h-5 text-indigo-600" />
          Suggested Logistics Plan
        </h3>
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">
          {routes.length} MSAFARA GENERATED
        </Badge>
      </div>

      <div className="grid gap-6">
        {routes.map((route) => (
          <Card key={route.msafaraNumber} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-slate-50/50 border-b py-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black">
                    {route.msafaraNumber}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-wide">{route.name}</CardTitle>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {route.startingPoint} → {route.regions[route.regions.length - 1].name}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {route.vehicles.map((v, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-white border-slate-200 text-[9px] font-black uppercase tracking-tighter px-2">
                      {v.quantity}x {v.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Path Visualization */}
              <div className="mb-8">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Route Path</p>
                <div className="flex items-center flex-wrap gap-y-4">
                  {route.pathDisplay.map((point, idx) => (
                    <React.Fragment key={idx}>
                      <div className={`flex flex-col items-center ${idx === 0 ? 'text-slate-400' : 'text-indigo-600'}`}>
                        <div className={`w-3 h-3 rounded-full border-2 ${idx === 0 ? 'bg-slate-200 border-slate-300' : 'bg-indigo-600 border-indigo-200'}`} />
                        <span className="text-[10px] font-black mt-2">{point}</span>
                      </div>
                      {idx < route.pathDisplay.length - 1 && (
                        <div className="flex-1 min-w-[30px] h-[2px] bg-slate-100 mx-2 mt-[-18px]" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Package className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Load</p>
                      <p className="text-sm font-black">{route.totalBoxes} Boxes / {route.totalTons} Tons</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Loading Date</p>
                      <p className="text-sm font-black">{route.loadingDate}</p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 bg-slate-50 rounded-2xl p-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Delivery Schedule</p>
                  <div className="space-y-2">
                    {route.regions.map((reg, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-indigo-600 w-4">{idx + 1}.</span>
                          <span className="text-xs font-bold">{reg.name}</span>
                          <ArrowRight className="w-3 h-3 text-slate-300" />
                          <span className="text-[10px] font-medium text-slate-500 italic">Receive at {reg.receivingPlace}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-slate-900">{reg.boxes} BOXES</span>
                          <span className="text-[10px] font-bold text-slate-400">{reg.deliveryDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {route.notes && (
                <div className="mt-6 flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                  <p className="text-[10px] font-medium text-amber-800 leading-relaxed">
                    <span className="font-black uppercase tracking-widest mr-1">Note:</span>
                    {route.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SmartRouteSuggester;