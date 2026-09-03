import React, { useState, useRef, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { api, ApiError } from '../api/client';
import { Citation, CoachReply } from '../api/types';
import { CitationModal } from '../components/CitationModal';
import { SafetyBanner } from '../components/SafetyBanner';
import {
  ArrowUp,
  Bookmark,
  ChevronRight,
  Copy,
  PenTool,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  BookOpen,
  Lock,
  AlertCircle
} from 'lucide-react';

interface ChatTurn {
  id: string;
  userQuestion: string;
  timestamp: string;
  coachReply: CoachReply;
}

interface AskCoachViewProps {
  initialPrompt?: string;
  onToast: (msg: string) => void;
}

export const AskCoachView: React.FC<AskCoachViewProps> = ({ initialPrompt, onToast }) => {
  const { ensureSession, indexReady } = useSession();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [inputValue, setInputValue] = useState<string>(initialPrompt || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [likedTurns, setLikedTurns] = useState<Record<string, 'up' | 'down'>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const starterPrompts = [
    'Bio hẹn hò ngắn nên viết thế nào?',
    'Làm sao từ chối lịch sự khi không hợp vibe?',
    'Cách mở lời tự nhiên không nhạt?',
    'Khi nào nên chủ động hẹn gặp mặt ngoài đời?',
  ];

  const followUpSuggestions = [
    'Giúp tôi sửa bio hiện tại theo công thức 3 nhịp trên',
    'Người hướng nội thì nên đặt câu hỏi mở như thế nào?',
    'Có nên ghi rõ gu hoặc tiêu chuẩn tìm kiếm trong bio không?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSubmitting]);

  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText || inputValue).trim();
    if (!textToSend) {
      setErrorMessage('Hãy nhập câu hỏi trước khi gửi.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const sid = await ensureSession();
      const reply = await api.askCoach(sid, textToSend);

      const now = new Date();
      const timeString = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          userQuestion: textToSend,
          timestamp: timeString,
          coachReply: reply,
        },
      ]);
      setInputValue('');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.detail : 'Không thể gửi câu hỏi đến Coach.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      onToast('Đã sao chép nội dung vào khay nhớ tạm!');
    });
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col min-h-[calc(100vh-14rem)] pb-32">
      {/* Top Session Counter & Archival Breadcrumb */}
      <div className="w-full flex items-center justify-between py-2 mb-6 border-b border-paper-border text-xs text-charcoal-muted">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-magenta-600"></span>
          <span className="font-mono uppercase tracking-wider font-semibold text-charcoal">
            Phiên đối thoại trực tiếp • Phòng tham vấn 01
          </span>
        </div>
        <div className="flex items-center gap-2 text-charcoal-muted">
          <BookOpen className="w-3.5 h-3.5 text-magenta-600" />
          <span className="hidden sm:inline font-mono">
            RAG Corpus: Tâm lý học gắn bó & Giao tiếp phi bạo lực
          </span>
        </div>
      </div>

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
            <span className="text-xs font-bold uppercase tracking-widest text-magenta-700">
              Phòng tham vấn cá nhân
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl text-charcoal font-normal">
              Bắt đầu với một sự chân thật.
            </h2>
            <p className="text-sm text-charcoal-muted max-w-md mt-1 leading-relaxed">
              Hỏi về bio, opener, nhịp chat, ranh giới… Coach sẽ trích nguồn tâm lý học và nghiên cứu tương tác khi trả lời.
            </p>
          </div>

          {/* Starter Chips */}
          <div className="flex flex-col items-center gap-3 w-full">
            <span className="text-xs uppercase tracking-wider text-charcoal-muted font-medium">
              Gợi ý chủ đề chiêm nghiệm
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
                <div className="bg-magenta-600 text-white rounded-2xl rounded-tr-none px-5 py-3.5 shadow-sm text-sm sm:text-base leading-relaxed">
                  <p>{msg.userQuestion}</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-charcoal-muted px-1 font-mono">
                  <span>Bạn</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>
              </div>

              {/* Coach Bubble */}
              <div className="flex flex-col gap-2 max-w-[95%] sm:max-w-[90%]">
                <div className="bg-paper-card rounded-2xl rounded-tl-none p-6 sm:p-7 shadow-sm border border-paper-border relative overflow-hidden space-y-4">
                  {/* Left decorative bar */}
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-passion"></div>

                  {/* Coach Meta */}
                  <div className="flex items-center justify-between pb-2 border-b border-paper-border/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-magenta-50 border border-magenta-200 flex items-center justify-center text-magenta-700 font-bold text-xs">
                        C
                      </div>
                      <div>
                        <div className="text-xs font-bold text-charcoal">
                          Dating Coach Lâm Uyên
                        </div>
                        <div className="text-[11px] text-charcoal-muted">
                          Tham vấn cấu trúc đối thoại cá nhân
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopy(msg.coachReply.reply)}
                      className="text-charcoal-muted hover:text-magenta-600 p-1.5 rounded-lg hover:bg-paper-subtle transition-colors"
                      title="Sao chép nội dung"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Safety Refusal vs Normal Reply */}
                  {msg.coachReply.refused ? (
                    <SafetyBanner message={msg.coachReply.reply} />
                  ) : (
                    <div className="text-sm sm:text-base text-charcoal leading-relaxed space-y-3 font-normal">
                      {msg.coachReply.reply.split('\n\n').map((paragraph, pIdx) => (
                        <p key={pIdx}>{paragraph}</p>
                      ))}
                    </div>
                  )}

                  {/* Citations Row (RAG Grounding) */}
                  {msg.coachReply.citations && msg.coachReply.citations.length > 0 && (
                    <div className="pt-4 border-t border-paper-border/80 flex flex-col gap-2 bg-paper-subtle/50 -mx-6 sm:-mx-7 -mb-6 sm:-mb-7 p-4 sm:p-5 rounded-b-2xl">
                      <div className="flex items-center gap-1.5 text-magenta-700 font-mono text-xs font-semibold uppercase tracking-wider">
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Cơ sở trích xuất (RAG Grounding)</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {msg.coachReply.citations.map((cite, cIdx) => (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => setActiveCitation(cite)}
                            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper-card border border-paper-border hover:border-magenta-300 hover:bg-magenta-50 text-xs font-medium text-charcoal-soft transition-all shadow-xs cursor-pointer"
                          >
                            <BookOpen className="w-3 h-3 text-magenta-600" />
                            <span>{cite.title}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-charcoal-faint group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Turn Feedback */}
                <div className="flex items-center justify-between px-2 text-[11px] text-charcoal-muted">
                  <div className="flex items-center gap-2 font-mono">
                    <span>Coach Assistant</span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLikedTurns((prev) => ({ ...prev, [msg.id]: 'up' }))}
                      className={`p-1 rounded hover:bg-paper-card transition-colors ${
                        likedTurns[msg.id] === 'up' ? 'text-magenta-600' : 'text-charcoal-faint'
                      }`}
                      title="Hữu ích"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLikedTurns((prev) => ({ ...prev, [msg.id]: 'down' }))}
                      className={`p-1 rounded hover:bg-paper-card transition-colors ${
                        likedTurns[msg.id] === 'down' ? 'text-passion-600' : 'text-charcoal-faint'
                      }`}
                      title="Chưa chuẩn xác"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Follow-up suggestions box */}
          <div className="bg-paper-card rounded-2xl p-5 border border-paper-border shadow-xs space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
              Gợi ý chuyển nhịp tiếp theo
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
        <div className="mt-4 p-3 bg-passion-50 border border-passion-200 rounded-xl flex items-center gap-2 text-xs text-passion-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-passion-600" />
          <span>{errorMessage}</span>
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
            className="relative flex items-center w-full bg-paper-card rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-paper-border p-2 transition-shadow focus-within:shadow-glow-magenta"
          >
            <div className="hidden sm:flex items-center gap-1.5 pl-3 pr-2 text-charcoal-muted border-r border-paper-border my-1">
              <Sparkles className="w-4 h-4 text-magenta-600" />
              <span className="text-xs font-medium">Hỏi coach</span>
            </div>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Hỏi về bio, ngữ cảnh nhắn tin, hoặc một thắc mắc hẹn hò cụ thể..."
              disabled={isSubmitting || !indexReady}
              className="flex-1 w-full bg-transparent px-4 py-2 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />

            <button
              type="submit"
              disabled={isSubmitting || !inputValue.trim() || !indexReady}
              className="h-10 px-4 rounded-xl bg-magenta-600 hover:bg-magenta-700 text-white flex items-center justify-center gap-1 text-xs font-semibold transition-all disabled:opacity-40 shadow-sm cursor-pointer active:scale-95"
            >
              <span>{isSubmitting ? 'Đang đọc...' : 'Gửi'}</span>
              <ArrowUp className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between px-3 mt-2 text-[11px] text-charcoal-muted">
            <span>Nhấn Enter để gửi</span>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-magenta-600" />
              <span>Bảo mật & Phi ẩn danh cục bộ</span>
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
