"use client"

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Mi Perfil</CardTitle>
          <CardDescription>Información de tu cuenta de administrador.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user?.email || ''} readOnly disabled />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
          <CardDescription>Para mayor seguridad, te recomendamos usar una contraseña única.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="current-password">Contraseña Actual</Label>
            <Input id="current-password" type="password" />
          </div>
           <div className="space-y-2">
            <Label htmlFor="new-password">Nueva Contraseña</Label>
            <Input id="new-password" type="password" />
          </div>
          <div className="flex justify-end">
            <Button>Actualizar Contraseña</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}