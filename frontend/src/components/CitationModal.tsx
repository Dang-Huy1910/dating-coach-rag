import React from 'react';
import { Citation } from '../api/types';
import { useI18n } from '../i18n/LocaleContext';
import { BookOpen, X, CheckCircle2, Bookmark } from 'lucide-react';

interface CitationModalProps {
  citation: Citation | null;
  onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({ citation, onClose }) => {
  const { t } = useI18n();
  if (!citation) return null;

  return (
    <div className="fixed inset-0 bg-charcoal-deep/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-paper-card max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-paper-border flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-2 border-b border-paper-border">
          <div className="flex items-center gap-2 text-magenta-600">
            <BookOpen className="w-5 h-5" />
            <h4 className="font-editorial text-xl font-medium text-charcoal">
              {t('cite.title')}
            </h4>
          </div>
          <button
            onClick={onClose}
            className="text-charcoal-muted hover:text-charcoal p-1 rounded-lg hover:bg-paper-subtle transition-colors"
            title={t('cite.closeTitle')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 bg-paper-subtle/80 p-4 rounded-xl border border-paper-border/60">
          <div>
            <div className="flex items-center gap-1.5 text-xs uppercase font-mono font-semibold tracking-wider text-magenta-700">
              <Bookmark className="w-3.5 h-3.5" />
              <span>{t('cite.source')}</span>
            </div>
            <p className="font-semibold text-charcoal text-base mt-1">
              {citation.title}
            </p>
          </div>

          {citation.heading && (
            <div>
              <span className="text-xs uppercase font-mono text-charcoal-muted">{t('cite.heading')}</span>
              <p className="text-sm font-medium text-charcoal-soft mt-0.5">
                {citation.heading}
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-paper-border/80 flex items-center justify-between text-xs text-charcoal-muted font-mono">
            <span>{t('cite.file', { path: citation.path })}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-magenta-50 text-magenta-700 border border-magenta-200 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              {t('cite.score', { pct: (citation.score * 100).toFixed(0) })}
            </span>
          </div>
        </div>

        <p className="text-xs text-charcoal-muted leading-relaxed italic">
          {t('cite.note')}
        </p>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-magenta-600 hover:bg-magenta-700 text-white text-sm font-medium transition-all active:scale-95 shadow-sm"
          >
            {t('cite.gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
};

