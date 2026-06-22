"use client"

import { useState } from "react";
import { useAuthStore, selectUser } from "@/stores/authStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import apiClient from "@/api/client";
import { adminAuthApi } from "@/api/modules/adminAuth";
import { PasswordStrength } from "@/components/admin/PasswordStrength";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const user = useAuthStore(selectUser);
  const setAuthState = useAuthStore((state) => state._setAuthState);
  const authState = useAuthStore((state) => state.authState);

  const [name, setName] = useState(user?.name ?? "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initials = (user?.name?.slice(0, 2) || user?.email?.slice(0, 2) || 'AD').toUpperCase();

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    if (name.length > 100) {
      toast.error("El nombre no puede superar los 100 caracteres");
      return;
    }
    try {
      setIsSavingName(true);
      const result = await adminAuthApi.updateProfile({ name: name.trim() });
      if (authState.type === 'admin') {
        setAuthState({
          type: 'admin',
          user: { ...result.user, type: 'admin' as const },
          isAuthenticated: true,
        });
      }
      toast.success("Nombre actualizado exitosamente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar el nombre");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error("Todos los campos son requeridos");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }

    try {
      setIsSubmitting(true);
      await apiClient.post("auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success("Contraseña actualizada exitosamente");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cambiar la contraseña");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Mi Perfil</CardTitle>
          <CardDescription>Información de tu cuenta de administrador.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{user?.name || "Administrador"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={100}
            />
            <Button onClick={handleSaveName} disabled={isSavingName || name.trim() === (user?.name ?? "")} size="sm">
              {isSavingName ? "Guardando..." : "Guardar nombre"}
            </Button>
          </div>

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
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña Actual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              <PasswordStrength value={newPassword} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Actualizando..." : "Actualizar Contraseña"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
