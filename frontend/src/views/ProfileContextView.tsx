import React, { useEffect, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { isCatalogSample, tStatic, useI18n } from '../i18n/LocaleContext';
import { api, ApiError } from '../api/client';
import { Citation, CoachReply, ProfileImage } from '../api/types';
import { AiStatusBadge } from '../components/AiStatusBadge';
import { CitationModal } from '../components/CitationModal';
import { CoachBubble, CoachBubbleLoading } from '../components/CoachBubble';
import { EmptyAiState } from '../components/EmptyAiState';
import { SafetyBanner } from '../components/SafetyBanner';
import {
  ModeHeader,
  ModePage,
  modeCardClass,
  modeInputClass,
  modeLabelClass,
  modeLabelMutedClass,
  modePrimaryButtonClass,
  modeTextareaClass,
} from '../components/ModePage';
import {
  AlertCircle,
  AtSign,
  BookOpen,
  Check,
  Copy,
  Heart,
  ImagePlus,
  Info,
  Link2,
  Lock,
  Shield,
  Sparkles,
  X,
} from 'lucide-react';

interface ProfileContextViewProps {
  onToast: (msg: string) => void;
}

const MAX_SCREENSHOTS = 3;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type LocalShot = {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  comments: string;
};

async function fileToProfileImage(shot: LocalShot): Promise<ProfileImage> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(tStatic('error.readImage')));
    reader.readAsDataURL(shot.file);
  });
  const comma = dataUrl.indexOf(',');
  return {
    mime_type: shot.file.type,
    data_base64: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl,
    caption: shot.caption.trim() || null,
    comments: shot.comments.trim() || null,
  };
}

