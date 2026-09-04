import React, { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { KnowledgeFormat, KnowledgeSourceInfo } from '../api/types';
import {
  ModeHeader,
  ModePage,
  modeCardClass,
  modePrimaryButtonClass,
} from '../components/ModePage';
import {
  AlertCircle,
  BookOpen,
  FileUp,
  Library,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface KnowledgeViewProps {
  onToast: (msg: string) => void;
}

function formatBytes(value?: number | null): string {
  if (value == null) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({ onToast }) => {
  const [formats, setFormats] = useState<KnowledgeFormat[]>([]);
  const [sources, setSources] = useState<KnowledgeSourceInfo[]>([]);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [indexReady, setIndexReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await api.listKnowledge();
    setFormats(data.formats);
    setSources(data.sources);
    setChunkCount(data.chunk_count ?? null);
    setIndexReady(data.index_ready);
  }, []);

  useEffect(() => {
    refresh().catch((err: unknown) => {
      const msg = err instanceof ApiError ? err.detail : 'Không tải được thư viện.';
      setErrorMsg(msg);
    });
  }, [refresh]);

  const onUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setErrorMsg(null);
    setBusy(true);
    try {
      for (const file of Array.from(fileList)) {
        const result = await api.uploadKnowledge(file);
        onToast(`Đã thêm “${result.source.title}” · ${result.chunk_count} chunks`);
      }
      await refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof ApiError ? err.detail : 'Upload thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (source: KnowledgeSourceInfo) => {
    if (source.kind !== 'upload') return;
    if (!window.confirm(`Xóa tài liệu upload “${source.title}” khỏi RAG?`)) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await api.deleteKnowledge(source.source_id);
      onToast('Đã xóa upload và dựng lại index.');
      await refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof ApiError ? err.detail : 'Không xóa được.');
    } finally {
      setBusy(false);
    }
  };

  const onReindex = async () => {
    setBusy(true);
    setErrorMsg(null);
    try {
      const result = await api.reindexKnowledge();
      onToast(`Reindex xong · ${result.chunk_count} chunks`);
      await refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof ApiError ? err.detail : 'Reindex thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const curated = sources.filter((s) => s.kind === 'curated');
  const uploaded = sources.filter((s) => s.kind === 'upload');

  return (
    <ModePage>
      <ModeHeader
        eyebrow="Thư viện RAG"
        title="Thêm tài liệu vào knowledge base"
        description="Tải hướng dẫn / ghi chú coaching của bạn. Hệ thống trích chữ, chia chunk và đưa vào FAISS cùng bộ tài liệu gốc."
        aside={
          <div className="inline-flex items-center gap-2 bg-paper-card px-3.5 py-1.5 rounded-full border border-paper-border shadow-xs text-xs font-mono text-charcoal">
            <Library className="w-3.5 h-3.5 text-magenta-600" aria-hidden="true" />
            <span>
              {indexReady ? 'Index sẵn sàng' : 'Index chưa sẵn'}
              {chunkCount != null ? ` · ${chunkCount} chunks` : ''}
            </span>
          </div>
        }
      />

      <div className={`${modeCardClass} space-y-5`}>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-charcoal">
            Định dạng được hỗ trợ
          </p>
          <div className="flex flex-wrap gap-2">
            {formats.map((fmt) => (
              <span
                key={fmt.ext}
                title={fmt.note}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-magenta-50 border border-magenta-200 text-xs font-medium text-charcoal"
              >
                <span className="font-mono text-magenta-700">{fmt.ext}</span>
                <span>{fmt.label}</span>
              </span>
            ))}
          </div>
          <p className="text-[11px] text-charcoal-muted leading-relaxed">
            Tối đa 5MB / file. PDF cần có lớp chữ (chưa OCR ảnh scan). Upload không ghi đè bộ
            curated 01–07.
          </p>
        </div>

        <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-magenta-300 bg-magenta-50/40 px-6 py-10 cursor-pointer hover:bg-magenta-50/70 transition-colors">
          <FileUp className="w-8 h-8 text-magenta-600" aria-hidden="true" />
          <span className="text-sm font-semibold text-charcoal">
            Chọn hoặc kéo thả tài liệu để thêm vào RAG
          </span>
          <span className="text-[11px] text-charcoal-muted font-mono">
            .md · .txt · .pdf · .docx · .html · .csv
          </span>
          <input
            type="file"
            className="sr-only"
            accept=".md,.markdown,.txt,.pdf,.docx,.html,.htm,.csv,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/html,text/csv"
            multiple
            disabled={busy}
            onChange={(e) => {
              void onUpload(e.target.files);
              e.target.value = '';
            }}
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onReindex()}
            disabled={busy}
            className={modePrimaryButtonClass + ' sm:w-auto sm:px-5'}
          >
            <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Dựng lại index</span>
          </button>
        </div>

        {errorMsg && (
          <div
            className="p-3 bg-passion-50 text-passion-800 text-xs rounded-xl border border-passion-200 flex items-center gap-2"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-passion-600 flex-shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      <section className={`${modeCardClass} space-y-4`}>
        <h2 className="font-editorial text-2xl text-charcoal">Tài liệu curated</h2>
        <ul className="space-y-2">
          {curated.map((source) => (
            <li
              key={source.source_id}
              className="flex items-start justify-between gap-3 rounded-xl border border-paper-border bg-paper-subtle/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-charcoal truncate">{source.title}</p>
                <p className="text-[11px] font-mono text-charcoal-muted truncate">{source.path}</p>
              </div>
              <span className="text-[11px] font-mono text-charcoal-muted shrink-0">
                {formatBytes(source.bytes)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${modeCardClass} space-y-4`}>
        <h2 className="font-editorial text-2xl text-charcoal">Tài liệu bạn tải lên</h2>
        {uploaded.length === 0 ? (
          <p className="text-sm text-charcoal-muted">Chưa có upload. Thêm file ở khung phía trên.</p>
        ) : (
          <ul className="space-y-2">
            {uploaded.map((source) => (
              <li
                key={source.source_id}
                className="flex items-start justify-between gap-3 rounded-xl border border-magenta-200/80 bg-magenta-50/40 px-4 py-3"
              >
                <div className="min-w-0 flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-magenta-600 mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-charcoal truncate">{source.title}</p>
                    <p className="text-[11px] font-mono text-charcoal-muted truncate">
                      {source.path}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-charcoal-muted">
                    {formatBytes(source.bytes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void onDelete(source)}
                    disabled={busy}
                    className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-passion-200 text-passion-700 hover:bg-passion-50 cursor-pointer disabled:opacity-50"
                    aria-label={`Xóa ${source.title}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ModePage>
  );
};
