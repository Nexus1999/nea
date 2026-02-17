"use client";

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format } from "date-fns";
import { MapPin, Hash, BookOpen, CalendarDays, Tag, GraduationCap } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SecondaryMasterSummary } from "@/types/mastersummaries";
import abbreviateSchoolName from "@/utils/abbreviateSchoolName";

interface SecondarySchoolDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolDetails?: SecondaryMasterSummary | null;
  examinationCode: string; // To determine which subject codes to display
  subjectsMap: Map<string, string>; // New prop: Map of subject_code to subject_name
}

// Define subject codes for secondary examinations
const CSEE_FTNA_SUBJECT_CODES = [
  '011','012','013','014','015','016','017','018','019','021','022','023','024','025','026',
  '031','032','033','034','035','036','041','042','050','051','052','061','062','071','072',
  '073','074','080','081','082','083','087','088','090','091'
];
const ACSEE_SUBJECT_CODES = [
  '111','112','113','114','115','116','118','121','122','123','125','126','131','132','133',
  '134','136','137','141','142','151','152','153','155','161'
];

const SecondarySchoolDetailsDrawer: React.FC<SecondarySchoolDetailsDrawerProps> = ({ open, onOpenChange, schoolDetails, examinationCode, subjectsMap }) => {
  if (!schoolDetails) {
    return null;
  }

  const getSubjectCodes = (code: string) => {
    if (['CSEE', 'FTNA'].includes(code)) {
      return CSEE_FTNA_SUBJECT_CODES;
    } else if (code === 'ACSEE') {
      return ACSEE_SUBJECT_CODES;
    }
    return [];
  };

  const relevantSubjectCodes = getSubjectCodes(examinationCode);

  // Filter out subject codes that have a value of 0 or are not present
  const subjectsWithValues = relevantSubjectCodes.filter(code => 
    Object.prototype.hasOwnProperty.call(schoolDetails, code) && (schoolDetails[code] as number) > 0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-3xl font-bold text-gray-800">School Details</SheetTitle>
          <SheetDescription className="text-gray-600">
            Detailed subject registration data for <span className="font-semibold text-gray-800">{abbreviateSchoolName(schoolDetails.center_name)}</span> ({schoolDetails.center_number}).
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-8 scrollbar-hidden">
          {/* General Information */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
              <MapPin className="h-6 w-6 text-neas-green" /> General Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Center Number</p>
                <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-500" /> {schoolDetails.center_number}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Center Name</p>
                <p className="text-base font-semibold text-gray-900">{abbreviateSchoolName(schoolDetails.center_name)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Region</p>
                <p className="text-base font-semibold text-gray-900">{schoolDetails.region}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                <p className="text-xs font-medium text-gray-500 mb-1">District</p>
                <p className="text-base font-semibold text-gray-900">{schoolDetails.district}</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Subject Registration Data */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-neas-green" /> Subject Registration
            </h3>
            {subjectsWithValues.length > 0 ? (
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-50 z-10">
                    <TableRow>
                      <TableHead className="h-10 px-4 text-base font-semibold text-gray-700">Subject</TableHead>
                      <TableHead className="h-10 px-4 text-base font-semibold text-gray-700 text-right">Registered Students</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjectsWithValues.map((code, index) => (
                      <TableRow key={code} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <TableCell className="py-3 px-4 text-base font-medium text-gray-800">
                          {code} - {subjectsMap.get(code) || 'Unknown Subject'}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-base text-gray-700 text-right">{schoolDetails[code] as number}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-gray-500 p-4 bg-white rounded-lg shadow-sm border">No subject registration data with values greater than 0 found for this school.</p>
            )}
          </section>

          <Separator />

          {/* Audit Information */}
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-neas-green" /> Audit Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Data Version</p>
                <p className="text-base font-semibold text-gray-900">{schoolDetails.version}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Created At</p>
                <p className="text-base font-semibold text-gray-900">{format(new Date(schoolDetails.created_at), 'PPP')}</p>
              </div>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SecondarySchoolDetailsDrawer;