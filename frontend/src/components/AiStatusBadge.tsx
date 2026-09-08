import React from 'react';
import { CheckCircle, Sparkles, Waves } from 'lucide-react';
import { useI18n } from '../i18n/LocaleContext';

export type AiStatus = 'idle' | 'loading' | 'ready';

interface AiStatusBadgeProps {
  status: AiStatus;
  readyLabel?: string;
  loadingLabel?: string;
  idleLabel?: string;
}

export const AiStatusBadge: React.FC<AiStatusBadgeProps> = ({
  status,
  readyLabel,
  loadingLabel,
  idleLabel,
}) => {
  const { t } = useI18n();
  const ready = readyLabel ?? t('ui.aiReady');
  const loading = loadingLabel ?? t('ui.aiLoading');
  const idle = idleLabel ?? t('ui.aiIdle');
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
      {status === 'ready' ? ready : status === 'loading' ? loading : idle}
    </span>
  );
};
