import {lazy, useEffect} from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuthStore, selectCheckSession } from './stores/authStore';
import HomePage from './pages/HomePage';
import AdminLoginPage from './pages/admin/login/AdminLoginPage';
import PublicLayout from './layouts/PublicLayout';
import AdminRoute from './components/AdminRoute';
import NotFoundPage from './pages/NotFoundPage';
import ContactPage from './pages/ContactPage';
import PlatformFeaturesPage from './pages/PlatformFeaturesPage';
import ServicesGridPage from './pages/ServicesGridPage';
import BookingCalendarPage from './pages/BookingCalendarPage';
import BookingConfirmPage from './pages/BookingConfirmPage';
import BookingSuccessPage from './pages/BookingSuccessPage';

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
const CategoriesPage = lazy(() => import('./pages/admin/categories/CategoriesPage'))
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
      { path: 'book', element: <ServicesGridPage /> },
      { path: 'book/calendar', element: <BookingCalendarPage /> },
      { path: 'book/confirm', element: <BookingConfirmPage /> },
      { path: 'book/success', element: <BookingSuccessPage /> },
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
    element: <AdminRoute />,
    children: [
    {
      path: '/admin',
      element: <AdminLayout />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'services', element: <ServicesPage /> },
        { path: 'categories', element: <CategoriesPage /> },
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
  const checkSession = useAuthStore(selectCheckSession);

  // Check for existing session on app initialization
  useEffect(() => {
    checkSession();
  }, [checkSession]);

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