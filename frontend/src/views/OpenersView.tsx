import React, { useEffect, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { isCatalogSample, useI18n } from '../i18n/LocaleContext';
import { api, ApiError } from '../api/client';
import { Citation, CoachReply } from '../api/types';
import { AiStatusBadge } from '../components/AiStatusBadge';
import { CitationModal } from '../components/CitationModal';
import { CoachBubble, CoachBubbleLoading } from '../components/CoachBubble';
import { EmptyAiState } from '../components/EmptyAiState';
import {
  ModeHeader,
  ModePage,
  modeCardClass,
  modeLabelClass,
  modeLabelMutedClass,
  modePrimaryButtonClass,
} from '../components/ModePage';
import { SafetyBanner } from '../components/SafetyBanner';
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Info,
  Lightbulb,
  MessageCircle,
  Shield,
  Sparkles,
} from 'lucide-react';

interface OpenersViewProps {
  onToast: (msg: string) => void;
  onNavigateToMessage?: () => void;
}

export const OpenersView: React.FC<OpenersViewProps> = ({ onToast, onNavigateToMessage }) => {
  const { executeWithSession, kit, refreshKit } = useSession();
  const { locale, t } = useI18n();
  const [contextInput, setContextInput] = useState<string>(() => t('openers.sample'));
  const [tone, setTone] = useState<string>('warm');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [coachReply, setCoachReply] = useState<CoachReply | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [fromKit, setFromKit] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  useEffect(() => {
    const openers = (kit.openers || []).filter(Boolean);
    if (openers.length === 0) {
      return;
    }
    const key = `${kit.updated_at ?? ''}|${openers.join('|')}`;
    if (key === hydratedKey) {
      return;
    }
    setHydratedKey(key);
    setCoachReply({
      reply: t('openers.kitFill'),
      citations: [],
      refused: false,
      hedged: false,
      disclaimer: '',
      intent: 'openers',
      openers,
    });
    setFromKit(true);
    setAnalyzedAt(null);
  }, [kit, hydratedKey, t]);

  useEffect(() => {
    if (!fromKit && isCatalogSample('openers.sample', contextInput)) {
      setContextInput(t('openers.sample'));
    }
  }, [locale, t]);

  const aiOpeners = coachReply?.openers?.filter(Boolean) ?? [];
  const hasAiOpeners = aiOpeners.length > 0;

  const handleGenerate = async () => {
    if (!contextInput.trim()) {
      setErrorMsg(t('openers.needContext'));
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    setCoachReply(null);
    setAnalyzedAt(null);
    setFromKit(false);

    try {
      const fullPrompt = `${contextInput.trim()} (${t('openers.stylePrefix')}: ${tone})`;
      const reply = await executeWithSession(async (sid) => {
        const result = await api.suggestOpeners(sid, fullPrompt);
        await refreshKit(sid);
        return result;
      });
      setCoachReply(reply);
      const now = new Date();
      setAnalyzedAt(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : t('openers.fail');
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      onToast(t('openers.copied'));
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  return (
    <ModePage>
      <ModeHeader
        eyebrow={t('openers.eyebrow')}
        title={t('openers.title')}
        description={t('openers.desc')}
      />

      <div className={`${modeCardClass} space-y-5 relative overflow-hidden`}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="opener-context"
              className={modeLabelClass}
            >
              <MessageCircle className="w-4 h-4 text-magenta-600" aria-hidden="true" />
              <span>{t('openers.contextLabel')}</span>
            </label>
            <span className="text-[11px] text-charcoal-muted font-mono">{t('openers.contextHint')}</span>
          </div>

          <textarea
            id="opener-context"
            rows={3}
            value={contextInput}
            onChange={(e) => {
              setContextInput(e.target.value);
              setCoachReply(null);
              setAnalyzedAt(null);
              setFromKit(false);
            }}
            placeholder={t('openers.contextPh')}
            className="w-full bg-paper-subtle text-charcoal text-sm p-4 rounded-xl resize-none outline-none focus:bg-paper-card focus:ring-2 focus:ring-magenta-500/20 focus:border-magenta-500 transition-all border border-paper-border leading-relaxed"
          />
        </div>

        {fromKit && (
          <div className="text-xs text-magenta-800 bg-magenta-50 p-2.5 rounded-lg border border-magenta-200">
            {t('common.fromKit')}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-1.5">
            <label htmlFor="opener-tone" className={modeLabelMutedClass}>
              {t('openers.toneLabel')}
            </label>
            <div className="relative">
              <select
                id="opener-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full appearance-none bg-paper-subtle text-charcoal text-xs sm:text-sm font-medium rounded-xl py-3 px-4 border border-paper-border outline-none cursor-pointer pr-10 hover:border-magenta-300 transition-all min-h-[44px]"
              >
                <option value="warm">{t('openers.toneWarm')}</option>
                <option value="playful">{t('openers.tonePlayful')}</option>
                <option value="thoughtful">{t('openers.toneThoughtful')}</option>
                <option value="direct">{t('openers.toneDirect')}</option>
              </select>
              <ChevronDown className="w-4 h-4 text-charcoal-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            aria-busy={isGenerating}
            className={modePrimaryButtonClass}
          >
            <Sparkles
              className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isGenerating ? t('openers.working') : t('openers.cta')}</span>
          </button>
        </div>

        {errorMsg && (
          <div
            className="p-3 bg-passion-50 text-passion-800 text-xs rounded-xl border border-passion-200 flex items-center gap-2"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-passion-600 flex-shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center gap-2.5 bg-passion-50/70 rounded-xl p-3 border border-passion-200/80 text-xs text-passion-900">
          <Info className="w-4 h-4 text-passion-600 flex-shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong>{t('openers.noteLead')}</strong> {t('openers.note')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-xs text-charcoal-muted">
          <span className="font-mono uppercase font-bold text-magenta-700">{t('common.rag')}:</span>
          {hasAiOpeners && coachReply?.citations && coachReply.citations.length > 0 ? (
            coachReply.citations.slice(0, 3).map((cite, idx) => (
              <button
                key={`${cite.source_id}-${idx}`}
                type="button"
                onClick={() => setActiveCitation(cite)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-card border border-paper-border text-charcoal font-medium hover:bg-magenta-50 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-magenta-600" aria-hidden="true" />
                <span>{cite.title}</span>
              </button>
            ))
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-card border border-dashed border-paper-border text-charcoal-muted font-medium">
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                {t('ui.citeSoon')}
              </span>
            </>
          )}
        </div>
        <AiStatusBadge
          status={hasAiOpeners ? 'ready' : isGenerating ? 'loading' : 'idle'}
          readyLabel={t('openers.aiReady')}
        />
      </div>

      {coachReply?.refused ? (
        <SafetyBanner message={coachReply.reply} />
      ) : isGenerating ? (
        <CoachBubbleLoading label={t('openers.loading')} />
      ) : hasAiOpeners ? (
        <div className="space-y-4">
          {coachReply?.reply?.trim() && (
            <CoachBubble
              reply={coachReply}
              timestamp={analyzedAt}
              subtitle={t('openers.bubbleSub')}
              onCitationClick={setActiveCitation}
              onCopyReply={(text) => {
                navigator.clipboard.writeText(text).then(() => onToast(t('openers.copyReply')));
              }}
            />
          )}

          <div className="flex items-center justify-between">
            <h2 className="font-editorial text-2xl font-normal text-charcoal flex items-center gap-2">
              <span>{t('openers.optimized')}</span>
              <span className="text-xs font-mono font-normal text-charcoal-muted">
                ({t('ui.optionCount', { n: aiOpeners.length })})
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aiOpeners.map((text, idx) => (
              <div
                key={idx}
                className="bg-paper-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-2 border-magenta-200/80 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-magenta-50 text-magenta-700 font-bold text-xs flex items-center justify-center border border-magenta-200">
                        0{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                        {t('ui.option', { n: idx + 1 })}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-magenta-700 bg-magenta-50 px-2.5 py-0.5 rounded-full border border-magenta-200">
                      {t('ui.copyReady')}
                    </span>
                  </div>

                  <div className="p-4 bg-paper-subtle rounded-xl border border-paper-border/80">
                    <p className="font-editorial text-base sm:text-lg text-charcoal italic leading-relaxed">
                      “{text}”
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-paper-border/60">
                  <button
                    type="button"
                    onClick={() => handleCopy(text, idx)}
                    className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      copiedIndex === idx
                        ? 'bg-magenta-600 text-white border-magenta-600 shadow-sm'
                        : 'bg-magenta-600 hover:bg-magenta-700 text-white border-transparent shadow-glow-magenta'
                    }`}
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{copiedIndex === idx ? t('ui.copiedShort') : t('ui.copy')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyAiState
          title={t('openers.emptyTitle')}
          description={t('openers.emptyDesc')}
          hint={t('openers.emptyHint')}
        />
      )}

      <div className="rounded-2xl bg-paper-card p-6 border border-paper-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-magenta-50 text-magenta-600 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal">
              {t('openers.ruleTitle')}
            </span>
            <p className="text-xs text-charcoal-muted leading-relaxed max-w-xl">
              {t('openers.ruleBody')}
            </p>
          </div>
        </div>

        {onNavigateToMessage && (
          <button
            type="button"
            onClick={onNavigateToMessage}
            className="shrink-0 inline-flex items-center gap-1.5 min-h-[44px] text-xs font-bold text-magenta-700 hover:text-magenta-800 transition-colors cursor-pointer"
          >
            <span>{t('openers.seePacing')}</span>
            <span>→</span>
          </button>
        )}
      </div>

      <CitationModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </ModePage>
  );
};
