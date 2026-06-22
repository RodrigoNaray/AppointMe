import { Link, Outlet, useLocation } from 'react-router-dom';
import { Package2, ChevronLeft, ChevronRight, LayoutDashboard, Tags, Calendar, BookOpen, Briefcase, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminNav } from '@/components/shared/AdminNav';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import ScrollToTopOnNavigate from '@/components/ScrollToTopOnNavigate';

type NavLinkConfig = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
};

function isAdminLinkActive(pathname: string, linkTo: string): boolean {
  if (linkTo === '/admin') {
    return pathname === '/admin';
  }
  return pathname === linkTo || pathname.startsWith(linkTo + '/');
}

export default function AdminLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const navLinks: NavLinkConfig[] = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/services", label: "Servicios", icon: Briefcase },
    { to: "/admin/categories", label: "Categorías", icon: Tags },
    { to: "/admin/availability", label: "Disponibilidad", icon: Calendar },
    { to: "/admin/bookings", label: "Reservas", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen w-full">
      <ScrollToTopOnNavigate />

      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:border focus:border-border focus:rounded-md focus:text-sm focus:text-foreground"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Package2 className="h-6 w-6" />
          <span className="hidden sm:inline">AppointMePro</span>
        </Link>

        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Ver homepage"
          aria-label="Ver homepage en nueva pestaña"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>

        <div className="flex-1"></div>

        <AdminNav />
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-3.75rem)]">
        <aside
          aria-label="Navegación principal"
          className={cn(
            'hidden md:flex md:flex-col md:border-r md:shadow-sm transition-all duration-300 ease-in-out bg-gradient-to-b from-muted/40 to-muted/20',
            isCollapsed ? 'md:w-16' : 'md:w-56 lg:w-64'
          )}
        >
          <div className="flex items-center p-3 border-b min-h-[52px]">
            <div
              className={cn(
                'flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out',
                isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'
              )}
            >
              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Panel Admin
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                'h-8 w-8 flex-shrink-0 hover:bg-primary/10 hover:text-primary transition-all duration-200',
                isCollapsed ? 'ml-0' : 'ml-auto'
              )}
              title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
              aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto" aria-label="Secciones del panel">
            {navLinks.map(link => {
              const Icon = link.icon;
              const isActive = isAdminLinkActive(location.pathname, link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all border-l-2',
                    isActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-primary/5',
                    isCollapsed && 'justify-center'
                  )}
                  title={isCollapsed ? link.label : ''}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span
                    className={cn(
                      'truncate transition-all duration-300 ease-in-out',
                      isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
                    )}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main
          id="admin-main"
          tabIndex={-1}
          className="flex-1 flex flex-col gap-3 p-3 pb-20 sm:gap-4 sm:p-4 sm:pb-20 lg:gap-6 lg:p-6 lg:pb-6 overflow-x-hidden outline-none"
        >
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navegación admin"
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5 h-16">
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = isAdminLinkActive(location.pathname, link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors relative',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
