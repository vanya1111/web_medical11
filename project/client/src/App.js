import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage       from './pages/LoginPage';
import DashboardPage   from './pages/DashboardPage';
import PatientsPage    from './pages/PatientsPage';
import RecordsPage     from './pages/RecordsPage';
import RecordDetailPage from './pages/RecordDetailPage';
import AddRecordPage   from './pages/AddRecordPage';
import UsersPage       from './pages/UsersPage';
import AuditPage       from './pages/AuditPage';
import ProfilePage     from './pages/ProfilePage';
import Layout          from './components/Layout';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } }
});

// Protected route wrapper
function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Завантаження...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="patients" element={
          <PrivateRoute roles={['Admin','Doctor']}><PatientsPage /></PrivateRoute>
        } />

        <Route path="patients/:patientId/records" element={
          <PrivateRoute roles={['Admin','Doctor']}><RecordsPage /></PrivateRoute>
        } />

        <Route path="my-records" element={
          <PrivateRoute roles={['Patient']}><RecordsPage myRecords /></PrivateRoute>
        } />

        <Route path="records/:id" element={<RecordDetailPage />} />

        <Route path="records/new" element={
          <PrivateRoute roles={['Admin','Doctor']}><AddRecordPage /></PrivateRoute>
        } />

        <Route path="users" element={
          <PrivateRoute roles={['Admin']}><UsersPage /></PrivateRoute>
        } />

        <Route path="audit" element={
          <PrivateRoute roles={['Admin']}><AuditPage /></PrivateRoute>
        } />

        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
