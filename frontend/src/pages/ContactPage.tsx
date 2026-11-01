import React, { useState } from 'react';
import { BUSINESS } from '../config/business';

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Phase 9 — email integration
    // For now, mailto fallback
    window.location.href =
      `mailto:${BUSINESS.supportEmail}?subject=Support request from ${encodeURIComponent(name)}&body=${encodeURIComponent(message)}`;
    setSubmitted(true);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-xl font-semibold text-neutral-900 mb-2">Contact</h1>
      <p className="text-sm text-neutral-500 mb-6">
        For support, billing, or privacy requests. We aim to respond within 5 business days.
      </p>

      {submitted ? (
        <div className="p-4 bg-green-50 border border-green-100 rounded text-sm text-green-700">
          Thank you. Your email client should have opened with your message pre-filled.
          If not, email us directly at{' '}
          <a href={`mailto:${BUSINESS.supportEmail}`} className="underline">
            {BUSINESS.supportEmail}
          </a>.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="label">Name</label>
            <input id="name" type="text" required value={name}
              onChange={(e) => setName(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="message" className="label">Message</label>
            <textarea id="message" required rows={5} value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input resize-none" />
          </div>
          <p className="text-xs text-neutral-500">
            For privacy requests (data deletion, access), email{' '}
            <a href={`mailto:${BUSINESS.privacyEmail}`} className="underline">
              {BUSINESS.privacyEmail}
            </a> directly.
          </p>
          <button type="submit" className="btn-primary">Send message</button>
        </form>
      )}
    </div>
  );
}
