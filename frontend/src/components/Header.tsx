import React from 'react';
import { useSession } from '../context/SessionContext';
import { Lock, RotateCcw } from 'lucide-react';

export type AppMode = 'welcome' | 'ask' | 'bio' | 'message' | 'openers' | 'profile' | 'simulate' | 'library';

interface HeaderProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onResetSessionNotify?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentMode, onModeChange, onResetSessionNotify }) => {
  const { resetSession, isLoading } = useSession();

  const handleReset = async () => {
    if (window.confirm('Bạn có muốn bắt đầu một phiên làm việc mới? Toàn bộ nội dung trao đổi hiện tại sẽ được làm mới.')) {
      await resetSession();
      if (onResetSessionNotify) {
        onResetSessionNotify();
      }
    }
  };

  const modes: { id: AppMode; label: string }[] = [
    { id: 'welcome', label: 'Giới thiệu' },
    { id: 'ask', label: 'Hỏi coach' },
    { id: 'bio', label: 'Sửa bio' },
    { id: 'message', label: 'Phân tích tin' },
    { id: 'openers', label: 'Gợi ý opener' },
    { id: 'profile', label: 'Dán profile' },
    { id: 'simulate', label: 'Luyện nhắn tin' },
    { id: 'library', label: 'Thư viện' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-paper/90 backdrop-blur-md border-b border-paper-border shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          onClick={() => onModeChange('welcome')}
          className="flex items-center gap-3 text-left group transition-all"
        >
          <img
            src="/logo.png"
            alt="Dating Coach Logo"
            className="w-10 h-10 rounded-xl object-contain shadow-sm border border-paper-border group-hover:scale-105 group-hover:shadow-glow-magenta transition-all"
          />
          <div>
            <div className="font-editorial text-2xl font-normal text-charcoal leading-none tracking-tight group-hover:text-magenta-700 transition-colors">
              Coach
            </div>
            <div className="text-[11px] text-charcoal-muted tracking-wide font-medium mt-0.5 uppercase">
              Dating Communication Lab
            </div>
          </div>
        </button>

        {/* Segmented Mode Control */}
        <nav className="hidden md:flex items-center bg-paper-subtle p-1 rounded-full border border-paper-border shadow-xs">
          {modes.map((mode) => {
            const isActive = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-paper-card text-magenta-700 shadow-sm border border-paper-border/80'
                    : 'text-charcoal-muted hover:text-charcoal hover:bg-paper/50'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </nav>

        {/* Actions & Session Privacy Pill */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-charcoal-muted bg-paper-subtle px-3 py-1.5 rounded-full border border-paper-border font-mono">
            <Lock className="w-3.5 h-3.5 text-magenta-600" />
            <span>Phiên ẩn danh</span>
          </div>

          <button
            onClick={handleReset}
            disabled={isLoading}
            className="p-2 rounded-xl text-charcoal-muted hover:text-charcoal hover:bg-paper-subtle border border-transparent hover:border-paper-border transition-all"
            title="Làm mới phiên chat"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Mode Switcher Bar */}
      <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 bg-paper-subtle/70 border-t border-paper-border gap-1.5 scrollbar-none">
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap font-medium transition-all ${
                isActive
                  ? 'bg-magenta-600 text-white shadow-xs'
                  : 'text-charcoal-muted hover:text-charcoal bg-paper-card border border-paper-border'
              }`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};

