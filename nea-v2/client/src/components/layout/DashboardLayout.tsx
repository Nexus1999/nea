import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link, Outlet } from 'react-router-dom';
import {
  Home, Clock, DollarSign, Database, PenLine, UserCog, Building, Tags,
  Shield, FileText, Settings, Menu, Bell, User, ChevronDown, LogOut, X,
  Users, LayoutDashboard, Globe, MapPin, BookOpen, GraduationCap, Navigation,
  Lock, History, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../providers/AuthProvider';
import { toast } from 'sonner';
import { api } from '../../lib/axios';
import nectaLogo from '../../images/NECTA.png';
import Breadcrumbs from '../shared/Breadcrumbs';

// ── Full nav definition mirroring original v1 structure ──────────────────────
export const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home, key: 'Dashboard', exact: true },
  { path: '/dashboard/timetables', label: 'Timetables', icon: Clock, key: 'Timetables', permission: 'Timetables:view' },
  { path: '/dashboard/budgets', label: 'Budgets', icon: DollarSign, key: 'Budgets', permission: 'budgets:view' },
  { path: '/dashboard/master-summaries', label: 'Master Summaries', icon: Database, key: 'MasterSummaries', permission: 'master_summaries:view' },
  { path: '/dashboard/stationeries', label: 'Stationeries', icon: PenLine, key: 'Stationeries', permission: 'stationeries:view' },
  { path: '/dashboard/supervisors', label: 'Supervisions', icon: UserCog, key: 'Supervisions', permission: 'supervisors:view' },
  {
    path: '/dashboard/institutions',
    label: 'Institutions',
    icon: Building,
    key: 'Institutions',
    permission: 'master_summaries:view',
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
    permission: 'supervisors:view',
    subItems: [
      { path: '/dashboard/miscellaneous/overview', label: 'Overview', icon: LayoutDashboard, key: 'MiscOverview' },
      { path: '/dashboard/teachers', label: 'Teachers Inventory', icon: Users, key: 'MiscTeachers' },
    ],
  },
  {
    path: '/dashboard/security',
    label: 'Security',
    icon: Shield,
    key: 'Security',
    permission: 'users:view',
    subItems: [
      { path: '/dashboard/security', label: 'Overview', icon: Shield, key: 'SecurityOverview', exact: true },
      { path: '/dashboard/security/users', label: 'Users', icon: Users, key: 'SecurityUsers' },
      { path: '/dashboard/security/roles', label: 'Roles', icon: UserCog, key: 'SecurityRoles' },
      { path: '/dashboard/security/permissions', label: 'Permissions', icon: Lock, key: 'SecurityPermissions' },
      { path: '/dashboard/security/audit-logs', label: 'Audit Logs', icon: History, key: 'SecurityAuditLogs' },
      { path: '/dashboard/security/sessions', label: 'Sessions', icon: Globe, key: 'SecuritySessions' },
    ]
  },
  { path: '/dashboard/reports', label: 'Reports', icon: FileText, key: 'Reports', permission: 'master_summaries:view' },
  {
    path: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
    key: 'Settings',
    permission: 'users:view',
    subItems: [
      { path: '/dashboard/settings/regions', label: 'Regions', icon: Globe, key: 'SettingsRegions' },
      { path: '/dashboard/settings/districts', label: 'Districts', icon: MapPin, key: 'SettingsDistricts' },
      { path: '/dashboard/settings/examinations', label: 'Examinations', icon: BookOpen, key: 'SettingsExaminations' },
      { path: '/dashboard/settings/subjects', label: 'Subjects', icon: GraduationCap, key: 'SettingsSubjects' },
      { path: '/dashboard/settings/regional-distances', label: 'Regional Distances', icon: Navigation, key: 'SettingsDistances' },
      { path: '/dashboard/settings/transport-guidelines', label: 'Transport Guidelines', icon: Settings, key: 'SettingsTransport' },
    ]
  },
  { path: '/dashboard/profile', label: 'Profile', icon: User, key: 'Profile' },
];

