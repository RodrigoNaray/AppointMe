import { Link, Outlet } from 'react-router-dom';
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore, selectAuthState } from '@/stores/authStore';
import UserMenu from '@/components/UserMenu';
import ScrollToTopOnNavigate from '@/components/ScrollToTopOnNavigate';

import Footer from '@/components/Footer';

export default function PublicLayout() {
  const authState = useAuthStore(selectAuthState);

  return (
    <div className="min-h-screen w-full">
      <ScrollToTopOnNavigate />
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-primary" />
        </Link>
        
        <nav className="hidden md:flex items-center gap-1 ml-2">
          <Link to="/" className="px-3 py-1.5 text-sm font-medium text-muted-foreground rounded-md transition-colors hover:text-foreground hover:bg-muted">
            Inicio
          </Link>
          <Link to="/book" className="px-3 py-1.5 text-sm font-medium text-muted-foreground rounded-md transition-colors hover:text-foreground hover:bg-muted">
            Servicios
          </Link>
          <Link to="/contact" className="px-3 py-1.5 text-sm font-medium text-muted-foreground rounded-md transition-colors hover:text-foreground hover:bg-muted">
            Contacto
          </Link>
        </nav>
        
        <div className="flex-1" />
        
        {authState.isAuthenticated && authState.type === 'client' ? (
          <UserMenu />
        ) : authState.isAuthenticated && authState.type === 'admin' ? (
          <Link to="/admin">
            <Button size="sm">Admin</Button>
          </Link>
        ) : (
          <Link to="/login">
            <Button size="sm">Ingresar</Button>
          </Link>
        )}
      </header>

      <main className="flex flex-1 flex-col bg-background">
        <Outlet />
        <Footer />
      </main>
    </div>
  );
}