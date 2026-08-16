import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from 'sonner';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Shell } from '@/components/layout/Shell';

import Login from '@/pages/login';
import Register from '@/pages/register';
import DocumentsList from '@/pages/documents/index';
import DocumentDetail from '@/pages/documents/detail';
import NewDocument from '@/pages/documents/new';
import NewRevision from '@/pages/revisions/new';
import RequestsList from '@/pages/requests/index';
import NewRequest from '@/pages/requests/new';
import PrintControl from '@/pages/print/index';
import PrintHistory from '@/pages/print/history';
import Reports from '@/pages/reports';
import UsersList from '@/pages/admin/users/index';
import NewUser from '@/pages/admin/users/new';
import AuditTrail from '@/pages/audit';
import Settings from '@/pages/settings';
import DepartmentsList from '@/pages/admin/departments';
import CategoriesList from '@/pages/admin/categories';
import Dashboard from './pages/dashboard';
import Verify from '@/pages/verify';
import HowToUse from '@/pages/how-to-use';
import ChangePassword from '@/pages/change-password';

// Dummy component for unbuilt pages
function UnderConstruction({ name }: { name: string }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center text-center space-y-4">
      <div className="text-4xl font-mono text-muted-foreground">[{name.toUpperCase()}]</div>
      <p className="text-muted-foreground max-w-md">This module is currently under construction and will be deployed in the next operational phase.</p>
    </div>
  );
}

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, path, ...rest }: any) {
  return (
    <Route path={path} {...rest}>
      {(params) => {
        const { user, isLoading } = useAuth();
        const [location, setLocation] = useLocation();

        useEffect(() => {
          if (!isLoading && !user) {
            const redirect = location !== "/" ? `?redirect=${encodeURIComponent(location)}` : "";
            setLocation(`/login${redirect}`);
          } else if (user && user.mustChangePassword && location !== "/change-password") {
            setLocation("/change-password");
          }
        }, [user, isLoading, location, setLocation]);

        if (isLoading) {
          return <div className="flex h-[80vh] w-full items-center justify-center font-mono text-sm tracking-widest animate-pulse">INITIALIZING TERMINAL...</div>;
        }

        if (!user) return null;

        return <Component params={params} />;
      }}
    </Route>
  );
}

function RootRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => setLocation("/dashboard"), []);
  return null;
}

function NotFound() {
  return <div className="p-8 text-center font-mono text-destructive font-bold">ERR 404: MODULE NOT FOUND</div>;
}

function LoginGuard() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      // Already authenticated — send to dashboard (or the redirect target)
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      setLocation(redirect && redirect.startsWith("/") ? redirect : "/dashboard");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return null;
  if (user) return null;
  return <Login />;
}

function AppRoutes() {
  const [location] = useLocation();
  const isPublic = location === "/login" || location === "/register" || location === "/how-to-use" || location.startsWith("/verify");

  return (
    <>
      {isPublic ? (
        <Switch>
          <Route path="/login" component={LoginGuard} />
          <Route path="/register" component={Register} />
          <Route path="/how-to-use" component={HowToUse} />
          <Route path="/verify/:token" component={Verify} />
        </Switch>
      ) : (
        <Shell>
          <Switch>
            <ProtectedRoute path="/" component={RootRedirect} />
            <ProtectedRoute path="/dashboard" component={Dashboard} />
            <ProtectedRoute path="/change-password" component={ChangePassword} />
            <ProtectedRoute path="/documents" component={DocumentsList} />
            <ProtectedRoute path="/documents/new" component={NewDocument} />
            <ProtectedRoute path="/documents/:id" component={DocumentDetail} />
            <ProtectedRoute path="/revisions/new/:documentId" component={NewRevision} />
            <ProtectedRoute path="/requests" component={RequestsList} />
            <ProtectedRoute path="/requests/new" component={NewRequest} />
            <ProtectedRoute path="/print" component={PrintControl} />
            <ProtectedRoute path="/print-history" component={PrintHistory} />
            <ProtectedRoute path="/reports" component={Reports} />
            <ProtectedRoute path="/audit" component={AuditTrail} />
            <ProtectedRoute path="/admin/users" component={UsersList} />
            <ProtectedRoute path="/admin/users/new" component={NewUser} />
            <ProtectedRoute path="/admin/departments" component={DepartmentsList} />
            <ProtectedRoute path="/admin/categories" component={CategoriesList} />
            <ProtectedRoute path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </Shell>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </WouterRouter>
      <Toaster theme="light" position="top-right" closeButton richColors toastOptions={{
        className: 'font-mono rounded-sm border-border text-sm',
      }} />
    </QueryClientProvider>
  );
}

export default App;