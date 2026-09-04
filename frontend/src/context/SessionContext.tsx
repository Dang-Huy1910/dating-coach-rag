import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '../api/client';
import { SessionResponse } from '../api/types';

interface SessionContextType {
  sessionId: string | null;
  session: SessionResponse | null;
  disclaimer: string;
  indexReady: boolean;
  isBackendConnected: boolean;
  isLoading: boolean;
  error: string | null;
  ensureSession: () => Promise<string>;
  resetSession: () => Promise<void>;
  checkHealth: () => Promise<void>;
  clearError: () => void;
}

const DEFAULT_DISCLAIMER = 'Đây không phải liệu pháp tâm lý và không ghép đôi người thật.';

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>(DEFAULT_DISCLAIMER);
  const [indexReady, setIndexReady] = useState<boolean>(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const health = await api.getHealth();
      setIndexReady(health.index_ready);
      setIsBackendConnected(true);
    } catch {
      setIsBackendConnected(false);
      setIndexReady(false);
    }
  }, []);

  const fetchDisclaimer = useCallback(async () => {
    try {
      const res = await api.getDisclaimer();
      if (res.text) {
        setDisclaimer(res.text);
      }
    } catch {
      // keep default fallback
    }
  }, []);

  const createNewSession = useCallback(async (): Promise<SessionResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await api.createSession();
      setSession(newSession);
      if (newSession.disclaimer) {
        setDisclaimer(newSession.disclaimer);
      }
      setIsBackendConnected(true);
      return newSession;
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.detail : 'Không thể khởi tạo phiên tư vấn.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (session?.id) {
      return session.id;
    }
    const newSession = await createNewSession();
    return newSession.id;
  }, [session, createNewSession]);

  const resetSession = useCallback(async () => {
    if (session?.id) {
      try {
        await api.deleteSession(session.id);
      } catch {
        // ignore delete failure
      }
    }
    setSession(null);
    await createNewSession();
  }, [session, createNewSession]);

  useEffect(() => {
    checkHealth();
    fetchDisclaimer();
    // Auto initialize ephemeral session on tab load
    createNewSession().catch(() => {
      // Handled in state
    });
  }, [checkHealth, fetchDisclaimer, createNewSession]);

  const clearError = () => setError(null);

  return (
    <SessionContext.Provider
      value={{
        sessionId: session?.id || null,
        session,
        disclaimer,
        indexReady,
        isBackendConnected,
        isLoading,
        error,
        ensureSession,
        resetSession,
        checkHealth,
        clearError,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

