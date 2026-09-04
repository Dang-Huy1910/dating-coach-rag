import React from 'react';
import { useSession } from '../context/SessionContext';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const HealthNotice: React.FC = () => {
  const { indexReady, isBackendConnected, checkHealth, isLoading } = useSession();

  if (isBackendConnected && indexReady) {
    return null;
  }

  return (
    <div className="w-full bg-passion-50 border-b border-passion-200 py-2.5 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-passion-900">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-passion-600 flex-shrink-0" />
          <span>
            {!isBackendConnected
              ? 'Không thể kết nối đến máy chủ FastAPI (http://127.0.0.1:8000). Vui lòng kiểm tra backend.'
              : 'Thư viện kiến thức RAG chưa sẵn sàng. Hãy đảm bảo đã chạy bước nạp tri thức (ingest).'}
          </span>
        </div>
        <button
          onClick={() => checkHealth()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-passion-100 hover:bg-passion-200 text-passion-800 font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Thử lại</span>
        </button>
      </div>
    </div>
  );
};

