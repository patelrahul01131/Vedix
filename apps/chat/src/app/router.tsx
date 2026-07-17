import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { PageLoader } from '../components/common/LoadingStates';

// Lazy loading for code splitting
const ChatPage = lazy(() => import('../features/chat/ChatPage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Chat Routes */}
        <Route 
          path="/chat" 
          element={
            <Suspense fallback={<PageLoader />}>
              <ChatPage />
            </Suspense>
          } 
        />
        <Route 
          path="/chat/:missionId" 
          element={
            <Suspense fallback={<PageLoader />}>
              <ChatPage />
            </Suspense>
          } 
        />
        
        {/* Settings Route */}
        <Route 
          path="/settings" 
          element={
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          } 
        />

        {/* Redirect root to /chat */}
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Route>
    </Routes>
  );
}
