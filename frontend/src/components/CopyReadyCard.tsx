import React from 'react';
import { Check, CheckCircle, Copy, ShieldCheck } from 'lucide-react';

interface CopyReadyCardProps {
  title?: string;
  content: string;
  isLoading?: boolean;
  emptyText?: string;
  onCopy: () => void;
  copied?: boolean;
  footerHint?: string;
}

export const CopyReadyCard: React.FC<CopyReadyCardProps> = ({
  title = 'Bản sửa gợi ý (Copy-Ready)',
  content,
  isLoading = false,
  emptyText = 'Nội dung copy-ready sẽ hiện ở đây sau khi Coach AI trả lời.',
  onCopy,
  copied = false,
  footerHint,
}) => (
  <section className="bg-paper-card rounded-2xl p-6 sm:p-7 shadow-md border-2 border-magenta-200/90 relative overflow-hidden space-y-4">
    <div
      className="pointer-events-none absolute -right-8 -top-8 w-28 h-28 rounded-full bg-magenta-100/50 blur-2xl"
      aria-hidden="true"
    />
    <div className="flex items-center justify-between gap-3 flex-wrap relative">
      <div className="flex items-center gap-2 text-magenta-700">
        <ShieldCheck className="w-4 h-4" aria-hidden="true" />
        <h3 className="text-xs font-bold uppercase tracking-wider font-mono">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        <span className="bg-magenta-50 text-magenta-700 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-magenta-200">
          Copy-ready
        </span>
        <button
          type="button"
          onClick={onCopy}
          disabled={!content || isLoading}
          aria-disabled={!content || isLoading}
          className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            copied
              ? 'bg-magenta-600 text-white border-magenta-600 shadow-sm'
              : 'bg-magenta-600 hover:bg-magenta-700 text-white border-transparent shadow-glow-magenta'
          }`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{copied ? 'Đã chép!' : 'Sao chép'}</span>
        </button>
      </div>
    </div>

    <div className="bg-paper-subtle rounded-xl p-4 sm:p-5 border border-paper-border min-h-[6rem] relative">
      {isLoading ? (
        <div className="space-y-2.5 py-1" role="status" aria-label="Đang soạn nội dung">
          <div className="h-3 w-full rounded-full bg-paper-border/70 animate-pulse" />
          <div className="h-3 w-5/6 rounded-full bg-paper-border/60 animate-pulse" />
          <div className="h-3 w-2/3 rounded-full bg-paper-border/50 animate-pulse" />
        </div>
      ) : content ? (
        <blockquote className="font-editorial text-base sm:text-lg text-charcoal italic leading-relaxed">
          “{content}”
        </blockquote>
      ) : (
        <div className="flex items-start gap-2 text-sm text-charcoal-muted leading-relaxed">
          <CheckCircle className="w-4 h-4 text-magenta-500 shrink-0 mt-0.5 opacity-60" aria-hidden="true" />
          <p>{emptyText}</p>
        </div>
      )}
    </div>

    {footerHint && <p className="text-xs text-charcoal-muted relative">{footerHint}</p>}
  </section>
);
