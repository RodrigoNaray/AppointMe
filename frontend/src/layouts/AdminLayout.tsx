import { Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Barra lateral de navegación del admin */}
      <aside className="w-64 bg-gray-800 text-white p-4">
        <h2 className="text-xl font-bold mb-4">AppointMe Admin</h2>
        <nav>
          <ul>
            <li>Dashboard</li>
            <li>Servicios</li>
            <li>Disponibilidad</li>
            <li>Reservas</li>
          </ul>
        </nav>
      </aside>

      {/* Contenido principal de la página */}
      <main className="flex-1 p-8">
        <Outlet /> {/* Aquí se renderizará el componente de la página actual */}
      </main>
    </div>
  );
}