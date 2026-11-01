import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Box } from 'lucide-react';

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-40">
      <nav
        className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-neutral-900 font-semibold text-base hover:opacity-80 transition-opacity"
        >
          <Box className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
          Dishviz
        </Link>

        {/* Center nav */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink
            to="/pricing"
            className={({ isActive }) =>
              `text-sm transition-colors ${
                isActive
                  ? 'text-neutral-900 font-medium'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`
            }
          >
            Credits & Pricing
          </NavLink>
          <NavLink
            to="/docs/api"
            className={({ isActive }) =>
              `text-sm transition-colors ${
                isActive
                  ? 'text-neutral-900 font-medium'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`
            }
          >
            API Docs
          </NavLink>
        </div>

        {/* Auth actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `text-sm transition-colors ${
                    isActive
                      ? 'text-neutral-900 font-medium'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <Link to="/create" className="btn-primary text-xs px-3 py-1.5">
                Create AR Model
              </Link>
              <button
                onClick={() => void handleLogout()}
                className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Sign in
              </Link>
              <Link to="/register" className="btn-primary text-xs px-3 py-1.5">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Trial usage banner */}
      {isAuthenticated && <TrialBanner />}
    </header>
  );
}

function TrialBanner() {
  const { trial, subscription } = useAuth();

  // Only show for users without an active subscription and with trial remaining
  if (!trial || subscription?.status === 'active') return null;

  const { generationsRemaining, generationsTotal } = trial;

  if (generationsRemaining === 0) {
    return (
      <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 text-center">
        <p className="text-xs text-amber-700">
          Your free AR generations are finished.{' '}
          <Link to="/pricing" className="font-medium underline hover:no-underline">
            Upgrade to AR Creator
          </Link>{' '}
          to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 border-b border-neutral-100 px-4 py-1.5 text-center">
      <p className="text-xs text-neutral-500">
        {generationsRemaining} / {generationsTotal} free AR generations remaining
      </p>
    </div>
  );
}
