export type Intent = 'ask' | 'rewrite_bio' | 'analyze_message' | 'openers' | 'profile_context';
export type PrivacyFlag = 'public' | 'private' | 'unknown';

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
  code?: 'empty_input' | 'too_long' | 'not_found' | 'index_not_ready' | 'need_visible_text' | string | null;
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

export interface ProfileImage {
  mime_type: 'image/jpeg' | 'image/png' | 'image/webp' | string;
  data_base64: string;
  caption?: string | null;
  comments?: string | null;
}

export interface ProfileContextRequest {
  handle?: string | null;
  profile_url?: string | null;
  visible_text?: string;
  privacy?: PrivacyFlag;
  relationship_progress?: string | null;
  question?: string | null;
  images?: ProfileImage[];
}

export interface KnowledgeFormat {
  ext: string;
  label: string;
  note: string;
}

export interface KnowledgeSourceInfo {
  source_id: string;
  title: string;
  path: string;
  kind: 'curated' | 'upload' | string;
  bytes?: number | null;
  updated_at?: string | null;
}

export interface KnowledgeListResponse {
  formats: KnowledgeFormat[];
  sources: KnowledgeSourceInfo[];
  index_ready: boolean;
  chunk_count?: number | null;
}

export interface KnowledgeUploadResponse {
  source: KnowledgeSourceInfo;
  chunk_count: number;
  detail: string;
}

export interface KnowledgeReindexResponse {
  chunk_count: number;
  detail: string;
}

