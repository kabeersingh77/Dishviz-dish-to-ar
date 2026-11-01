import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { compliance } from '../api/client';

export interface CookiePreferences {
  essential: true; // Strictly necessary, always true
  analytics: boolean;
  preferences: boolean;
}

interface CookieConsentContextValue {
  hasAnswered: boolean;
  preferences: CookiePreferences;
  isSettingsOpen: boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (prefs: { analytics: boolean; preferences: boolean }) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

const STORAGE_KEY = 'objectar_cookie_consent_v1';

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  preferences: false,
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const [hasAnswered, setHasAnswered] = useState<boolean>(true); // default true to avoid flash before check
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CookiePreferences;
        setPreferences({
          essential: true,
          analytics: Boolean(parsed.analytics),
          preferences: Boolean(parsed.preferences),
        });
        setHasAnswered(true);
      } else {
        setHasAnswered(false);
      }
    } catch {
      setHasAnswered(false);
    }
  }, []);

  // Listen for global custom event (e.g. from Footer "Cookie Settings" button)
  useEffect(() => {
    const handleOpen = () => setIsSettingsOpen(true);
    window.addEventListener('objectar:open-cookie-settings', handleOpen);
    return () => window.removeEventListener('objectar:open-cookie-settings', handleOpen);
  }, []);

  const persist = useCallback((newPrefs: CookiePreferences) => {
    setPreferences(newPrefs);
    setHasAnswered(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    } catch {
      // Ignore local storage error
    }

    // Sync to backend compliance endpoint asynchronously
    void compliance.recordConsent({
      consentType: 'cookie_preferences',
      granted: true,
      preferences: {
        essential: newPrefs.essential,
        analytics: newPrefs.analytics,
        preferences: newPrefs.preferences,
      },
    }).catch(() => {
      // Fire-and-forget
    });


    // Notify telemetry or other subsystems
    window.dispatchEvent(new CustomEvent('objectar:consent-changed', { detail: newPrefs }));
  }, []);

  const acceptAll = useCallback(() => {
    persist({
      essential: true,
      analytics: true,
      preferences: true,
    });
    setIsSettingsOpen(false);
  }, [persist]);

  const rejectNonEssential = useCallback(() => {
    persist({
      essential: true,
      analytics: false,
      preferences: false,
    });
    setIsSettingsOpen(false);
  }, [persist]);

  const savePreferences = useCallback((custom: { analytics: boolean; preferences: boolean }) => {
    persist({
      essential: true,
      analytics: custom.analytics,
      preferences: custom.preferences,
    });
    setIsSettingsOpen(false);
  }, [persist]);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  return (
    <CookieConsentContext.Provider
      value={{
        hasAnswered,
        preferences,
        isSettingsOpen,
        acceptAll,
        rejectNonEssential,
        savePreferences,
        openSettings,
        closeSettings,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider');
  return ctx;
}
