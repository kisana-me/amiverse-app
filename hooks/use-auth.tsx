import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AuthContextType = {
  token: string | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'authToken';

// Replace this with your real login URL (the web site you already made)
const AUTH_URL = 'https://example.com/login';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const redirectUri = Linking.createURL('auth');

  useEffect(() => {
    // Restore token from secure storage on mount
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) setToken(stored);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();

    // Handle incoming deep links
    const handleUrl = ({ url }: { url: string }) => {
      const parsed = Linking.parse(url);
      const maybeToken = parsed.queryParams?.token || parsed.queryParams?.access_token;
      if (typeof maybeToken === 'string') {
        SecureStore.setItemAsync(TOKEN_KEY, maybeToken);
        setToken(maybeToken);
      }
    };

    const subscription = Linking.addEventListener('url', (e) => handleUrl(e));
    // In case app was cold-started from the link
    (async () => {
      const initial = await Linking.getInitialURL();
      if (initial) handleUrl({ url: initial });
    })();

    return () => subscription.remove();
  }, []);

  const login = async () => {
    const url = `${AUTH_URL}?redirect_uri=${encodeURIComponent(redirectUri)}`;
    // Open external browser where the user will authenticate on your website.
    // The website must redirect back to the app using the `redirect_uri`,
    // e.g. `expoexample://auth?token=...` (scheme is taken from app.json).
    await WebBrowser.openBrowserAsync(url);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
  };

  const value = useMemo(() => ({ token, loading, login, logout }), [token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default useAuth;
