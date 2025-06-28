import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import PublicLayout from './layouts/PublicLayout';
import HomePage from './pages/HomePage';
import AdminDashboardPage from './pages/AdminDashboardPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        index: true, // Esto hace que sea la ruta por defecto para '/'
        element: <HomePage />,
      },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminDashboardPage />,
      },
      // Aquí añadiremos más rutas de admin como /admin/services
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;