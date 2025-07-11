import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import ServicesPage from './pages/admin/ServicesPage';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
  {  
    element: <ProtectedRoute />,
    children: [
    {
      path: '/admin',
      element: <AdminLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'services', element: <ServicesPage /> },
      ],
    },
    ],
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;