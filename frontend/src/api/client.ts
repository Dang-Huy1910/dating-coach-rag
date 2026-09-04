import {
  AskRequest,
  CoachReply,
  DisclaimerResponse,
  DraftRequest,
  ErrorResponse,
  HealthResponse,
  OpenersRequest,
  KnowledgeListResponse,
  KnowledgeReindexResponse,
  KnowledgeUploadResponse,
  ProfileContextRequest,
  SessionResponse,
  PersonaProfile,
  SimulationChatRequest,
  SimulationChatResponse,
} from './types';

// Empty string = same-origin via Vite proxy (/v1, /health → :8000). Avoids CORS-on-500 looking like "network error".
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');

class ApiError extends Error {
  detail: string;
  status: number;
  code?: string;

  constructor(detail: string, status: number, code?: string) {
    super(detail);
    this.name = 'ApiError';
    this.detail = detail;
    this.status = status;
    this.code = code;
  }
}

function friendlyNetworkMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : '';
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(raw)) {
    return 'Lỗi mạng khi gọi API. Kiểm tra backend (cổng 8000) còn chạy không.';
  }
  return raw || 'Không thể kết nối đến máy chủ API.';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${cleanPath}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (response.status === 204) {
      return {} as T;
    }

    if (!response.ok) {
      let detail = `Yêu cầu thất bại (${response.status})`;
      let code: string | undefined;
      try {
        const errorJson: ErrorResponse = await response.json();
        if (typeof errorJson.detail === 'string' && errorJson.detail) {
          detail = errorJson.detail;
        }
        if (errorJson.code) {
          code = errorJson.code;
        }
      } catch {
        if (response.statusText) {
          detail = response.statusText;
        }
      }
      if (response.status === 429) {
        detail =
          detail ||
          'LLM đang hết hạn mức (quota). Đợi vài phút hoặc đổi model/provider.';
      }
      throw new ApiError(detail, response.status, code);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(friendlyNetworkMessage(err), 0);
  }
}

export const api = {
  getHealth: async (): Promise<HealthResponse> => {
    return request<HealthResponse>('/health');
  },

  getDisclaimer: async (): Promise<DisclaimerResponse> => {
    return request<DisclaimerResponse>('/v1/disclaimer');
  },

  createSession: async (): Promise<SessionResponse> => {
    return request<SessionResponse>('/v1/sessions', {
      method: 'POST',
    });
  },

  getSession: async (sessionId: string): Promise<SessionResponse> => {
    return request<SessionResponse>(`/v1/sessions/${sessionId}`);
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    return request<void>(`/v1/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  askCoach: async (sessionId: string, question: string): Promise<CoachReply> => {
    const body: AskRequest = { question, stream: false };
    return request<CoachReply>(`/v1/sessions/${sessionId}/ask`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  rewriteBio: async (sessionId: string, draft: string, notes?: string): Promise<CoachReply> => {
    const body: DraftRequest = { draft, notes };
    return request<CoachReply>(`/v1/sessions/${sessionId}/rewrite-bio`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  analyzeMessage: async (sessionId: string, draft: string, notes?: string): Promise<CoachReply> => {
    const body: DraftRequest = { draft, notes };
    return request<CoachReply>(`/v1/sessions/${sessionId}/analyze-message`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  suggestOpeners: async (sessionId: string, context: string): Promise<CoachReply> => {
    const body: OpenersRequest = { context };
    return request<CoachReply>(`/v1/sessions/${sessionId}/openers`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  coachFromProfileContext: async (
    sessionId: string,
    body: ProfileContextRequest,
  ): Promise<CoachReply> => {
    return request<CoachReply>(`/v1/sessions/${sessionId}/profile-context`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  listKnowledge: async (): Promise<KnowledgeListResponse> => {
    return request<KnowledgeListResponse>('/v1/knowledge');
  },

  uploadKnowledge: async (file: File): Promise<KnowledgeUploadResponse> => {
    const url = `${API_BASE}/v1/knowledge/upload`;
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await fetch(url, { method: 'POST', body: form });
      if (!response.ok) {
        let detail = `Yêu cầu thất bại (${response.status})`;
        try {
          const errorJson: ErrorResponse = await response.json();
          if (typeof errorJson.detail === 'string' && errorJson.detail) {
            detail = errorJson.detail;
          }
        } catch {
          /* ignore */
        }
        throw new ApiError(detail, response.status);
      }
      return (await response.json()) as KnowledgeUploadResponse;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(friendlyNetworkMessage(err), 0);
    }
  },

  deleteKnowledge: async (sourceId: string): Promise<void> => {
    return request<void>(`/v1/knowledge/${encodeURIComponent(sourceId)}`, {
      method: 'DELETE',
    });
  },

  reindexKnowledge: async (): Promise<KnowledgeReindexResponse> => {
    return request<KnowledgeReindexResponse>('/v1/knowledge/reindex', {
      method: 'POST',
    });
  },

  getSimulationPersonas: async (): Promise<PersonaProfile[]> => {
    return request<PersonaProfile[]>('/v1/simulation/personas');
  },

  sendSimulationChat: async (body: SimulationChatRequest): Promise<SimulationChatResponse> => {
    return request<SimulationChatResponse>('/v1/simulation/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

export { ApiError };

