import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Wraps routes that require authentication.
 * Redirects unauthenticated users to /login with return path preserved.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Avoid redirect flash during initial session check
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
}
