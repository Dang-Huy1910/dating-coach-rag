import React, { useMemo, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { api, ApiError } from '../api/client';
import { Citation, CoachReply } from '../api/types';
import { CitationModal } from '../components/CitationModal';
import { SafetyBanner } from '../components/SafetyBanner';
import { Sparkline } from '../components/Sparkline';
import {
  Activity,
  Bookmark,
  Check,
  CheckCircle,
  Clock,
  Copy,
  HeartHandshake,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Waves,
} from 'lucide-react';

interface MessageViewProps {
  onToast: (msg: string) => void;
}

type RiskLevel = 'low' | 'medium' | 'high';

function assessDraft(draft: string): {
  tone: string;
  clarity: string;
  risk: RiskLevel;
  riskLabel: string;
} {
  const text = draft.toLowerCase();
  const pushy =
    /(sao.*(không|ko)|trả lời đi|phải|ngay|gấp|từ sáng|bận đến vậy|đòi|tại sao không)/i.test(
      text,
    );
  const softInvite =
    /(cà phê|cafe|coffee|cuối tuần|nếu bạn|khi nào rảnh|bạn thấy sao|muốn thử)/i.test(text);
  const hasQuestion = draft.includes('?');
  const long = draft.trim().length > 180;

  if (pushy) {
    return {
      tone: 'Hơi dồn ép & nóng vội',
      clarity: hasQuestion ? '8 / 10 • Rõ ý bức bách' : '7 / 10 • Rõ nhưng gắt',
      risk: 'high',
      riskLabel: 'Cao — dễ gây phòng thủ',
    };
  }
  if (softInvite) {
    return {
      tone: 'Lịch sự, mời gọi',
      clarity: hasQuestion ? '8 / 10 • Rõ lời mời' : '7 / 10 • Cần cụ thể hơn',
      risk: 'low',
      riskLabel: 'Thấp — ít áp lực',
    };
  }
  return {
    tone: 'Trung tính',
    clarity: long ? '6 / 10 • Hơi dài' : hasQuestion ? '7 / 10 • Có câu hỏi' : '6 / 10 • Chưa rõ đích',
    risk: 'medium',
    riskLabel: 'Trung bình — tùy ngữ cảnh',
  };
}

function MetricSkeleton({ label }: { label: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-dashed border-paper-border bg-paper-subtle/80 p-3.5 min-h-[5.5rem] flex flex-col justify-between"
      aria-hidden="true"
    >
      <span className="text-[11px] font-bold text-charcoal-faint uppercase font-mono tracking-wide">
        {label}
      </span>
      <div className="mt-3 space-y-2">
        <div className="h-2.5 w-3/4 rounded-full bg-paper-border/80 animate-pulse" />
        <div className="h-2 w-1/2 rounded-full bg-paper-border/60 animate-pulse" />
      </div>
    </div>
  );
}

function CoachReplyBody({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {paragraphs.map((para, idx) => (
        <p
          key={idx}
          className={`text-sm sm:text-[15px] text-charcoal leading-relaxed ${
            idx === 0 ? 'font-medium' : 'text-charcoal-soft'
          }`}
        >
          {para}
        </p>
      ))}
    </div>
  );
}

export const MessageView: React.FC<MessageViewProps> = ({ onToast }) => {
  const { ensureSession } = useSession();
  const [draft, setDraft] = useState<string>(
    'Hey, mình thấy profile bạn khá thú vị. Bạn có muốn đi uống cà phê cuối tuần này không?',
  );
  const [notes, setNotes] = useState<string>(
    'Lịch sử: quen qua dating app, đã nhắn 2-3 tin. Mục tiêu: mời đi cà phê cuối tuần, lịch thoáng.',
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [coachReply, setCoachReply] = useState<CoachReply | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const assessment = useMemo(() => assessDraft(draft), [draft]);
  const hasResult = Boolean(coachReply);

  const handleAnalyze = async () => {
    if (!draft.trim()) {
      setErrorMsg('Vui lòng nhập nội dung tin nhắn cần phân tích.');
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);
    setCoachReply(null);

    try {
      const sid = await ensureSession();
      const reply = await api.analyzeMessage(
        sid,
        draft.trim(),
        notes.trim() || undefined,
      );
      setCoachReply(reply);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : 'Không thể phân tích tin nhắn.';
      setErrorMsg(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentSuggestion = coachReply?.improved_draft?.trim() || '';

  const handleCopy = () => {
    if (!currentSuggestion) {
      onToast('Chưa có bản sửa để sao chép — hãy phân tích trước.');
      return;
    }
    navigator.clipboard.writeText(currentSuggestion).then(() => {
      setCopied(true);
      onToast('Đã sao chép bản sửa vào khay nhớ tạm!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-16">
      <div className="border-b border-paper-border pb-6 space-y-2">
        <div className="flex items-center gap-2 text-magenta-600">
          <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse"></span>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-magenta-700">
            Phòng thực nghiệm đối thoại • Pacing Dynamics
          </span>
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl text-charcoal font-normal">
          Phân tích tin nhắn trước khi gửi
        </h1>
        <p className="font-editorial text-base sm:text-lg text-charcoal-muted italic">
          Dán tin sắp gửi — Coach phản hồi đúng nội dung đó (tone, rõ ý, rủi ro giao tiếp) kèm bản viết lại.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-paper-card rounded-2xl p-6 shadow-sm border border-paper-border space-y-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="message-draft"
                className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4 text-magenta-600" />
                <span>Tin nhắn sắp gửi</span>
              </label>
              <span className="text-[11px] font-mono text-charcoal-muted bg-paper-subtle px-2.5 py-0.5 rounded-full border border-paper-border">
                Bản nháp
              </span>
            </div>

            <textarea
              id="message-draft"
              rows={5}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setCoachReply(null);
              }}
              placeholder="Dán hoặc gõ nội dung tin nhắn bạn đang ngập ngừng muốn gửi..."
              className="w-full bg-paper-subtle text-charcoal text-sm p-4 rounded-xl resize-none outline-none focus:bg-paper-card focus:ring-2 focus:ring-magenta-500/20 focus:border-magenta-500 transition-all border border-paper-border leading-relaxed"
            />

            <div>
              <label
                htmlFor="message-notes"
                className="text-xs font-bold text-charcoal-muted uppercase tracking-wider"
              >
                Ghi chú thêm (tuỳ chọn)
              </label>
              <textarea
                id="message-notes"
                rows={3}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setCoachReply(null);
                }}
                placeholder="Ngữ cảnh: đã chat bao lâu, mục tiêu tin nhắn, điều muốn tránh…"
                className="mt-2 w-full bg-paper-subtle text-charcoal text-sm p-3 rounded-xl resize-none outline-none focus:bg-paper-card focus:ring-2 focus:ring-magenta-500/20 border border-paper-border leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-charcoal-muted">
              <span>
                {draft.length} ký tự • {draft.includes('?') ? 'Có câu hỏi' : 'Đang soạn'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDraft('');
                  setCoachReply(null);
                }}
                className="hover:text-passion-600 transition-colors cursor-pointer"
              >
                Xóa nháp
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-passion-50 text-passion-800 text-xs rounded-lg border border-passion-200">
                {errorMsg}
              </div>
            )}

            <div className="bg-passion-50/70 rounded-xl p-4 border border-passion-200/80 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-passion-100 text-passion-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-passion-900 uppercase tracking-wider">
                  Gợi ý dùng chế độ này
                </span>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  Phân tích trước khi gửi giúp giảm áp lực vô thức (đòi reply, mơ hồ, hoặc lời mời quá rộng).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              aria-busy={isAnalyzing}
              className="w-full min-h-[44px] bg-magenta-600 hover:bg-magenta-700 active:scale-[0.99] text-white py-3 px-5 rounded-xl text-xs sm:text-sm font-semibold shadow-glow-magenta transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles
                className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>
                {isAnalyzing
                  ? 'Đang phân tích tin nhắn…'
                  : 'Phân tích & gợi ý bản viết lại'}
              </span>
            </button>
          </div>

          <div className="bg-paper-card rounded-2xl p-5 shadow-sm border border-paper-border flex items-center gap-4">
            <Sparkline />
            <div className="space-y-1">
              <div className="text-xs font-bold text-charcoal">Chỉ số nhịp khẩn cấp (ước lượng)</div>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                {hasResult
                  ? `Sau phân tích: rủi ro giao tiếp ${assessment.riskLabel.toLowerCase()}.`
                  : 'Nhấn phân tích để Coach đánh giá đúng bản nháp hiện tại.'}
              </p>
            </div>
          </div>

          <div className="bg-paper-card rounded-2xl p-5 border border-paper-border space-y-2">
            <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wider flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-magenta-600" />
              <span>Cơ sở RAG / Citations</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {hasResult && coachReply?.citations && coachReply.citations.length > 0 ? (
                coachReply.citations.map((cite, idx) => (
                  <button
                    key={`${cite.source_id}-${idx}`}
                    type="button"
                    onClick={() => setActiveCitation(cite)}
                    className="inline-flex items-center gap-1 bg-paper-subtle text-charcoal px-3 py-1 rounded-full text-xs border border-paper-border font-mono hover:bg-magenta-50 cursor-pointer"
                  >
                    {cite.title}
                    {cite.heading ? ` / ${cite.heading}` : ''}
                  </button>
                ))
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 bg-paper-subtle text-charcoal-muted px-3 py-1 rounded-full text-xs border border-paper-border font-mono">
                    Sẽ hiện sau khi phân tích
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Diagnostic metrics */}
          <section
            className="bg-paper-card rounded-2xl p-6 shadow-sm border border-paper-border space-y-4"
            aria-labelledby="diagnostic-heading"
            aria-busy={isAnalyzing}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-magenta-600" aria-hidden="true" />
                  <h2
                    id="diagnostic-heading"
                    className="text-xs font-bold uppercase tracking-wider text-charcoal"
                  >
                    Chẩn đoán phản xạ truyền đạt
                  </h2>
                </div>
                <p className="text-[11px] text-charcoal-muted leading-relaxed max-w-md">
                  {hasResult
                    ? 'Ước lượng nhanh từ bản nháp sau khi Coach đã phân tích.'
                    : 'Ba chỉ số sẽ hiện sau khi bạn nhấn phân tích — chưa phải kết quả AI.'}
                </p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold font-mono px-2.5 py-1 rounded-full border ${
                  hasResult
                    ? 'bg-magenta-50 text-magenta-700 border-magenta-200'
                    : isAnalyzing
                      ? 'bg-passion-50 text-passion-700 border-passion-200'
                      : 'bg-paper-subtle text-charcoal-muted border-paper-border'
                }`}
              >
                {hasResult ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    Đã đối chiếu
                  </>
                ) : isAnalyzing ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    Đang đo…
                  </>
                ) : (
                  <>
                    <Waves className="w-3.5 h-3.5" aria-hidden="true" />
                    Chờ phân tích
                  </>
                )}
              </span>
            </div>

            {hasResult ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-passion-50 p-3.5 rounded-xl border border-passion-200/80 flex flex-col justify-between min-h-[5.5rem]">
                  <span className="text-[11px] font-bold text-passion-900 uppercase font-mono">
                    Giọng điệu (Tone)
                  </span>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-passion-700">
                    <span className="w-2 h-2 rounded-full bg-passion-500" aria-hidden="true" />
                    <span>{assessment.tone}</span>
                  </div>
                </div>
                <div className="bg-magenta-50 p-3.5 rounded-xl border border-magenta-200/80 flex flex-col justify-between min-h-[5.5rem]">
                  <span className="text-[11px] font-bold text-magenta-900 uppercase font-mono">
                    Độ rõ (Clarity)
                  </span>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-magenta-700">
                    <span className="w-2 h-2 rounded-full bg-magenta-600" aria-hidden="true" />
                    <span>{assessment.clarity}</span>
                  </div>
                </div>
                <div
                  className={`p-3.5 rounded-xl border flex flex-col justify-between min-h-[5.5rem] ${
                    assessment.risk === 'high'
                      ? 'bg-passion-100/70 border-passion-300'
                      : assessment.risk === 'low'
                        ? 'bg-magenta-50 border-magenta-200'
                        : 'bg-paper-subtle border-paper-border'
                  }`}
                >
                  <span className="text-[11px] font-bold text-passion-900 uppercase font-mono">
                    Rủi ro giao tiếp
                  </span>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-passion-800">
                    <span className="w-2 h-2 rounded-full bg-passion-600" aria-hidden="true" />
                    <span>{assessment.riskLabel}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <MetricSkeleton label="Giọng điệu (Tone)" />
                  <MetricSkeleton label="Độ rõ (Clarity)" />
                  <MetricSkeleton label="Rủi ro giao tiếp" />
                </div>
                <div className="rounded-xl border border-dashed border-magenta-200/80 bg-gradient-to-br from-magenta-50/70 via-paper-card to-passion-50/40 px-4 py-3.5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-magenta-100 text-magenta-600 flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold text-charcoal">
                      {isAnalyzing
                        ? 'Đang đọc nhịp tin nhắn của bạn…'
                        : 'Chưa có chẩn đoán — sẵn sàng khi bạn phân tích'}
                    </p>
                    <p className="text-[11px] text-charcoal-muted leading-relaxed">
                      {isAnalyzing
                        ? 'Giữ nguyên bản nháp; kết quả tone / rõ ý / rủi ro sẽ đổ vào các ô trên.'
                        : 'Nhấn “Phân tích & gợi ý bản viết lại” bên trái để lấp đầy ba chỉ số và khung Coach.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[11px] text-charcoal-muted leading-relaxed">
              Rủi ro = áp lực / ranh giới / rõ ý —{' '}
              <span className="italic">không phải chẩn đoán tâm lý lâm sàng</span>.
            </p>
          </section>

          {/* Coach reply frame */}
          <section
            className="relative bg-paper-card rounded-2xl shadow-sm border border-paper-border overflow-hidden"
            aria-labelledby="coach-heading"
            aria-busy={isAnalyzing}
          >
            <div
              className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-magenta-500 via-passion-400 to-neon-pink"
              aria-hidden="true"
            />
            <div className="p-6 sm:p-7 space-y-4 pl-7 sm:pl-8">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-magenta-50 border border-magenta-100 text-magenta-600 flex items-center justify-center shadow-sm">
                    <Lightbulb className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2
                      id="coach-heading"
                      className="font-editorial text-xl sm:text-2xl font-normal text-charcoal leading-tight"
                    >
                      Góc nhìn từ Coach
                    </h2>
                    <p className="text-[11px] font-mono text-charcoal-muted uppercase tracking-wider mt-0.5">
                      Tone · Clarity · Interpersonal risk
                    </p>
                  </div>
                </div>
                {hasResult && !coachReply?.refused && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-magenta-700 bg-magenta-50 border border-magenta-200 px-2.5 py-1 rounded-full">
                    <CheckCircle className="w-3 h-3" aria-hidden="true" />
                    Đã tạo
                  </span>
                )}
              </div>

              {isAnalyzing ? (
                <div className="rounded-xl border border-paper-border bg-paper-subtle/80 p-4 space-y-3" role="status">
                  <div className="flex items-center gap-2 text-xs font-semibold text-magenta-700">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    Đang phân tích tin nhắn sắp gửi…
                  </div>
                  <div className="space-y-2.5" aria-hidden="true">
                    <div className="h-3 w-full rounded-full bg-paper-border/80 animate-pulse" />
                    <div className="h-3 w-11/12 rounded-full bg-paper-border/70 animate-pulse" />
                    <div className="h-3 w-4/5 rounded-full bg-paper-border/60 animate-pulse" />
                    <div className="h-3 w-2/3 rounded-full bg-paper-border/50 animate-pulse" />
                  </div>
                </div>
              ) : coachReply?.refused ? (
                <SafetyBanner message={coachReply.reply} />
              ) : coachReply?.reply ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-magenta-100 bg-gradient-to-br from-magenta-50/50 via-white to-paper-subtle p-4 sm:p-5 shadow-[0_2px_12px_rgba(217,27,92,0.04)]">
                    <CoachReplyBody text={coachReply.reply} />
                  </div>
                  {coachReply.hedged && (
                    <div className="p-3.5 bg-paper-subtle rounded-xl border border-paper-border flex items-start gap-2.5">
                      <HeartHandshake
                        className="w-4 h-4 text-magenta-600 flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <p className="text-xs text-charcoal-muted leading-relaxed">
                        Coach đang thận trọng vì thư viện có thể chỉ hỗ trợ một phần — không bịa
                        nghiên cứu.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-paper-border bg-paper-subtle/60 px-5 py-8 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-white border border-paper-border text-magenta-500 flex items-center justify-center shadow-sm">
                    <MessageSquare className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5 max-w-sm mx-auto">
                    <p className="text-sm font-semibold text-charcoal">
                      Chưa có phân tích cho tin nhắn này
                    </p>
                    <p className="text-xs text-charcoal-muted leading-relaxed">
                      Gợi ý tone, rõ ý và rủi ro giao tiếp sẽ xuất hiện tại đây sau khi bạn chạy
                      phân tích.
                    </p>
                  </div>
                  <p className="text-[11px] font-mono text-magenta-700/80">
                    Bước tiếp theo → nút phân tích bên trái
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Improved draft */}
          <section className="bg-paper-card rounded-2xl p-6 sm:p-7 shadow-md border-2 border-magenta-200/90 relative overflow-hidden space-y-4">
            <div
              className="pointer-events-none absolute -right-8 -top-8 w-28 h-28 rounded-full bg-magenta-100/50 blur-2xl"
              aria-hidden="true"
            />
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-magenta-600" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-wider text-charcoal font-mono">
                  Bản viết lại gợi ý
                </span>
              </div>
              <span className="bg-magenta-50 text-magenta-700 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-magenta-200">
                Copy-ready
              </span>
            </div>

            <div className="bg-paper-subtle rounded-xl p-4 sm:p-5 border border-paper-border min-h-[6.5rem] relative">
              {currentSuggestion ? (
                <blockquote className="font-editorial text-base sm:text-lg text-charcoal italic leading-relaxed">
                  “{currentSuggestion}”
                </blockquote>
              ) : isAnalyzing ? (
                <div className="space-y-2.5 py-1" role="status" aria-label="Đang soạn bản viết lại">
                  <div className="h-3 w-full rounded-full bg-paper-border/70 animate-pulse" />
                  <div className="h-3 w-5/6 rounded-full bg-paper-border/60 animate-pulse" />
                  <div className="h-3 w-2/3 rounded-full bg-paper-border/50 animate-pulse" />
                </div>
              ) : (
                <div className="flex flex-col items-start justify-center gap-2 py-1 min-h-[4.5rem]">
                  <p className="text-sm text-charcoal-muted leading-relaxed">
                    Bản viết lại sẽ hiện ở đây — giữ ý mời, giảm áp lực phòng thủ khi có thể.
                  </p>
                  <span className="text-[11px] font-mono text-charcoal-faint">
                    Trống cho đến khi Coach trả lời
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 gap-3 flex-wrap">
              <span className="text-xs text-charcoal-muted">
                Giữ ý mời / mục tiêu • Giảm áp lực phòng thủ khi có thể
              </span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!currentSuggestion}
                aria-disabled={!currentSuggestion}
                className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  copied
                    ? 'bg-magenta-600 text-white border-magenta-600 shadow-sm'
                    : 'bg-magenta-600 hover:bg-magenta-700 text-white border-transparent shadow-glow-magenta'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                <span>{copied ? 'Đã sao chép!' : 'Sao chép bản sửa'}</span>
              </button>
            </div>
          </section>

          <section className="bg-paper-card rounded-2xl p-5 shadow-sm border border-paper-border space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
              Bảng so sánh nhanh
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-passion-50 p-3.5 rounded-xl border border-passion-200">
                <span className="text-xs font-bold text-passion-700 font-mono">Bản gốc</span>
                <p className="text-xs text-charcoal-muted mt-1 leading-relaxed line-clamp-4">
                  {draft.trim() || '—'}
                </p>
              </div>
              <div className="bg-magenta-50 p-3.5 rounded-xl border border-magenta-200">
                <span className="text-xs font-bold text-magenta-800 font-mono">Bản sửa Coach</span>
                <p className="text-xs text-charcoal-muted mt-1 leading-relaxed line-clamp-4">
                  {currentSuggestion || 'Chưa có — nhấn phân tích.'}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <CitationModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  );
};
