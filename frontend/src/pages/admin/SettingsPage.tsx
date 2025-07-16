import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Ajustes de la Aplicación</CardTitle>
          <CardDescription>Configuraciones generales para AppointMe.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aquí podrás configurar notificaciones, integraciones y otros ajustes de la aplicación en el futuro.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}