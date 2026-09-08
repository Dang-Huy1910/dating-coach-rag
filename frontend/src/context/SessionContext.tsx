import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '../api/client';
import { ChatTurn, SessionKitResponse, SessionResponse } from '../api/types';
import { tStatic } from '../i18n/LocaleContext';

const EMPTY_KIT: SessionKitResponse = {
  improved_bio: null,
  analysis_points: null,
  openers: [],
  improved_message: null,
  message_draft: null,
  message_analysis: null,
  tone: null,
  clarity: null,
  risk: null,
  updated_at: null,
  slots_filled: [],
};

interface SessionContextType {
  sessionId: string | null;
  session: SessionResponse | null;
  disclaimer: string;
  indexReady: boolean;
  isBackendConnected: boolean;
  isLoading: boolean;
  error: string | null;
  kit: SessionKitResponse;
  refreshKit: (sessionId?: string | null) => Promise<SessionKitResponse>;
  chatTurns: ChatTurn[];
  appendChatTurn: (turn: ChatTurn) => void;
  ensureSession: (forceNew?: boolean) => Promise<string>;
  createNewSession: () => Promise<SessionResponse>;
  executeWithSession: <T>(operation: (sessionId: string) => Promise<T>) => Promise<T>;
  resetSession: () => Promise<void>;
  checkHealth: () => Promise<void>;
  clearError: () => void;
}

const DEFAULT_DISCLAIMER = tStatic('session.disclaimerDefault');

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [disclaimer, setDisclaimer] = useState<string>(DEFAULT_DISCLAIMER);
  const [indexReady, setIndexReady] = useState<boolean>(true);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [kit, setKit] = useState<SessionKitResponse>(EMPTY_KIT);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);

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

  const refreshKit = useCallback(async (sessionId?: string | null): Promise<SessionKitResponse> => {
    const sid = sessionId ?? null;
    if (!sid) {
      setKit(EMPTY_KIT);
      return EMPTY_KIT;
    }
    try {
      const next = await api.getSessionKit(sid);
      setKit(next);
      return next;
    } catch {
      setKit(EMPTY_KIT);
      return EMPTY_KIT;
    }
  }, []);

  const createNewSession = useCallback(async (): Promise<SessionResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await api.createSession();
      setSession(newSession);
      setChatTurns([]);
      if (newSession.disclaimer) {
        setDisclaimer(newSession.disclaimer);
      }
      setIsBackendConnected(true);
      await refreshKit(newSession.id);
      return newSession;
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.detail : tStatic('error.sessionInit');
      setError(message);
      setKit(EMPTY_KIT);
      setChatTurns([]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshKit]);

  const ensureSession = useCallback(async (forceNew = false): Promise<string> => {
    if (!forceNew && session?.id) {
      return session.id;
    }
    const newSession = await createNewSession();
    return newSession.id;
  }, [session, createNewSession]);

  const executeWithSession = useCallback(
    async <T,>(operation: (sessionId: string) => Promise<T>): Promise<T> => {
      let sid = await ensureSession();
      try {
        return await operation(sid);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 404) {
          // In-memory session expired on backend (e.g. Render restart or inactivity)
          // Provision a fresh session and retry seamlessly
          const fresh = await createNewSession();
          return await operation(fresh.id);
        }
        throw err;
      }
    },
    [ensureSession, createNewSession]
  );

  const resetSession = useCallback(async () => {
    if (session?.id) {
      try {
        await api.deleteSession(session.id);
      } catch {
        // ignore delete failure
      }
    }
    setSession(null);
    setKit(EMPTY_KIT);
    setChatTurns([]);
    await createNewSession();
  }, [session, createNewSession]);

  const appendChatTurn = useCallback((turn: ChatTurn) => {
    setChatTurns((prev) => [...prev, turn]);
  }, []);

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
        kit,
        refreshKit,
        chatTurns,
        appendChatTurn,
        ensureSession,
        createNewSession,
        executeWithSession,
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
