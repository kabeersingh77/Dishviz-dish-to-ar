import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import { CookieConsentBanner } from './components/consent/CookieConsentBanner';
import { CookieSettingsModal } from './components/consent/CookieSettingsModal';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// ─── Eagerly loaded ───────────────────────────────────────────────────────
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CreatePage } from './pages/CreatePage';
import { EmbedPage } from './pages/EmbedPage';

// ─── Lazy loaded — heavy pages loaded on demand ───────────────────────────
// The 3D viewer (model-viewer) is only loaded on the result page
const ResultPage = lazy(() =>
  import('./pages/ResultPage').then((m) => ({ default: m.ResultPage }))
);
const AddItemPage = lazy(() =>
  import('./pages/AddItemPage').then((m) => ({ default: m.AddItemPage }))
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);

const DashboardHistoryPage = lazy(() =>
  import('./pages/DashboardHistoryPage').then((m) => ({ default: m.DashboardHistoryPage }))
);
const DashboardApiPage = lazy(() =>
  import('./pages/DashboardApiPage').then((m) => ({ default: m.DashboardApiPage }))
);
const DashboardBillingPage = lazy(() =>
  import('./pages/DashboardBillingPage').then((m) => ({ default: m.DashboardBillingPage }))
);
const ApiDocsPage = lazy(() =>
  import('./pages/ApiDocsPage').then((m) => ({ default: m.ApiDocsPage }))
);
const PricingPage = lazy(() =>
  import('./pages/PricingPage').then((m) => ({ default: m.PricingPage }))
);
const PrivacyPage = lazy(() =>
  import('./pages/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const TermsPage = lazy(() =>
  import('./pages/legal/TermsPage').then((m) => ({ default: m.TermsPage }))
);
const RefundsPage = lazy(() =>
  import('./pages/legal/RefundsPage').then((m) => ({ default: m.RefundsPage }))
);
const CookiesPage = lazy(() =>
  import('./pages/legal/CookiesPage').then((m) => ({ default: m.CookiesPage }))
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

/** Standard layout: Navbar + content + Footer */
function StandardLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}

/** Page-level loading fallback */
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CookieConsentProvider>
          <Routes>

          {/* ─── Standard layout routes ─── */}
          <Route element={<StandardLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route
              path="pricing"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PricingPage />
                </Suspense>
              }
            />
            <Route
              path="docs/api"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ApiDocsPage />
                </Suspense>
              }
            />
            <Route
              path="privacy"
              element={
                <Suspense fallback={<PageLoader />}>
                  <PrivacyPage />
                </Suspense>
              }
            />
            <Route
              path="terms"
              element={
                <Suspense fallback={<PageLoader />}>
                  <TermsPage />
                </Suspense>
              }
            />
            <Route
              path="refunds"
              element={
                <Suspense fallback={<PageLoader />}>
                  <RefundsPage />
                </Suspense>
              }
            />
            <Route
              path="cookies"
              element={
                <Suspense fallback={<PageLoader />}>
                  <CookiesPage />
                </Suspense>
              }
            />
            <Route
              path="contact"
              element={
                <Suspense fallback={<PageLoader />}>
                  <ContactPage />
                </Suspense>
              }
            />

            {/* ─── Protected routes ─── */}
            <Route
              path="add-item"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <AddItemPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="result/:jobId"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <ResultPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <DashboardPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard/history"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <DashboardHistoryPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard/api"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <DashboardApiPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="dashboard/billing"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <DashboardBillingPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route
              path="*"
              element={
                <Suspense fallback={<PageLoader />}>
                  <NotFoundPage />
                </Suspense>
              }
            />
          </Route>

            {/* ─── Full-screen routes (no standard layout) ─── */}
            {/* CreatePage uses full-screen camera overlay — no Navbar/Footer */}
            <Route
              path="create"
              element={
                <ProtectedRoute>
                  <CreatePage />
                </ProtectedRoute>
              }
            />

            {/* EmbedPage — standalone embeddable 3D/AR viewer without site chrome */}
            <Route
              path="embed/:assetId"
              element={
                <Suspense fallback={<PageLoader />}>
                  <EmbedPage />
                </Suspense>
              }
            />
          </Routes>
          <CookieConsentBanner />
          <CookieSettingsModal />
        </CookieConsentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

