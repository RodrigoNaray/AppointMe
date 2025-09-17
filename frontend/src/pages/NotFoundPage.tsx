import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20">
      <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
      <h1 className="text-6xl font-bold text-gray-800">404</h1>
      <h2 className="text-2xl font-semibold text-gray-600 mt-2 mb-4">Página No Encontrada</h2>
      <p className="text-gray-500 mb-6">
        Lo sentimos, no pudimos encontrar la página que estás buscando.
      </p>
      <Link
        to="/"
        className="bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors"
      >
        Volver al Inicio
      </Link>
    </div>
  );
}