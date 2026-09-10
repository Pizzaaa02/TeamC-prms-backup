import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RegistrationProvider } from './contexts/RegistrationContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { CustomizationProvider } from './contexts/CustomizationContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext';
import { ProtectedRoute, PublicRoute, RoleSelectionRoute } from './components/ProtectedRoute';
import RoleSelectionGuard from './components/RoleSelectionGuard';
import PublicPageTransition from './components/PublicPageTransition';

/*  Public pages  */
import GuestHome from './pages/GuestHome';
import GuestProperties from './pages/GuestProperties';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import LandlordCategories from './pages/LandlordCategories';
import Register from './pages/Register';
import RoleSelection from './pages/RoleSelection';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';
import SearchPage from './pages/SearchPage';
import PrivacyNotice from './pages/PrivacyNotice';

/*  Lazy-loaded pages (code-split for performance)  */
const PropertyDetail = lazy(() => import('./pages/PropertyDetail'));
const Properties = lazy(() => import('./pages/Properties'));
const FinanceDashboard = lazy(() => import('./pages/FinanceDashboard'));
const AdminCategories = lazy(() => import('./pages/AdminCategories'));
const WebsiteCustomizer = lazy(() => import('./pages/Customize'));
const UserManagement = lazy(() => import('./pages/UserManagement'));

/*  Admin  */
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminSimplePage from './pages/AdminSimplePage';
import AddProperty from './pages/AddProperty';
import PropertyEdit from './pages/PropertyEdit';
import Settings from './pages/Settings';

/*  Landlord  */
import LandlordLayout from './components/LandlordLayout';
import LandlordDashboard from './pages/LandlordDashboard';
import LandlordSimplePage from './pages/LandlordSimplePage';

/*  Tenant  */
import TenantLayout from './components/TenantLayout';
import TenantDashboard from './pages/TenantDashboard';
import TenantSimplePage from './pages/TenantSimplePage';

/*  Agent  */
import AgentLayout from './components/AgentLayout';
import AgentDashboard from './pages/AgentDashboard';
import AgentCategories from './pages/AgentCategories';
import AgentSimplePage from './pages/AgentSimplePage';

/*  Shared  */
import Profile from './pages/Profile';
import LandlordHeatmap from './pages/LandlordHeatmap';
import LandlordMaintenance from './pages/LandlordMaintenance';
import PaymentReceipt from './pages/PaymentReceipt';
import CommunicationHub from './components/CommunicationHub';
import ErrorBoundary from './components/ErrorBoundary';

const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<div className="admin-shell center">Loading...</div>}>
    {children}
  </Suspense>
);

