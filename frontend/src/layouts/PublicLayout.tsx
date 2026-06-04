import { Link, Outlet } from 'react-router-dom';
import { Package2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore, selectAuthState } from '@/stores/authStore';
import UserMenu from '@/components/UserMenu';
import ScrollToTopOnNavigate from '@/components/ScrollToTopOnNavigate';
import LanguageSelector from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';

export default function PublicLayout() {
  const authState = useAuthStore(selectAuthState);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full">
      <ScrollToTopOnNavigate />
      {/* Navbar Sticky */}
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:h-[60px] lg:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Package2 className="h-6 w-6" />
          <span>{t('appName')}</span>
        </Link>
        
        <LanguageSelector />
        
        {/* Spacer */}
        <div className="flex-1"></div>
        
        {/* Auth Button/Menu */}
        {authState.isAuthenticated && authState.type === 'client' ? (
          <UserMenu />
        ) : (
          <Link to="/login">
            <Button>{t('nav.login')}</Button>
          </Link>
        )}
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col">
        <Outlet /> 
      </main>
    </div>
  );
}