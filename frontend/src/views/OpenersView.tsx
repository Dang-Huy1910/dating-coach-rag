import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { api, ApiError } from '../api/client';
import { Citation, CoachReply } from '../api/types';
import { CitationModal } from '../components/CitationModal';
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
  Smile,
  Sparkles
} from 'lucide-react';

interface OpenersViewProps {
  onToast: (msg: string) => void;
  onNavigateToMessage?: () => void;
}

export const OpenersView: React.FC<OpenersViewProps> = ({ onToast, onNavigateToMessage }) => {
  const { ensureSession } = useSession();
  const [contextInput, setContextInput] = useState<string>(
    'App hẹn hò, bio đối phương nói thích chạy bộ và đang luyện tập cho giải bán marathon 21km'
  );
  const [tone, setTone] = useState<string>('warm');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [coachReply, setCoachReply] = useState<CoachReply | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fallbackOpeners = [
    {
      label: 'Tập trung trải nghiệm',
      tag: 'Thân thiện',
      text: 'Chào bạn, nhìn cự ly 21km thấy nể thật đấy! Bạn thường chạy buổi sáng sớm hay chiều tối để tránh nóng vậy?',
      reason: 'Công nhận nỗ lực rèn luyện của đối phương mà không tâng bốc thái quá, đồng thời đặt câu hỏi mở về thói quen hàng ngày rất dễ trả lời.',
      safety: 'Độ an toàn: 100%',
    },
    {
      label: 'Tò mò & hài hước nhẹ',
      tag: 'Dí dỏm',
      text: 'Đang luyện 21km thì động lực lớn nhất khi chạy là gì: playlist nhạc hay phần thưởng sau vạch đích?',
      reason: 'Tạo một tình huống so sánh dí dỏm, mở ra cơ hội chia sẻ về sở thích âm nhạc hoặc món ăn yêu thích mà không tạo áp lực chất vấn.',
      safety: 'Độ kích hoạt chuyện: Cao',
    },
  ];

  const handleGenerate = async () => {
    if (!contextInput.trim()) {
      setErrorMsg('Vui lòng nhập bối cảnh hoặc chi tiết profile đối phương.');
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);

    try {
      const sid = await ensureSession();
      // Embed tone hint in context if needed
      const fullPrompt = `${contextInput.trim()} (Phong cách: ${tone})`;
      const reply = await api.suggestOpeners(sid, fullPrompt);
      setCoachReply(reply);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : 'Không thể tạo gợi ý câu mở đầu.';
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      onToast('Đã sao chép câu mở đầu!');
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  // Determine display list: from API openers array or fallback
  const displayOpeners = coachReply?.openers && coachReply.openers.length > 0
    ? coachReply.openers.map((op, idx) => ({
        label: `Phương án 0${idx + 1}`,
        tag: idx === 0 ? 'Thân thiện / Trực tiếp' : 'Dí dỏm / Tò mò',
        text: op,
        reason: 'Khởi đầu từ chi tiết có thật trong hồ sơ, giảm áp lực chào hỏi một chiều.',
        safety: 'Đã kiểm định không thao túng',
      }))
    : fallbackOpeners;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2 border-b border-paper-border pb-6">
        <div className="flex items-center gap-2 text-magenta-600">
          <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse"></span>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-magenta-700">
            Chế độ phân tích & kiến tạo • Thấu cảm hội thoại
          </span>
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl text-charcoal font-normal">
          Gợi ý Opener tự nhiên & khơi gợi kết nối
        </h1>
        <p className="text-sm text-charcoal-muted max-w-2xl leading-relaxed">
          Thay vì những lời chào rập khuôn, hãy bắt đầu từ một chi tiết nhỏ có thật. Một câu mở đầu tinh tế giúp đối phương cảm thấy được chú ý lắng nghe thay vì bị đánh giá.
        </p>
      </div>

      {/* Workbench Card */}
      <div className="bg-paper-card rounded-2xl shadow-sm border border-paper-border p-6 sm:p-7 space-y-5 relative overflow-hidden">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="opener-context"
              className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 text-magenta-600" />
              <span>Ngữ cảnh hoặc thông tin từ profile</span>
            </label>
            <span className="text-[11px] text-charcoal-muted font-mono">Chi tiết đối phương chia sẻ</span>
          </div>

          <textarea
            id="opener-context"
            rows={3}
            value={contextInput}
            onChange={(e) => setContextInput(e.target.value)}
            placeholder="Ví dụ: App hẹn hò, ảnh chụp quán cà phê sách, bio thích leo núi..."
            className="w-full bg-paper-subtle text-charcoal text-sm p-4 rounded-xl resize-none outline-none focus:bg-paper-card focus:ring-2 focus:ring-magenta-500/20 focus:border-magenta-500 transition-all border border-paper-border leading-relaxed"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-1.5">
            <label htmlFor="opener-tone" className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
              Phong cách tiếp cận
            </label>
            <div className="relative">
              <select
                id="opener-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full appearance-none bg-paper-subtle text-charcoal text-xs sm:text-sm font-medium rounded-xl py-3 px-4 border border-paper-border outline-none cursor-pointer pr-10 hover:border-magenta-300 transition-all"
              >
                <option value="warm">Thân thiện / Nhẹ nhàng</option>
                <option value="playful">Hài hước nhẹ / Tò mò</option>
                <option value="thoughtful">Đồng cảm sâu / Lắng nghe</option>
                <option value="direct">Trực tiếp / Gọn gàng</option>
              </select>
              <ChevronDown className="w-4 h-4 text-charcoal-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-magenta-600 hover:bg-magenta-700 active:scale-[0.99] text-white py-3 px-6 rounded-xl text-xs sm:text-sm font-semibold shadow-glow-magenta transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Đang phân tích dữ liệu...' : 'Gợi ý câu mở đầu'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-passion-50 text-passion-800 text-xs rounded-xl border border-passion-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-passion-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Boundary Notice */}
        <div className="flex items-center gap-2.5 bg-passion-50/70 rounded-xl p-3 border border-passion-200/80 text-xs text-passion-900">
          <Info className="w-4 h-4 text-passion-600 flex-shrink-0" />
          <p className="leading-relaxed">
            <strong>Lưu ý:</strong> Coach không tìm hay xếp hạng người thật. Mọi phân tích nhằm rèn luyện tư duy trò chuyện chân thành và tôn trọng ranh giới.
          </p>
        </div>
      </div>

      {/* RAG Grounding Tags */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-charcoal-muted">
        <span className="font-mono uppercase font-bold text-magenta-700">Cơ sở tâm lý RAG:</span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-card border border-paper-border text-charcoal font-medium">
          <BookOpen className="w-3.5 h-3.5 text-magenta-600" />
          <span>Nghệ thuật đặt câu hỏi mở</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-card border border-paper-border text-charcoal font-medium">
          <Shield className="w-3.5 h-3.5 text-passion-500" />
          <span>Khởi động hội thoại tự nhiên</span>
        </span>
      </div>

      {/* Safety Refusal vs Generated Opener Cards */}
      {coachReply?.refused ? (
        <SafetyBanner message={coachReply.reply} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-editorial text-2xl font-normal text-charcoal flex items-center gap-2">
              <span>Gợi ý đã tối ưu</span>
              <span className="text-xs font-mono font-normal text-charcoal-muted">
                ({displayOpeners.length} phương án)
              </span>
            </h2>
            <span className="text-xs text-magenta-700 font-semibold font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-neon-pink"></span>
              Đã kiểm định không thao túng
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {displayOpeners.map((opener, idx) => (
              <div
                key={idx}
                className="bg-paper-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-paper-border flex flex-col justify-between gap-4 group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-magenta-50 text-magenta-700 font-bold text-xs flex items-center justify-center border border-magenta-200">
                        0{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                        {opener.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-charcoal-muted bg-paper-subtle px-2.5 py-0.5 rounded-full border border-paper-border">
                      {opener.tag}
                    </span>
                  </div>

                  <div className="p-4 bg-paper-subtle rounded-xl border border-paper-border/80">
                    <p className="font-editorial text-base sm:text-lg text-charcoal italic leading-relaxed">
                      “{opener.text}”
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-charcoal-muted">Vì sao hiệu quả?</span>
                    <p className="text-xs text-charcoal-muted leading-relaxed">
                      {opener.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-paper-border/60">
                  <div className="flex items-center gap-1.5 text-xs text-charcoal-muted">
                    <Smile className="w-4 h-4 text-magenta-600" />
                    <span>{opener.safety}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(opener.text, idx)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      copiedIndex === idx
                        ? 'bg-magenta-600 text-white border-magenta-600 shadow-sm'
                        : 'bg-paper-subtle hover:bg-paper-card text-charcoal border-paper-border'
                    }`}
                  >
                    {copiedIndex === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-magenta-600" />}
                    <span>{copiedIndex === idx ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Golden Rule Card */}
      <div className="rounded-2xl bg-paper-card p-6 border border-paper-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-magenta-50 text-magenta-600 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal">
              Quy tắc vàng của Coach
            </span>
            <p className="text-xs text-charcoal-muted leading-relaxed max-w-xl">
              Nếu đối phương phản hồi ngắn gọn hoặc chưa nhiệt tình, hãy giữ sự thư thái. Đừng vội vàng gửi dồn dập tin nhắn thứ hai để chứng minh bản thân.
            </p>
          </div>
        </div>

        {onNavigateToMessage && (
          <button
            type="button"
            onClick={onNavigateToMessage}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-magenta-700 hover:text-magenta-800 transition-colors cursor-pointer"
          >
            <span>Xem mẹo duy trì nhịp trò chuyện</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* Citation Modal */}
      <CitationModal
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
};

