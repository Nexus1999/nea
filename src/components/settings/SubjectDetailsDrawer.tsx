"use client";

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format } from "date-fns";
import { BookOpen, Hash, Tag, CheckCircle, CalendarDays, Loader2, Calculator } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
  exam_code: string;
  status: string;
  created_at: string;
  examination_name?: string; // To display full examination name
  normal_booklet_multiplier: number; // New field
  graph_booklet_multiplier: number; // New field
}

interface SubjectDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject;
  loading: boolean; // New loading prop for fetching related data
}

const SubjectDetailsDrawer: React.FC<SubjectDetailsDrawerProps> = ({ open, onOpenChange, subject, loading }) => {
  if (!subject) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-3xl font-bold text-gray-800">Subject Details</SheetTitle>
          <SheetDescription className="text-gray-600">
            View detailed information about the <span className="font-semibold text-gray-800">{subject.subject_name}</span> subject.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-neas-green" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-6 space-y-8 scrollbar-hidden">
            {/* General Information */}
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-neas-green" /> General Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Subject Code</p>
                  <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-500" /> {subject.subject_code}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Subject Name</p>
                  <p className="text-base font-semibold text-gray-900">{subject.subject_name}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Examination Code</p>
                  <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-500" /> {subject.exam_code}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Examination Name</p>
                  <p className="text-base font-semibold text-gray-900">{subject.examination_name || 'N/A'}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                  <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-500" /> {subject.status}
                  </p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Multiplier Information */}
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                <Calculator className="h-6 w-6 text-neas-green" /> Stationery Multipliers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Normal Booklet Multiplier</p>
                  <p className="text-base font-semibold text-gray-900">{subject.normal_booklet_multiplier.toFixed(2)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Graph Booklet Multiplier</p>
                  <p className="text-base font-semibold text-gray-900">{subject.graph_booklet_multiplier.toFixed(2)}</p>
                </div>
              </div>
            </section>

            <Separator />

            {/* Audit Information */}
            <section className="space-y-4">
              <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                <CalendarDays className="h-6 w-6 text-neas-green" /> Audit Information
              </h3>
              <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Created At</p>
                <p className="text-base font-semibold text-gray-900">{format(new Date(subject.created_at), 'PPP')}</p>
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default SubjectDetailsDrawer;