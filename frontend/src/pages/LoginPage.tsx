import { useState } from "react";
import { useClientAuth } from "@/context/AuthContext";
import type { LoginDto } from "@/types/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { loginClient } = useClientAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const loginData: LoginDto = { email, password };
        await loginClient(loginData);
    };

    const handleGoogleLogin = () => {
        // Aquí iría la lógica para iniciar sesión con Google
        console.log("Login con Google");
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
                        <Button type="submit" className="w-full">Iniciar Sesión</Button>
                    </form>
                    <Separator className="my-4" />
                    <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
                        Iniciar Sesión con Google
                    </Button>
                    <p className="mt-4 text-center text-sm">
                        ¿No tienes una cuenta?{" "}
                        <Link to="/register" className="text-blue-500 hover:underline">
                            Regístrate aquí
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

