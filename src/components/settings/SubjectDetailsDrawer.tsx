"use client";

import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import {
  BookOpen,
  Hash,
  CalendarDays,
  Loader2,
  Calculator,
  XCircle,
} from "lucide-react";

interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
  exam_code: string;
  status: string;
  created_at: string;
  examination_name?: string;
  normal_booklet_multiplier: number;
  graph_booklet_multiplier: number;
}

interface SubjectDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject;
  loading: boolean;
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  active: {
    label: "Active",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  inactive: {
    label: "Inactive",
    color: "text-rose-700 bg-rose-50 border-rose-200",
    dot: "bg-rose-500",
  },
  pending: {
    label: "Pending",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    dot: "bg-amber-400",
  },
};

const SubjectDetailsDrawer: React.FC<SubjectDetailsDrawerProps> = ({
  open,
  onOpenChange,
  subject,
  loading,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setMounted(true), 60);
      return () => clearTimeout(t);
    } else {
      setMounted(false);
    }
  }, [open]);

  if (!subject) return null;

  const statusKey = subject.status?.toLowerCase() ?? "pending";
  const status = statusConfig[statusKey] ?? statusConfig["pending"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col p-0 border-l border-zinc-200 shadow-2xl bg-white overflow-hidden"
        style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" }}
      >
        {/* Decorative accent strip */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400" />

        {/* Header */}
        <SheetHeader className="px-8 pt-8 pb-6 border-b border-zinc-100 bg-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-100">
                  <BookOpen className="h-5 w-5 text-white" strokeWidth={1.8} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border-2 border-white shadow">
                  <div className={`w-full h-full rounded-full ${status.dot}`} />
                </div>
              </div>
              <div>
                <SheetTitle
                  className="text-xl font-bold text-zinc-900 leading-tight tracking-tight"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {subject.subject_name}
                </SheetTitle>
                <SheetDescription className="text-sm text-zinc-400 mt-0.5 font-mono tracking-widest uppercase">
                  {subject.subject_code}
                </SheetDescription>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${status.color}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
        </SheetHeader>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-zinc-50">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
            <p className="text-sm text-zinc-400 font-medium tracking-wide">
              Loading subject details…
            </p>
          </div>
        ) : (
          <div
            className="flex-1 overflow-y-auto bg-zinc-50/60"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#d4d4d8 transparent" }}
          >
            <div
              className="px-8 py-8 space-y-8"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 0.35s ease, transform 0.35s ease",
              }}
            >
              {/* General Information */}
              <Section icon={<Hash className="h-4 w-4" />} title="General Information">
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard label="Subject Code" value={subject.subject_code} mono />
                  <InfoCard label="Exam Code" value={subject.exam_code} mono />
                  <InfoCard
                    label="Examination Name"
                    value={subject.examination_name || "—"}
                    span
                  />
                </div>
              </Section>

              {/* Stationery Multipliers */}
              <Section icon={<Calculator className="h-4 w-4" />} title="Stationery Multipliers">
                <div className="grid grid-cols-2 gap-3">
                  <MultiplierCard
                    label="Normal Booklet"
                    value={subject.normal_booklet_multiplier}
                    accent="emerald"
                  />
                  <MultiplierCard
                    label="Graph Booklet"
                    value={subject.graph_booklet_multiplier}
                    accent="teal"
                  />
                </div>
              </Section>

              {/* Audit */}
              <Section icon={<CalendarDays className="h-4 w-4" />} title="Audit">
                <div className="bg-white rounded-xl border border-zinc-200 px-5 py-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">
                    Created At
                  </p>
                  <p className="text-sm font-semibold text-zinc-800">
                    {format(new Date(subject.created_at), "MMMM d, yyyy")}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {format(new Date(subject.created_at), "h:mm a")}
                  </p>
                </div>
              </Section>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 px-8 py-5 border-t border-zinc-100 bg-white flex items-center justify-between">
          <span className="text-xs text-zinc-300 font-mono">ID #{subject.id}</span>
          <button
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <XCircle className="h-4 w-4" />
            Close
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/* ── Sub-components ── */

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-emerald-500">{icon}</span>
        <h3
          className="text-xs font-bold uppercase tracking-widest text-zinc-400"
          style={{ letterSpacing: "0.1em" }}
        >
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function InfoCard({
  label,
  value,
  mono,
  span,
}: {
  label: string;
  value: string;
  mono?: boolean;
  span?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-zinc-200 px-5 py-4 hover:border-zinc-300 hover:shadow-sm transition-all duration-150 ${
        span ? "col-span-2" : ""
      }`}
    >
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p
        className={`text-sm font-semibold text-zinc-800 truncate ${
          mono ? "font-mono tracking-wide" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MultiplierCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "emerald" | "teal";
}) {
  const colors = {
    emerald: "from-emerald-50 to-white border-emerald-100 text-emerald-700",
    teal: "from-teal-50 to-white border-teal-100 text-teal-700",
  };
  return (
    <div
      className={`bg-gradient-to-b ${colors[accent]} rounded-xl border px-5 py-5 flex flex-col gap-1 hover:shadow-sm transition-all duration-150`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
      <p className="text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.03em" }}>
        {value.toFixed(2)}
      </p>
      <p className="text-xs font-medium opacity-60">multiplier</p>
    </div>
  );
}

export default SubjectDetailsDrawer;