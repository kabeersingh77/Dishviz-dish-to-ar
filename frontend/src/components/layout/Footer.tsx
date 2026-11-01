import React from 'react';
import { Link } from 'react-router-dom';
import { Box } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-neutral-900 font-semibold text-sm mb-3">
              <Box className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              Dishviz
            </Link>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-48">
              Turn photos of physical objects into AR-ready 3D models.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-3">
              Product
            </h3>
            <ul className="space-y-2">
              <li><FooterLink to="/create">Create AR Model</FooterLink></li>
              <li><FooterLink to="/pricing">Pricing</FooterLink></li>
              <li><FooterLink to="/dashboard">Dashboard</FooterLink></li>
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-3">
              Developers
            </h3>
            <ul className="space-y-2">
              <li><FooterLink to="/docs/api">API Reference</FooterLink></li>
              <li><FooterLink to="/dashboard/api">API Keys</FooterLink></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider mb-3">
              Legal
            </h3>
            <ul className="space-y-2">
              <li><FooterLink to="/privacy">Privacy Policy</FooterLink></li>
              <li><FooterLink to="/terms">Terms of Service</FooterLink></li>
              <li><FooterLink to="/refunds">Refund Policy</FooterLink></li>
              <li><FooterLink to="/cookies">Cookie Policy</FooterLink></li>
              <li><FooterLink to="/contact">Contact</FooterLink></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} Dishviz. All rights reserved.
          </p>
          {/* Persistent cookie settings link */}
          <button
            onClick={() => {
              // Cookie consent manager — implemented in Phase 8
              const event = new CustomEvent('objectar:open-cookie-settings');
              window.dispatchEvent(event);
            }}
            className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors underline"
          >
            Cookie Settings
          </button>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
    >
      {children}
    </Link>
  );
}
