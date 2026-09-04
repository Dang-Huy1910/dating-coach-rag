import React from 'react';
import { CheckCircle, Sparkles, Waves } from 'lucide-react';

export type AiStatus = 'idle' | 'loading' | 'ready';

interface AiStatusBadgeProps {
  status: AiStatus;
  readyLabel?: string;
  loadingLabel?: string;
  idleLabel?: string;
}

export const AiStatusBadge: React.FC<AiStatusBadgeProps> = ({
  status,
  readyLabel = 'Từ Coach AI',
  loadingLabel = 'AI đang gen…',
  idleLabel = 'Chờ AI',
}) => {
  const styles =
    status === 'ready'
      ? 'bg-magenta-50 border-magenta-200 text-magenta-700'
      : status === 'loading'
        ? 'bg-passion-50 border-passion-200 text-passion-700'
        : 'bg-paper-subtle border-paper-border text-charcoal-muted';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-wider font-mono ${styles}`}
    >
      {status === 'ready' ? (
        <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
      ) : status === 'loading' ? (
        <Sparkles className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Waves className="w-3.5 h-3.5" aria-hidden="true" />
      )}
      {status === 'ready' ? readyLabel : status === 'loading' ? loadingLabel : idleLabel}
    </span>
  );
};
