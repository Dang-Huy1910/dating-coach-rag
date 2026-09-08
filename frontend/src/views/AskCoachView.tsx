import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { tStatic, useI18n } from '../i18n/LocaleContext';
import { api, ApiError } from '../api/client';
import { Citation, ProfileImage } from '../api/types';
import { CitationModal } from '../components/CitationModal';
import { CoachBubble } from '../components/CoachBubble';
import { CopyReadyCard } from '../components/CopyReadyCard';
import { RoutedIntentBadge, intentLabel } from '../components/RoutedIntentBadge';
import {
  AlertCircle,
  ArrowUp,
  BookOpen,
  ImagePlus,
  Lock,
  PenTool,
  Sparkles,
  X,
} from 'lucide-react';

const MAX_SCREENSHOTS = 3;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type LocalShot = {
  id: string;
  file: File;
  previewUrl: string;
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
  };
}

interface AskCoachViewProps {
  initialPrompt?: string;
  onToast: (msg: string) => void;
}

const KIT_SLOT_KEYS: Record<string, string> = {
  bio: 'ask.kitBio',
  openers: 'ask.kitOpeners',
  message: 'ask.kitMessage',
};

function kitSavedMessage(
  slots: string[] | null | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string | null {
  if (!slots || slots.length === 0) {
    return null;
  }
  const parts = slots.map((s) => (KIT_SLOT_KEYS[s] ? t(KIT_SLOT_KEYS[s]) : '')).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  if (parts.length === 1) {
    return t('ask.kitSaved1', { slot: parts[0] });
  }
  if (parts.length === 2) {
    return t('ask.kitSaved2', { a: parts[0], b: parts[1] });
  }
  return t('ask.kitSavedMany', { list: parts.slice(0, -1).join(', '), last: parts[parts.length - 1] });
}

export const AskCoachView: React.FC<AskCoachViewProps> = ({ initialPrompt, onToast }) => {
  const { executeWithSession, indexReady, refreshKit, chatTurns, appendChatTurn } = useSession();
  const { t } = useI18n();
  const messages = chatTurns;
  const [inputValue, setInputValue] = useState<string>(initialPrompt || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [shots, setShots] = useState<LocalShot[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const starterPrompts = [
    t('ask.starter1'),
    t('ask.starter2'),
    t('ask.starter3'),
    t('ask.starter4'),
  ];

  const followUpSuggestions = [t('ask.follow1'), t('ask.follow2'), t('ask.follow3')];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSubmitting]);

  const addFiles = (files: File[]) => {
    if (!files.length) return;
    const next: LocalShot[] = [];
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setErrorMessage(t('ask.imageType'));
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setErrorMessage(t('ask.imageTooBig'));
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    setShots((current) => {
      const room = MAX_SCREENSHOTS - current.length;
      if (room <= 0) {
        next.forEach((shot) => URL.revokeObjectURL(shot.previewUrl));
        setErrorMessage(t('ask.imageMax', { n: MAX_SCREENSHOTS }));
        return current;
      }
      const accepted = next.slice(0, room);
      next.slice(room).forEach((shot) => URL.revokeObjectURL(shot.previewUrl));
      if (next.length > room) {
        setErrorMessage(t('ask.imageMax', { n: MAX_SCREENSHOTS }));
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
      event.preventDefault();
      addFiles(files);
      onToast(t('ask.pasteToast', { n: files.length }));
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onToast, t]);

  useEffect(() => {
    return () => {
      shots.forEach((shot) => URL.revokeObjectURL(shot.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText || inputValue).trim();
    const pendingShots = shots;
    if (!textToSend && pendingShots.length === 0) {
      setErrorMessage(t('ask.empty'));
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const images = pendingShots.length
        ? await Promise.all(pendingShots.map(fileToProfileImage))
        : [];
      const previews = pendingShots.map((shot) => shot.previewUrl);
      const reply = await executeWithSession(async (sid) => {
        const result = await api.askAgent(sid, textToSend, images);
        await refreshKit(sid);
        return result;
      });

      const now = new Date();
      const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

      appendChatTurn({
        id: Math.random().toString(36).substring(2, 9),
        userQuestion: textToSend || t('ask.fromImage'),
        timestamp: timeString,
        coachReply: reply,
        imagePreviews: previews.length ? previews : undefined,
      });
      setInputValue('');
      setShots([]);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : t('ask.fail');
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string, key?: string) => {
    navigator.clipboard.writeText(text).then(() => {
      if (key) {
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
      }
      onToast(t('ask.copyToast'));
    });
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col min-h-[calc(100vh-14rem)] pb-32 space-y-8">
      <header className="border-b border-paper-border pb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" aria-hidden="true" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-magenta-700">
                {t('ask.kicker')}
              </span>
            </div>
            <h1 className="font-editorial text-3xl sm:text-4xl text-charcoal font-normal tracking-tight">
              {t('ask.title')}
            </h1>
            <p className="text-sm text-charcoal-muted max-w-2xl leading-relaxed">
              {t('ask.lead')}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-mono text-charcoal-muted bg-paper-card px-3.5 py-1.5 rounded-full border border-paper-border shadow-xs shrink-0">
            <BookOpen className="w-3.5 h-3.5 text-magenta-600" aria-hidden="true" />
            <span className="hidden sm:inline">{t('ask.ragBadge')}</span>
            <span className="sm:hidden">RAG</span>
          </div>
        </div>
      </header>

      {/* Empty State (Screen 02) */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center my-auto text-center px-4 py-8">
          {/* Minimalist Fountain Pen & Open Journal SVG */}
          <div className="relative w-40 h-40 mb-6 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-magenta-200/40 via-passion-200/30 to-neon-glow blur-2xl pointer-events-none"></div>
            <svg
              className="w-36 h-36 text-magenta-700 relative z-10 transition-transform duration-700 hover:scale-105"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 160 160"
            >
              {/* Open Spread Journal */}
              <path
                className="text-magenta-800"
                d="M 80 120 C 65 116, 38 116, 20 122 L 20 54 C 38 48, 65 48, 80 54 Z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
              <path
                className="text-magenta-800"
                d="M 80 120 C 95 116, 122 116, 140 122 L 140 54 C 122 48, 95 48, 80 54 Z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
              <path
                className="text-paper-border"
                d="M 20 126 C 38 120, 65 120, 80 124 C 95 120, 122 120, 140 126"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.2"
              />
              <path
                className="text-magenta-400"
                d="M 80 54 L 80 120"
                strokeLinecap="round"
                strokeWidth="1.5"
              />
              {/* Journal Guidelines */}
              <line className="text-paper-border" strokeDasharray="2 3" strokeWidth="1" x1="32" x2="68" y1="68" y2="68" />
              <line className="text-paper-border" strokeDasharray="2 3" strokeWidth="1" x1="32" x2="68" y1="80" y2="80" />
              <line className="text-paper-border" strokeDasharray="2 3" strokeWidth="1" x1="32" x2="68" y1="92" y2="92" />
              <line className="text-paper-border" strokeDasharray="2 3" strokeWidth="1" x1="92" x2="128" y1="68" y2="68" />
              <line className="text-paper-border" strokeDasharray="2 3" strokeWidth="1" x1="92" x2="128" y1="80" y2="80" />
              <line className="text-paper-border" strokeDasharray="2 3" strokeWidth="1" x1="92" x2="128" y1="92" y2="92" />
              {/* Fountain Pen laying across spread */}
              <g transform="rotate(32 94 62)">
                <polygon className="text-passion-500" fill="currentColor" points="94,30 98,40 90,40" />
                <line stroke="#ffffff" strokeWidth="0.8" x1="94" x2="94" y1="30" y2="37" />
                <rect className="text-magenta-700" fill="currentColor" height="5" rx="0.5" width="6" x="91" y="40" />
                <rect className="text-charcoal" fill="currentColor" height="38" rx="1.5" width="8" x="90" y="45" />
                <rect className="text-neon-pink" fill="currentColor" height="1.5" width="8" x="90" y="47" />
              </g>
              <circle className="text-neon-pink animate-pulse" cx="96" cy="46" fill="currentColor" r="1.5" />
            </svg>
          </div>

          {/* Heading */}
          <div className="flex flex-col items-center gap-2 max-w-lg mb-8">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-magenta-700">
              {t('ask.emptyKicker')}
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl text-charcoal font-normal tracking-tight">
              {t('ask.emptyTitle')}
            </h2>
            <p className="text-sm text-charcoal-muted max-w-md mt-1 leading-relaxed">
              {t('ask.emptyLead')}
            </p>
          </div>

          {/* Starter Chips */}
          <div className="flex flex-col items-center gap-3 w-full">
            <span className="text-xs uppercase tracking-wider text-charcoal-muted font-medium">
              {t('ask.starterLabel')}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-xl">
              {starterPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputValue(prompt);
                    handleSend(prompt);
                  }}
                  className="group flex items-center gap-2 px-4 py-2 rounded-full bg-paper-card border border-paper-border hover:border-magenta-300 hover:bg-magenta-50/50 transition-all text-xs sm:text-sm text-charcoal shadow-xs cursor-pointer active:scale-95"
                >
                  <PenTool className="w-3.5 h-3.5 text-magenta-600 transition-transform group-hover:-rotate-12" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Active Conversation Flow (Screen 03) */
        <div className="space-y-8 flex-1">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-6 animate-in fade-in duration-300">
              {/* User Bubble */}
              <div className="flex flex-col items-end gap-1.5 max-w-[85%] ml-auto">
                <div className="bg-magenta-600 text-white rounded-2xl rounded-tr-none px-5 py-3.5 shadow-sm text-sm sm:text-base leading-relaxed space-y-2">
                  {msg.imagePreviews && msg.imagePreviews.length > 0 ? (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {msg.imagePreviews.map((src, idx) => (
                        <img
                          key={`${msg.id}-img-${idx}`}
                          src={src}
                          alt=""
                          className="h-16 w-16 rounded-lg object-cover border border-white/30"
                        />
                      ))}
                    </div>
                  ) : null}
                  <p>{msg.userQuestion}</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-charcoal-muted px-1 font-mono">
                  <span>{t('ask.you')}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>
              </div>

              <div className="max-w-[95%] sm:max-w-[90%] space-y-3">
                <div className="flex flex-wrap items-center gap-2 pl-1">
                  {msg.coachReply.steps && msg.coachReply.steps.length >= 1 ? (
                    msg.coachReply.steps.map((step, idx) => (
                      <span
                        key={`${msg.id}-step-${idx}-${step.intent}`}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border ${
                          step.status === 'skipped_needs_draft'
                            ? 'bg-paper-subtle text-charcoal-muted border-paper-border'
                            : step.status === 'refused'
                              ? 'bg-passion-50 text-passion-700 border-passion-200'
                              : 'bg-magenta-50 text-magenta-700 border-magenta-200'
                        }`}
                        title={`${step.label} (${step.status})`}
                      >
                        {step.label || intentLabel(step.intent)}
                      </span>
                    ))
                  ) : (
                    <RoutedIntentBadge intent={msg.coachReply.intent} />
                  )}
                </div>
                <CoachBubble
                  reply={msg.coachReply}
                  timestamp={msg.timestamp}
                  subtitle={
                    msg.coachReply.steps && msg.coachReply.steps.length > 1
                      ? msg.coachReply.steps.map((s) => s.label || intentLabel(s.intent)).join(' → ')
                      : intentLabel(msg.coachReply.intent)
                  }
                  onCitationClick={setActiveCitation}
                  onCopyReply={(text) => handleCopy(text)}
                >
                  {msg.coachReply.analysis_points && msg.coachReply.analysis_points.length > 0 ? (
                    <ul className="pl-1 space-y-1.5 text-sm text-charcoal list-disc list-inside">
                      {msg.coachReply.analysis_points.map((point, idx) => (
                        <li key={`${msg.id}-ap-${idx}`}>{point}</li>
                      ))}
                    </ul>
                  ) : null}
                  {(msg.coachReply.tone || msg.coachReply.clarity || msg.coachReply.risk) ? (
                    <div className="pl-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {msg.coachReply.tone ? (
                        <div className="rounded-xl bg-passion-50 border border-passion-200 px-3 py-2">
                          <div className="font-mono font-bold text-passion-700 mb-0.5">{t('ask.toneShort')}</div>
                          <div className="text-charcoal">{msg.coachReply.tone}</div>
                        </div>
                      ) : null}
                      {msg.coachReply.clarity ? (
                        <div className="rounded-xl bg-magenta-50 border border-magenta-200 px-3 py-2">
                          <div className="font-mono font-bold text-magenta-800 mb-0.5">{t('ask.clarityShort')}</div>
                          <div className="text-charcoal">{msg.coachReply.clarity}</div>
                        </div>
                      ) : null}
                      {msg.coachReply.risk ? (
                        <div className="rounded-xl bg-passion-50 border border-passion-200 px-3 py-2">
                          <div className="font-mono font-bold text-passion-700 mb-0.5">{t('ask.riskShort')}</div>
                          <div className="text-charcoal">{msg.coachReply.risk}</div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </CoachBubble>

                {msg.coachReply.improved_draft ? (
                  <CopyReadyCard
                    title={
                      msg.coachReply.intent === 'analyze_message'
                        ? t('message.rewriteTitle')
                        : t('bio.rewriteTitle')
                    }
                    content={msg.coachReply.improved_draft}
                    onCopy={() => handleCopy(msg.coachReply.improved_draft!, `${msg.id}-draft`)}
                    copied={copiedKey === `${msg.id}-draft`}
                  />
                ) : null}

                {msg.coachReply.openers && msg.coachReply.openers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {msg.coachReply.openers.map((opener, idx) => (
                      <div
                        key={`${msg.id}-op-${idx}`}
                        className="bg-paper-card rounded-2xl p-5 shadow-sm border-2 border-magenta-200/80 flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                            {t('ui.option', { n: idx + 1 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(opener, `${msg.id}-op-${idx}`)}
                            className="text-[11px] font-semibold text-magenta-700 hover:text-magenta-900 cursor-pointer"
                          >
                            {copiedKey === `${msg.id}-op-${idx}` ? t('ui.copied') : t('ui.copy')}
                          </button>
                        </div>
                        <p className="font-editorial text-base text-charcoal italic leading-relaxed">
                          “{opener}”
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {(() => {
                  const saved = kitSavedMessage(msg.coachReply.kit_updated, t);
                  return saved ? (
                    <div className="text-xs text-magenta-800 bg-magenta-50 px-3.5 py-2.5 rounded-xl border border-magenta-200">
                      {saved}
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          ))}

          {/* Follow-up suggestions box */}
          <div className="bg-paper-card rounded-2xl p-5 border border-paper-border shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
              {t('ask.followLabel')}
            </span>
            <div className="flex flex-wrap gap-2">
              {followUpSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputValue(suggestion);
                    handleSend(suggestion);
                  }}
                  className="text-xs px-3.5 py-2 rounded-xl bg-paper-subtle hover:bg-magenta-600 hover:text-white text-charcoal transition-all border border-paper-border/80 shadow-xs cursor-pointer text-left"
                >
                  “{suggestion}”
                </button>
              ))}
            </div>
          </div>

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Error display */}
      {errorMessage && (
        <div className="mt-4 p-3 bg-passion-50 border border-passion-200 rounded-xl flex items-center justify-between gap-3 text-xs text-passion-800">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-passion-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => handleSend(inputValue)}
            className="text-magenta-700 font-semibold underline hover:text-magenta-900 shrink-0 cursor-pointer"
          >
            {t('ask.retry')}
          </button>
        </div>
      )}

      {/* Sticky Bottom Composer */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-paper via-paper/95 to-transparent pt-6 pb-6 pointer-events-none">
        <div className="max-w-4xl mx-auto px-4 pointer-events-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative flex flex-col w-full bg-paper-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-paper-border p-2 transition-shadow focus-within:shadow-glow-magenta"
          >
            {shots.length > 0 ? (
              <div className="flex flex-wrap gap-2 px-2 pt-1 pb-2">
                {shots.map((shot) => (
                  <div key={shot.id} className="relative">
                    <img
                      src={shot.previewUrl}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover border border-paper-border"
                    />
                    <button
                      type="button"
                      onClick={() => removeShot(shot.id)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-charcoal text-white flex items-center justify-center cursor-pointer"
                      aria-label={t('ui.removeImage')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex items-center w-full">
            <div className="hidden sm:flex items-center gap-1.5 pl-3 pr-2 text-charcoal-muted border-r border-paper-border my-1">
              <Sparkles className="w-4 h-4 text-magenta-600" />
              <span className="text-xs font-medium">{t('ask.unified')}</span>
            </div>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('ask.placeholder')}
              disabled={isSubmitting || !indexReady}
              className="flex-1 w-full bg-transparent px-4 py-2 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(Array.from(e.target.files || []));
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || !indexReady || shots.length >= MAX_SCREENSHOTS}
              className="h-10 w-10 rounded-xl text-magenta-700 hover:bg-magenta-50 flex items-center justify-center cursor-pointer disabled:opacity-40"
              aria-label={t('ask.addImage')}
              title={t('ask.addImageTitle')}
            >
              <ImagePlus className="w-5 h-5" />
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (!inputValue.trim() && shots.length === 0) || !indexReady}
              className="h-10 px-4 rounded-xl bg-magenta-600 hover:bg-magenta-700 text-white flex items-center justify-center gap-1 text-xs font-semibold transition-all disabled:opacity-40 shadow-sm cursor-pointer active:scale-95"
            >
              <span>{isSubmitting ? t('ask.sending') : t('ask.send')}</span>
              <ArrowUp className="w-4 h-4" />
            </button>
            </div>
          </form>

          <div className="flex items-center justify-between px-3 mt-2 text-[11px] text-charcoal-muted">
            <span>{t('ask.enter')}</span>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-magenta-600" />
              <span>{t('ask.secure')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Citation Modal */}
      <CitationModal
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
};
