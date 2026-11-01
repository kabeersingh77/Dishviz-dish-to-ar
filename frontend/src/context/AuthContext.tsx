import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { auth, ApiError } from '../api/client';
import type { MeResponse, User, TrialInfo, SubscriptionInfo } from '../types/api';

interface AuthState {
  user: User | null;
  trial: TrialInfo | null;
  subscription: SubscriptionInfo | null;
  /** Full /me response — includes canCreate, isOnTrial, apiUsage */
  me: MeResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetches /me — call after creating a job to refresh quota counts */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const EMPTY_STATE: AuthState = {
  user: null,
  trial: null,
  subscription: null,
  me: null,
  isLoading: false,
  isAuthenticated: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    ...EMPTY_STATE,
    isLoading: true,
  });

  const setFromResponse = useCallback((data: MeResponse) => {
    setState({
      user: data.user,
      trial: data.trial,
      subscription: data.subscription,
      me: data,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const data = await auth.me();
      setFromResponse(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setState({ ...EMPTY_STATE });
      }
    }
  }, [setFromResponse]);

  // Check session on mount
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    await auth.login({ email, password });
    await refreshUser();
  }, [refreshUser]);

  const register = useCallback(async (
    email: string,
    password: string,
    name?: string
  ) => {
    const data = await auth.register({ email, password, name });
    setFromResponse(data as MeResponse);
  }, [setFromResponse]);

  const logout = useCallback(async () => {
    await auth.logout();
    setState({ ...EMPTY_STATE });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
