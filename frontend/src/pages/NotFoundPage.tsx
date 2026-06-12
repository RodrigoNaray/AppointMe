import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <AlertTriangle className="w-16 h-16 text-accent mb-4" />
      <h1 className="text-6xl font-bold text-foreground">404</h1>
      <h2 className="text-2xl font-semibold text-muted-foreground mt-2 mb-4">Página No Encontrada</h2>
      <p className="text-muted-foreground mb-6">
        Lo sentimos, no pudimos encontrar la página que estás buscando.
      </p>
      <Link
        to="/"
        className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
      >
        Volver al Inicio
      </Link>
    </div>
  );
}
