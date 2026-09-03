import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: Array<string | false | null | undefined>) {
  return twMerge(clsx(inputs));
}

interface ModePageProps {
  children: React.ReactNode;
  className?: string;
  /** chat = narrow ask thread; studio = single-column forms; wide = two-column bio/message */
  width?: 'chat' | 'studio' | 'wide';
}

/** Shared page shell for coaching modes (Bio / Message / Openers / Profile). */
export const ModePage: React.FC<ModePageProps> = ({
  children,
  className,
  width = 'studio',
}) => (
  <div
    className={cn(
      'w-full mx-auto space-y-8 pb-16',
      width === 'wide' ? 'max-w-6xl' : width === 'chat' ? 'max-w-4xl' : 'max-w-5xl',
      className,
    )}
  >
    {children}
  </div>
);

interface ModeHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  aside?: React.ReactNode;
}

/** Shared eyebrow + H1 + lead text used across coaching slides. */
export const ModeHeader: React.FC<ModeHeaderProps> = ({
  eyebrow,
  title,
  description,
  aside,
}) => (
  <header className="border-b border-paper-border pb-6">
    <div
      className={cn(
        'flex flex-col gap-4',
        aside ? 'md:flex-row md:items-end md:justify-between' : '',
      )}
    >
      <div className="space-y-2 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-neon-pink animate-pulse"
            aria-hidden="true"
          />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-magenta-700">
            {eyebrow}
          </span>
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl text-charcoal font-normal tracking-tight">
          {title}
        </h1>
        <p className="text-sm text-charcoal-muted max-w-2xl leading-relaxed">{description}</p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  </header>
);

/** Standard uppercase field label inside coaching forms. */
export const modeLabelClass =
  'text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5';

/** Muted helper label (secondary fields). */
export const modeLabelMutedClass =
  'text-xs font-bold uppercase tracking-wider text-charcoal-muted flex items-center gap-1.5';

/** Primary workbench card. */
export const modeCardClass =
  'bg-paper-card rounded-2xl shadow-sm border border-paper-border p-6 space-y-4';

/** Shared text field look. */
export const modeInputClass =
  'w-full min-h-[44px] bg-paper-subtle text-charcoal text-sm px-4 rounded-xl outline-none border border-paper-border focus:bg-paper-card focus:ring-2 focus:ring-magenta-500/20 focus:border-magenta-500 transition-all';

export const modeTextareaClass =
  'w-full bg-paper-subtle text-charcoal text-sm p-4 rounded-xl resize-none outline-none border border-paper-border leading-relaxed focus:bg-paper-card focus:ring-2 focus:ring-magenta-500/20 focus:border-magenta-500 transition-all';

export const modePrimaryButtonClass =
  'w-full min-h-[44px] bg-magenta-600 hover:bg-magenta-700 active:scale-[0.99] text-white py-3 px-6 rounded-xl text-xs sm:text-sm font-semibold shadow-glow-magenta transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
