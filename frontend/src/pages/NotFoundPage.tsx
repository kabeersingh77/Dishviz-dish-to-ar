import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-4xl font-semibold text-neutral-200 mb-4">404</p>
      <h1 className="text-base font-semibold text-neutral-900 mb-2">Page not found</h1>
      <p className="text-sm text-neutral-500 mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-secondary">Go home</Link>
    </div>
  );
}
