import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/admin/dashboard/DashboardPage';
import ServicesPage from './pages/admin/services/ServicesPage';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundPage from './pages/NotFoundPage';
import ServicesListPage from './pages/ServicesListPage';
import ContactPage from './pages/ContactPage';
import AvailabilityPage from './pages/admin/AvailabilityPage';
import BookingsPage from './pages/admin/bookings/BookingsPage';
import ProfilePage from './pages/admin/ProfilePage';
import SettingsPage from './pages/admin/SettingsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'services', element: <ServicesListPage /> },
      { path: 'contact', element: <ContactPage /> },
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
        { path: 'availability', element: <AvailabilityPage /> }, 
        { path: 'bookings', element: <BookingsPage /> },
        { path: 'profile', element: <ProfilePage /> },
        { path: 'settings', element: <SettingsPage /> },  
      ],
    },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;