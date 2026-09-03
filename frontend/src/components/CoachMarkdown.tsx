import React from 'react';
import ReactMarkdown from 'react-markdown';

interface CoachMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Renders coach reply Markdown with editorial styling.
 * Inline `code` (often used for RAG source titles) becomes soft chips.
 */
export const CoachMarkdown: React.FC<CoachMarkdownProps> = ({
  content,
  className = '',
}) => {
  const text = (content || '').trim();
  if (!text) {
    return <p className="text-sm text-charcoal-muted">Coach chưa trả nội dung.</p>;
  }

  return (
    <div className={`coach-md text-sm sm:text-[15px] text-charcoal leading-relaxed ${className}`}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 text-charcoal-soft first:text-charcoal first:font-medium">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-charcoal">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-charcoal">{children}</em>,
          ul: ({ children }) => (
            <ul className="my-3 space-y-2.5 list-none pl-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 space-y-2 list-decimal pl-5 marker:text-magenta-600 marker:font-semibold">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="relative pl-4 text-charcoal-soft before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-magenta-500">
              {children}
            </li>
          ),
          code: ({ children }) => (
            <span className="inline-flex items-center max-w-full align-middle mx-0.5 px-2 py-0.5 rounded-md bg-magenta-50 text-magenta-800 border border-magenta-100 font-mono text-[12px] sm:text-[13px] leading-snug break-words">
              {children}
            </span>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-magenta-700 underline underline-offset-2 hover:text-magenta-800"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <h3 className="font-editorial text-lg text-charcoal mb-2 mt-1">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="font-editorial text-base text-charcoal mb-2 mt-1">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-sm font-semibold text-charcoal mb-1.5 mt-1">{children}</h4>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 pl-3 border-l-2 border-magenta-400 bg-magenta-50/40 py-2 pr-3 rounded-r-lg text-charcoal-soft italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-paper-border" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};
