import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Common Components
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import Toast from './components/common/Toast';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import FeasibilityCalculator from './pages/FeasibilityCalculator';
import FeedstockManagement from './pages/FeedstockManagement';
import CommunitySharing from './pages/CommunitySharing';
import PlantMonitoring from './pages/PlantMonitoring';
import GeographicalMap from './pages/GeographicalMap';
import GovernmentSchemes from './pages/GovernmentSchemes';
import ReportsAnalytics from './pages/ReportsAnalytics';
import HouseholdManagement from './pages/HouseholdManagement';
import VillageManagement from './pages/VillageManagement';
import UserManagement from './pages/UserManagement';
import AllocationOptimizer from './pages/AllocationOptimizer';
import IncentivePlatform from './pages/IncentivePlatform';
import DigestatePlanner from './pages/DigestatePlanner';
import DigitalTwinSimulator from './pages/DigitalTwinSimulator';
import MyHouseholdProfile from './pages/MyHouseholdProfile';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Main Layout Container
const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-x-clip">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <Toast />
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected App Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/calculator"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <FeasibilityCalculator />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/feedstock"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <FeedstockManagement />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/community"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CommunitySharing />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/monitoring"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <PlantMonitoring />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <GeographicalMap />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/schemes"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <GovernmentSchemes />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <ReportsAnalytics />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Advanced Optimization, Incentives, Digestate & Digital Twin Modules */}
            <Route
              path="/optimizer"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <AllocationOptimizer />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/incentives"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <IncentivePlatform />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/digestate"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <DigestatePlanner />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/simulator"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <DigitalTwinSimulator />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/my-household"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <MyHouseholdProfile />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Coordinator & Admin only */}
            <Route
              path="/households"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                  <MainLayout>
                    <HouseholdManagement />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin only */}
            <Route
              path="/villages"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <VillageManagement />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <MainLayout>
                    <UserManagement />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