/*  New pages (Module 2-3)  */
const MyBookings = lazy(() => import('./pages/MyBookings'));
const LandlordBookings = lazy(() => import('./pages/LandlordBookings'));
const AdminBookings = lazy(() => import('./pages/AdminBookings'));
const TenantPayments = lazy(() => import('./pages/TenantPayments'));
const TenantMaintenance = lazy(() => import('./pages/TenantMaintenance'));
const AgentMaintenance = lazy(() => import('./pages/AgentMaintenance'));
const AgentProperties = lazy(() => import('./pages/AgentProperties'));
const AgentBookings = lazy(() => import('./pages/AgentBookings'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const AdminAuditLogs = lazy(() => import('./pages/AdminAuditLogs'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const PrivacyCenter = lazy(() => import('./pages/PrivacyCenter'));
const AdminPrivacy = lazy(() => import('./pages/AdminPrivacy'));
const Agreements = lazy(() => import('./pages/Agreements'));
const AgentWork = lazy(() => import('./pages/AgentWork'));
const AgentPortfolio = lazy(() => import('./pages/AgentPortfolio'));

function AppRoutes() {
  const { loading } = useAuth();

  /* Block rendering routes until hydration is done */
  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Loading PRMS...</p>
      </div>
    );
  }

  return (
    <Routes>
      {/*  Issue #1: GuestHome is the default landing page — guests see it, signed-in users get redirected to their dashboard  */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <GuestHome />
          </PublicRoute>
        }
      />

      {/*  Issue #5: Public guest-properties route  */}
      <Route path="/properties" element={<GuestProperties />} />
      <Route path="/privacy" element={<PrivacyNotice />} />

      {/*  Issue #12: PropertyDetail page (lazy-loaded)  */}
      <Route
        path="/properties/edit/:id"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Landlord']}>
            <SuspenseWrapper>
              <PropertyEdit />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/properties/:id"
        element={
          <SuspenseWrapper>
            <PropertyDetail />
          </SuspenseWrapper>
        }
      />

      {/*  Public routes (auth-001: RoleSelection -> Register -> Login)  */}
      <Route
        path="/role-selection"
        element={
          <RoleSelectionRoute>
            <PublicPageTransition>
              <RoleSelection />
            </PublicPageTransition>
          </RoleSelectionRoute>
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <PublicPageTransition>
              <Login />
            </PublicPageTransition>
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <LoginGuard>
              <PublicPageTransition>
                <ForgotPassword />
              </PublicPageTransition>
            </LoginGuard>
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RoleSelectionGuard>
              <PublicPageTransition>
                <Register />
              </PublicPageTransition>
            </RoleSelectionGuard>
          </PublicRoute>
        }
      />

      {/*  Admin routes (AUTH-006: role-protected)  */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <ErrorBoundary>
              <AdminLayout />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route
          path="notifications"
          element={
            <SuspenseWrapper>
              <NotificationCenter />
            </SuspenseWrapper>
          }
        />
        <Route
          path="users"
          element={
            <SuspenseWrapper>
              <UserManagement />
            </SuspenseWrapper>
          }
        />
        <Route path="profile" element={<Profile />} />
        <Route
          path="properties"
          element={
            <SuspenseWrapper>
              <Properties />
            </SuspenseWrapper>
          }
        />
        <Route path="properties/add" element={<AddProperty />} />
        <Route path="properties/edit" element={<PropertyEdit />} />
        <Route path="properties/edit/:id" element={<PropertyEdit />} />
        <Route
          path="properties/:id"
          element={<PropertyDetail />}
        />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="agreements" element={<Agreements />} />
        <Route
          path="finance"
          element={
            <SuspenseWrapper>
              <FinanceDashboard />
            </SuspenseWrapper>
          }
        />
        <Route path="maintenance" element={<AdminSimplePage type="maintenance" />} />
        <Route path="messages" element={<CommunicationHub />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route
          path="categories"
          element={
            <SuspenseWrapper>
              <AdminCategories />
            </SuspenseWrapper>
          }
        />
        <Route path="settings" element={<Settings />} />
        <Route path="privacy" element={<AdminPrivacy />} />
        <Route
          path="settings/customizer"
          element={
            <SuspenseWrapper>
              <WebsiteCustomizer />
            </SuspenseWrapper>
          }
        />
        <Route path="help" element={<AdminSimplePage type="help" />} />
      </Route>

      {/*  Landlord routes (AUTH-006: role-protected)  */}
      <Route
        path="/landlord/*"
        element={
          <ProtectedRoute allowedRoles={['Landlord']}>
            <ErrorBoundary>
              <LandlordLayout />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route index element={<LandlordDashboard />} />
        <Route path="dashboard" element={<LandlordDashboard />} />
        <Route
          path="notifications"
          element={
            <SuspenseWrapper>
              <NotificationCenter />
            </SuspenseWrapper>
          }
        />
        <Route path="profile" element={<Profile />} />
        <Route
          path="properties"
          element={
            <SuspenseWrapper>
              <Properties />
            </SuspenseWrapper>
          }
        />
        <Route path="properties/add" element={<AddProperty />} />
        <Route path="properties/edit" element={<PropertyEdit />} />
        <Route path="properties/edit/:id" element={<PropertyEdit />} />
        <Route path="properties/:id" element={<PropertyDetail />} />
        <Route path="bookings" element={<LandlordBookings />} />
        <Route path="agreements" element={<Agreements />} />
        <Route
          path="finance"
          element={
            <SuspenseWrapper>
              <FinanceDashboard />
            </SuspenseWrapper>
          }
        />
        <Route path="heatmap" element={<LandlordHeatmap />} />
        <Route path="maintenance" element={<LandlordMaintenance />} />
        <Route path="categories" element={<LandlordCategories />} />
        <Route
          path="maintenance"
          element={
            <SuspenseWrapper>
              <LandlordMaintenance />
            </SuspenseWrapper>
          }
        />
        <Route path="messages" element={<CommunicationHub />} />
        <Route path="settings" element={<Settings />} />
        <Route path="privacy" element={<PrivacyCenter />} />
        <Route
          path="settings/customizer"
          element={
            <SuspenseWrapper>
              <WebsiteCustomizer />
            </SuspenseWrapper>
          }
        />
        <Route path="help" element={<LandlordSimplePage label="Help Center" />} />
      </Route>

      {/*  Tenant routes (AUTH-006: role-protected)  */}
      <Route
        path="/tenant/*"
        element={
          <ProtectedRoute allowedRoles={['Tenant']}>
            <ErrorBoundary>
              <TenantLayout />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route index element={<TenantDashboard />} />
        <Route path="dashboard" element={<TenantDashboard />} />
        <Route
          path="notifications"
          element={
            <SuspenseWrapper>
              <NotificationCenter />
            </SuspenseWrapper>
          }
        />
        <Route path="profile" element={<Profile />} />
        <Route
          path="properties"
          element={
            <SuspenseWrapper>
              <Properties />
            </SuspenseWrapper>
          }
        />
        <Route path="properties/:id" element={<PropertyDetail />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="agreements" element={<Agreements />} />
        <Route path="payments" element={<TenantPayments />} />
        <Route path="payments/:id" element={<PaymentReceipt />} />
        <Route path="maintenance" element={<TenantMaintenance />} />
          <Route path="messages" element={<CommunicationHub />} />
        <Route path="settings" element={<Settings />} />
        <Route path="privacy" element={<PrivacyCenter />} />
        <Route
          path="settings/customizer"
          element={
            <SuspenseWrapper>
              <WebsiteCustomizer />
            </SuspenseWrapper>
          }
        />
          <Route path="help" element={<TenantSimplePage type="help" />} />
      </Route>

      {/*  Agent routes (AUTH-006: role-protected)  */}
      <Route
        path="/agent/*"
        element={
          <ProtectedRoute allowedRoles={['Agent']}>
            <ErrorBoundary>
              <AgentLayout />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      >
        <Route index element={<AgentDashboard />} />
        <Route path="dashboard" element={<AgentDashboard />} />
        <Route
          path="notifications"
          element={
            <SuspenseWrapper>
              <NotificationCenter />
            </SuspenseWrapper>
          }
        />
        <Route path="profile" element={<Profile />} />
        <Route path="properties" element={<AgentWork mode="properties" />} />
        <Route
          path="properties"
          element={
            <SuspenseWrapper>
              <AgentProperties />
            </SuspenseWrapper>
          }
        />
        <Route path="properties/:id" element={<PropertyDetail />} />
        <Route
          path="bookings"
          element={
            <SuspenseWrapper>
              <AgentBookings />
            </SuspenseWrapper>
          }
        />
          <Route
            path="finance"
            element={
              <SuspenseWrapper>
                <AgentPortfolio mode="finance" />
              </SuspenseWrapper>
            }
          />
          <Route
            path="reports"
        <Route path="maintenance" element={<AgentMaintenance />} />
        <Route path="categories" element={<AgentCategories />} />
        <Route path="settings" element={<Settings />} />
        <Route
          path="finance"
          element={
            <SuspenseWrapper>
              <FinanceDashboard />
            </SuspenseWrapper>
          }
        />
        <Route
          path="reports"
          element={
            <SuspenseWrapper>
                <AgentPortfolio mode="reports" />
            </SuspenseWrapper>
          }
        />
        <Route path="help" element={<AgentSimplePage label="Help Center" />} />
      </Route>

      {/*  Search page (public)  */}
      <Route path="/search" element={<SearchPage />} />

      {/*  Issue #30: Fallback to 404 NotFound  */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <SettingsProvider>
          <CustomizationProvider>
            <AuthProvider>
              <UserPreferencesProvider>
                <FeatureFlagsProvider>
                  <RegistrationProvider>
                    <AppRoutes />
                  </RegistrationProvider>
                </FeatureFlagsProvider>
              </UserPreferencesProvider>
            </AuthProvider>
          </CustomizationProvider>
        </SettingsProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
