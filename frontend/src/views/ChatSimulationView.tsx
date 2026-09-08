import React, { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client';
import { tStatic, useI18n } from '../i18n/LocaleContext';
import {
  PersonaProfile,
  SimulationCoachFeedback,
  SimulationMessage,
} from '../api/types';
import {
  ModeHeader,
  ModePage,
  modeCardClass,
  modeInputClass,
  modePrimaryButtonClass,
} from '../components/ModePage';
import {
  AlertCircle,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  HeartHandshake,
  Lightbulb,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  User,
  UserCheck,
  X,
} from 'lucide-react';

interface ChatSimulationViewProps {
  onToast: (msg: string) => void;
}

export const ChatSimulationView: React.FC<ChatSimulationViewProps> = ({ onToast }) => {
  const { t } = useI18n();
  const [personas, setPersonas] = useState<PersonaProfile[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<PersonaProfile | null>(null);
  const [messages, setMessages] = useState<SimulationMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [coachFeedback, setCoachFeedback] = useState<SimulationCoachFeedback | null>(null);
  const [isCoachOpen, setIsCoachOpen] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Custom persona form state
  const [customName, setCustomName] = useState('');
  const [customAge, setCustomAge] = useState(24);
  const [customVibe, setCustomVibe] = useState('');
  const [customStyle, setCustomStyle] = useState('');
  const [customHint, setCustomHint] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const list = await api.getSimulationPersonas();
        setPersonas(list);
        if (list.length > 0) {
          setSelectedPersona(list[0]);
          // Greeting message
          setMessages([
            {
              role: 'target',
              content: tStatic('simulate.greeting', { name: list[0].name }),
            },
          ]);
        }
      } catch (err: unknown) {
        setErrorMsg(tStatic('simulate.failLoad'));
      }
    };
    void loadPersonas();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  const handleSelectPersona = (p: PersonaProfile) => {
    if (selectedPersona?.id === p.id) return;
    if (messages.length > 1) {
      if (!window.confirm(t('simulate.switchConfirm', { name: p.name }))) {
        return;
      }
    }
    setSelectedPersona(p);
    setCoachFeedback(null);
    setErrorMsg(null);
    setMessages([
      {
        role: 'target',
        content: t('simulate.greeting', { name: p.name }),
      },
    ]);
  };

  const handleResetChat = () => {
    if (!selectedPersona) return;
    if (window.confirm(t('simulate.resetConfirm', { name: selectedPersona.name }))) {
      setMessages([
        {
          role: 'target',
          content: t('simulate.greetingAgain', { name: selectedPersona.name }),
        },
      ]);
      setCoachFeedback(null);
      setErrorMsg(null);
      onToast(t('simulate.resetToast'));
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text || !selectedPersona || isSending) return;

    const nextMessages: SimulationMessage[] = [
      ...messages,
      { role: 'user', content: text },
    ];

    setMessages(nextMessages);
    setInputMessage('');
    setIsSending(true);
    setErrorMsg(null);

    try {
      const res = await api.sendSimulationChat({
        persona: selectedPersona,
        messages: nextMessages,
      });

      setMessages([
        ...nextMessages,
        { role: 'target', content: res.target_reply },
      ]);
      setCoachFeedback(res.coach_feedback);
      setIsCoachOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : t('simulate.failSend');
      setErrorMsg(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleUseSuggestion = (suggestion: string) => {
    setInputMessage(suggestion);
    onToast(t('simulate.pasted'));
  };

  const handleCreateCustomPersona = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim() || !customVibe.trim()) {
      alert(t('simulate.needCustom'));
      return;
    }

    const newPersona: PersonaProfile = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      avatar: '✨',
      tagline: t('simulate.customTagline'),
      age: customAge || 24,
      archetype: 'custom',
      vibe_description: customVibe.trim(),
      messaging_style: customStyle.trim() || t('simulate.customStyle'),
      sample_opener_hint: customHint.trim() || t('simulate.customHint'),
    };

    setPersonas((prev) => [...prev, newPersona]);
    setSelectedPersona(newPersona);
    setMessages([
      {
        role: 'target',
        content: t('simulate.greetingCustom', { name: newPersona.name }),
      }
    ]);
    setCoachFeedback(null);
    setShowCustomModal(false);
    onToast(t('simulate.created', { name: newPersona.name }));
  };

  return (
    <ModePage width="wide">
      <ModeHeader
        eyebrow={t('simulate.eyebrow')}
        title={t('simulate.title')}
        description={t('simulate.desc')}
        aside={
          <button
            type="button"
            onClick={handleResetChat}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-paper-card border border-paper-border text-xs font-mono text-charcoal hover:bg-magenta-50 hover:border-magenta-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-magenta-600" />
            <span>{t('simulate.reset')}</span>
          </button>
        }
      />

      {/* 1. Chọn Đối tượng (Persona Selector) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-magenta-600" />
            <span>{t('simulate.pick')}</span>
          </p>
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="text-xs font-semibold text-magenta-600 hover:text-magenta-700 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('simulate.create')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {personas.map((p) => {
            const isSelected = selectedPersona?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPersona(p)}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-magenta-50/70 border-magenta-500 shadow-md ring-1 ring-magenta-500/30'
                    : 'bg-paper-card border-paper-border hover:border-magenta-200 hover:bg-paper-subtle/50 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl p-1.5 rounded-xl bg-paper-subtle border border-paper-border/60">
                    {p.avatar}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-charcoal">{p.name}</span>
                      <span className="text-xs text-charcoal-muted font-mono">{t('ui.ageYears', { n: p.age })}</span>
                    </div>
                    <p className="text-xs font-medium text-magenta-700 mt-0.5 truncate">{p.tagline}</p>
                  </div>
                </div>
                <p className="text-[11px] text-charcoal-soft line-clamp-2 leading-relaxed">
                  {p.vibe_description}
                </p>
                {isSelected && (
                  <span className="absolute top-3 right-3 text-[10px] font-mono font-bold uppercase tracking-wider bg-magenta-600 text-white px-2 py-0.5 rounded-full">
                    {t('simulate.chatting')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Chat Simulation Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Khung Chat Trực Quan (8 cols) */}
        <div className="lg:col-span-8 flex flex-col rounded-3xl bg-paper-card border border-paper-border shadow-md overflow-hidden min-h-[580px]">
          {/* Header của Khung Chat */}
          {selectedPersona && (
            <div className="px-5 py-4 bg-paper-subtle/80 border-b border-paper-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedPersona.avatar}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-charcoal">{selectedPersona.name}</span>
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {t('simulate.online')}
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-muted line-clamp-1">{selectedPersona.tagline}</p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-magenta-700 bg-magenta-50 px-2.5 py-1 rounded-full border border-magenta-200 hidden sm:inline-block">
                {t('simulate.simBadge')}
              </span>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[460px] min-h-[360px] bg-paper-card">
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <span className="w-8 h-8 rounded-full bg-paper-subtle border border-paper-border flex items-center justify-center text-sm shrink-0 mb-0.5">
                      {selectedPersona?.avatar || '👤'}
                    </span>
                  )}
                  <div
                    className={`max-w-[82%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-passion text-white rounded-br-none shadow-sm'
                        : 'bg-paper-subtle text-charcoal rounded-bl-none border border-paper-border/80 shadow-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-end gap-2.5 justify-start">
                <span className="w-8 h-8 rounded-full bg-paper-subtle border border-paper-border flex items-center justify-center text-sm shrink-0">
                  {selectedPersona?.avatar || '👤'}
                </span>
                <div className="bg-paper-subtle text-charcoal-muted px-4 py-2.5 rounded-2xl rounded-bl-none border border-paper-border/80 flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-magenta-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-magenta-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-magenta-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px] font-mono">{t('simulate.typing', { name: selectedPersona?.name ?? '' })}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mx-4 mb-2 p-2.5 bg-passion-50 text-passion-800 text-xs rounded-xl border border-passion-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-passion-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-paper-subtle border-t border-paper-border flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={selectedPersona ? t('simulate.phNamed', { name: selectedPersona.name }) : t('simulate.ph')}
              disabled={isSending}
              className="flex-1 bg-paper-card text-sm text-charcoal px-4 py-2.5 rounded-xl border border-paper-border outline-none focus:ring-2 focus:ring-magenta-500/30 focus:border-magenta-400 placeholder:text-charcoal-muted"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="min-h-[42px] px-4 rounded-xl bg-magenta-600 hover:bg-magenta-700 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">{t('simulate.send')}</span>
            </button>
          </form>
        </div>

        {/* Cột Cố Vấn Coach Thời Gian Thực (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-paper-card rounded-3xl p-5 border border-paper-border shadow-md space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-paper-border">
              <div className="flex items-center gap-2 text-magenta-700">
                <Sparkles className="w-4 h-4 text-magenta-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider font-mono">
                  {t('simulate.coachTitle')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCoachOpen(!isCoachOpen)}
                className="text-charcoal-muted hover:text-charcoal p-1 rounded-lg"
                title={isCoachOpen ? t('simulate.collapse') : t('simulate.expand')}
              >
                {isCoachOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {coachFeedback ? (
              isCoachOpen && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Vibe Score Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-charcoal">{t('simulate.vibe')}</span>
                    {coachFeedback.vibe_score === 'positive' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                        {t('simulate.vibePos')}
                      </span>
                    )}
                    {coachFeedback.vibe_score === 'neutral' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                        {t('simulate.vibeNeu')}
                      </span>
                    )}
                    {coachFeedback.vibe_score === 'warning' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-passion-50 text-passion-700 border border-passion-200 text-xs font-bold">
                        {t('simulate.vibeWarn')}
                      </span>
                    )}
                  </div>

                  {/* Nhận xét giọng điệu */}
                  <div className="space-y-1.5 bg-paper-subtle p-3 rounded-xl border border-paper-border/80">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">
                      {t('simulate.toneEval')}
                    </p>
                    <p className="text-xs text-charcoal leading-relaxed">
                      {coachFeedback.tone_evaluation}
                    </p>
                  </div>

                  {/* Lời khuyên thiết thực */}
                  <div className="space-y-1.5 bg-magenta-50/50 p-3 rounded-xl border border-magenta-200/80">
                    <div className="flex items-center gap-1.5 text-magenta-800 text-[11px] font-bold uppercase tracking-wider">
                      <Lightbulb className="w-3.5 h-3.5 text-magenta-600" />
                      <span>{t('simulate.nextAdvice')}</span>
                    </div>
                    <p className="text-xs text-charcoal leading-relaxed">
                      {coachFeedback.advice}
                    </p>
                  </div>

                  {/* Gợi ý câu rep mẫu */}
                  {coachFeedback.suggested_replies && coachFeedback.suggested_replies.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-charcoal-muted">
                        {t('simulate.suggested')}
                      </p>
                      <div className="space-y-2">
                        {coachFeedback.suggested_replies.map((reply, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleUseSuggestion(reply)}
                            className="w-full text-left p-2.5 rounded-xl border border-paper-border bg-paper-card hover:bg-magenta-50 hover:border-magenta-300 text-xs text-charcoal transition-all group flex items-start justify-between gap-2 cursor-pointer shadow-xs"
                          >
                            <span className="italic leading-relaxed">“{reply}”</span>
                            <Copy className="w-3.5 h-3.5 text-magenta-400 group-hover:text-magenta-600 shrink-0 mt-0.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="py-8 text-center space-y-2">
                <HeartHandshake className="w-8 h-8 text-charcoal-muted mx-auto opacity-50" />
                <p className="text-xs font-semibold text-charcoal">{t('simulate.noAnalysis')}</p>
                <p className="text-[11px] text-charcoal-muted leading-relaxed px-2">
                  {t('simulate.noAnalysisHint')}
                </p>
              </div>
            )}
          </div>

          {/* Gợi ý mở lời ban đầu */}
          {selectedPersona?.sample_opener_hint && (
            <div className="bg-paper-card rounded-2xl p-4 border border-paper-border text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-charcoal">
                <Sparkles className="w-3.5 h-3.5 text-magenta-600" />
                <span>{t('simulate.topicWith', { name: selectedPersona.name })}</span>
              </div>
              <p className="text-[11px] text-charcoal-muted leading-relaxed">
                {selectedPersona.sample_opener_hint}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tự tạo Đối tượng Custom */}
      {showCustomModal && (
        <div
          className="fixed inset-0 bg-charcoal-deep/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-paper-card max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-paper-border space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-editorial text-xl text-charcoal">{t('simulate.modalTitle')}</h2>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-charcoal-muted hover:text-charcoal p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-charcoal-muted">
              {t('simulate.modalLead')}
            </p>

            <form onSubmit={handleCreateCustomPersona} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-charcoal">{t('simulate.nameLabel')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('simulate.namePh')}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-paper-subtle text-xs p-2.5 rounded-xl border border-paper-border outline-none focus:ring-2 focus:ring-magenta-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-charcoal">{t('simulate.ageLabel')}</label>
                  <input
                    type="number"
                    min={18}
                    max={60}
                    value={customAge}
                    onChange={(e) => setCustomAge(Number(e.target.value))}
                    className="w-full bg-paper-subtle text-xs p-2.5 rounded-xl border border-paper-border outline-none focus:ring-2 focus:ring-magenta-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-charcoal">{t('simulate.vibeLabel')}</label>
                <textarea
                  rows={3}
                  required
                  placeholder={t('simulate.vibePh')}
                  value={customVibe}
                  onChange={(e) => setCustomVibe(e.target.value)}
                  className="w-full bg-paper-subtle text-xs p-2.5 rounded-xl border border-paper-border outline-none focus:ring-2 focus:ring-magenta-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-charcoal">{t('simulate.styleLabel')}</label>
                <input
                  type="text"
                  placeholder={t('simulate.stylePh')}
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
                  className="w-full bg-paper-subtle text-xs p-2.5 rounded-xl border border-paper-border outline-none focus:ring-2 focus:ring-magenta-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-muted hover:bg-paper-subtle"
                >
                  {t('simulate.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-magenta-600 hover:bg-magenta-700 text-white shadow-glow-magenta"
                >
                  {t('simulate.start')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ModePage>
  );
};
