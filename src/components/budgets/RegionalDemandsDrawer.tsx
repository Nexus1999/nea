"use client";

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Package } from "lucide-react";
import RegionalDemandsTable from "./transportation/RegionalDemandsTable";

interface RegionalDemandsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  budgetId: string;
  budgetTitle: string;
}

const RegionalDemandsDrawer: React.FC<RegionalDemandsDrawerProps> = ({
  isOpen,
  onClose,
  budgetId,
  budgetTitle,
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-[500px] p-0 flex flex-col bg-white border-none shadow-2xl">
        <div className="bg-slate-900 text-white p-6 shrink-0">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <Package className="h-5 w-5 text-indigo-400" />
              Regional Demands
            </SheetTitle>
            <SheetDescription className="text-slate-400">
              Manage box counts for <span className="text-white font-bold">{budgetTitle}</span>
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <RegionalDemandsTable budgetId={budgetId} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RegionalDemandsDrawer;