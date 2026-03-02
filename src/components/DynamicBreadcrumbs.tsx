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
import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Home, Clock, DollarSign, Database, PenLine, UserCog, Building, Tags, Shield, FileText,
  Settings, Users, LayoutDashboard, Globe, MapPin, BookOpen, GraduationCap, Accessibility,
  UserCheck, User
} from "lucide-react";

// ── Icon map ──────────────────────────────────────────────────────────────
const iconMap: Record<string, React.ReactNode> = {
  dashboard: <Home className="h-4 w-4" />,
  timetables: <Clock className="h-4 w-4" />,
  budgets: <DollarSign className="h-4 w-4" />,
  mastersummaries: <Database className="h-4 w-4" />,
  stationeries: <PenLine className="h-4 w-4" />,
  supervisors: <UserCog className="h-4 w-4" />,
  'supervisors-management': <Users className="h-4 w-4" />,
  'supervisors-assignments': <UserCheck className="h-4 w-4" />,
  institutions: <Building className="h-4 w-4" />,
  primary: <Building className="h-4 w-4" />,
  secondary: <Building className="h-4 w-4" />,
  colleges: <Building className="h-4 w-4" />,
  miscellaneous: <Tags className="h-4 w-4" />,
  overview: <LayoutDashboard className="h-4 w-4" />,
  jobs: <Users className="h-4 w-4" />,
  'teachers-management': <Users className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  roles: <UserCog className="h-4 w-4" />,
  permissions: <Shield className="h-4 w-4" />,
  'audit-logs': <FileText className="h-4 w-4" />,
  reports: <FileText className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  regions: <Globe className="h-4 w-4" />,
  districts: <MapPin className="h-4 w-4" />,
  examinations: <BookOpen className="h-4 w-4" />,
  subjects: <GraduationCap className="h-4 w-4" />,
  profile: <User className="h-4 w-4" />,
  'special-needs': <Accessibility className="h-4 w-4" />
};

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  timetables: "Timetables",
  budgets: "Budgets",
  mastersummaries: "Master Summaries",
  'special-needs': "Special Needs",
  stationeries: "Stationeries",
  supervisors: "Supervisions",
  'supervisors-management': "Supervisors Management",
  'supervisors-assignments': "Supervisor Assignments",
  institutions: "Institutions",
  primary: "Primary Schools",
  secondary: "Secondary Schools",
  colleges: "Teachers Colleges",
  miscellaneous: "Miscellaneous",
  overview: "Overview",
  jobs: "Teachers Inventory",
  'teachers-management': "Teachers Management",
  security: "Security",
  users: "Users",
  roles: "Roles",
  permissions: "Permissions",
  'audit-logs': "Audit Logs",
  reports: "Reports",
  settings: "Settings",
  regions: "Regions",
  districts: "Districts",
  examinations: "Examinations",
  subjects: "Subjects",
  profile: "Profile",
  details: "Details"
};

// Special need codes to skip in breadcrumbs
const specialNeedCodes = ['BR', 'HI', 'LV', 'PI'];

const DynamicBreadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  // Skip if on root /dashboard
  if (pathnames.length <= 1) return null;

  return (
    <Breadcrumb className="text-sm">
      <BreadcrumbList className="flex flex-wrap items-center gap-1.5">
        {/* Dashboard */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link 
              to="/dashboard" 
              className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium"
            >
              {iconMap.dashboard}
              Dashboard
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {pathnames.slice(1).map((value, index) => {
          const actualIndex = index + 1;
          
          // Skip numeric/UUID IDs
          if (/^\d+$/.test(value) || value.match(/^[0-9a-fA-F-]{36}$/)) {
            return null;
          }

          // Skip special need codes (BR, HI, etc.)
          if (specialNeedCodes.includes(value)) {
            return null;
          }

          let to = `/${pathnames.slice(0, actualIndex + 1).join('/')}`;
          
          // Special handling for "Special Needs" link to include the ID if it follows
          if (value === 'special-needs' && pathnames[actualIndex + 1]) {
            const nextSegment = pathnames[actualIndex + 1];
            if (/^\d+$/.test(nextSegment)) {
              to = `/${pathnames.slice(0, actualIndex + 2).join('/')}`;
            }
          }

          const isLast = actualIndex === pathnames.length - 1;
          const displayName = labelMap[value] || 
            value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');

          const icon = iconMap[value] || <FileText className="h-4 w-4" />;

          return (
            <React.Fragment key={to}>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-medium text-gray-900 flex items-center gap-1.5">
                    {icon}
                    {displayName}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link 
                      to={to} 
                      className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      {icon}
                      {displayName}
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