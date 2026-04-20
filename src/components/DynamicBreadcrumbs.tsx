"use client";

import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronRight, History } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Home, Clock, DollarSign, Database, PenLine, UserCog, Building, Tags, Shield, FileText,
  Settings, Users, LayoutDashboard, Globe, MapPin, BookOpen, GraduationCap, Accessibility,
  UserCheck, User, Truck, Sparkles, MapPinned
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <Home className="h-4 w-4" />,
  timetables: <Clock className="h-4 w-4" />,
  budgets: <DollarSign className="h-4 w-4" />,
  transportation: <Truck className="h-4 w-4" />,
  'action-plan': <LayoutDashboard className="h-4 w-4" />,
  'route-planner': <MapPinned className="h-4 w-4" />,
  'ai-suggester': <Sparkles className="h-4 w-4" />,
  mastersummaries: <Database className="h-4 w-4" />,
  supervisors: <UserCog className="h-4 w-4" />,
  miscellaneous: <Tags className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  profile: <User className="h-4 w-4" />,
  'special-needs': <Accessibility className="h-4 w-4" />,
  version: <History className="h-4 w-4" />
};

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  timetables: "Timetables",
  budgets: "Budgets",
  transportation: "Budgets",
  'action-plan': "Action Plan",
  'route-planner': "Manual Planner",
  'ai-suggester': "AI Suggester",
  mastersummaries: "Master Summaries",
  supervisors: "Supervisions",
  miscellaneous: "Miscellaneous",
  security: "Security",
  settings: "Settings",
  profile: "Profile",
  'special-needs': "Special Needs",
};

const isSkippable = (value: string) => {
  return /^\d+$/.test(value) || value.match(/^[0-9a-fA-F-]{36}$/);
};

const DynamicBreadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  if (pathnames.length <= 1) return null;

  return (
    <Breadcrumb className="text-sm">
      <BreadcrumbList className="flex flex-wrap items-center gap-1.5">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard" className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium">
              {iconMap.dashboard} Dashboard
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {pathnames.slice(1).map((value, index) => {
          const actualIndex = index + 1;
          if (isSkippable(value)) return null;

          const remainingSegments = pathnames.slice(actualIndex + 1);
          const isLastVisible = remainingSegments.every(seg => isSkippable(seg));

          let to = `/${pathnames.slice(0, actualIndex + 1).join('/')}`;
          if (value === 'transportation') to = '/dashboard/budgets';

          const displayName = labelMap[value] || value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
          const icon = iconMap[value] || <FileText className="h-4 w-4" />;

          return (
            <React.Fragment key={to}>
              <BreadcrumbSeparator><ChevronRight className="h-4 w-4 text-gray-400" /></BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLastVisible ? (
                  <BreadcrumbPage className="font-medium text-gray-900 flex items-center gap-1.5">
                    {icon} {displayName}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={to} className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium">
                      {icon} {displayName}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default DynamicBreadcrumbs;