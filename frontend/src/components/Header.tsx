import React from 'react';
import { useSession } from '../context/SessionContext';
import { useI18n } from '../i18n/LocaleContext';
import { Lock, RotateCcw } from 'lucide-react';

export type AppMode = 'welcome' | 'ask' | 'bio' | 'message' | 'openers' | 'profile' | 'simulate' | 'library';

interface HeaderProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onResetSessionNotify?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentMode, onModeChange, onResetSessionNotify }) => {
  const { resetSession, isLoading } = useSession();
  const { locale, setLocale, t } = useI18n();

  const handleReset = async () => {
    if (window.confirm(t('header.resetConfirm'))) {
      await resetSession();
      if (onResetSessionNotify) {
        onResetSessionNotify();
      }
    }
  };

  const modes: { id: AppMode; labelKey: string }[] = [
    { id: 'welcome', labelKey: 'nav.welcome' },
    { id: 'ask', labelKey: 'nav.ask' },
    { id: 'bio', labelKey: 'nav.bio' },
    { id: 'message', labelKey: 'nav.message' },
    { id: 'openers', labelKey: 'nav.openers' },
    { id: 'profile', labelKey: 'nav.profile' },
    { id: 'simulate', labelKey: 'nav.simulate' },
    { id: 'library', labelKey: 'nav.library' },
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
                {t(mode.labelKey)}
              </button>
            );
          })}
        </nav>

        {/* Actions & Session Privacy Pill */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center p-0.5 rounded-full border border-paper-border bg-paper-subtle shadow-xs"
            role="group"
            aria-label={t('header.langLabel')}
          >
            <button
              type="button"
              onClick={() => setLocale('vi')}
              className={`min-w-[2.25rem] px-2 py-1 rounded-full text-[11px] font-mono font-bold tracking-wide transition-all cursor-pointer ${
                locale === 'vi'
                  ? 'bg-paper-card text-magenta-700 shadow-sm border border-paper-border/80'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
              aria-pressed={locale === 'vi'}
            >
              {t('header.langVi')}
            </button>
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`min-w-[2.25rem] px-2 py-1 rounded-full text-[11px] font-mono font-bold tracking-wide transition-all cursor-pointer ${
                locale === 'en'
                  ? 'bg-paper-card text-magenta-700 shadow-sm border border-paper-border/80'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
              aria-pressed={locale === 'en'}
            >
              {t('header.langEn')}
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-xs text-charcoal-muted bg-paper-subtle px-3 py-1.5 rounded-full border border-paper-border font-mono">
            <Lock className="w-3.5 h-3.5 text-magenta-600" />
            <span>{t('header.anonymous')}</span>
          </div>

          <button
            onClick={handleReset}
            disabled={isLoading}
            className="p-2 rounded-xl text-charcoal-muted hover:text-charcoal hover:bg-paper-subtle border border-transparent hover:border-paper-border transition-all"
            title={t('header.resetTitle')}
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
              {t(mode.labelKey)}
            </button>
          );
        })}
      </div>
    </header>
  );
};

