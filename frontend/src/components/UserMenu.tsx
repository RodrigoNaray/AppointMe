import { useNavigate } from 'react-router-dom';
import { useAuthStore, selectAuthState, selectLogoutClient } from '@/stores/authStore';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * UserMenu Component
 * 
 * Menú dropdown para usuarios autenticados siguiendo mejores prácticas:
 * - React 19: Composición de componentes sin prop drilling
 * - shadcn-ui: Componentes accesibles (ARIA) y responsive
 * - TypeScript: Type-safe con discriminated unions del AuthStore
 * - Zustand: Gestión de estado global con persist middleware
 * - UX: Toast notifications para feedback inmediato
 */
export default function UserMenu() {
  const authState = useAuthStore(selectAuthState);
  const logoutClient = useAuthStore(selectLogoutClient);
  const navigate = useNavigate();

  // Solo renderizar si hay usuario autenticado de tipo cliente
  if (!authState.isAuthenticated || authState.type !== 'client') {
    return null;
  }

  const user = authState.user;

  // Generar iniciales del nombre para el avatar
  const getInitials = (name: string | undefined): string => {
    // Validación: Si name es undefined o vacío, usar email como fallback
    if (!name || name.trim().length === 0) {
      const email = user.email || 'U';
      return email.substring(0, 2).toUpperCase();
    }
    
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logoutClient();
      toast.success('Sesión cerrada exitosamente');
      navigate('/');
    } catch (error) {
      toast.error('Error al cerrar sesión');
      console.error('Logout error:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate('/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>Mi Perfil</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
