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
  Home, Clock, DollarSign, Database, UserCog, Tags, Shield, FileText,
  Settings, Accessibility, User, Truck, Sparkles, MapPinned, ClipboardList
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <Home className="h-4 w-4" />,
  timetables: <Clock className="h-4 w-4" />,
  budgets: <DollarSign className="h-4 w-4" />,
  transportation: <Truck className="h-4 w-4" />,
  "action-plan": <ClipboardList className="h-4 w-4" />,
  "route-planner": <MapPinned className="h-4 w-4" />,
  "ai-suggester": <Sparkles className="h-4 w-4" />,
  mastersummaries: <Database className="h-4 w-4" />,
  supervisors: <UserCog className="h-4 w-4" />,
  miscellaneous: <Tags className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  profile: <User className="h-4 w-4" />,
  "special-needs": <Accessibility className="h-4 w-4" />,
  version: <History className="h-4 w-4" />
};

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  timetables: "Timetables",
  budgets: "Budgets",
  transportation: "Transportation",
  "action-plan": "Action Plan",
  "route-planner": "Route Planner",
  "ai-suggester": "Suggester",
};

const isSkippable = (value: string) =>
  /^\d+$/.test(value) || value.match(/^[0-9a-fA-F-]{36}$/);

const DynamicBreadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter(Boolean);

  if (pathnames.length <= 1) return null;

  const getBreadcrumbs = () => {
    const items: { label: string; to: string; icon: React.ReactNode }[] = [];

    // Dashboard
    items.push({
      label: "Dashboard",
      to: "/dashboard",
      icon: iconMap.dashboard
    });

    if (pathnames.includes("budgets")) {
      items.push({
        label: "Budgets",
        to: "/dashboard/budgets",
        icon: iconMap.budgets
      });

      const budgetId = pathnames.find(
        p => /^[0-9a-fA-F-]{36}$/.test(p) || /^\d+$/.test(p)
      );

      if (budgetId) {
        // ✅ ALWAYS show Action Plan after Budgets
        items.push({
          label: "Action Plan",
          to: `/dashboard/budgets/action-plan/${budgetId}`,
          icon: iconMap["action-plan"]
        });

        // Transportation (still goes back to budgets)
        if (pathnames.includes("transportation")) {
          items.push({
            label: "Transportation",
            to: `/dashboard/budgets/action-plan/${budgetId}`,
            icon: iconMap.transportation
          });
        }

        // Route Planner
        if (pathnames.includes("route-planner")) {
          items.push({
            label: "Route Planner",
            to: `/dashboard/budgets/transportation/route-planner/${budgetId}`,
            icon: iconMap["route-planner"]
          });
        }

        // AI Suggester
        if (pathnames.includes("ai-suggester")) {
          if (!pathnames.includes("route-planner")) {
            items.push({
              label: "Route Planner",
              to: `/dashboard/budgets/transportation/route-planner/${budgetId}`,
              icon: iconMap["route-planner"]
            });
          }

          items.push({
            label: "Suggester",
            to: `/dashboard/budgets/transportation/ai-suggester/${budgetId}`,
            icon: iconMap["ai-suggester"]
          });
        }
      }
    } else {
      // fallback
      pathnames.slice(1).forEach((value, index) => {
        if (isSkippable(value)) return;

        const to = `/${pathnames.slice(0, index + 2).join("/")}`;

        items.push({
          label:
            labelMap[value] ||
            value.charAt(0).toUpperCase() +
              value.slice(1).replace(/-/g, " "),
          to,
          icon: iconMap[value] || <FileText className="h-4 w-4" />
        });
      });
    }

    return items;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <Breadcrumb className="text-sm">
      <BreadcrumbList className="flex flex-wrap items-center gap-1.5">
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={item.to}>
            {index > 0 && (
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </BreadcrumbSeparator>
            )}

            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage className="font-medium text-gray-900 flex items-center gap-1.5">
                  {item.icon} {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link
                    to={item.to}
                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    {item.icon} {item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default DynamicBreadcrumbs;