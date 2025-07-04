import { Outlet, Link } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-800 text-white p-5">
        <h2 className="text-2xl font-semibold mb-6">Admin Panel</h2>
        <nav>
          <ul>
            <li className="mb-2"><Link to="/admin">Dashboard</Link></li>
            <li className="mb-2"><Link to="/admin/services">Servicios</Link></li>
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-10 bg-gray-100">
        <Outlet /> {/* Aquí se renderizarán las páginas de admin */}
      </main>
    </div>
  );
}