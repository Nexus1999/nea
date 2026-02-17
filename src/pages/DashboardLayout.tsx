"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link, Outlet, useParams } from "react-router-dom";
import {
  Home, Clock, DollarSign, Database, PenLine, UserCog, Building, Tags, Shield, FileText, Settings,
  Menu, Bell, User, ChevronDown, LogOut, X, Users, LayoutDashboard, ChevronRight,
  Globe, MapPin, BookOpen, GraduationCap, Accessibility, GitBranch, UserCheck, PlusCircle, Eye
} from "lucide-react";
 
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { showStyledSwal } from '../utils/alerts';
import { useAuth } from "@/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import NectaLogo from "@/components/NectaLogo";
import { SpecialNeedType } from "@/types/mastersummaries";
import Spinner from "@/components/Spinner";
import DynamicBreadcrumbs from "@/components/DynamicBreadcrumbs";

const specialNeedFullNames: Record<SpecialNeedType, string> = {
  HI: 'Hearing Impairment',
  BR: 'Braille',
  LV: 'Low Vision',
  PI: 'Physical Impairment',
};

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home, key: 'Dashboard' },
  { path: '/dashboard/timetables', label: 'Timetables', icon: Clock, key: 'Timetables' },
  { path: '/dashboard/budgets', label: 'Budgets', icon: DollarSign, key: 'Budgets' },
  { path: '/dashboard/mastersummaries', label: 'Master Summaries', icon: Database, key:'Master Summaries'},
  { path: '/dashboard/stationeries', label: 'Stationeries', icon: PenLine, key: 'Stationeries' },
  { path: '/dashboard/supervisors', label: 'Supervisions', icon: UserCog, key: 'Supervisions' },
  { 
    path: '/dashboard/institutions', 
    label: 'Institutions', 
    icon: Building, 
    key: 'Institutions',
    subItems: [
      { path: '/dashboard/institutions', label: 'Overview', icon: LayoutDashboard, key: 'InstitutionsOverview' },
      { path: '/dashboard/institutions/primary', label: 'Primary Schools', icon: Building, key: 'PrimarySchools' },
      { path: '/dashboard/institutions/secondary', label: 'Secondary Schools', icon: Building, key: 'SecondarySchools' },
      { path: '/dashboard/institutions/colleges', label: 'Teachers Colleges', icon: Building, key: 'TeachersColleges' },
    ]
  },
 {
    path: '/dashboard/miscellaneous',
    label: 'Miscellaneous',
    icon: Tags,
    key: 'Miscellaneous',
    subItems: [
      {
        path: '/dashboard/miscellaneous/overview',label: 'OverView',icon: LayoutDashboard,key: 'MiscellaneousOverview',},
       {path: '/dashboard/miscellaneous/jobs',label: 'Teachers Inventory',icon: Users,key: 'MiscellaneousTeachers',
      },
    ],
  },
  {
    path: '/dashboard/security',
    label: 'Security',
    icon: Shield,
    key: 'Security',
    subItems: [
      { path: '/dashboard/security', label: 'Overview', icon: Shield, key: 'SecurityOverview' },
      { path: '/dashboard/security/users', label: 'Users', icon: Users, key: 'SecurityUsers' },
      { path: '/dashboard/security/roles', label: 'Roles', icon: UserCog, key: 'SecurityRoles' },
      { path: '/dashboard/security/permissions', label: 'Permissions', icon: Shield, key: 'SecurityPermissions' },
      { path: '/dashboard/security/audit-logs', label: 'Audit Logs', icon: FileText, key: 'SecurityAuditLogs' },
    ]
  },
  { path: '/dashboard/reports', label: 'Reports', icon: FileText, key: 'Reports' },
  {
    path: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
    key: 'Settings',
    subItems: [
      { path: '/dashboard/settings/regions', label: 'Regions', icon: Globe, key: 'SettingsRegions' },
      { path: '/dashboard/settings/districts', label: 'Districts', icon: MapPin, key: 'SettingsDistricts' },
      { path: '/dashboard/settings/examinations', label: 'Examinations', icon: BookOpen, key: 'SettingsExaminations' },
      { path: '/dashboard/settings/subjects', label: 'Subjects', icon: GraduationCap, key: 'SettingsSubjects' },
    ]
  },
  { path: '/dashboard/profile', label: 'Profile', icon: User, key: 'Profile' },
];

 

