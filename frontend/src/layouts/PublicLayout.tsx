import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div>
      <header className="bg-white shadow p-4">
        <h1 className="text-2xl font-bold">AppointMe</h1>
      </header>
      <main className="p-8">
        <Outlet />
      </main>
    </div>
  );
}