export const ProfileContextView: React.FC<ProfileContextViewProps> = ({ onToast }) => {
  const { executeWithSession } = useSession();
  const { locale, t } = useI18n();
  const [handle, setHandle] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [visibleText, setVisibleText] = useState('');
  const [relationship, setRelationship] = useState('');
  const [question, setQuestion] = useState(() => t('profile.sampleQ'));
  const [shots, setShots] = useState<LocalShot[]>([]);
  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [coachReply, setCoachReply] = useState<CoachReply | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);

  const aiOpeners = coachReply?.openers?.filter(Boolean) ?? [];
  const activeShot = shots.find((shot) => shot.id === activeShotId) ?? null;

  const addFiles = (files: File[]) => {
    if (!files.length) return;
    const next: LocalShot[] = [];
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setErrorMsg(t('profile.imageType'));
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setErrorMsg(t('profile.imageTooBig'));
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
        comments: '',
      });
    }
    setShots((current) => {
      const room = MAX_SCREENSHOTS - current.length;
      if (room <= 0) {
        next.forEach((shot) => URL.revokeObjectURL(shot.previewUrl));
        setErrorMsg(t('profile.imageMax', { n: MAX_SCREENSHOTS }));
        return current;
      }
      const accepted = next.slice(0, room);
      next.slice(room).forEach((shot) => URL.revokeObjectURL(shot.previewUrl));
      if (next.length > room) {
        setErrorMsg(t('profile.imageMax', { n: MAX_SCREENSHOTS }));
      }
      return [...current, ...accepted];
    });
  };

  const removeShot = (id: string) => {
    setShots((current) => {
      const victim = current.find((shot) => shot.id === id);
      if (victim) URL.revokeObjectURL(victim.previewUrl);
      return current.filter((shot) => shot.id !== id);
    });
    setActiveShotId((current) => (current === id ? null : current));
  };

  const patchShot = (id: string, patch: Partial<Pick<LocalShot, 'caption' | 'comments'>>) => {
    setShots((current) => current.map((shot) => (shot.id === id ? { ...shot, ...patch } : shot)));
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items?.length) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (!files.length) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        event.preventDefault();
      }
      addFiles(files);
      onToast(t('profile.pasteToast', { n: files.length }));
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onToast, t]);

  useEffect(() => {
    if (isCatalogSample('profile.sampleQ', question)) {
      setQuestion(t('profile.sampleQ'));
    }
  }, [locale, t]);

  useEffect(() => {
    return () => {
      shots.forEach((shot) => URL.revokeObjectURL(shot.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    const trimmedVisible = visibleText.trim();
    const url = profileUrl.trim();
    if (!trimmedVisible && shots.length === 0 && !url) {
      setErrorMsg(
        handle.trim() ? t('profile.needHandle') : t('profile.needContext'),
      );
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    setCoachReply(null);
    setAnalyzedAt(null);

    try {
      const images = shots.length ? await Promise.all(shots.map(fileToProfileImage)) : [];
      const reply = await executeWithSession((sid) =>
        api.coachFromProfileContext(sid, {
          handle: handle.trim() || null,
          profile_url: url || null,
          visible_text: trimmedVisible,
          relationship_progress: relationship.trim() || null,
          question: question.trim() || null,
          images,
        })
      );
      let replyData = reply;
      if (
        replyData.reply &&
        replyData.reply.trim().startsWith('{') &&
        replyData.reply.includes('"reply"')
      ) {
        try {
          const cleaned = replyData.reply.trim().replace(/\\([^"\\/bfnrtu])/g, '$1');
          const parsed = JSON.parse(cleaned);
          if (parsed.reply) {
            replyData = {
              ...replyData,
              reply: parsed.reply,
              openers:
                Array.isArray(parsed.openers) && parsed.openers.length > 0
                  ? parsed.openers
                  : replyData.openers,
              improved_draft: parsed.improved_draft || replyData.improved_draft,
            };
          }
        } catch {
          // ignore
        }
      }
      setCoachReply(replyData);
      const now = new Date();
      setAnalyzedAt(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.detail);
      } else {
        setErrorMsg(t('profile.fail'));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      onToast(t('profile.copied'));
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  return (
    <ModePage>
      <ModeHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.desc')}
      />

      <div className={`${modeCardClass} space-y-5 relative overflow-hidden`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="profile-handle"
              className={modeLabelClass}
            >
              <AtSign className="w-4 h-4 text-magenta-600" aria-hidden="true" />
              {t('profile.handleLabel')}
            </label>
            <input
              id="profile-handle"
              type="text"
              value={handle}
              maxLength={128}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={t('profile.handlePh')}
              className={modeInputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="profile-url" className={modeLabelClass}>
              <Link2 className="w-4 h-4 text-magenta-600" aria-hidden="true" />
              {t('profile.urlLabel')}
            </label>
            <input
              id="profile-url"
              type="url"
              value={profileUrl}
              maxLength={500}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder={t('profile.urlPh')}
              className={modeInputClass}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="profile-relationship" className={modeLabelClass}>
            <Heart className="w-4 h-4 text-magenta-600" aria-hidden="true" />
            {t('profile.relLabel')}
          </label>
          <textarea
            id="profile-relationship"
            rows={2}
            maxLength={2000}
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder={t('profile.relPh')}
            className={modeTextareaClass}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="profile-visible" className={modeLabelClass}>
              {t('profile.visibleLabel')}
            </label>
            <span className="text-[11px] text-charcoal-muted font-mono">{t('profile.visibleHint')}</span>
          </div>
          <textarea
            id="profile-visible"
            rows={4}
            maxLength={8000}
            value={visibleText}
            onChange={(e) => {
              setVisibleText(e.target.value);
              setCoachReply(null);
              setAnalyzedAt(null);
            }}
            placeholder={t('profile.visiblePh')}
            className={modeTextareaClass}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label htmlFor="profile-shots" className={modeLabelClass}>

              <ImagePlus className="w-4 h-4 text-magenta-600" aria-hidden="true" />
              {t('profile.shotsLabel')}
            </label>
            <span className="text-[11px] text-charcoal-muted font-mono">
              {t('profile.shotsHint', { n: MAX_SCREENSHOTS })}
            </span>
          </div>
          <input
            id="profile-shots"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              e.target.value = '';
            }}
            className="block w-full text-xs text-charcoal-muted file:mr-3 file:min-h-[44px] file:px-4 file:rounded-xl file:border-0 file:bg-magenta-50 file:text-magenta-800 file:text-xs file:font-semibold hover:file:bg-magenta-100 file:cursor-pointer cursor-pointer"
          />
          {shots.length > 0 && (
            <ul className="grid grid-cols-3 gap-3 pt-1">
              {shots.map((shot) => (
                <li key={shot.id} className="relative rounded-xl overflow-hidden border border-paper-border bg-paper-subtle aspect-square">
                  <button
                    type="button"
                    onClick={() => setActiveShotId(shot.id)}
                    className="w-full h-full cursor-pointer"
                    aria-label={t('profile.viewShot')}
                  >
                    <img src={shot.previewUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                  {(shot.caption || shot.comments) && (
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] font-mono bg-paper-card/90 px-1.5 py-0.5 rounded-md border border-paper-border">
                      {t('profile.hasNotes')}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeShot(shot.id)}
                    className="absolute top-1.5 right-1.5 min-h-[32px] min-w-[32px] rounded-full bg-charcoal/80 text-white flex items-center justify-center hover:bg-charcoal cursor-pointer"
                    aria-label={t('ui.removeImage')}
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="profile-question" className={modeLabelMutedClass}>
            {t('profile.qLabel')}
          </label>
          <input
            id="profile-question"
            type="text"
            maxLength={2000}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('profile.qPh')}
            className={modeInputClass}
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isGenerating}
          aria-busy={isGenerating}
          className={modePrimaryButtonClass}
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{isGenerating ? t('profile.working') : t('profile.cta')}</span>
        </button>

        {errorMsg && (
          <div
            className="p-3 bg-passion-50 text-passion-800 text-xs rounded-xl border border-passion-200 flex items-center gap-2"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-passion-600 flex-shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-start gap-2.5 bg-passion-50/70 rounded-xl p-3 border border-passion-200/80 text-xs text-passion-900">
          <Info className="w-4 h-4 text-passion-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            {t('profile.note')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-xs text-charcoal-muted">
          <span className="font-mono uppercase font-bold text-magenta-700">{t('common.rag')}:</span>
          {coachReply?.citations && coachReply.citations.length > 0 ? (
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-card border border-dashed border-paper-border text-charcoal-muted font-medium">
              <Shield className="w-3.5 h-3.5" aria-hidden="true" />
              {t('ui.citeSoon')}
            </span>
          )}
        </div>
        <AiStatusBadge
          status={coachReply && !coachReply.refused ? 'ready' : isGenerating ? 'loading' : 'idle'}
          readyLabel={t('profile.aiReady')}
        />
      </div>

      {isGenerating ? (
        <CoachBubbleLoading label={t('profile.loading')} />
      ) : coachReply?.refused ? (
        <SafetyBanner message={coachReply.reply} />
      ) : coachReply ? (
        <div className="space-y-4">
          <CoachBubble
            reply={coachReply}
            timestamp={analyzedAt}
            subtitle={t('profile.bubbleSub')}
            onCitationClick={setActiveCitation}
            onCopyReply={(text) => {
              navigator.clipboard.writeText(text).then(() => onToast(t('profile.copyReply')));
            }}
          />
          {coachReply?.improved_draft && (
            <div className="bg-paper-card rounded-2xl p-6 shadow-sm border-2 border-magenta-200/80 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                    {t('profile.draftFromCtx')}
                  </span>
                  <span className="text-[11px] font-mono text-magenta-700 bg-magenta-50 px-2.5 py-0.5 rounded-full border border-magenta-200">
                    {t('ui.copyReady')}
                  </span>
                </div>
                <p className="font-editorial text-base sm:text-lg text-charcoal italic leading-relaxed">
                  “{coachReply.improved_draft}”
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(coachReply.improved_draft!).then(() => onToast(t('profile.copyHint')));
                }}
                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-magenta-600 hover:bg-magenta-700 text-white transition-all self-end cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('ui.copy')}</span>
              </button>
            </div>
          )}
          {aiOpeners.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {aiOpeners.map((text, idx) => (
                <div
                  key={idx}
                  className="bg-paper-card rounded-2xl p-6 shadow-sm border-2 border-magenta-200/80 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                        {t('ui.option', { n: idx + 1 })}
                      </span>
                      <span className="text-[11px] font-mono text-magenta-700 bg-magenta-50 px-2.5 py-0.5 rounded-full border border-magenta-200">
                        {t('ui.copyReady')}
                      </span>
                    </div>
                    <p className="font-editorial text-base sm:text-lg text-charcoal italic leading-relaxed">
                      “{text}”
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(text, idx)}
                    className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      copiedIndex === idx
                        ? 'bg-magenta-600 text-white border-magenta-600'
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
              ))}
            </div>
          )}
        </div>
      ) : (
        <EmptyAiState
          title={t('profile.emptyTitle')}
          description={t('profile.emptyDesc')}
          hint={t('profile.emptyHint')}
        />
      )}

      <div className="rounded-2xl bg-paper-card p-6 border border-paper-border flex items-start gap-3.5 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-magenta-50 text-magenta-600 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-charcoal">
            {t('profile.ephemeralTitle')}
          </span>
          <p className="text-xs text-charcoal-muted leading-relaxed max-w-xl">
            {t('profile.ephemeralBody')}
          </p>
        </div>
      </div>

      {activeShot && (
        <div
          className="fixed inset-0 bg-charcoal-deep/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shot-modal-title"
        >
          <div className="bg-paper-card max-w-3xl w-full rounded-2xl p-5 sm:p-6 shadow-2xl border border-paper-border flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <h2 id="shot-modal-title" className="font-editorial text-xl text-charcoal">
                {t('profile.shotModalTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setActiveShotId(null)}
                className="min-h-[44px] min-w-[44px] rounded-xl text-charcoal-muted hover:text-charcoal hover:bg-paper-subtle flex items-center justify-center"
                aria-label={t('ui.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={activeShot.previewUrl}
              alt={t('profile.shotAlt')}
              className="w-full max-h-[50vh] object-contain rounded-xl border border-paper-border bg-paper-subtle"
            />
            <div className="space-y-1.5">
              <label htmlFor="shot-caption" className="text-xs font-bold uppercase tracking-wider text-charcoal">
                {t('profile.captionLabel')}
              </label>
              <textarea
                id="shot-caption"
                rows={2}
                maxLength={2000}
                value={activeShot.caption}
                onChange={(e) => patchShot(activeShot.id, { caption: e.target.value })}
                placeholder={t('profile.captionPh')}
                className="w-full bg-paper-subtle text-sm p-3 rounded-xl border border-paper-border outline-none focus:ring-2 focus:ring-magenta-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="shot-comments" className="text-xs font-bold uppercase tracking-wider text-charcoal">
                {t('profile.commentsLabel')}
              </label>
              <textarea
                id="shot-comments"
                rows={3}
                maxLength={4000}
                value={activeShot.comments}
                onChange={(e) => patchShot(activeShot.id, { comments: e.target.value })}
                placeholder={t('profile.commentsPh')}
                className="w-full bg-paper-subtle text-sm p-3 rounded-xl border border-paper-border outline-none focus:ring-2 focus:ring-magenta-500/20"
              />
            </div>
            <button
              type="button"
              onClick={() => setActiveShotId(null)}
              className="min-h-[44px] bg-magenta-600 hover:bg-magenta-700 text-white rounded-xl text-sm font-semibold"
            >
              {t('profile.shotDone')}
            </button>
          </div>
        </div>
      )}

      <CitationModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </ModePage>
  );
};
