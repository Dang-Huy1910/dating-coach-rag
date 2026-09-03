import React, { useEffect, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { api, ApiError } from '../api/client';
import { Citation, CoachReply, ProfileImage } from '../api/types';
import { AiStatusBadge } from '../components/AiStatusBadge';
import { CitationModal } from '../components/CitationModal';
import { CoachBubble, CoachBubbleLoading } from '../components/CoachBubble';
import { EmptyAiState } from '../components/EmptyAiState';
import { SafetyBanner } from '../components/SafetyBanner';
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
    reader.onerror = () => reject(new Error('Không đọc được ảnh.'));
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
  const { ensureSession } = useSession();
  const [handle, setHandle] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [visibleText, setVisibleText] = useState('');
  const [relationship, setRelationship] = useState('');
  const [question, setQuestion] = useState('Gợi ý opener lịch sự, không theo dõi quá.');
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
        setErrorMsg('Ảnh phải là JPEG, PNG hoặc WebP — screenshot bài/story bạn đã thấy.');
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setErrorMsg('Ảnh quá lớn, hãy gửi screenshot dưới 2MB mỗi tấm.');
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
        setErrorMsg(`Chỉ gửi tối đa ${MAX_SCREENSHOTS} ảnh mỗi lần.`);
        return current;
      }
      const accepted = next.slice(0, room);
      next.slice(room).forEach((shot) => URL.revokeObjectURL(shot.previewUrl));
      if (next.length > room) {
        setErrorMsg(`Chỉ gửi tối đa ${MAX_SCREENSHOTS} ảnh mỗi lần.`);
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
      onToast(`Đã dán ${files.length} ảnh từ clipboard.`);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onToast]);

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
        handle.trim()
          ? 'Handle chỉ để ghi nhớ. Hãy dán link YouTube/Reddit, caption, hoặc ảnh.'
          : 'Hãy dán link YouTube/Reddit, bio/caption, hoặc thêm ảnh (Ctrl+V).',
      );
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    setCoachReply(null);
    setAnalyzedAt(null);

    try {
      const sid = await ensureSession();
      const images = shots.length ? await Promise.all(shots.map(fileToProfileImage)) : [];
      const reply = await api.coachFromProfileContext(sid, {
        handle: handle.trim() || null,
        profile_url: url || null,
        visible_text: trimmedVisible,
        relationship_progress: relationship.trim() || null,
        question: question.trim() || null,
        images,
      });
      setCoachReply(reply);
      const now = new Date();
      setAnalyzedAt(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMsg(err.detail);
      } else {
        setErrorMsg('Không thể coach từ ngữ cảnh profile.');
      }
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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-16">
      <div className="space-y-2 border-b border-paper-border pb-6">
        <div className="flex items-center gap-2 text-magenta-600">
          <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-magenta-700">
            YouTube / Reddit public · Ảnh dán clipboard
          </span>
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl text-charcoal font-normal">
          Coach từ profile công khai bạn đã thấy
        </h1>
        <p className="text-sm text-charcoal-muted max-w-2xl leading-relaxed">
          Link YouTube hoặc Reddit được đọc qua API công khai. Instagram không fetch. Handle chỉ
          để ghi nhớ. Ảnh: upload hoặc Ctrl+V, bấm ảnh để thêm caption/bình luận.
        </p>
      </div>

      <div className="bg-paper-card rounded-2xl shadow-sm border border-paper-border p-6 sm:p-7 space-y-5 relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="profile-handle"
              className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5"
            >
              <AtSign className="w-4 h-4 text-magenta-600" aria-hidden="true" />
              Handle (tuỳ chọn, chưa lưu)
            </label>
            <input
              id="profile-handle"
              type="text"
              value={handle}
              maxLength={128}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@tên để ghi nhớ sitting"
              className="w-full min-h-[44px] bg-paper-subtle text-charcoal text-sm px-4 rounded-xl outline-none focus:bg-paper-card focus:ring-2 focus:ring-magenta-500/20 focus:border-magenta-500 transition-all border border-paper-border"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="profile-url"
              className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5"
            >
              <Link2 className="w-4 h-4 text-magenta-600" aria-hidden="true" />
              Link YouTube hoặc Reddit
            </label>
            <input
              id="profile-url"
              type="url"
              value={profileUrl}
              maxLength={500}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="https://youtube.com/@… hoặc reddit.com/user/…"
              className="w-full min-h-[44px] bg-paper-subtle text-charcoal text-sm px-4 rounded-xl outline-none focus:bg-paper-card focus:ring-2 focus:ring-magenta-500/20 focus:border-magenta-500 transition-all border border-paper-border"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="profile-relationship"
            className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5"
          >
            <Heart className="w-4 h-4 text-magenta-600" aria-hidden="true" />
            Mối quan hệ đang tiến triển tới đâu?
          </label>
          <textarea
            id="profile-relationship"
            rows={2}
            maxLength={2000}
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="Ví dụ: mới follow, chưa nhắn / đã chat 1 tuần / đã gặp một lần cà phê…"
            className="w-full bg-paper-subtle text-charcoal text-sm p-4 rounded-xl resize-none outline-none focus:bg-paper-card focus:ring-2 focus:ring-magenta-500/20 border border-paper-border leading-relaxed"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="profile-visible"
              className="text-xs font-bold uppercase tracking-wider text-charcoal"
            >
              Bio / caption / ghi chú thêm
            </label>
            <span className="text-[11px] text-charcoal-muted font-mono">Tuỳ chọn nếu đã có link hoặc ảnh</span>
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
            placeholder="Caption bạn thấy, hoặc ghi chú vibe — không bắt buộc nếu đã dán YouTube/Reddit hoặc ảnh."
            className="w-full bg-paper-subtle text-charcoal text-sm p-4 rounded-xl resize-none outline-none focus:bg-paper-card focus:ring-2 focus:ring-magenta-500/20 focus:border-magenta-500 transition-all border border-paper-border leading-relaxed"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label
              htmlFor="profile-shots"
              className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5"
            >
              <ImagePlus className="w-4 h-4 text-magenta-600" aria-hidden="true" />
              Ảnh bài / story
            </label>
            <span className="text-[11px] text-charcoal-muted font-mono">
              Tối đa {MAX_SCREENSHOTS} · upload hoặc Ctrl+V · bấm ảnh để ghi caption
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
                    aria-label="Xem ảnh và thêm caption"
                  >
                    <img src={shot.previewUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                  {(shot.caption || shot.comments) && (
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] font-mono bg-paper-card/90 px-1.5 py-0.5 rounded-md border border-paper-border">
                      Có ghi chú
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeShot(shot.id)}
                    className="absolute top-1.5 right-1.5 min-h-[32px] min-w-[32px] rounded-full bg-charcoal/80 text-white flex items-center justify-center hover:bg-charcoal cursor-pointer"
                    aria-label="Gỡ ảnh"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="profile-question"
            className="text-xs font-bold uppercase tracking-wider text-charcoal-muted"
          >
            Bạn muốn coach điều gì?
          </label>
          <input
            id="profile-question"
            type="text"
            maxLength={2000}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Cách mở lời lịch sự…"
            className="w-full min-h-[44px] bg-paper-subtle text-charcoal text-sm px-4 rounded-xl outline-none border border-paper-border focus:ring-2 focus:ring-magenta-500/20"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isGenerating}
          aria-busy={isGenerating}
          className="w-full min-h-[44px] bg-magenta-600 hover:bg-magenta-700 active:scale-[0.99] text-white py-3 px-6 rounded-xl text-xs sm:text-sm font-semibold shadow-glow-magenta transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>{isGenerating ? 'Đang coach…' : 'Nhờ coach'}</span>
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
            Chỉ fetch YouTube Data API và Reddit public JSON. Không Instagram, không ghép đôi, không
            lưu hồ sơ crush.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap text-xs text-charcoal-muted">
          <span className="font-mono uppercase font-bold text-magenta-700">Cơ sở RAG:</span>
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
              Hiện sau khi AI gen
            </span>
          )}
        </div>
        <AiStatusBadge
          status={coachReply && !coachReply.refused ? 'ready' : isGenerating ? 'loading' : 'idle'}
          readyLabel="Coach từ ngữ cảnh"
        />
      </div>

      {isGenerating ? (
        <CoachBubbleLoading label="Đang soạn gợi ý từ ngữ cảnh…" />
      ) : coachReply?.refused ? (
        <SafetyBanner message={coachReply.reply} />
      ) : coachReply ? (
        <div className="space-y-4">
          <CoachBubble
            reply={coachReply}
            timestamp={analyzedAt}
            subtitle="Cách tiếp cận từ ngữ cảnh"
            onCitationClick={setActiveCitation}
            onCopyReply={(text) => {
              navigator.clipboard.writeText(text).then(() => onToast('Đã sao chép nhận xét Coach!'));
            }}
          />
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
                        Phương án 0{idx + 1}
                      </span>
                      <span className="text-[11px] font-mono text-magenta-700 bg-magenta-50 px-2.5 py-0.5 rounded-full border border-magenta-200">
                        Copy-ready
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
                    <span>{copiedIndex === idx ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <EmptyAiState
          title="Chưa có coaching từ profile"
          description="Dán link YouTube/Reddit, caption, hoặc Ctrl+V ảnh bài bạn đã thấy."
          hint="Bấm từng ảnh để thêm caption và bình luận từ bài đó"
        />
      )}

      <div className="rounded-2xl bg-paper-card p-6 border border-paper-border flex items-start gap-3.5 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-magenta-50 text-magenta-600 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-charcoal">
            Phiên tạm thời
          </span>
          <p className="text-xs text-charcoal-muted leading-relaxed max-w-xl">
            Handle chưa được lưu thành hồ sơ. Làm mới phiên xóa đoạn dán và ảnh.
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
                Ảnh và ngữ cảnh bài viết
              </h2>
              <button
                type="button"
                onClick={() => setActiveShotId(null)}
                className="min-h-[44px] min-w-[44px] rounded-xl text-charcoal-muted hover:text-charcoal hover:bg-paper-subtle flex items-center justify-center"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={activeShot.previewUrl}
              alt="Screenshot đã chọn"
              className="w-full max-h-[50vh] object-contain rounded-xl border border-paper-border bg-paper-subtle"
            />
            <div className="space-y-1.5">
              <label htmlFor="shot-caption" className="text-xs font-bold uppercase tracking-wider text-charcoal">
                Caption của bài / story
              </label>
              <textarea
                id="shot-caption"
                rows={2}
                maxLength={2000}
                value={activeShot.caption}
                onChange={(e) => patchShot(activeShot.id, { caption: e.target.value })}
                placeholder="Dán caption đi kèm ảnh này…"
                className="w-full bg-paper-subtle text-sm p-3 rounded-xl border border-paper-border outline-none focus:ring-2 focus:ring-magenta-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="shot-comments" className="text-xs font-bold uppercase tracking-wider text-charcoal">
                Bình luận nổi bật trên bài
              </label>
              <textarea
                id="shot-comments"
                rows={3}
                maxLength={4000}
                value={activeShot.comments}
                onChange={(e) => patchShot(activeShot.id, { comments: e.target.value })}
                placeholder="Dán vài comment bạn thấy liên quan…"
                className="w-full bg-paper-subtle text-sm p-3 rounded-xl border border-paper-border outline-none focus:ring-2 focus:ring-magenta-500/20"
              />
            </div>
            <button
              type="button"
              onClick={() => setActiveShotId(null)}
              className="min-h-[44px] bg-magenta-600 hover:bg-magenta-700 text-white rounded-xl text-sm font-semibold"
            >
              Xong, giữ ghi chú này
            </button>
          </div>
        </div>
      )}

      <CitationModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  );
};
