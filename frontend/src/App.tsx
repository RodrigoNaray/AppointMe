import {lazy} from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import PublicLayout from './layouts/PublicLayout';
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundPage from './pages/NotFoundPage';
import ServicesListPage from './pages/ServicesListPage';
import ContactPage from './pages/ContactPage';

//--- Admin routes ---//
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const DashboardPage = lazy(() => import('./pages/admin/dashboard/DashboardPage'))
const ServicesPage = lazy(() => import('./pages/admin/services/ServicesPage'))
const AvailabilityPage = lazy(() => import('./pages/admin/AvailabilityPage'))
const BookingsPage = lazy(() => import('./pages/admin/bookings/BookingsPage'))
const ProfilePage = lazy(() => import('./pages/admin/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))
//-------------------//

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