const DashboardLayout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isSecuritySubMenuOpen, setIsSecuritySubMenuOpen] = useState(false);
  const [isSettingsSubMenuOpen, setIsSettingsSubMenuOpen] = useState(false);
  const [isInstitutionsSubMenuOpen, setIsInstitutionsSubMenuOpen] = useState(false);
  const [isMiscellaneousSubMenuOpen, setIsMiscellaneousSubMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { session, user, loading, userRole, logout } = useAuth();
  const params = useParams();

  useEffect(() => {
    setIsSecuritySubMenuOpen(location.pathname.startsWith('/dashboard/security'));
    setIsSettingsSubMenuOpen(location.pathname.startsWith('/dashboard/settings'));
    setIsInstitutionsSubMenuOpen(location.pathname.startsWith('/dashboard/institutions'));
    setIsMiscellaneousSubMenuOpen(location.pathname.startsWith('/dashboard/miscellaneous'));
  }, [location.pathname]);

  useEffect(() => {
    if (!loading && !session) {
      navigate("/login", { replace: true });
    }
  }, [session, loading, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      showStyledSwal({
        icon: "error",
        title: "Logout Failed",
        text: "An error occurred while trying to log out. Please try again."
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDynamicId = (segment: string): boolean => {
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(segment)) return true;
    if (/^\d+$/.test(segment)) return true;
    if (segment.length > 20) return true;
    return false;
  };

 

  const filteredNavItems = navItems.filter(item => true);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white/70 flex items-center justify-center z-[9999]">
        <Spinner label="Loading dashboard..." size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: isDesktopSidebarCollapsed ? "90px" : "288px" }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`
          flex-shrink-0 h-full bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl z-50
          ${isMobileSidebarOpen ? "fixed translate-x-0" : "fixed -translate-x-full"}
          lg:relative lg:translate-x-0
          flex flex-col overflow-y-auto scrollbar-none
        `}
        style={{ 
          width: isMobileSidebarOpen ? "288px" : (isDesktopSidebarCollapsed ? "90px" : "288px"),
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-white/10 flex justify-between items-center h-20">
            <div className={`flex items-center gap-3 ${isDesktopSidebarCollapsed ? 'justify-center w-full' : ''}`}>
              <div className="p-2.5 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-400 rounded-xl shadow-lg ring-2 ring-white/20">
                <NectaLogo className="w-6 h-6" />
              </div>
              {!isDesktopSidebarCollapsed && (
                <div>
                  <h1 className="text-white font-black text-lg">NEAS</h1>
                  <p className="text-xs text-gray-400 font-medium">Admin System</p>
                </div>
              )}
            </div>
            <button onClick={() => setIsMobileSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path || (item.subItems && location.pathname.startsWith(item.path));
              
              if (item.subItems) {
                const isSubMenuOpen =
                  item.key === 'Security' ? isSecuritySubMenuOpen :
                  item.key === 'Settings' ? isSettingsSubMenuOpen :
                  item.key === 'Institutions' ? isInstitutionsSubMenuOpen :
                  item.key === 'Miscellaneous' ? isMiscellaneousSubMenuOpen : false;

                const setIsSubMenuOpen =
                  item.key === 'Security' ? setIsSecuritySubMenuOpen :
                  item.key === 'Settings' ? setIsSettingsSubMenuOpen :
                  item.key === 'Institutions' ? setIsInstitutionsSubMenuOpen :
                  item.key === 'Miscellaneous' ? setIsMiscellaneousSubMenuOpen : () => {};

                return (
                  <Collapsible key={item.key} open={isSubMenuOpen} onOpenChange={setIsSubMenuOpen} className="space-y-2">
                    <CollapsibleTrigger asChild>
                      <motion.div
                        whileHover={{ x: 2 }}
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                          isActive ? "bg-gradient-to-r from-red-500/80 via-orange-500/80 to-yellow-400/80 text-white shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"
                        } ${isDesktopSidebarCollapsed ? 'justify-center' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          {!isDesktopSidebarCollapsed && <span className="font-semibold text-sm">{item.label}</span>}
                        </div>
                        {!isDesktopSidebarCollapsed && (
                          <ChevronDown className={`h-4 w-4 transition-transform ${isSubMenuOpen ? 'rotate-180' : 'rotate-0'}`} />
                        )}
                      </motion.div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-4 space-y-1">
                      {item.subItems.map((subItem) => {
                        const isSubItemActive = location.pathname === subItem.path;
                        return (
                          <Link key={subItem.key} to={subItem.path} onClick={() => setIsMobileSidebarOpen(false)}>
                            <motion.div
                              whileHover={{ x: 2 }}
                              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                isSubItemActive ? "bg-gradient-to-r from-red-500/80 via-orange-500/80 to-yellow-400/80 text-white shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"
                              } ${isDesktopSidebarCollapsed ? 'justify-center' : ''}`}
                            >
                              <subItem.icon className="h-5 w-5" />
                              {!isDesktopSidebarCollapsed && <span className="font-semibold text-sm">{subItem.label}</span>}
                            </motion.div>
                          </Link>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              return (
                <Link key={item.key} to={item.path} onClick={() => setIsMobileSidebarOpen(false)}>
                  <motion.div
                    whileHover={{ x: 2 }}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isActive ? "bg-gradient-to-r from-red-500/80 via-orange-500/80 to-yellow-400/80 text-white shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"
                    } ${isDesktopSidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    <item.icon className="h-5 w-5" />
                    {!isDesktopSidebarCollapsed && <span className="font-semibold text-sm">{item.label}</span>}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10 space-y-2">
            <div className={`flex items-center gap-3 p-2 bg-white/5 rounded-lg ${isDesktopSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center ring-2 ring-white/20">
                <User className="w-5 h-5 text-white" />
              </div>
              {!isDesktopSidebarCollapsed && (
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white truncate">{user?.email || "User"}</p>
                  <p className="text-xs text-gray-400">{userRole || "Loading Role..."}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className={`w-full flex items-center justify-start text-gray-300 hover:bg-white/10 hover:text-white p-3 rounded-lg transition-colors ${isDesktopSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <LogOut className={`h-5 w-5 ${!isDesktopSidebarCollapsed ? 'mr-3' : ''}`} />
              {!isDesktopSidebarCollapsed && <span className="font-semibold text-sm">Logout</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between h-20 bg-white shadow-sm px-6 z-30 flex-shrink-0">
          <button onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} className="text-gray-600 hover:text-primary transition-colors lg:hidden">
            <Menu size={24} />
          </button>
          <div className="hidden lg:block">
            <button onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)} className="text-gray-600 hover:text-primary transition-colors p-2 rounded-full hover:bg-gray-100">
              <Menu size={24} />
            </button>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <div className="relative">
              <Bell size={24} className="text-gray-600 cursor-pointer hover:text-primary" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
            </div>

            <div ref={userMenuRef} className="relative">
              <div className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="hidden md:flex flex-col">
                  <p className="text-sm font-semibold text-gray-800">{user?.email || "User"}</p>
                  <p className="text-xs text-gray-600">{userRole || "Loading Role..."}</p>
                </div>
                <ChevronDown size={16} className="text-gray-600" />
              </div>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-lg py-2 z-50 origin-top-right"
                  >
                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                      <p className="font-semibold">{user?.email || "User"}</p>
                      <p className="text-xs text-gray-500">{userRole || "Loading Role..."}</p>
                    </div>
                    <Link to="/dashboard/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setUserMenuOpen(false)}>
                      <User size={16} /> Profile
                    </Link>
                    <Link to="/dashboard/settings/regions" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setUserMenuOpen(false)}>
                      <Settings size={16} /> Settings
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
           
          <div className="flex justify-end mb-4 px-2">
          <div className="max-w-[75%] md:max-w-none">
            <DynamicBreadcrumbs />
          </div>
        </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;