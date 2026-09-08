import React, { useEffect, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { isCatalogSample, useI18n } from '../i18n/LocaleContext';
import { api, ApiError } from '../api/client';
import { Citation, CoachReply } from '../api/types';
import { AiStatusBadge } from '../components/AiStatusBadge';
import { CitationModal } from '../components/CitationModal';
import { CoachBubble, CoachBubbleLoading } from '../components/CoachBubble';
import { CopyReadyCard } from '../components/CopyReadyCard';
import { EmptyAiState } from '../components/EmptyAiState';
import { SafetyBanner } from '../components/SafetyBanner';
import { ModeHeader, ModePage, modeCardClass, modeLabelClass } from '../components/ModePage';
import {
  Bookmark,
  Edit3,
  Flame,
  History,
  Lightbulb,
  MinusCircle,
  PlusCircle,
  Sparkles,
} from 'lucide-react';

interface BioStudioViewProps {
  onToast: (msg: string) => void;
}

function pointIcon(index: number, text: string) {
  const positive =
    /(thêm|giữ|nên có|mời|hook|cụ thể hóa|làm rõ|add|keep|invite|specify|clarify|include)/i.test(
      text,
    ) || index === 2;
  if (positive) {
    return <PlusCircle className="w-4 h-4 text-magenta-600 flex-shrink-0 mt-0.5" aria-hidden="true" />;
  }
  return <MinusCircle className="w-4 h-4 text-passion-600 flex-shrink-0 mt-0.5" aria-hidden="true" />;
}

export const BioStudioView: React.FC<BioStudioViewProps> = ({ onToast }) => {
  const { executeWithSession, kit, refreshKit } = useSession();
  const { locale, t } = useI18n();
  const [draft, setDraft] = useState<string>(() => t('bio.sample'));
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [coachReply, setCoachReply] = useState<CoachReply | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [copiedReply, setCopiedReply] = useState(false);
  const [fromKit, setFromKit] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  useEffect(() => {
    const bio = kit.improved_bio?.trim();
    if (!bio) {
      return;
    }
    const key = `${kit.updated_at ?? ''}|${bio}`;
    if (key === hydratedKey) {
      return;
    }
    setHydratedKey(key);
    setDraft(bio);
    setCoachReply({
      reply: t('bio.kitFill'),
      citations: [],
      refused: false,
      hedged: false,
      disclaimer: '',
      intent: 'rewrite_bio',
      improved_draft: bio,
      analysis_points: kit.analysis_points ?? null,
    });
    setFromKit(true);
    setAnalyzedAt(null);
  }, [kit, hydratedKey, t]);

  useEffect(() => {
    if (!fromKit && isCatalogSample('bio.sample', draft)) {
      setDraft(t('bio.sample'));
    }
  }, [locale, t]);

  const hasResult = Boolean(coachReply && !coachReply.refused);
  const analysisPoints = coachReply?.analysis_points?.filter(Boolean) ?? [];
  const hasAiAnalysis = analysisPoints.length > 0 || Boolean(coachReply?.reply?.trim());
  const currentSuggestion = coachReply?.improved_draft?.trim() || '';

  const handleRefine = async () => {
    if (!draft.trim()) {
      setErrorMsg(t('bio.needDraft'));
      return;
    }

    setErrorMsg(null);
    setIsRefining(true);
    setCoachReply(null);
    setAnalyzedAt(null);
    setFromKit(false);

    try {
      const reply = await executeWithSession(async (sid) => {
        const result = await api.rewriteBio(sid, draft.trim());
        await refreshKit(sid);
        return result;
      });
      setCoachReply(reply);
      const now = new Date();
      setAnalyzedAt(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : t('bio.fail');
      setErrorMsg(msg);
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopy = () => {
    if (!currentSuggestion) {
      onToast(t('bio.copyNeed'));
      return;
    }
    navigator.clipboard.writeText(currentSuggestion).then(() => {
      setCopied(true);
      onToast(t('bio.copied'));
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <ModePage width="wide">
      <ModeHeader
        eyebrow={t('bio.eyebrow')}
        title={t('bio.title')}
        description={t('bio.desc')}
        aside={
          <div className="inline-flex items-center gap-2 bg-paper-card px-3.5 py-1.5 rounded-full border border-paper-border shadow-xs text-xs font-mono text-charcoal">
            <History className="w-3.5 h-3.5 text-magenta-600" aria-hidden="true" />
            <span>{t('bio.ragBadge')}</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 flex flex-col gap-6 min-w-0">
          <div className={`${modeCardClass} flex flex-col gap-4`}>
            <div className="flex items-center justify-between">
              <label
                htmlFor="bio-draft"
                className={modeLabelClass}
              >
                <Edit3 className="w-4 h-4 text-magenta-600" aria-hidden="true" />
                <span>{t('bio.draftLabel')}</span>
              </label>
              <span className="text-[11px] font-mono bg-paper-subtle text-charcoal-muted px-2.5 py-0.5 rounded-full border border-paper-border">
                {t('common.chars', { n: draft.length })}
              </span>
            </div>

            <textarea
              id="bio-draft"
              rows={6}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setCoachReply(null);
                setAnalyzedAt(null);
                setFromKit(false);
              }}
              placeholder={t('bio.draftPh')}
              className="w-full bg-paper-subtle text-charcoal text-sm p-4 rounded-xl resize-none outline-none focus:bg-paper-card focus:ring-2 focus:ring-magenta-500/20 focus:border-magenta-500 transition-all border border-paper-border leading-relaxed"
            />

            {fromKit && (
              <div className="text-xs text-magenta-800 bg-magenta-50 p-2.5 rounded-lg border border-magenta-200">
                {t('common.fromKit')}
              </div>
            )}

            {errorMsg && (
              <div
                className="text-xs text-passion-600 bg-passion-50 p-2.5 rounded-lg border border-passion-200"
                role="alert"
              >
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                <Flame className="w-4 h-4 text-passion-500" aria-hidden="true" />
                <span>
                  {hasAiAnalysis ? t('bio.hintReady') : t('bio.hintIdle')}
                </span>
              </div>

              <button
                type="button"
                onClick={handleRefine}
                disabled={isRefining}
                aria-busy={isRefining}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] bg-magenta-600 hover:bg-magenta-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-glow-magenta active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Sparkles
                  className={`w-4 h-4 ${isRefining ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{isRefining ? t('bio.working') : t('bio.cta')}</span>
              </button>
            </div>
          </div>

          <div className="bg-paper-card p-5 rounded-2xl border border-paper-border flex items-start gap-3.5 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-passion-50 text-passion-600 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                {t('bio.labTitle')}
              </span>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                {t('bio.labBody')}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6 min-w-0">
          <section
            className="bg-paper-card p-6 sm:p-7 rounded-2xl shadow-md border border-paper-border flex flex-col gap-5"
            aria-labelledby="bio-coach-heading"
            aria-busy={isRefining}
          >
            <div className="flex items-center justify-between pb-3 border-b border-paper-border gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-magenta-50 border border-magenta-200 flex items-center justify-center text-magenta-600 shrink-0">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="bio-coach-heading"
                    className="font-editorial text-xl sm:text-2xl font-normal text-charcoal"
                  >
                    {t('bio.reviewTitle')}
                  </h2>
                  <p className="text-xs text-charcoal-muted">
                    {hasAiAnalysis
                      ? `${t('bio.reviewReady')}${analyzedAt ? ` • ${analyzedAt}` : ''}`
                      : t('bio.reviewIdle')}
                  </p>
                </div>
              </div>
              <AiStatusBadge
                status={hasAiAnalysis ? 'ready' : isRefining ? 'loading' : 'idle'}
              />
            </div>

            {coachReply?.refused ? (
              <SafetyBanner message={coachReply.reply} />
            ) : isRefining ? (
              <CoachBubbleLoading label={t('bio.loading')} />
            ) : hasResult && hasAiAnalysis && coachReply ? (
              <div className="space-y-4">
                {analysisPoints.length > 0 && (
                  <div className="bg-paper-subtle p-5 rounded-xl border border-paper-border/80 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                      <span>{t('bio.pointsLabel')}</span>
                    </div>
                    <ul className="space-y-2.5">
                      {analysisPoints.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs sm:text-sm text-charcoal leading-relaxed"
                        >
                          {pointIcon(idx, point)}
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <CoachBubble
                  reply={coachReply}
                  timestamp={analyzedAt}
                  subtitle={t('bio.bubbleSub')}
                  onCitationClick={setActiveCitation}
                  onCopyReply={(text) => {
                    navigator.clipboard.writeText(text).then(() => {
                      setCopiedReply(true);
                      onToast(t('bio.copyReply'));
                      setTimeout(() => setCopiedReply(false), 2000);
                    });
                  }}
                />
                {copiedReply && <span className="sr-only">{t('ui.copiedSr')}</span>}
              </div>
            ) : (
              <EmptyAiState
                title={t('bio.emptyTitle')}
                description={t('bio.emptyDesc')}
                hint={t('bio.emptyHint')}
              />
            )}
          </section>

          <CopyReadyCard
            title={t('bio.rewriteTitle')}
            content={currentSuggestion}
            isLoading={isRefining}
            emptyText={t('bio.rewriteEmpty')}
            onCopy={handleCopy}
            copied={copied}
            footerHint={t('bio.rewriteHint')}
          />

          {hasResult && coachReply?.citations && coachReply.citations.length > 0 && (
            <div className="bg-paper-card rounded-2xl p-5 border border-paper-border space-y-2">
              <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-magenta-600" aria-hidden="true" />
                <span>{t('common.rag')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {coachReply.citations.map((cite, idx) => (
                  <button
                    key={`foot-${cite.source_id}-${idx}`}
                    type="button"
                    onClick={() => setActiveCitation(cite)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-subtle hover:bg-magenta-50 border border-paper-border text-xs font-medium text-charcoal transition-all cursor-pointer"
                  >
                    <span>{cite.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <CitationModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </ModePage>
  );
};
