import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Contacto</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Estamos aquí para ayudarte. ¡No dudes en contactarnos!
        </p>
      </div>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Nuestra Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Mail className="h-6 w-6 text-primary" />
            <p className="text-lg">info@appointme.com</p>
          </div>
          <div className="flex items-center gap-4">
            <Phone className="h-6 w-6 text-primary" />
            <p className="text-lg">+598 123 456 789</p>
          </div>
          <div className="flex items-center gap-4">
            <MapPin className="h-6 w-6 text-primary" />
            <p className="text-lg">Av. 18 de Julio 1234, Montevideo, Uruguay</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}