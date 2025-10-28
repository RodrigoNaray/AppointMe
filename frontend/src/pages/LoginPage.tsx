import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from 'react-hot-toast';
import { useAuthStore, selectLoginClient } from "@/stores/authStore";
import { useOAuthStore, selectSaveReturnUrl } from "@/stores/oauthStore";
import { API_BASE_URL } from "@/api/config";
import type { LoginDto } from "@/types/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M17.64 9.2045c0-.638-.0573-1.2509-.1636-1.8409H9v3.4841h4.8445c-.2091 1.1282-.8428 2.0844-1.7958 2.7276v2.268h2.9069c1.7028-1.568 2.6844-3.8769 2.6844-6.6398z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.4691-.8046 5.9582-2.1779l-2.9069-2.268c-.8078.5433-1.8438.8669-3.0513.8669-2.3478 0-4.3342-1.5846-5.0418-3.7135H1.0121v2.3318C2.4995 15.9146 5.5149 18 9 18z" fill="#34A853"/>
            <path d="M3.9582 10.706c-.1826-.5433-.2864-1.1239-.2864-1.706s.1038-1.1627.2864-1.706V5.6693H1.0121A8.994 8.994 0 0 0 0 9c0 1.4416.3461 2.8052.9579 3.992l2.0003-2.286z" fill="#FBBC05"/>
            <path d="M9 3.5791c1.3221 0 2.5125.4555 3.4491 1.3449l2.5866-2.5866C13.4659.8771 11.4268 0 9 0 5.5149 0 2.4995 2.0854 1.0121 5.6693l2.9461 2.0188C4.6658 5.1636 6.6522 3.5791 9 3.5791z" fill="#EA4335"/>
        </svg>
    );
}

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const loginClient = useAuthStore(selectLoginClient);
    const saveReturnUrl = useOAuthStore(selectSaveReturnUrl);

    // Leer returnUrl de query params
    const returnUrl = searchParams.get('returnUrl');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            const loginData: LoginDto = { email, password };
            await loginClient(loginData);
            
            toast.success('¡Inicio de sesión exitoso!');
            
            // Redirigir inmediatamente a returnUrl si existe, sino a home
            if (returnUrl) {
                navigate(returnUrl);
            } else {
                navigate('/');
            }
        } catch (error: any) {
            toast.error('Usuario o contraseña incorrecta');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        // Guardar returnUrl en sessionStorage (Zustand) antes de redirect
        // OWASP: sessionStorage expira al cerrar tab, no vulnerable a XSS persistente
        if (returnUrl) {
            saveReturnUrl(returnUrl);
        }
        
        window.location.href = `${API_BASE_URL}/auth/client/google`;
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium">Correo Electrónico</label>
                            <Input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium">Contraseña</label>
                            <Input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                        </Button>
                    </form>
                    <Separator className="my-4" />
                    <Button variant="outline" className="w-full flex items-center justify-center gap-2" onClick={handleGoogleLogin}>
                        <GoogleIcon />
                        <span>Iniciar Sesión con Google</span>
                    </Button>
                    <p className="mt-4 text-center text-sm">
                        ¿No tienes una cuenta?{" "}
                        <Link 
                            to={returnUrl ? `/register?returnUrl=${encodeURIComponent(returnUrl)}` : "/register"} 
                            className="text-blue-500 hover:underline"
                        >
                            Regístrate aquí
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

