import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useI18n } from '../i18n/LocaleContext';

interface SafetyBannerProps {
  message?: string;
}

export const SafetyBanner: React.FC<SafetyBannerProps> = ({ message }) => {
  const { t } = useI18n();
  return (
    <div
      className="rounded-2xl border border-passion-200/90 bg-passion-50/80 p-4 flex items-start gap-3.5"
      role="status"
    >
      <div className="w-9 h-9 rounded-xl bg-paper-card border border-passion-200 flex items-center justify-center text-passion-700 flex-shrink-0">
        <ShieldAlert className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-passion-900">
          {t('safety.title')}
        </p>
        <p className="text-xs text-charcoal-muted leading-relaxed">
          {message || t('safety.default')}
        </p>
        <p className="text-[11px] text-charcoal-muted/80 leading-relaxed">
          {t('safety.gate')}
        </p>
      </div>
    </div>
  );
};
