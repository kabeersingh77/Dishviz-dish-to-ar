import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { BUSINESS } from '../config/business';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setIsSubmitting(false);
      return;
    }

    try {
      await register(email, password, name.trim() || undefined);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Registration failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-neutral-900 mb-1">Create account</h1>
        <p className="text-sm text-neutral-500 mb-1">
          {BUSINESS.limits.trialGenerations} free AR generations included. No credit card required.
        </p>
        <p className="text-sm text-neutral-500 mb-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-600 hover:text-accent-800 underline">
            Sign in
          </Link>
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-100 rounded text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="label">
              Name <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Your name"
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
            <p className="text-xs text-neutral-400 mt-1">At least 8 characters</p>
          </div>

          {/* Service consent — required, tied to account creation */}
          <p className="text-xs text-neutral-500 leading-relaxed">
            By creating an account, you agree to our{' '}
            <Link to="/terms" target="_blank" className="underline hover:no-underline">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" target="_blank" className="underline hover:no-underline">Privacy Policy</Link>.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full justify-center"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
