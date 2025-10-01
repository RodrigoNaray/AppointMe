import { useState, useEffect, useMemo } from "react";
import { useClientAuth } from "@/context/AuthContext";
import type { RegisterDto } from "@/types/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface PasswordFeedback {
    label: string;
    valid: boolean;
}

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [passwordFeedback, setPasswordFeedback] = useState<PasswordFeedback[]>([]);
    const { registerClient } = useClientAuth();
    const [showBalloon, setShowBalloon] = useState(false);

    const passwordCriteria = [
        { label: "Al menos 8 caracteres", test: (pw: string) => pw.length >= 8 },
        { label: "Al menos un número", test: (pw: string) => /\d/.test(pw) },
        { label: "Al menos una letra mayúscula", test: (pw: string) => /[A-Z]/.test(pw) },
        { label: "Al menos una letra minúscula", test: (pw: string) => /[a-z]/.test(pw) },
        { label: "Al menos un carácter especial", test: (pw: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
    ];

    useEffect(() => {
        const feedback = passwordCriteria.map((criterion) => ({
            label: criterion.label,
            valid: criterion.test(password),
        }));
        setPasswordFeedback(feedback);
    }, [password]);

    const metCount = useMemo(() => passwordFeedback.filter(f => f.valid).length, [passwordFeedback]);
    const totalCount = passwordFeedback.length || 1;
    const progressPercent = Math.round((metCount / totalCount) * 100);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.includes('@')) {
            setErrorMessage("El correo electrónico debe contener un '@'");
            return;
        }
        if (password !== confirmPassword) {
            setErrorMessage("Las contraseñas no coinciden");
            return;
        }
        if (!passwordCriteria.every((criterion) => criterion.test(password))) {
            setErrorMessage("La contraseña no cumple con todos los requisitos");
            return;
        }
        setErrorMessage(''); // Clear error message if validation passes
        const registerData: RegisterDto = { name, email, phone, password };
        await registerClient(registerData);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Registrarse</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errorMessage && (
                            <div className="text-red-600 text-sm">{errorMessage}</div>
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
                            {/* explicit association: label (full-width) + sibling input to match other fields */}
                            <label htmlFor="password" className="block text-sm font-medium cursor-pointer w-full">Contraseña</label>
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
                                aria-describedby={showBalloon ? 'password-balloon' : undefined}
                            />

                            {/* Floating balloon - absolute positioned; hidden by default, appears above to avoid layout shift */}
                            <div
                                role="status"
                                aria-live="polite"
                                id="password-balloon"
                                className={`${showBalloon ? 'pointer-events-auto' : 'pointer-events-none'} absolute z-20 bottom-full mb-2 right-0 w-72 sm:w-80 transform transition duration-150 ease-out ${showBalloon ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
                            >
                                <div className={`bg-white border rounded-lg shadow-md p-3 text-sm`}> 
                                    <p className="font-semibold mb-2">Requisitos de la contraseña</p>
                                    <ul className="space-y-2">
                                        {passwordFeedback.map((fb, idx) => (
                                            <li key={idx} className="flex items-center gap-3">
                                                <span className={`flex items-center justify-center rounded-full w-6 h-6 ${fb.valid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                    {fb.valid ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                </span>
                                                <span className={fb.valid ? 'text-gray-500 line-through' : 'text-gray-800'}>{fb.label}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium">Confirmar Contraseña</label>
                            <Input
                                type="password"
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full"
                            />
                        </div>
                        <Button type="submit" className="w-full">Registrarse</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}