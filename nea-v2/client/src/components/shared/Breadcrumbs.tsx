import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home, Shield, Activity, GraduationCap, UserCog } from 'lucide-react';
import { navItems } from '../layout/DashboardLayout';

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const getBreadcrumbData = (path: string) => {
    // Search in top-level items
    for (const item of navItems) {
      if (item.path === path) return item;
      // Search in sub-items
      if (item.subItems) {
        const sub = item.subItems.find(s => s.path === path);
        if (sub) return sub;
      }
    }
    return null;
  };

  if (pathnames.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <div className="flex items-center gap-1.5">
        <Link 
          to="/dashboard" 
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </Link>
      </div>
      
      {pathnames.map((value, index) => {
        if (value === 'dashboard' && index === 0) return null;
        
        const path = `/${pathnames.slice(0, index + 1).join('/')}`;
        const data = getBreadcrumbData(path);
        const last = index === pathnames.length - 1;
        
        if (!data && !last) return null; // Skip intermediate paths that aren't in nav

        const label = data?.label || value.charAt(0).toUpperCase() + value.slice(1);
        const Icon = data?.icon;
        
        return (
          <React.Fragment key={path}>
            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
            {last ? (
              <span className="font-medium text-gray-900 flex items-center gap-1.5">
                {Icon && <Icon className="w-4 h-4 text-slate-800" />}
                {label}
              </span>
            ) : (
              <Link
                to={path}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors font-medium"
              >
                {Icon && <Icon className="w-4 h-4" />}
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
