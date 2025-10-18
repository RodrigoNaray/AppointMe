import {lazy} from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import AdminLoginPage from './pages/admin/login/AdminLoginPage';
import PublicLayout from './layouts/PublicLayout';
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundPage from './pages/NotFoundPage';
import ServicesListPage from './pages/ServicesListPage';
import ContactPage from './pages/ContactPage';
import PlatformFeaturesPage from './pages/PlatformFeaturesPage';

//--- Public routes ---//
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const EmailVerificationPage = lazy(() => import('./pages/EmailVerificationPage'))
const ResendVerificationPage = lazy(() => import('./pages/ResendVerificationPage'))
const ChangeEmailPage = lazy(() => import('./pages/ChangeEmailPage'))
const VerifyEmailChangePage = lazy(() => import('./pages/VerifyEmailChangePage'))
const ClientProfilePage = lazy(() => import('./pages/ClientProfilePage'))
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'))


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
      { path: 'features', element: <PlatformFeaturesPage /> },
      { path: 'Adminlogin', element: <AdminLoginPage /> },
      { path: 'services', element: <ServicesListPage /> },
      { path: 'contact', element: <ContactPage /> },
      { path: 'login', element: <LoginPage/> },
      { path: 'register', element: <RegisterPage/> },
      { path: 'verify-email', element: <EmailVerificationPage/> },
      { path: 'resend-verification', element: <ResendVerificationPage/> },
      { path: 'change-email', element: <ChangeEmailPage/> },
      { path: 'verify-email-change', element: <VerifyEmailChangePage/> },
      { path: 'profile', element: <ClientProfilePage/> },
      { path: 'change-password', element: <ChangePasswordPage/> },
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
  return (
    <ErrorBoundary>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            duration: 1500,
            style: {
              background: '#10b981',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10b981',
            },
          },
          error: {
            duration: 1500,
            style: {
              background: '#ef4444',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444',
            },
          },
        }}
      />
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;