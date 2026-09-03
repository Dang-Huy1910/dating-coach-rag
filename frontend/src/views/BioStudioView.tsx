import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { api, ApiError } from '../api/client';
import { Citation, CoachReply } from '../api/types';
import { CitationModal } from '../components/CitationModal';
import { SafetyBanner } from '../components/SafetyBanner';
import {
  Bookmark,
  Check,
  CheckCircle,
  Copy,
  Edit3,
  Flame,
  History,
  Lightbulb,
  MessageSquare,
  MinusCircle,
  PlusCircle,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface BioStudioViewProps {
  onToast: (msg: string) => void;
}

export const BioStudioView: React.FC<BioStudioViewProps> = ({ onToast }) => {
  const { ensureSession } = useSession();
  const [draft, setDraft] = useState<string>(
    'Yêu cuộc sống. Thích du lịch, cà phê và nói chuyện sâu sắc. Tìm người cùng tần số.'
  );
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [coachReply, setCoachReply] = useState<CoachReply | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fallbackSuggestion =
    'Cuối tuần hay ngồi góc quen thử cà phê pour-over hoặc chạy bộ dọc bờ kè. Nếu bạn cũng thích tìm quán ăn vặt vỉa hè lúc 9h tối, gợi ý cho mình một quán ruột nhé.';

  const handleRefine = async () => {
    if (!draft.trim()) {
      setErrorMsg('Vui lòng nhập bio nháp trước khi yêu cầu Coach sửa.');
      return;
    }

    setErrorMsg(null);
    setIsRefining(true);

    try {
      const sid = await ensureSession();
      const reply = await api.rewriteBio(sid, draft.trim());
      setCoachReply(reply);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : 'Không thể gửi bio tới Coach.';
      setErrorMsg(msg);
    } finally {
      setIsRefining(false);
    }
  };

  const currentSuggestion = coachReply?.improved_draft || fallbackSuggestion;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSuggestion).then(() => {
      setCopied(true);
      onToast('Đã sao chép bản sửa vào khay nhớ tạm!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header & Meta */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-paper-border pb-6">
        <div>
          <div className="flex items-center gap-1.5 text-magenta-600 mb-1">
            <History className="w-4 h-4" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-magenta-700">
              Bio Refinement Studio
            </span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl text-charcoal font-normal">
            Chỉnh sửa Bio & Hồ sơ hẹn hò
          </h1>
          <p className="text-sm text-charcoal-muted max-w-xl mt-1 leading-relaxed">
            Biến những câu chữ chung chung thành những chi tiết đời thường sống động — nơi câu chuyện thật sự bắt đầu.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-paper-card px-3.5 py-1.5 rounded-full border border-paper-border shadow-xs text-xs font-mono text-charcoal">
          <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse"></span>
          <span>RAG Model: Authentic Dating Profile</span>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input Workbench (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-paper-card p-6 rounded-2xl shadow-sm border border-paper-border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="bio-draft"
                className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4 text-magenta-600" />
                <span>Bio / Profile nháp của bạn</span>
              </label>
              <span className="text-[11px] font-mono bg-paper-subtle text-charcoal-muted px-2.5 py-0.5 rounded-full border border-paper-border">
                {draft.length} / 250
              </span>
            </div>

            <textarea
              id="bio-draft"
              rows={6}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nhập bio hiện tại của bạn trên Tinder, Bumble hoặc Hinge..."
              className="w-full bg-paper-subtle text-charcoal text-sm p-4 rounded-xl resize-none outline-none focus:bg-paper-card focus:ring-2 focus:ring-magenta-500/20 focus:border-magenta-500 transition-all border border-paper-border leading-relaxed"
            />

            {errorMsg && (
              <div className="text-xs text-passion-600 bg-passion-50 p-2.5 rounded-lg border border-passion-200">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                <Flame className="w-4 h-4 text-passion-500" />
                <span>Độ cụ thể: {draft.length > 50 ? 'Trung bình' : 'Thấp (12/100)'}</span>
              </div>

              <button
                type="button"
                onClick={handleRefine}
                disabled={isRefining}
                className="inline-flex items-center gap-2 bg-magenta-600 hover:bg-magenta-700 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-glow-magenta active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 ${isRefining ? 'animate-spin' : ''}`} />
                <span>{isRefining ? 'Đang phân tích...' : 'Nhờ coach sửa'}</span>
              </button>
            </div>
          </div>

          {/* Lab Tip Card */}
          <div className="bg-paper-card p-5 rounded-2xl border border-paper-border flex items-start gap-3.5 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-passion-50 text-passion-600 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                Gợi ý từ phòng lab
              </span>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Người khác không kết nối với “sở thích du lịch” mà kết nối với trải nghiệm bạn lỡ chuyến tàu đêm hay một tiệm mì gõ bạn yêu thích lúc 2h sáng.
              </p>
            </div>
          </div>

          {/* Photo Aesthetic Card */}
          <div className="relative overflow-hidden rounded-2xl h-40 bg-charcoal shadow-sm border border-paper-border">
            <div
              className="w-full h-full bg-cover bg-center opacity-80"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80')`,
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-deep/90 via-charcoal-deep/40 to-transparent flex items-end p-5">
              <p className="font-editorial text-xs sm:text-sm text-white/90 italic leading-relaxed">
                “Sự chân thành không phải là nói hết mọi thứ, mà là nói thật một khoảnh khắc nhỏ.”
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Coach Synthesis & Suggestion (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-paper-card p-6 sm:p-8 rounded-2xl shadow-md border border-paper-border flex flex-col gap-6">
            {/* Coach Header */}
            <div className="flex items-center justify-between pb-3 border-b border-paper-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-magenta-50 border border-magenta-200 flex items-center justify-center text-magenta-600 font-bold text-sm">
                  C
                </div>
                <div>
                  <h2 className="font-editorial text-2xl font-normal text-charcoal">
                    Đánh giá & Phân tích của Coach
                  </h2>
                  <p className="text-xs text-charcoal-muted">
                    Phân tích chuyên sâu dựa trên tâm lý đối thoại tự nhiên
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-magenta-50 border border-magenta-200 text-magenta-700 text-xs font-semibold uppercase tracking-wider font-mono">
                Gợi ý tối ưu
              </span>
            </div>

            {/* Refusal or Analysis */}
            {coachReply?.refused ? (
              <SafetyBanner message={coachReply.reply} />
            ) : (
              <>
                {/* Deconstruction Checklist */}
                <div className="bg-paper-subtle p-5 rounded-xl border border-paper-border/80 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                    <span>Những điểm cần điều chỉnh trong bản nháp:</span>
                  </div>
                  <ul className="space-y-2.5">
                    <li className="flex items-start gap-2 text-xs text-charcoal leading-relaxed">
                      <MinusCircle className="w-4 h-4 text-passion-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Tránh từ ngữ sáo rỗng:</strong> Cụm từ <em>“cùng tần số”</em> hay <em>“yêu cuộc sống”</em> không cung cấp thông tin nhận diện cụ thể mà tạo cảm giác khoảng cách.
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-charcoal leading-relaxed">
                      <MinusCircle className="w-4 h-4 text-passion-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Chuyển sở thích chung thành bối cảnh:</strong> Thay vì nói chung <em>“cà phê”</em>, hãy đặc tả thói quen (uống pour-over một mình, tiệm quen cuối tuần).
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-xs text-charcoal leading-relaxed">
                      <PlusCircle className="w-4 h-4 text-magenta-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Thêm lời mời tương tác tự nhiên:</strong> Kết thúc bằng một câu hỏi gợi mở hoặc một “mồi đối thoại” (hook) dễ trả lời, không tạo áp lực.
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Suggested Bio Box */}
                <div className="bg-paper-card rounded-2xl p-6 border-2 border-magenta-200/80 shadow-sm relative overflow-hidden space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-magenta-700">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider font-mono">
                        Bản sửa gợi ý (Copy-Ready)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                        copied
                          ? 'bg-magenta-600 text-white border-magenta-600 shadow-sm'
                          : 'bg-paper-subtle text-charcoal hover:bg-paper-card border-paper-border'
                      }`}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-magenta-600" />}
                      <span>{copied ? 'Đã chép!' : 'Sao chép'}</span>
                    </button>
                  </div>

                  <blockquote className="font-editorial text-lg sm:text-xl text-charcoal italic leading-relaxed py-1">
                    “{currentSuggestion}”
                  </blockquote>

                  <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-charcoal-muted border-t border-paper-border/60">
                    <span className="flex items-center gap-1 text-magenta-700">
                      • Giàu cảm giác giác quan
                    </span>
                    <span className="flex items-center gap-1 text-passion-600">
                      • Dễ phản hồi tức thì
                    </span>
                    <span className="flex items-center gap-1 text-charcoal-soft">
                      • Không giáo điều
                    </span>
                  </div>
                </div>

                {/* Citations if available */}
                {coachReply?.citations && coachReply.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="text-xs font-mono text-charcoal-muted uppercase">Cơ sở RAG:</span>
                    {coachReply.citations.map((cite, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveCitation(cite)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-subtle hover:bg-magenta-50 border border-paper-border text-xs font-medium text-charcoal transition-all"
                      >
                        <Bookmark className="w-3 h-3 text-magenta-600" />
                        <span>{cite.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Value Metric Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-paper-card p-4 rounded-xl border border-paper-border flex items-start gap-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-magenta-50 text-magenta-600 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-charcoal">Tỉ lệ phản hồi tăng ~42%</div>
                <p className="text-xs text-charcoal-muted mt-0.5 leading-relaxed">
                  Khi bio chứa bối cảnh không gian cụ thể như quán quen hoặc thói quen đêm.
                </p>
              </div>
            </div>

            <div className="bg-paper-card p-4 rounded-xl border border-paper-border flex items-start gap-3 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-passion-50 text-passion-600 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-charcoal">Lời mời tự nhiên</div>
                <p className="text-xs text-charcoal-muted mt-0.5 leading-relaxed">
                  Hỏi về “quán ruột” giảm áp lực làm quen hơn các câu triết lý chung chung.
                </p>
              </div>
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
