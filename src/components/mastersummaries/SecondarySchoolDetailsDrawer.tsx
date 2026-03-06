"use client";

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format } from "date-fns";
import { MapPin, Hash, CalendarDays, GraduationCap } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SecondaryMasterSummary } from "@/types/mastersummaries";
import abbreviateSchoolName from "@/utils/abbreviateSchoolName";

interface SecondarySchoolDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolDetails?: SecondaryMasterSummary | null;
  examinationCode: string;
  subjectsMap: Map<string, string>;
}

const CSEE_FTNA_SUBJECT_CODES = [
  '011','012','013','014','015','016','017','018','019','021','022','023','024','025','026',
  '031','032','033','034','035','036','041','042','050','051','052','061','062','071','072',
  '073','074','080','081','082','083','087','088','090','091'
];

const ACSEE_SUBJECT_CODES = [
  '111','112','113','114','115','116','118','121','122','123','125','126','131','132','133',
  '134','136','137','141','142','151','152','153','155','161'
];

const UALIMU_SUBJECT_CODES = [
  '513','514','520','521','522-E','531','532','541','542','551','552','553','554','566','567',
  '585','586','587','588','589','595','596','597','598','599','610','611','520-E','616','522',
  '516','521-E','517','580','590','710','711','712','713','715','716','717','719','721','722',
  '724','725','731','732','733','735','736','737','738','740','750','751','752','753','761',
  '762','763','764','612','613','614','615','621','622','624','631','632','633','634','635',
  '636','638','640','641','650','651','652','654','680','682','683','684','686','687','689',
  '691','510','560','561','562','563','564','565','571','572','573','574','581','582','583',
  '584','661','664','665','669','670','672','673','674','675','676','679','692','693','694',
  '695','696'
];

const UALIMU_CODES = ['DSEE', 'GATCE', 'GATSCCE', 'DPEE', 'DSPEE', 'DPPEE'];

const getSubjectCodes = (code: string): string[] => {
  if (['CSEE', 'FTNA'].includes(code)) return CSEE_FTNA_SUBJECT_CODES;
  if (code === 'ACSEE') return ACSEE_SUBJECT_CODES;
  if (UALIMU_CODES.includes(code)) return UALIMU_SUBJECT_CODES;
  return [];
};

const SecondarySchoolDetailsDrawer: React.FC<SecondarySchoolDetailsDrawerProps> = ({
  open,
  onOpenChange,
  schoolDetails,
  examinationCode,
  subjectsMap,
}) => {
  if (!schoolDetails) return null;

  const relevantSubjectCodes = getSubjectCodes(examinationCode);

  // Only show subjects present on the record with a value > 0
  const subjectsWithValues = relevantSubjectCodes.filter(code =>
    Object.prototype.hasOwnProperty.call(schoolDetails, code) &&
    (schoolDetails[code] as number) > 0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-3xl font-bold text-gray-800">School Details</SheetTitle>
          <SheetDescription className="text-gray-600">
            Detailed subject registration data for{' '}
            <span className="font-semibold text-gray-800">
              {abbreviateSchoolName(schoolDetails.center_name)}
            </span>{' '}
            ({schoolDetails.center_number}).
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
                <p className="text-base font-semibold text-gray-900">
                  {abbreviateSchoolName(schoolDetails.center_name)}
                </p>
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
                      <TableHead className="h-10 px-4 text-base font-semibold text-gray-700 text-right">
                        Registered Students
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjectsWithValues.map((code, index) => (
                      <TableRow key={code} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <TableCell className="py-3 px-4 text-base font-medium text-gray-800">
                          {code} – {subjectsMap.get(code) || 'Unknown Subject'}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-base text-gray-700 text-right">
                          {(schoolDetails[code] as number).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-gray-500 p-4 bg-white rounded-lg shadow-sm border">
                No subject registration data with values greater than 0 found for this school.
              </p>
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
                <p className="text-base font-semibold text-gray-900">
                  {format(new Date(schoolDetails.created_at), 'PPP')}
                </p>
              </div>
            </div>
          </section>

        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SecondarySchoolDetailsDrawer;