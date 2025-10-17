import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { clientAuthService } from '@/api/clientAuth';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

/**
 * ChangePasswordPage Component
 * 
 * Página para cambiar contraseña del cliente autenticado.
 * 
 * Mejores prácticas implementadas:
 * - React 19: Hooks useState, useNavigate, useAuth
 * - OWASP A02:2021: Requiere contraseña actual para confirmar identidad
 * - UX: Validaciones en frontend + feedback con toast
 * - TypeScript: Type-safe con interfaces del AuthContext
 * - shadcn-ui: Componentes accesibles y responsive
 */
export default function ChangePasswordPage() {
  const { authState, logoutClient } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verificar si el usuario está autenticado
  if (!authState.isAuthenticated || authState.type !== 'client') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
            <CardTitle className="text-2xl font-bold">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Debes iniciar sesión para cambiar tu contraseña.
            </p>
            <Link to="/login">
              <Button className="w-full">Ir al Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones frontend
    if (currentPassword.length < 6) {
      toast.error("La contraseña actual debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword === currentPassword) {
      toast.error("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);

    try {
      const result = await clientAuthService.changePassword(currentPassword, newPassword);

      if (result.success) {
        toast.success(result.message);
        
        // Logout después de cambiar contraseña (buena práctica de seguridad)
        setTimeout(async () => {
          await logoutClient();
          toast.success('Por favor inicia sesión con tu nueva contraseña');
          navigate('/login');
        }, 2000);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error interno del servidor. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <Lock className="w-12 h-12 text-blue-500 mx-auto mb-2" />
          <CardTitle className="text-2xl font-bold">Cambiar Contraseña</CardTitle>
          <p className="text-gray-600 mt-2">
            Actualiza tu contraseña de forma segura
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contraseña Actual */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium mb-1">
                Contraseña Actual
              </label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="Ingresa tu contraseña actual"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Nueva Contraseña */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirmar Nueva Contraseña */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repite la nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
            </Button>

            <div className="text-center">
              <Link to="/profile" className="text-sm text-blue-600 hover:underline">
                Volver al perfil
              </Link>
            </div>
          </form>

          {/* Información de seguridad */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Por seguridad:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>La nueva contraseña debe ser diferente a la actual</li>
                  <li>Se cerrará tu sesión después del cambio</li>
                  <li>Deberás iniciar sesión con la nueva contraseña</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
