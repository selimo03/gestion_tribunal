import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/Layout';
import { normalizeRole } from './lib/permissions';
import { api } from './services/api';
import { supabase } from './lib/supabaseClient';
import ErrorBoundary from './components/ErrorBoundary';
import { NotificationProvider } from './context/NotificationContext';

// ─── Chargement différé (code splitting) ──────────────────────────────────────
// Pages publiques
const Home           = lazy(() => import('./pages/Home'));
const About          = lazy(() => import('./pages/About'));
const Features       = lazy(() => import('./pages/Features'));
const Support        = lazy(() => import('./pages/Support'));
const Privacy        = lazy(() => import('./pages/Privacy'));
const Register       = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Login          = lazy(() => import('./pages/Login'));
const ResetPassword  = lazy(() => import('./pages/ResetPassword'));
const ConfirmEmail   = lazy(() => import('./pages/ConfirmEmail'));
const NotFound       = lazy(() => import('./pages/NotFound'));

// Pages protégées
const Dashboard     = lazy(() => import('./pages/Dashboard'));
const Affaires      = lazy(() => import('./pages/Affaires'));
const AffaireDetail = lazy(() => import('./pages/AffaireDetail'));
const Audiences     = lazy(() => import('./pages/Audiences'));
const Parties       = lazy(() => import('./pages/Parties'));
const Juges         = lazy(() => import('./pages/Juges'));
const Avocats       = lazy(() => import('./pages/Avocats'));
const Demandes      = lazy(() => import('./pages/Demandes'));
const Stats         = lazy(() => import('./pages/Stats'));
const AuditLogs     = lazy(() => import('./pages/AuditLogs'));
const Profile       = lazy(() => import('./pages/Profile'));
const Settings      = lazy(() => import('./pages/Settings'));
const Users         = lazy(() => import('./pages/Users'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Rapports      = lazy(() => import('./pages/Rapports'));

// ─── Spinner de chargement global ────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#020617] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Chargement…</p>
    </div>
  </div>
);

// ─── Cache de vérification de statut (TTL 5 min) ─────────────────────────────
const STATUT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STATUT_CACHE_KEY = 'prot_route_cache';

function getStatutCache(userId) {
  try {
    const raw = sessionStorage.getItem(STATUT_CACHE_KEY);
    if (!raw) return null;
    const { id, ts, statut } = JSON.parse(raw);
    if (id === userId && Date.now() - ts < STATUT_CACHE_TTL) return statut;
  } catch { /* ignore */ }
  return null;
}
function setStatutCache(userId, statut) {
  try {
    sessionStorage.setItem(STATUT_CACHE_KEY, JSON.stringify({ id: userId, ts: Date.now(), statut }));
  } catch { /* ignore */ }
}
export function clearStatutCache() {
  try { sessionStorage.removeItem(STATUT_CACHE_KEY); } catch { /* ignore */ }
}

// ─── Route protégée ───────────────────────────────────────────────────────────
// Vérifie aussi statut_compte en BDD pour éviter le bypass via signUp auto-login.
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked]   = useState(false);
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!isAuthenticated || !user?.id) {
        if (!cancelled) setChecking(false);
        return;
      }

      // Vérifier le cache d'abord pour éviter une requête BDD à chaque navigation
      const cached = getStatutCache(user.id);
      if (cached !== null) {
        if (!cancelled) setChecking(false);
        if (cached === 'blocked') {
          await supabase.auth.signOut();
          await logout();
          if (!cancelled) setBlocked(true);
        }
        return;
      }

      try {
        const statut = await api.getStatutCompte(user.id);
        if (cancelled) return;

        // Compte pending/refuse/suspendu OU inactif → on déconnecte
        if (!statut
            || statut.statut_compte !== 'approuve'
            || statut.actif === false) {
          setStatutCache(user.id, 'blocked');
          await supabase.auth.signOut();
          await logout();
          setBlocked(true);
        } else {
          setStatutCache(user.id, 'ok');
        }
      } catch {
        // En cas d'erreur réseau, on bloque par sécurité plutôt que de laisser passer
        if (!cancelled) setApiError(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id, logout]);

  if (!isAuthenticated || blocked) return <Navigate to="/login" replace />;

  if (checking) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-['Outfit']">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-2xl flex items-center justify-center text-3xl">⚠️</div>
          <div>
            <h2 className="text-xl font-black text-white">Connexion impossible</h2>
            <p className="text-slate-400 text-sm mt-2">
              La vérification de votre compte a échoué. Vérifiez votre connexion et réessayez.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setApiError(false); setChecking(true); }}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition-colors"
            >
              Réessayer
            </button>
            <button
              onClick={() => logout()}
              className="px-6 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (requireAdmin) {
    const role = normalizeRole(user?.role || 'huissier');
    if (role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

// ─── App principale ───────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Routes publiques */}
            <Route path="/"                  element={<Home />} />
            <Route path="/about"             element={<About />} />
            <Route path="/features"          element={<Features />} />
            <Route path="/support"           element={<Support />} />
            <Route path="/privacy"           element={<Privacy />} />
            <Route path="/register"          element={<Register />} />
            <Route path="/forgot-password"   element={<ForgotPassword />} />
            <Route path="/login"             element={<Login />} />
            <Route path="/reset-password"    element={<ResetPassword />} />
            <Route path="/confirm"           element={<ConfirmEmail />} />

            {/* Routes protégées */}
            <Route path="/dashboard"         element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/affaires"          element={<ProtectedRoute><Affaires /></ProtectedRoute>} />
            <Route path="/affaires/:id"      element={<ProtectedRoute><AffaireDetail /></ProtectedRoute>} />
            <Route path="/audiences"         element={<ProtectedRoute><Audiences /></ProtectedRoute>} />
            <Route path="/parties"           element={<ProtectedRoute><Parties /></ProtectedRoute>} />
            <Route path="/juges"             element={<ProtectedRoute><Juges /></ProtectedRoute>} />
            <Route path="/avocats"           element={<ProtectedRoute><Avocats /></ProtectedRoute>} />
            <Route path="/stats"             element={<ProtectedRoute><Stats /></ProtectedRoute>} />
            <Route path="/profile"           element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings"          element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/notifications"     element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/rapports"          element={<ProtectedRoute><Rapports /></ProtectedRoute>} />

            {/* super_admin / gestionnaire */}
            <Route path="/demandes"          element={<ProtectedRoute><Demandes /></ProtectedRoute>} />

            {/* super_admin seulement */}
            <Route path="/audit"             element={<ProtectedRoute requireAdmin><AuditLogs /></ProtectedRoute>} />
            <Route path="/users"             element={<ProtectedRoute requireAdmin><Users /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*"                  element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;
