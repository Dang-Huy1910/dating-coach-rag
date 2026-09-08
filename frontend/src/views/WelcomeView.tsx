import React, { useState } from 'react';
import { AppMode } from '../components/Header';
import { useI18n } from '../i18n/LocaleContext';
import { ArrowRight, ArrowUpRight, AtSign, BookOpen, Coffee, Info, Lock, PenLine, Sparkles } from 'lucide-react';

interface WelcomeViewProps {
  onSelectMode: (mode: AppMode, initialPrompt?: string) => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onSelectMode }) => {
  const { t } = useI18n();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const samplePrompts = [t('welcome.prompt1'), t('welcome.prompt2'), t('welcome.prompt3')];

  const handleStart = () => {
    if (selectedIndex === 2) {
      onSelectMode('message');
    } else if (selectedIndex !== null) {
      onSelectMode('ask', samplePrompts[selectedIndex]);
    } else {
      onSelectMode('ask');
    }
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto space-y-12">
      {/* Ambient background glows */}
      <div className="absolute -top-10 -left-20 w-96 h-96 bg-magenta-200/30 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-1/2 -right-16 w-80 h-80 bg-passion-200/30 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-x-12 items-start pt-4">
        {/* Left Column: Editorial Thesis (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-paper-card px-3.5 py-1.5 rounded-full border border-paper-border text-magenta-700 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse"></span>
              <span className="text-xs font-semibold uppercase tracking-wider">
                {t('welcome.badge')}
              </span>
            </div>

            <h1 className="font-editorial text-4xl sm:text-5xl text-charcoal font-normal leading-[1.15] tracking-tight">
              {t('welcome.h1a')}<span className="text-gradient-passion font-medium">{t('welcome.h1b')}</span>
            </h1>

            <div className="relative pl-4 py-2 border-l-2 border-magenta-600">
              <p className="font-editorial text-lg sm:text-xl text-charcoal-muted italic leading-relaxed">
                {t('welcome.quote')}
              </p>
            </div>
          </div>

          {/* Editorial Visual Plate */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-charcoal aspect-[16/9] shadow-lg border border-paper-border group">
            <div 
              className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80')`
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-deep/90 via-charcoal-deep/30 to-transparent flex items-end p-6">
              <div className="backdrop-blur-md bg-white/10 px-3.5 py-1.5 rounded-lg border border-white/20 text-xs font-mono text-white/90">
                {t('welcome.plate')}
              </div>
            </div>
          </div>

          {/* Triad Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-paper-card p-4 rounded-xl border border-paper-border shadow-xs hover:border-magenta-200 transition-colors">
              <span className="text-xs font-bold uppercase tracking-wider text-magenta-700">{t('welcome.p1t')}</span>
              <p className="text-xs text-charcoal-muted mt-1 leading-relaxed">
                {t('welcome.p1d')}
              </p>
            </div>
            <div className="bg-paper-card p-4 rounded-xl border border-paper-border shadow-xs hover:border-passion-200 transition-colors">
              <span className="text-xs font-bold uppercase tracking-wider text-passion-600">{t('welcome.p2t')}</span>
              <p className="text-xs text-charcoal-muted mt-1 leading-relaxed">
                {t('welcome.p2d')}
              </p>
            </div>
            <div className="bg-paper-card p-4 rounded-xl border border-paper-border shadow-xs hover:border-neon-pink transition-colors">
              <span className="text-xs font-bold uppercase tracking-wider text-magenta-600">{t('welcome.p3t')}</span>
              <p className="text-xs text-charcoal-muted mt-1 leading-relaxed">
                {t('welcome.p3d')}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Studio Card & Action Portal (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-paper-card rounded-2xl p-6 sm:p-8 shadow-xl border border-paper-border relative overflow-hidden flex flex-col gap-6">
            {/* Top gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-passion"></div>

            {/* Emblem Header */}
            <div className="text-center pt-2 space-y-2 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-magenta-50 border border-magenta-200 flex items-center justify-center text-magenta-600 shadow-sm">
                <PenLine className="w-6 h-6" />
              </div>
              <h2 className="font-editorial text-3xl font-medium text-charcoal">
                Dating Coach
              </h2>
              <p className="text-xs text-charcoal-muted max-w-xs">
                {t('welcome.cardSub')}
              </p>
            </div>

            {/* Micro Indicator */}
            <div className="bg-paper-subtle rounded-xl p-3.5 flex items-center justify-between gap-3 border border-paper-border/60">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-magenta-600 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-charcoal">{t('welcome.ragTitle')}</span>
                  <span className="text-[11px] text-charcoal-muted">{t('welcome.ragSub')}</span>
                </div>
              </div>
              {/* Micro dots */}
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-magenta-300"></span>
                <span className="w-2 h-2 rounded-full bg-passion-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-magenta-600"></span>
              </div>
            </div>

            {/* Context Prompts */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-charcoal-muted uppercase tracking-wider block">
                {t('welcome.startFrom')}
              </label>
              <div className="flex flex-col gap-2">
                {samplePrompts.map((prompt, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`text-left px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-between group border cursor-pointer ${
                        isSelected
                          ? 'bg-magenta-50 border-magenta-300 text-magenta-800 font-medium shadow-xs'
                          : 'bg-paper-subtle/70 border-paper-border/80 text-charcoal hover:bg-paper-subtle hover:border-paper-border'
                      }`}
                    >
                      <span>“{prompt}”</span>
                      <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                        isSelected ? 'text-magenta-600' : 'text-charcoal-faint'
                      }`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legal Boundary Box */}
            <div className="bg-passion-50/70 border border-passion-200/80 rounded-xl p-3.5 flex items-start gap-3">
              <Info className="w-5 h-5 text-passion-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-passion-900">{t('welcome.boundTitle')}</p>
                <p className="text-[11px] text-charcoal-muted leading-relaxed">
                  {t('welcome.boundBody')}
                </p>
              </div>
            </div>

            {/* Action CTA */}
            <div className="space-y-2 pt-1 flex flex-col">
              <button
                type="button"
                onClick={handleStart}
                className="w-full bg-magenta-600 hover:bg-magenta-700 active:scale-[0.99] text-white py-3.5 px-6 rounded-xl text-sm font-semibold shadow-glow-magenta hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t('welcome.cta')}</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-charcoal-muted text-center">
                {t('welcome.noAccount')}
              </p>
              <button
                type="button"
                onClick={() => onSelectMode('profile')}
                className="w-full min-h-[44px] bg-paper-card hover:bg-magenta-50 text-magenta-800 py-3 px-6 rounded-xl text-sm font-semibold border border-magenta-200 hover:border-magenta-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <AtSign className="w-4 h-4" aria-hidden="true" />
                <span>{t('welcome.pastePublic')}</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectMode('simulate')}
                className="w-full min-h-[44px] bg-magenta-50/70 hover:bg-magenta-100 text-magenta-900 py-3 px-6 rounded-xl text-sm font-semibold border border-magenta-200 hover:border-magenta-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-magenta-600" aria-hidden="true" />
                <span>{t('welcome.simulate')}</span>
              </button>
              <p className="text-[11px] text-charcoal-muted text-center">
                {t('welcome.noIg')}
              </p>
            </div>

            {/* Live Privacy Assurance */}
            <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-charcoal-muted/80">
              <Lock className="w-3.5 h-3.5 text-magenta-600" />
              <span>{t('welcome.liveSession')}</span>
            </div>
          </div>

          {/* Studio Notebook Note */}
          <div className="p-4 bg-paper-card rounded-2xl border border-paper-border flex items-center gap-3.5 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-passion-50 border border-passion-200 flex items-center justify-center text-passion-600 flex-shrink-0">
              <Coffee className="w-4 h-4" />
            </div>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              <strong>{t('welcome.adviceLead')}</strong>
              {t('welcome.advice')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
