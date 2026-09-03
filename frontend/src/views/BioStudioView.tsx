import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { api, ApiError } from '../api/client';
import { Citation, CoachReply } from '../api/types';
import { AiStatusBadge } from '../components/AiStatusBadge';
import { CitationModal } from '../components/CitationModal';
import { CoachBubble, CoachBubbleLoading } from '../components/CoachBubble';
import { CopyReadyCard } from '../components/CopyReadyCard';
import { EmptyAiState } from '../components/EmptyAiState';
import { SafetyBanner } from '../components/SafetyBanner';
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
  const positive = /(thêm|giữ|nên có|mời|hook|cụ thể hóa|làm rõ)/i.test(text) || index === 2;
  if (positive) {
    return <PlusCircle className="w-4 h-4 text-magenta-600 flex-shrink-0 mt-0.5" aria-hidden="true" />;
  }
  return <MinusCircle className="w-4 h-4 text-passion-600 flex-shrink-0 mt-0.5" aria-hidden="true" />;
}

export const BioStudioView: React.FC<BioStudioViewProps> = ({ onToast }) => {
  const { ensureSession } = useSession();
  const [draft, setDraft] = useState<string>(
    'Yêu cuộc sống. Thích du lịch, cà phê và nói chuyện sâu sắc. Tìm người cùng tần số.',
  );
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [coachReply, setCoachReply] = useState<CoachReply | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [copiedReply, setCopiedReply] = useState(false);

  const hasResult = Boolean(coachReply && !coachReply.refused);
  const analysisPoints = coachReply?.analysis_points?.filter(Boolean) ?? [];
  const hasAiAnalysis = analysisPoints.length > 0 || Boolean(coachReply?.reply?.trim());
  const currentSuggestion = coachReply?.improved_draft?.trim() || '';

  const handleRefine = async () => {
    if (!draft.trim()) {
      setErrorMsg('Vui lòng nhập bio nháp trước khi yêu cầu Coach sửa.');
      return;
    }

    setErrorMsg(null);
    setIsRefining(true);
    setCoachReply(null);
    setAnalyzedAt(null);

    try {
      const sid = await ensureSession();
      const reply = await api.rewriteBio(sid, draft.trim());
      setCoachReply(reply);
      const now = new Date();
      setAnalyzedAt(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : 'Không thể gửi bio tới Coach.';
      setErrorMsg(msg);
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopy = () => {
    if (!currentSuggestion) {
      onToast('Chưa có bản sửa AI để sao chép — hãy nhờ coach sửa trước.');
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-paper-border pb-6">
        <div>
          <div className="flex items-center gap-1.5 text-magenta-600 mb-1">
            <History className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-magenta-700">
              Bio Refinement Studio
            </span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl text-charcoal font-normal">
            Chỉnh sửa Bio & Hồ sơ hẹn hò
          </h1>
          <p className="text-sm text-charcoal-muted max-w-xl mt-1 leading-relaxed">
            Đánh giá & phân tích do Coach AI tạo từ đúng bio bạn dán — kèm bản viết lại copy-ready.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-paper-card px-3.5 py-1.5 rounded-full border border-paper-border shadow-xs text-xs font-mono text-charcoal">
          <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
          <span>RAG Model: Authentic Dating Profile</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-paper-card p-6 rounded-2xl shadow-sm border border-paper-border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="bio-draft"
                className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4 text-magenta-600" aria-hidden="true" />
                <span>Bio / Profile nháp của bạn</span>
              </label>
              <span className="text-[11px] font-mono bg-paper-subtle text-charcoal-muted px-2.5 py-0.5 rounded-full border border-paper-border">
                {draft.length} ký tự
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
              }}
              placeholder="Nhập bio hiện tại của bạn trên Tinder, Bumble hoặc Hinge..."
              className="w-full bg-paper-subtle text-charcoal text-sm p-4 rounded-xl resize-none outline-none focus:bg-paper-card focus:ring-2 focus:ring-magenta-500/20 focus:border-magenta-500 transition-all border border-paper-border leading-relaxed"
            />

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
                  {hasAiAnalysis
                    ? 'Đánh giá bên phải do Coach AI gen từ bio này.'
                    : 'Chưa có đánh giá AI — nhấn nhờ coach sửa.'}
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
                <span>{isRefining ? 'Đang phân tích...' : 'Nhờ coach sửa'}</span>
              </button>
            </div>
          </div>

          <div className="bg-paper-card p-5 rounded-2xl border border-paper-border flex items-start gap-3.5 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-passion-50 text-passion-600 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                Gợi ý từ phòng lab
              </span>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Bio cụ thể (thói quen, chỗ quen, một khoảnh khắc nhỏ) dễ mời trả lời hơn khẩu hiệu
                chung như “yêu cuộc sống”.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6">
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
                    Đánh giá & Phân tích của Coach
                  </h2>
                  <p className="text-xs text-charcoal-muted">
                    {hasAiAnalysis
                      ? `Phân tích AI${analyzedAt ? ` • ${analyzedAt}` : ''}`
                      : 'Chờ Coach AI — không dùng checklist cứng'}
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
              <CoachBubbleLoading label="Đang gen đánh giá từ bio…" />
            ) : hasResult && hasAiAnalysis && coachReply ? (
              <div className="space-y-4">
                {analysisPoints.length > 0 && (
                  <div className="bg-paper-subtle p-5 rounded-xl border border-paper-border/80 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                      <span>Những điểm Coach AI nhận xét trên bản nháp:</span>
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
                  subtitle="Đánh giá bio / profile"
                  onCitationClick={setActiveCitation}
                  onCopyReply={(text) => {
                    navigator.clipboard.writeText(text).then(() => {
                      setCopiedReply(true);
                      onToast('Đã sao chép nhận xét Coach!');
                      setTimeout(() => setCopiedReply(false), 2000);
                    });
                  }}
                />
                {copiedReply && <span className="sr-only">Đã sao chép</span>}
              </div>
            ) : (
              <EmptyAiState
                title="Chưa có đánh giá & phân tích từ AI"
                description="Sau khi nhấn “Nhờ coach sửa”, phần này sẽ hiện bullets và nhận xét do Coach AI gen từ đúng bio bạn nhập."
                hint="Bước tiếp theo → nút nhờ coach sửa bên trái"
              />
            )}
          </section>

          <CopyReadyCard
            title="Bản sửa gợi ý (Copy-Ready)"
            content={currentSuggestion}
            isLoading={isRefining}
            emptyText="Bản bio viết lại sẽ hiện ở box riêng này sau khi Coach AI trả lời."
            onCopy={handleCopy}
            copied={copied}
            footerHint="Tách riêng khỏi phần đánh giá phía trên • Copy khi sẵn sàng"
          />

          {hasResult && coachReply?.citations && coachReply.citations.length > 0 && (
            <div className="bg-paper-card rounded-2xl p-5 border border-paper-border space-y-2">
              <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-magenta-600" aria-hidden="true" />
                <span>Cơ sở RAG</span>
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
    </div>
  );
};
