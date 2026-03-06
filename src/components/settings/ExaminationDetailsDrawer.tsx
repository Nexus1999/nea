"use client";

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from "date-fns";
import { BookOpen, Hash, Tag, Layers, CheckCircle2, XCircle, CalendarDays, Loader2, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Examination {
  exam_id: number;
  examination: string;
  code: string;
  level: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface ExaminationDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examination?: Examination;
  loading: boolean;
}

const ExaminationDetailsDrawer: React.FC<ExaminationDetailsDrawerProps> = ({ open, onOpenChange, examination, loading }) => {
  if (!examination) return null;

  const DetailItem = ({ icon: Icon, label, value, className }: any) => (
    <div className={cn("flex flex-col gap-1 px-4 py-2 rounded-lg bg-secondary/30 border border-border/40", className)}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-[10px] font-black text-muted-foreground/80 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground break-words">
        {value || "N/A"}
      </p>
    </div>
  );

  const isActive = examination.status?.toLowerCase() === 'active';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[480px] p-0 flex flex-col gap-0 border-l shadow-2xl">
        
        {/* Header Section */}
        <div className="bg-gradient-to-b from-primary/[0.04] to-transparent p-6 pb-5">
          <SheetHeader className="space-y-3 text-left">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary text-primary-foreground rounded-xl shadow-md shrink-0">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-2xl font-serif font-bold tracking-tight text-foreground truncate">
                  {examination.examination}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground/70" />
                  <span className="font-mono text-sm text-muted-foreground font-bold uppercase tracking-tighter">
                    Code: {examination.code}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex">
              <div className={cn(
                "px-3 py-1 rounded-md text-[10px] font-black border flex items-center gap-1.5 tracking-widest uppercase",
                isActive 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-rose-50 text-rose-700 border-rose-200"
              )}>
                {isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {examination.status}
              </div>
            </div>
          </SheetHeader>
        </div>

        <Separator />

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Syncing Data...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            
            {/* Section: Exam Configuration */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70 flex items-center gap-2 px-1">
                <Layers className="h-3.5 w-3.5" /> Examination Setup
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <DetailItem label="Exam Code" value={examination.code} icon={Tag} />
                <DetailItem label="Edu Level" value={examination.level} icon={Layers} />
                <DetailItem label="System ID" value={examination.exam_id} icon={Hash} />
                <DetailItem label="Current Status" value={examination.status} icon={CheckCircle2} />
              </div>
            </div>

            <Separator className="opacity-50" />

            {/* Section: Metadata */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70 flex items-center gap-2 px-1">
                <CalendarDays className="h-3.5 w-3.5" /> System Audit
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailItem 
                  label="Registered On" 
                  value={format(new Date(examination.created_at), 'PPP')} 
                  icon={CalendarDays} 
                />
                <DetailItem 
                  label="Last Modified" 
                  value={examination.updated_at ? format(new Date(examination.updated_at), 'PPP p') : "Original Record"} 
                  icon={Clock} 
                />
              </div>
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-secondary/20 border-t mt-auto">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest">
            <span className="font-serif italic text-primary/60">NECTA Registry</span>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>

      </SheetContent>
    </Sheet>
  );
};

export default ExaminationDetailsDrawer;