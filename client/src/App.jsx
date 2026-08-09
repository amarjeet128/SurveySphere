import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import SurveyBuilder from './pages/admin/SurveyBuilder';
import SurveyView from './pages/public/SurveyView';
import Analytics from './pages/admin/Analytics';
import LivePanel from './pages/admin/LivePanel';
import LiveDashboard from './pages/admin/LiveDashboard';
import LiveView from './pages/public/LiveView';
import GlobalThemeBuilder from './pages/admin/GlobalThemeBuilder';
import SurveysList from './pages/admin/SurveysList';
import JoinSurvey from './pages/public/JoinSurvey';
import AdminLogin from './pages/admin/AdminLogin';
import AdminSettings from './pages/admin/AdminSettings';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<JoinSurvey />} />
        <Route path="/s/:surveyId" element={<SurveyView />} />
        <Route path="/live" element={<LiveView />} />

        {/* Admin Login Route */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Admin Routes with Layout (Protected) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="surveys" element={<SurveysList />} />
            <Route path="surveys/new" element={<SurveyBuilder />} />
            <Route path="surveys/edit/:id" element={<SurveyBuilder />} />
            <Route path="theme" element={<GlobalThemeBuilder />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="live" element={<LiveDashboard />} />
          </Route>
          <Route path="/admin/live/builder/:id" element={<LivePanel />} />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
