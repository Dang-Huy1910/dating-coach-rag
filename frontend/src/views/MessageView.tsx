import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { api, ApiError } from '../api/client';
import { Citation, CoachReply } from '../api/types';
import { AiStatusBadge } from '../components/AiStatusBadge';
import { CitationModal } from '../components/CitationModal';
import { CoachBubble, CoachBubbleLoading } from '../components/CoachBubble';
import { CopyReadyCard } from '../components/CopyReadyCard';
import { EmptyAiState } from '../components/EmptyAiState';
import { ModeHeader, ModePage, modeCardClass, modeLabelClass } from '../components/ModePage';
import { Sparkline } from '../components/Sparkline';
import {
  Activity,
  Bookmark,
  Clock,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface MessageViewProps {
  onToast: (msg: string) => void;
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

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'passion' | 'magenta' | 'neutral';
}) {
  const styles =
    tone === 'passion'
      ? 'bg-passion-50 border-passion-200/80 text-passion-900 value:text-passion-700'
      : tone === 'magenta'
        ? 'bg-magenta-50 border-magenta-200/80 text-magenta-900'
        : 'bg-paper-subtle border-paper-border text-charcoal';

  const dot =
    tone === 'passion' ? 'bg-passion-500' : tone === 'magenta' ? 'bg-magenta-600' : 'bg-charcoal-muted';

  const valueColor =
    tone === 'passion' ? 'text-passion-700' : tone === 'magenta' ? 'text-magenta-700' : 'text-charcoal';

  return (
    <div className={`p-3.5 rounded-xl border flex flex-col justify-between min-h-[5.5rem] ${styles}`}>
      <span className="text-[11px] font-bold uppercase font-mono">{label}</span>
      <div className={`mt-2 flex items-center gap-1.5 text-xs font-bold ${valueColor}`}>
        <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden="true" />
        <span>{value}</span>
      </div>
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
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);

  const hasResult = Boolean(coachReply);
  const hasAiMetrics = Boolean(
    coachReply &&
      !coachReply.refused &&
      (coachReply.tone || coachReply.clarity || coachReply.risk),
  );
  const hasFullAiMetrics = Boolean(
    coachReply && coachReply.tone && coachReply.clarity && coachReply.risk,
  );
  const currentSuggestion = coachReply?.improved_draft?.trim() || '';

  const handleAnalyze = async () => {
    if (!draft.trim()) {
      setErrorMsg('Vui lòng nhập nội dung tin nhắn cần phân tích.');
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);
    setCoachReply(null);
    setAnalyzedAt(null);

    try {
      const sid = await ensureSession();
      const reply = await api.analyzeMessage(sid, draft.trim(), notes.trim() || undefined);
      setCoachReply(reply);
      const now = new Date();
      setAnalyzedAt(
        `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : 'Không thể phân tích tin nhắn.';
      setErrorMsg(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyDraft = () => {
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
    <ModePage width="wide">
      <ModeHeader
        eyebrow="Phòng thực nghiệm đối thoại • Pacing"
        title="Phân tích tin nhắn trước khi gửi"
        description="Dán tin sắp gửi — Coach phân tích tone, rõ ý, rủi ro giao tiếp và gợi ý bản viết lại copy-ready."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: draft workbench */}
        <div className="lg:col-span-5 flex flex-col gap-6 min-w-0">
          <div className={`${modeCardClass} gap-4`}>
            <div className="flex items-center justify-between">
              <label
                htmlFor="message-draft"
                className={modeLabelClass}
              >
                <MessageSquare className="w-4 h-4 text-magenta-600" aria-hidden="true" />
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
                setAnalyzedAt(null);
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
                  setAnalyzedAt(null);
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
                  setAnalyzedAt(null);
                }}
                className="hover:text-passion-600 transition-colors cursor-pointer"
              >
                Xóa nháp
              </button>
            </div>

            {errorMsg && (
              <div
                className="p-2.5 bg-passion-50 text-passion-800 text-xs rounded-lg border border-passion-200"
                role="alert"
              >
                {errorMsg}
              </div>
            )}

            <div className="bg-passion-50/70 rounded-xl p-4 border border-passion-200/80 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-passion-100 text-passion-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-passion-900 uppercase tracking-wider">
                  Gợi ý dùng chế độ này
                </span>
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  Phân tích trước khi gửi giúp giảm áp lực vô thức (đòi reply, mơ hồ, hoặc lời mời quá
                  rộng).
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
                {isAnalyzing ? 'Đang phân tích tin nhắn…' : 'Phân tích & gợi ý bản viết lại'}
              </span>
            </button>
          </div>

          <div className="bg-paper-card rounded-2xl p-5 shadow-sm border border-paper-border flex items-center gap-4">
            <Sparkline />
            <div className="space-y-1">
              <div className="text-xs font-bold text-charcoal">Trạng thái phân tích</div>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                {hasFullAiMetrics
                  ? 'Tone / rõ ý / rủi ro do Coach AI gen trong lần phân tích này.'
                  : hasAiMetrics
                    ? 'AI đã trả một phần chỉ số — không dùng heuristic giả.'
                    : 'Chỉ số chỉ hiện khi Coach AI trả lời — không ước lượng local.'}
              </p>
            </div>
          </div>

          <div className="bg-paper-card rounded-2xl p-5 border border-paper-border space-y-2">
            <div className="text-xs font-bold text-charcoal-muted uppercase tracking-wider flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-magenta-600" aria-hidden="true" />
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
                <span className="inline-flex items-center gap-1 bg-paper-subtle text-charcoal-muted px-3 py-1 rounded-full text-xs border border-paper-border font-mono">
                  Sẽ hiện sau khi phân tích
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: diagnostics + Ask-style coach bubble */}
        <div className="lg:col-span-7 flex flex-col gap-6">
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
                  {hasFullAiMetrics
                    ? 'Ba nhãn do Coach AI tạo (bắt buộc trong analyze-message).'
                    : hasAiMetrics
                      ? 'Một phần chỉ số đã có từ AI.'
                      : 'Chờ AI gen — không điền sẵn bằng code heuristic.'}
                </p>
              </div>
              <AiStatusBadge
                status={hasAiMetrics ? 'ready' : isAnalyzing ? 'loading' : 'idle'}
                loadingLabel="AI đang phân tích…"
              />
            </div>

            {hasAiMetrics ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard
                  label="Giọng điệu (Tone)"
                  value={coachReply?.tone || '—'}
                  tone="passion"
                />
                <MetricCard
                  label="Độ rõ (Clarity)"
                  value={coachReply?.clarity || '—'}
                  tone="magenta"
                />
                <MetricCard
                  label="Rủi ro giao tiếp"
                  value={coachReply?.risk || '—'}
                  tone="passion"
                />
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
                        ? 'Coach AI đang đọc tin nhắn của bạn…'
                        : 'Chưa có chẩn đoán từ AI'}
                    </p>
                    <p className="text-[11px] text-charcoal-muted leading-relaxed">
                      {isAnalyzing
                        ? 'Tone / rõ ý / rủi ro sẽ được AI điền — không dùng điểm heuristic.'
                        : 'Nhấn “Phân tích & gợi ý bản viết lại” để Coach AI tạo ba chỉ số và khung trả lời.'}
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

          <section aria-busy={isAnalyzing}>
            {isAnalyzing ? (
              <CoachBubbleLoading label="Đang phân tích tin nhắn…" />
            ) : coachReply ? (
              <CoachBubble
                reply={coachReply}
                timestamp={analyzedAt}
                subtitle="Phân tích tin nhắn sắp gửi"
                onCitationClick={setActiveCitation}
                onCopyReply={(text) => {
                  navigator.clipboard.writeText(text).then(() => {
                    onToast('Đã sao chép câu trả lời Coach!');
                  });
                }}
              >
                {coachReply.hedged && !coachReply.refused ? (
                  <p className="pl-1 text-xs text-charcoal-muted leading-relaxed">
                    Coach đang thận trọng vì thư viện có thể chỉ hỗ trợ một phần — không bịa nghiên
                    cứu.
                  </p>
                ) : null}
              </CoachBubble>
            ) : (
              <EmptyAiState
                title="Coach chưa trả lời"
                description="Sau khi phân tích, khung này sẽ hiện giống phòng Ask: avatar Coach, citations RAG, nội dung AI và nút sao chép."
                hint="Bước tiếp theo → nút phân tích bên trái"
              />
            )}
          </section>

          <CopyReadyCard
            title="Bản viết lại gợi ý"
            content={currentSuggestion}
            isLoading={isAnalyzing}
            emptyText="Bản viết lại do AI sẽ hiện ở box riêng này sau khi phân tích."
            onCopy={handleCopyDraft}
            copied={copied}
            footerHint="Giữ ý mời / mục tiêu • Giảm áp lực phòng thủ khi có thể"
          />

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
                  {currentSuggestion || 'Chưa có — chờ AI phân tích.'}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <CitationModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </ModePage>
  );
};