// ── Collapsible nav group component ──────────────────────────────────────────
const NavGroup = ({
  item, isCollapsed, forceOpen
}: {
  item: typeof navItems[0] & { subItems?: any[] };
  isCollapsed: boolean;
  forceOpen: boolean;
}) => {
  const location = useLocation();
  const [open, setOpen] = useState(forceOpen);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const isParentActive = location.pathname.startsWith(item.path);

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
          isParentActive
            ? 'bg-gradient-to-r from-red-500/80 via-orange-500/70 to-yellow-400/60 text-white shadow-sm'
            : 'text-gray-300 hover:bg-white/10 hover:text-white'
        } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <item.icon className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="font-semibold text-sm truncate">{item.label}</span>}
        </div>
        {!isCollapsed && (
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && !isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-4 pl-3 border-l border-white/10 space-y-0.5 py-1">
              {item.subItems!.map((sub) => {
                const isActive = (sub as any).exact
                  ? location.pathname === sub.path
                  : location.pathname === sub.path || location.pathname.startsWith(sub.path + '/');
                return (
                  <Link
                    key={sub.key}
                    to={sub.path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-gray-400 hover:bg-white/8 hover:text-gray-200'
                    }`}
                  >
                    <sub.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Main DashboardLayout ──────────────────────────────────────────────────────
const DashboardLayout = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCollapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutCountdown, setShowLogoutCountdown] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout, hasPermission } = useAuth();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async (reason?: string) => {
    try {
      await logout();
      if (!reason) toast.success('Logged out successfully');
      navigate(reason ? `/login?reason=${reason}` : '/login');
    } catch {
      toast.error('Failed to log out');
    }
  };

  // ── Auto-logout logic ──────────────────────────────────────────────────────
  const IDLE_TIMEOUT = 14 * 60 * 1000; // 14 mins (trigger countdown at 14m)
  const COUNTDOWN_START = 60; // 60 seconds

  const startCountdown = () => {
    setShowLogoutCountdown(true);
    setTimeLeft(COUNTDOWN_START);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          handleLogout('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetIdleTimer = () => {
    setShowLogoutCountdown(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(startCountdown, IDLE_TIMEOUT);
  };

  const stayLoggedIn = async () => {
    try {
      await api.get('/auth/me'); // This will extend the session on the backend
      resetIdleTimer();
      toast.success('Session extended');
    } catch {
      handleLogout('expired');
    }
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetIdleTimer));
    resetIdleTimer();

    return () => {
      events.forEach(event => document.removeEventListener(event, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const isAdministrator = user?.roleName?.toUpperCase() === 'ADMINISTRATOR';

  const filteredNavItems = navItems.filter(item =>
    !item.permission || isAdministrator || hasPermission(item.permission)
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b border-white/10 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="shrink-0">
          <img src={nectaLogo} alt="Logo" className={`${isCollapsed ? 'w-8 h-8' : 'w-10 h-10'} drop-shadow-sm`} />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <h1 className="text-white font-black text-lg leading-none">NEAS</h1>
            <p className="text-gray-400 text-xs font-medium mt-0.5">Admin System v2</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav 
        className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          nav::-webkit-scrollbar { display: none; }
        `}</style>
        {filteredNavItems.map((item) => {
          if (item.subItems) {
            const forceOpen = location.pathname.startsWith(item.path);
            return (
              <NavGroup
                key={item.key}
                item={item}
                isCollapsed={isCollapsed}
                forceOpen={forceOpen}
              />
            );
          }
          const isActive = (item as any).exact
            ? location.pathname === item.path
            : location.pathname === item.path;
          return (
            <Link key={item.key} to={item.path} onClick={() => setMobileSidebarOpen(false)}>
              <motion.div
                whileHover={{ x: isCollapsed ? 0 : 2 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-red-500/80 via-orange-500/70 to-yellow-400/60 text-white shadow-sm'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="font-semibold text-sm truncate">{item.label}</span>}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-white/10">
        <div className={`flex items-center gap-3 p-2.5 bg-white/5 rounded-xl mb-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center ring-2 ring-white/20 shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
              <p className="text-xs text-gray-400 truncate">{user?.roleName || 'Loading...'}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => handleLogout()}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-300 hover:bg-white/10 hover:text-white transition-colors ${isCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="font-semibold text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: isMobileSidebarOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl lg:hidden"
      >
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </motion.div>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 72 : 272 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col h-full bg-gradient-to-b from-gray-900 to-gray-800 shadow-2xl z-30 shrink-0 overflow-hidden"
      >
        <SidebarContent />
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 bg-white shadow-sm z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCollapsed(prev => !prev)}
              className="hidden lg:flex p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 ml-2 hidden sm:block">Dashboard</h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative cursor-pointer">
              <Bell className="h-5 w-5 text-gray-500 hover:text-gray-800 transition-colors" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">3</span>
            </div>

            {/* User dropdown */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(prev => !prev)}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <p className="text-sm font-semibold text-gray-800 leading-none">{user?.username}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{user?.roleName}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50"
                  >
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="font-semibold text-sm text-gray-900">{user?.username}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{user?.roleName}</p>
                    </div>
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="h-4 w-4 text-gray-400" /> Profile
                    </Link>
                    <Link
                      to="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-gray-400" /> Settings
                    </Link>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                        className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0 z-10 shadow-sm flex items-center">
          <Breadcrumbs />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-6 md:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Logout Countdown Overlay */}
      <AnimatePresence>
        {showLogoutCountdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl text-center space-y-6"
            >
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full border-4 border-orange-100 flex items-center justify-center mx-auto">
                  <span className="text-4xl font-black text-orange-600 font-mono">{timeLeft}</span>
                </div>
                <motion.div 
                  className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-gray-900">Session Expiring</h3>
                <p className="text-gray-500 text-sm font-medium mt-2 leading-relaxed">
                  You have been inactive for a while. For your security, you will be logged out in 60 seconds.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={stayLoggedIn}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                >
                  Stay Logged In
                </button>
                <button
                  onClick={() => handleLogout()}
                  className="w-full py-4 bg-white text-gray-400 rounded-2xl font-bold text-sm uppercase tracking-widest hover:text-red-500 transition-all"
                >
                  Logout Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
