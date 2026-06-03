import { Link, Outlet } from 'react-router-dom';
import { Menu, Package2, ChevronLeft, ChevronRight, LayoutDashboard, Tags, Calendar, BookOpen, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetDescription } from "@/components/ui/sheet"
import { AdminNav } from '@/components/shared/AdminNav';
import { useState } from 'react';
import ScrollToTopOnNavigate from '@/components/ScrollToTopOnNavigate';

export default function AdminLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navLinks = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/services", label: "Servicios", icon: Briefcase },
    { to: "/admin/categories", label: "Categorías", icon: Tags },
    { to: "/admin/availability", label: "Disponibilidad", icon: Calendar },
    { to: "/admin/bookings", label: "Reservas", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen w-full">
      <ScrollToTopOnNavigate />
      {/* Navbar Sticky con transparencia */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:h-[60px] lg:px-6">
        {/* Mobile Menu - A la izquierda */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden" 
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col w-56 p-0">
            <SheetDescription className="sr-only">
              Menú de navegación principal
            </SheetDescription>
            <div className="flex items-center gap-2 h-14 px-3 border-b bg-muted/30">
              <Package2 className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">AppointMePro</span>
            </div>
            <nav className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto">
              {navLinks.map(link => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/10 active:bg-primary/20 transition-all"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo - Visible en mobile y desktop */}
        <Link to="/admin" className="flex items-center gap-2 font-semibold">
          <Package2 className="h-6 w-6" />
          <span>AppointMePro</span>
        </Link>

        {/* Spacer para empujar AdminNav a la derecha */}
        <div className="flex-1"></div>

        {/* User Menu */}
        <AdminNav />
      </header>

      {/* Layout con Sidebar Desktop */}
      <div className="flex min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-3.75rem)]">
        {/* Sidebar Desktop - Vertical a la izquierda */}
        <aside 
          className={`
            hidden md:flex md:flex-col md:border-r md:shadow-sm
            transition-all duration-300 ease-in-out
            ${isCollapsed ? 'md:w-16' : 'md:w-56 lg:w-64'}
            bg-gradient-to-b from-muted/40 to-muted/20
          `}
        >
          {/* Botón collapse/expand - Mejorado con animación suave */}
          <div className="flex items-center p-3 border-b min-h-[52px]">
            <div 
              className={`
                flex items-center gap-2 overflow-hidden
                transition-all duration-300 ease-in-out
                ${isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}
              `}
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
              className={`
                h-8 w-8 flex-shrink-0 hover:bg-primary/10 hover:text-primary
                transition-all duration-200
                ${isCollapsed ? 'ml-0' : 'ml-auto'}
              `}
              title={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
            {navLinks.map(link => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2.5 
                    text-sm font-medium text-muted-foreground 
                    hover:text-foreground hover:bg-primary/10 
                    active:bg-primary/20 transition-all
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? link.label : ''}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span 
                    className={`
                      truncate transition-all duration-300 ease-in-out
                      ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
                    `}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:gap-6 lg:p-6 overflow-x-hidden">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
}