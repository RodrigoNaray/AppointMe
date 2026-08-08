import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import toast from 'react-hot-toast';
import { clientAuthService } from "@/api/modules/clientAuth";
import { useOAuthStore, selectSaveReturnUrl } from "@/stores/oauthStore";
import type { RegisterDto } from "@/types/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { usePageTitle } from "@/hooks/usePageTitle";

interface PasswordFeedback {
    label: string;
    valid: boolean;
}

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

export default function RegisterPage() {
    usePageTitle("Registrarse — AppointMePro");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const saveReturnUrl = useOAuthStore(selectSaveReturnUrl);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [passwordFeedback, setPasswordFeedback] = useState<PasswordFeedback[]>([]);
    const [showBalloon, setShowBalloon] = useState(false);

    const returnUrl = searchParams.get('returnUrl');

    const passwordCriteria = [
        { label: 'Al menos 8 caracteres', test: (pw: string) => pw.length >= 8 },
        { label: 'Al menos un número', test: (pw: string) => /\d/.test(pw) },
        { label: 'Al menos una letra mayúscula', test: (pw: string) => /[A-Z]/.test(pw) },
        { label: 'Al menos una letra minúscula', test: (pw: string) => /[a-z]/.test(pw) },
        { label: 'Al menos un carácter especial', test: (pw: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
    ];

    useEffect(() => {
        const feedback = passwordCriteria.map((criterion) => ({
            label: criterion.label,
            valid: criterion.test(password),
        }));
        setPasswordFeedback(feedback);
    }, [password]);

    const passwordValid = passwordCriteria.every((criterion) => criterion.test(password));

    const describedByIds = [
        showBalloon ? 'password-balloon' : undefined,
        !passwordValid && password.length > 0 ? 'password-error' : undefined,
    ].filter(Boolean).join('') || undefined;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.includes('@')) {
            setErrorMessage('El correo electrónico debe contener un \'@\'');
            return;
        }
        if (password !== confirmPassword) {
            setErrorMessage('Las contraseñas deben coincidir');
            return;
        }
        if (!passwordCriteria.every((criterion) => criterion.test(password))) {
            setErrorMessage('La contraseña no cumple con todos los requisitos');
            return;
        }

        setErrorMessage('');
        setIsLoading(true);

        try {
            const registerData: RegisterDto = { name, email, phone, password };
            const result = await clientAuthService.register(registerData);

            if (result.success) {
                toast.success('¡Registro exitoso! Revisa tu email para verificar tu cuenta.', {
                    duration: 5000,
                });

                if (returnUrl) {
                    navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
                } else {
                    navigate('/login');
                }
            } else {
                toast.error(result.message || 'Error en el registro');
                setErrorMessage(result.message || 'Error en el registro');
            }
        } catch (error) {
            toast.error('Error interno del servidor');
            setErrorMessage('Error interno del servidor');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        if (returnUrl) {
            saveReturnUrl(returnUrl);
        }

        const apiUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

        window.location.href = `${apiUrl}/auth/client/google`;
    };

    const passwordsMatch = password === confirmPassword;

    const confirmDescribedBy = !passwordsMatch && confirmPassword.length > 0 ? 'confirm-error' : undefined;

    return (
        <PageContainer maxWidth="md" fullHeight centered padding="none">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Registrarse</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errorMessage && (
                            <div className="text-destructive text-sm">{errorMessage}</div>
                        )}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium">Nombre</label>
                            <Input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium">Correo Electrónico</label>
                            <Input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium">Teléfono</label>
                            <Input
                                type="tel"
                                id="phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor="password" className={`block text-sm font-medium cursor-pointer w-full ${!passwordValid && password.length > 0 ? 'text-destructive' : ''}`}>Contraseña</label>
                            <Input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full mt-1"
                                onFocus={() => setShowBalloon(true)}
                                onBlur={() => setShowBalloon(false)}
                                onKeyDown={(e) => { if (e.key === 'Escape') setShowBalloon(false); }}
                                aria-invalid={!passwordValid && password.length > 0}
                                aria-describedby={describedByIds}
                            />

                            {!passwordValid && password.length > 0 && (
                                <p id="password-error" className="text-destructive text-sm mt-1">La contraseña debe cumplir con los requerimientos</p>
                            )}

                            <div
                                role="status"
                                aria-live="polite"
                                id="password-balloon"
                                className={`${showBalloon ? 'pointer-events-auto' : 'pointer-events-none'} absolute z-20 bottom-full mb-2 right-0 w-72 sm:w-80 transform transition duration-150 ease-out ${showBalloon ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
                            >
                                <div className={`bg-card border rounded-lg shadow-md p-3 text-sm`}>
                                    <p className="font-semibold mb-2">Requisitos de la contraseña</p>
                                    <ul className="space-y-2">
                                        {passwordFeedback.map((fb, idx) => (
                                            <li key={idx} className="flex items-center gap-3">
                                                <span className={`flex items-center justify-center rounded-full w-6 h-6 ${fb.valid ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                                                    {fb.valid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                </span>
                                                <span className={fb.valid ? 'text-muted-foreground line-through' : 'text-foreground'}>{fb.label}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className={`block text-sm font-medium ${!passwordsMatch && confirmPassword.length > 0 ? 'text-destructive' : ''}`}>Confirmar Contraseña</label>
                            <Input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full"
                                aria-invalid={!passwordsMatch && confirmPassword.length > 0}
                                aria-describedby={confirmDescribedBy}
                            />

                            {!passwordsMatch && confirmPassword.length > 0 && (
                                <p id="confirm-error" className="text-destructive text-sm mt-1">Las contraseñas deben coincidir</p>
                            )}
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Registrando...' : 'Registrarse'}
                        </Button>
                    </form>

                    <Separator className="my-4" />

                    <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleGoogleLogin}
                        type="button"
                    >
                        <GoogleIcon />
                        <span>Continuar con Google</span>
                    </Button>

                    <p className="mt-4 text-center text-sm">
                        ¿Ya tienes una cuenta?{" "}
                        <Link
                            to={returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login"}
                            className="text-primary hover:underline"
                        >
                            Inicia sesión aquí
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </PageContainer>
    );
}
