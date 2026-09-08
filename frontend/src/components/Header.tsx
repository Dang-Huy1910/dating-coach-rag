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
    <header className="fixed top-0 left-0 w-full z-40 bg-paper/85 backdrop-blur-xl border-b border-paper-border/80 shadow-[0_2px_12px_rgba(24,24,27,0.03)] transition-all">
      <div className="h-20 max-w-7xl 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          onClick={() => onModeChange('welcome')}
          className="flex items-center gap-3.5 text-left group transition-all cursor-pointer focus:outline-none"
        >
          <div className="relative">
            <img
              src="/logo.png"
              alt="Dating Coach Logo"
              className="w-10 h-10 rounded-2xl object-contain shadow-soft border border-paper-border/80 group-hover:scale-105 group-hover:shadow-glow-magenta transition-all duration-300"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" title="Active"></span>
          </div>
          <div>
            <div className="font-editorial text-2xl font-normal text-charcoal leading-none tracking-tight group-hover:text-magenta-700 transition-colors">
              Coach
            </div>
            <div className="text-[10px] text-charcoal-muted tracking-widest font-mono font-medium mt-1 uppercase flex items-center gap-1">
              <span>Dating Communication Lab</span>
            </div>
          </div>
        </button>

        {/* Segmented Mode Control - Desktop */}
        <nav className="hidden lg:flex items-center bg-paper-subtle/80 p-1 rounded-full border border-paper-border/90 shadow-soft">
          {modes.map((mode) => {
            const isActive = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-paper-card text-magenta-700 shadow-sm border border-paper-border font-bold'
                    : 'text-charcoal-muted hover:text-charcoal hover:bg-white/60'
                }`}
              >
                {t(mode.labelKey)}
              </button>
            );
          })}
        </nav>

        {/* Medium screens (Tablet / Small Laptop) */}
        <nav className="hidden md:flex lg:hidden items-center bg-paper-subtle/80 p-1 rounded-full border border-paper-border/90 shadow-soft overflow-x-auto max-w-[460px]">
          {modes.map((mode) => {
            const isActive = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-paper-card text-magenta-700 shadow-sm border border-paper-border font-bold'
                    : 'text-charcoal-muted hover:text-charcoal hover:bg-white/60'
                }`}
              >
                {t(mode.labelKey)}
              </button>
            );
          })}
        </nav>

        {/* Actions & Session Privacy Pill */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center p-0.5 rounded-full border border-paper-border/90 bg-paper-subtle shadow-soft"
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

          <div className="hidden xl:flex items-center gap-1.5 text-xs text-charcoal-muted bg-paper-subtle/80 px-3 py-1.5 rounded-full border border-paper-border font-mono">
            <Lock className="w-3.5 h-3.5 text-magenta-600" />
            <span>{t('header.anonymous')}</span>
          </div>

          <button
            onClick={handleReset}
            disabled={isLoading}
            className="p-2 rounded-xl text-charcoal-muted hover:text-charcoal hover:bg-paper-subtle border border-transparent hover:border-paper-border transition-all cursor-pointer disabled:opacity-50"
            title={t('header.resetTitle')}
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Mode Switcher Bar */}
      <div className="md:hidden flex items-center overflow-x-auto px-4 py-2.5 bg-paper/95 border-t border-paper-border/80 gap-1.5 scrollbar-none">
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-magenta-600 text-white font-semibold shadow-glow-magenta'
                  : 'text-charcoal-muted hover:text-charcoal bg-paper-card border border-paper-border/80'
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

