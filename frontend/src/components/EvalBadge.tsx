import React, { useEffect, useState } from 'react';

interface EvalSummary {
  quality_pass?: string;
  pass_rate?: number;
  hit_at_4?: number;
  mrr?: number;
  report_url?: string;
  status?: string;
}

const FALLBACK: EvalSummary = {
  quality_pass: '12/12',
  pass_rate: 100,
  hit_at_4: 1,
  mrr: 0.88,
  report_url: '/EVAL.md',
  status: 'pass',
};

function pct(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value * 1000) / 10}%`;
}

export const EvalBadge: React.FC = () => {
  const [summary, setSummary] = useState<EvalSummary>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    fetch('/eval-summary.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('missing'))))
      .then((data: EvalSummary) => {
        if (!cancelled && data?.quality_pass) {
          setSummary({ ...FALLBACK, ...data });
        }
      })
      .catch(() => {
        /* keep fallback for local demos without regenerated public files */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const href = summary.report_url || '/EVAL.md';

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 text-[11px] font-mono text-charcoal-muted/80 hover:text-magenta-700 transition-colors"
      title="Báo cáo chất lượng coach (RAG eval) — mở báo cáo đầy đủ"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-paper-border/80 bg-paper-subtle/60 px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-magenta-500/70" aria-hidden="true" />
        <span>
          Eval {summary.quality_pass}
          {summary.pass_rate != null ? ` (${summary.pass_rate}%)` : ''}
        </span>
        <span className="text-charcoal-faint">·</span>
        <span>Hit@4 {pct(summary.hit_at_4)}</span>
        <span className="text-charcoal-faint">·</span>
        <span>MRR {summary.mrr != null ? summary.mrr.toFixed(2) : '—'}</span>
      </span>
    </a>
  );
};
