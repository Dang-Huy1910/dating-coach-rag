export type Intent = 'ask' | 'rewrite_bio' | 'analyze_message' | 'openers';

export interface HealthResponse {
  status: 'ok';
  index_ready: boolean;
}

export interface DisclaimerResponse {
  text: string;
}

export interface SessionResponse {
  id: string;
  created_at: string;
  disclaimer: string;
  turn_count: number;
}

export interface Citation {
  source_id: string;
  title: string;
  heading?: string | null;
  path: string;
  score: number;
}

export interface CoachReply {
  reply: string;
  citations: Citation[];
  refused: boolean;
  hedged: boolean;
  disclaimer: string;
  intent: Intent;
  improved_draft?: string | null;
  openers?: string[] | null;
  /** LLM labels for analyze_message only */
  tone?: string | null;
  clarity?: string | null;
  risk?: string | null;
  /** LLM evaluation bullets (required for rewrite_bio) */
  analysis_points?: string[] | null;
}

export interface ErrorResponse {
  detail: string;
  code?: 'empty_input' | 'too_long' | 'not_found' | 'index_not_ready' | string | null;
}

export interface AskRequest {
  question: string;
  stream?: boolean;
}

export interface DraftRequest {
  draft: string;
  notes?: string;
}

export interface OpenersRequest {
  context: string;
}

