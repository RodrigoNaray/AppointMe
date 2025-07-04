import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-gray-800">AppointMe</h1>
      </header>
      <main className="container mx-auto p-4">
        <Outlet /> {/* Aquí se renderizarán las páginas públicas */}
      </main>
    </div>
  );
}