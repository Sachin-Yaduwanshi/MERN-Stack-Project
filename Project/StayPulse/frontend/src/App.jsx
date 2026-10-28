import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import RoleSwitcherBanner from './components/ui/RoleSwitcherBanner';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Public Pages
import HomePage from './pages/HomePage';
import HotelListingPage from './pages/HotelListingPage';
import HotelDetailsPage from './pages/HotelDetailsPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';

// Guest Dashboard
import GuestOverview from './pages/dashboard/guest/GuestOverview';
import GuestBookings from './pages/dashboard/guest/GuestBookings';
import GuestProfile from './pages/dashboard/guest/GuestProfile';

// Owner Dashboard
import OwnerOverview from './pages/dashboard/owner/OwnerOverview';
import OwnerProperties from './pages/dashboard/owner/OwnerProperties';
import OwnerRooms from './pages/dashboard/owner/OwnerRooms';
import OwnerBookings from './pages/dashboard/owner/OwnerBookings';
import OwnerProfile from './pages/dashboard/owner/OwnerProfile';

// Admin Dashboard
import AdminOverview from './pages/dashboard/admin/AdminOverview';
import AdminProperties from './pages/dashboard/admin/AdminProperties';
import AdminUsers from './pages/dashboard/admin/AdminUsers';
import AdminSettings from './pages/dashboard/admin/AdminSettings';

// Role-protected route wrapper for client-side navigation
function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans transition-colors duration-200">
            {/* Development Role Sandbox bar */}
            <RoleSwitcherBanner />

            {/* Standard Navigation */}
            <Navbar />

            {/* Main App Routes */}
            <main className="flex-1 flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/hotels" element={<HotelListingPage />} />
              <Route path="/hotels/:id" element={<HotelDetailsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Guest Dashboard Routes */}
              <Route
                path="/dashboard/guest"
                element={
                  <ProtectedRoute allowedRoles={['GUEST']}>
                    <GuestOverview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/guest/bookings"
                element={
                  <ProtectedRoute allowedRoles={['GUEST']}>
                    <GuestBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/guest/profile"
                element={
                  <ProtectedRoute allowedRoles={['GUEST']}>
                    <GuestProfile />
                  </ProtectedRoute>
                }
              />

              {/* Property Owner Dashboard Routes */}
              <Route
                path="/dashboard/owner"
                element={
                  <ProtectedRoute allowedRoles={['PROPERTY_OWNER']}>
                    <OwnerOverview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/owner/properties"
                element={
                  <ProtectedRoute allowedRoles={['PROPERTY_OWNER']}>
                    <OwnerProperties />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/owner/rooms"
                element={
                  <ProtectedRoute allowedRoles={['PROPERTY_OWNER']}>
                    <OwnerRooms />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/owner/bookings"
                element={
                  <ProtectedRoute allowedRoles={['PROPERTY_OWNER']}>
                    <OwnerBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/owner/profile"
                element={
                  <ProtectedRoute allowedRoles={['PROPERTY_OWNER']}>
                    <OwnerProfile />
                  </ProtectedRoute>
                }
              />

              {/* Platform Admin Dashboard Routes */}
              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute allowedRoles={['PLATFORM_ADMIN']}>
                    <AdminOverview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/properties"
                element={
                  <ProtectedRoute allowedRoles={['PLATFORM_ADMIN']}>
                    <AdminProperties />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['PLATFORM_ADMIN']}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin/settings"
                element={
                  <ProtectedRoute allowedRoles={['PLATFORM_ADMIN']}>
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />

              {/* 404 Route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  </ThemeProvider>
  );
}
