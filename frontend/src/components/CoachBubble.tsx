import React, { useState } from 'react';
import { Citation, CoachReply } from '../api/types';
import { CoachMarkdown } from './CoachMarkdown';
import { SafetyBanner } from './SafetyBanner';
import {
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';

interface CoachBubbleProps {
  reply: CoachReply;
  timestamp?: string | null;
  subtitle?: string;
  onCitationClick?: (cite: Citation) => void;
  onCopyReply?: (text: string) => void;
  showFeedback?: boolean;
  children?: React.ReactNode;
}

export const CoachBubble: React.FC<CoachBubbleProps> = ({
  reply,
  timestamp,
  subtitle = 'Phân tích & gợi ý từ Coach AI',
  onCitationClick,
  onCopyReply,
  showFeedback = true,
  children,
}) => {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = reply?.reply?.trim();
    if (!text) return;
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    if (onCopyReply) {
      onCopyReply(text);
      done();
      return;
    }
    navigator.clipboard.writeText(text).then(done).catch(() => undefined);
  };

  return (
    <div className="flex flex-col gap-2 max-w-full">
      <div className="bg-paper-card rounded-2xl rounded-tl-none p-5 sm:p-6 shadow-sm border border-paper-border relative overflow-hidden space-y-4">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-passion" aria-hidden="true" />

        <div className="flex items-center gap-2.5 pl-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-magenta-50 border border-magenta-200 flex items-center justify-center text-magenta-600 shrink-0">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-charcoal">Coach</p>
              {timestamp ? (
                <span className="text-[11px] font-mono text-charcoal-muted">{timestamp}</span>
              ) : null}
            </div>
            <p className="text-[11px] text-charcoal-muted truncate">{subtitle}</p>
          </div>
        </div>

        {reply?.citations && reply.citations.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pl-1">
            {reply.citations.map((cite, idx) => (
              <button
                key={`${cite.source_id}-${idx}`}
                type="button"
                onClick={() => onCitationClick?.(cite)}
                className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper-subtle border border-paper-border hover:border-magenta-300 hover:bg-magenta-50 text-xs font-medium text-charcoal-soft transition-all cursor-pointer"
              >
                <BookOpen className="w-3 h-3 text-magenta-600" aria-hidden="true" />
                <span>
                  {cite.title}
                  {cite.heading ? ` / ${cite.heading}` : ''}
                </span>
                <ChevronRight
                  className="w-3.5 h-3.5 text-charcoal-faint group-hover:translate-x-0.5 transition-transform"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        ) : null}

        {reply?.refused ? (
          <SafetyBanner message={reply.reply || 'Yêu cầu này không thể hỗ trợ.'} />
        ) : (
          <div className="pl-1 rounded-xl bg-gradient-to-br from-magenta-50/30 via-transparent to-paper-subtle/40 -mx-1 px-3 py-3 sm:px-4 sm:py-3.5 border border-transparent">
            <CoachMarkdown content={reply?.reply || ''} />
          </div>
        )}

        {children}
      </div>

      <div className="flex items-center justify-between px-2 text-[11px] text-charcoal-muted">
        <div className="flex items-center gap-2 font-mono">
          <span>Coach Assistant</span>
          {timestamp ? (
            <>
              <span>•</span>
              <span>{timestamp}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {showFeedback ? (
            <>
              <button
                type="button"
                onClick={() => setFeedback('up')}
                className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-paper-card transition-colors ${
                  feedback === 'up' ? 'text-magenta-600' : 'text-charcoal-faint'
                }`}
                title="Hữu ích"
                aria-pressed={feedback === 'up'}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setFeedback('down')}
                className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-paper-card transition-colors ${
                  feedback === 'down' ? 'text-passion-600' : 'text-charcoal-faint'
                }`}
                title="Chưa chuẩn xác"
                aria-pressed={feedback === 'down'}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={handleCopy}
            className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-paper-card transition-colors ${
              copied ? 'text-magenta-600' : 'text-charcoal-faint hover:text-magenta-600'
            }`}
            title="Sao chép câu trả lời"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const CoachBubbleLoading: React.FC<{ label?: string }> = ({
  label = 'Đang soạn…',
}) => (
  <div className="bg-paper-card rounded-2xl rounded-tl-none p-6 sm:p-7 shadow-sm border border-paper-border space-y-4">
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-full bg-magenta-50 border border-magenta-200 flex items-center justify-center text-magenta-600">
        <Sparkles className="w-4 h-4 animate-spin" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-bold text-charcoal">Coach</p>
        <p className="text-[11px] text-charcoal-muted font-mono">{label}</p>
      </div>
    </div>
    <div className="space-y-2.5" role="status">
      <div className="h-3 w-full rounded-full bg-paper-border/80 animate-pulse" />
      <div className="h-3 w-[90%] rounded-full bg-paper-border/70 animate-pulse" />
      <div className="h-3 w-4/5 rounded-full bg-paper-border/60 animate-pulse" />
    </div>
  </div>
);
