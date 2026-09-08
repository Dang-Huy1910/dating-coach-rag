import React, { useState } from 'react';
import { AppMode } from '../components/Header';
import { useI18n } from '../i18n/LocaleContext';
import {
  ArrowRight,
  ArrowUpRight,
  AtSign,
  BookOpen,
  Coffee,
  Info,
  Lightbulb,
  Lock,
  PenLine,
  Sparkles,
  Wand2,
} from 'lucide-react';

interface WelcomeViewProps {
  onSelectMode: (mode: AppMode, initialPrompt?: string) => void;
}

type ShowcaseTab = 'texting' | 'bio' | 'openers';

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onSelectMode }) => {
  const { t, locale } = useI18n();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('texting');

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

  const showcaseData: Record<
    ShowcaseTab,
    {
      before: string;
      coach: string;
      after: string;
      tag: string;
      mode: AppMode;
    }
  > = {
    texting: {
      before:
        locale === 'vi'
          ? '“Em ăn cơm chưa? Đang làm gì thế?”'
          : '“What are you up to tonight? Did you eat yet?”',
      coach:
        locale === 'vi'
          ? 'Câu hỏi thụ động dễ dồn đối phương vào cảm giác bị tra khảo hoặc ngõ cụt im lặng.'
          : 'Passive interrogation easily stalls the chat into dry, one-word replies.',
      after:
        locale === 'vi'
          ? '“Tối nay em có ghé tiệm sách cũ đường sách không? Nhìn góc ban công em đăng là anh nhớ ngay đến gu của em.”'
          : '“Did you end up stopping by that quiet bookstore cafe? The corner table in your story immediately reminded me of your aesthetic.”',
      tag: locale === 'vi' ? 'Gợi mở cảm xúc • Đầy kết nối' : 'Evocative & Contextual',
      mode: 'message',
    },
    bio: {
      before:
        locale === 'vi'
          ? '“Thích du lịch, cà phê, xem phim. Tìm người nghiêm túc, không toxic.”'
          : '“Love travel, coffee, movies. Looking for someone serious, no drama or toxic people.”',
      coach:
        locale === 'vi'
          ? 'Liệt kê sở thích chung chung kết hợp từ ngữ phòng thủ phát tín hiệu bất an từ quá khứ.'
          : 'Generic checklist coupled with defensive warnings signals unresolved past baggage.',
      after:
        locale === 'vi'
          ? '“Có điểm yếu lớn với cold brew sáng Chủ Nhật và những cuộc trò chuyện không vội vã. Tìm một người biết trân trọng sự bình yên hơn là những hứa hẹn hào nhoáng.”'
          : '“Vulnerable to slow Sunday cold brews and unhurried conversations. Drawn to quiet consistency over loud promises.”',
      tag: locale === 'vi' ? 'Có gu • Tự tin & Chân thành' : 'High-Warmth • Grounded',
      mode: 'bio',
    },
    openers: {
      before:
        locale === 'vi'
          ? '“Chào em, thấy em cười xinh quá nên anh nhắn làm quen.”'
          : '“Hey, you have a really cute smile, wanted to say hi.”',
      coach:
        locale === 'vi'
          ? 'Khen ngoại hình bề nổi là cách mở màn đối phương nhận hàng trăm lần, tỷ lệ hồi đáp dưới 15%.'
          : 'Surface compliments get lost in endless notification noise with low reply rates.',
      after:
        locale === 'vi'
          ? '“Tấm ảnh chụp ở quán đĩa than của bạn có vibe bình yên thật đấy. Bạn có tips nào để tìm được quán vắng người như trong hình không?”'
          : '“That quiet vinyl record bar in your 3rd photo has such great energy. How did you stumble across that place?”',
      tag: locale === 'vi' ? 'Tò mò chân thực • Dễ đối đáp' : 'Curiosity-Driven • Easy Hook',
      mode: 'openers',
    },
  };

  const currentShowcase = showcaseData[activeTab];

  return (
    <div className="relative w-full max-w-6xl mx-auto space-y-12">
      {/* Ambient background glows */}
      <div className="absolute -top-12 -left-20 w-96 h-96 bg-magenta-200/25 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-subtle"></div>
      <div className="absolute top-1/2 -right-16 w-80 h-80 bg-passion-200/25 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-x-12 items-start pt-2">
        {/* Left Column: Editorial Thesis & Interactive Live Demo (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-paper-card px-3.5 py-1.5 rounded-full border border-paper-border text-magenta-700 shadow-soft">
              <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse"></span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                {t('welcome.badge')}
              </span>
            </div>

            <h1 className="font-editorial text-4xl sm:text-5xl text-charcoal font-normal leading-[1.15] tracking-tight">
              {t('welcome.h1a')}
              <span className="text-gradient-passion font-medium">{t('welcome.h1b')}</span>
            </h1>

            <div className="editorial-pullquote py-2">
              <p className="font-editorial text-lg sm:text-xl text-charcoal-muted italic leading-relaxed">
                {t('welcome.quote')}
              </p>
            </div>
          </div>

          {/* Taste-Skill Live Interactive Discernment Showcase (Replaces generic stock photo) */}
          <div className="bg-paper-card rounded-2xl border border-paper-border shadow-card-elevated overflow-hidden transition-all duration-300">
            {/* Showcase Header & Tab Navigator */}
            <div className="bg-paper-subtle/80 px-4 sm:px-6 py-3 border-b border-paper-border flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-magenta-600" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-charcoal">
                  {t('welcome.showcaseTitle')}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-paper-card p-1 rounded-lg border border-paper-border/80">
                <button
                  type="button"
                  onClick={() => setActiveTab('texting')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'texting'
                      ? 'bg-magenta-600 text-white font-semibold shadow-xs'
                      : 'text-charcoal-muted hover:text-charcoal'
                  }`}
                >
                  {t('welcome.showcaseTab1')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bio')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'bio'
                      ? 'bg-magenta-600 text-white font-semibold shadow-xs'
                      : 'text-charcoal-muted hover:text-charcoal'
                  }`}
                >
                  {t('welcome.showcaseTab2')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('openers')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'openers'
                      ? 'bg-magenta-600 text-white font-semibold shadow-xs'
                      : 'text-charcoal-muted hover:text-charcoal'
                  }`}
                >
                  {t('welcome.showcaseTab3')}
                </button>
              </div>
            </div>

            {/* Showcase Body */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Draft Before */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-charcoal-muted flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-charcoal-faint"></span>
                    {t('welcome.showcaseBeforeLabel')}
                  </span>
                </div>
                <div className="bg-paper-subtle/70 rounded-xl p-3.5 border border-paper-border text-xs sm:text-sm text-charcoal-muted line-through opacity-80">
                  {currentShowcase.before}
                </div>
              </div>

              {/* Coach Insight */}
              <div className="bg-passion-50/60 rounded-xl p-3 border border-passion-200/70 flex items-start gap-2.5 text-xs text-passion-900 leading-relaxed">
                <Lightbulb className="w-4 h-4 text-passion-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold mr-1">{t('welcome.showcaseCoachAnalysis')}</span>
                  <span>{currentShowcase.coach}</span>
                </div>
              </div>

              {/* Elevated After */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-magenta-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-pink animate-pulse"></span>
                    {t('welcome.showcaseAfterLabel')}
                  </span>
                  <span className="text-[11px] font-mono bg-magenta-50 text-magenta-700 border border-magenta-200 px-2 py-0.5 rounded-full font-semibold">
                    {currentShowcase.tag}
                  </span>
                </div>
                <div className="bg-gradient-to-r from-magenta-50/50 via-white to-passion-50/30 rounded-xl p-4 border border-magenta-200/90 shadow-soft">
                  <p className="font-editorial text-sm sm:text-base text-charcoal italic leading-relaxed">
                    {currentShowcase.after}
                  </p>
                </div>
              </div>

              {/* Action Jump */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onSelectMode(currentShowcase.mode)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-magenta-700 hover:text-magenta-800 transition-colors cursor-pointer group"
                >
                  <span>
                    {activeTab === 'texting'
                      ? t('nav.message')
                      : activeTab === 'bio'
                        ? t('nav.bio')
                        : t('nav.openers')}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Triad Pillars with Editorial Depth */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <div className="bg-paper-card p-4 rounded-xl border border-paper-border shadow-soft hover:shadow-card-elevated hover:-translate-y-0.5 hover:border-magenta-300 transition-all duration-300 group">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-magenta-700 group-hover:text-magenta-800">
                {t('welcome.p1t')}
              </span>
              <p className="text-xs text-charcoal-muted mt-1.5 leading-relaxed">
                {t('welcome.p1d')}
              </p>
            </div>
            <div className="bg-paper-card p-4 rounded-xl border border-paper-border shadow-soft hover:shadow-card-elevated hover:-translate-y-0.5 hover:border-passion-300 transition-all duration-300 group">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-passion-600 group-hover:text-passion-700">
                {t('welcome.p2t')}
              </span>
              <p className="text-xs text-charcoal-muted mt-1.5 leading-relaxed">
                {t('welcome.p2d')}
              </p>
            </div>
            <div className="bg-paper-card p-4 rounded-xl border border-paper-border shadow-soft hover:shadow-card-elevated hover:-translate-y-0.5 hover:border-neon-pink transition-all duration-300 group">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-magenta-600 group-hover:text-magenta-700">
                {t('welcome.p3t')}
              </span>
              <p className="text-xs text-charcoal-muted mt-1.5 leading-relaxed">
                {t('welcome.p3d')}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Studio Card & Action Portal (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-paper-card rounded-2xl p-6 sm:p-8 shadow-card-elevated border border-paper-border relative overflow-hidden flex flex-col gap-6">
            {/* Top gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-passion"></div>

            {/* Emblem Header */}
            <div className="text-center pt-2 space-y-2 flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-magenta-50 border border-magenta-200 flex items-center justify-center text-magenta-600 shadow-soft">
                <PenLine className="w-6 h-6" />
              </div>
              <h2 className="font-editorial text-3xl font-medium text-charcoal">
                Dating Coach
              </h2>
              <p className="text-xs text-charcoal-muted max-w-xs leading-relaxed">
                {t('welcome.cardSub')}
              </p>
            </div>

            {/* Micro Indicator */}
            <div className="bg-paper-subtle rounded-xl p-3.5 flex items-center justify-between gap-3 border border-paper-border/70">
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
              <label className="text-xs font-mono font-bold text-charcoal-muted uppercase tracking-wider block">
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
                          ? 'bg-magenta-50 border-magenta-300 text-magenta-900 font-medium shadow-soft'
                          : 'bg-paper-subtle/70 border-paper-border/80 text-charcoal hover:bg-paper-subtle hover:border-paper-border'
                      }`}
                    >
                      <span className="pr-2">“{prompt}”</span>
                      <ArrowRight
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1 ${
                          isSelected ? 'text-magenta-600' : 'text-charcoal-faint'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legal Boundary Box */}
            <div className="bg-passion-50/60 border border-passion-200/70 rounded-xl p-3.5 flex items-start gap-3">
              <Info className="w-5 h-5 text-passion-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-passion-900">{t('welcome.boundTitle')}</p>
                <p className="text-[11px] text-charcoal-muted leading-relaxed">
                  {t('welcome.boundBody')}
                </p>
              </div>
            </div>

            {/* Action CTA Group */}
            <div className="space-y-2.5 pt-1 flex flex-col">
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
                onClick={() => onSelectMode('simulate')}
                className="w-full min-h-[44px] bg-magenta-50 hover:bg-magenta-100 text-magenta-900 py-3 px-6 rounded-xl text-sm font-semibold border border-magenta-200 hover:border-magenta-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-soft"
              >
                <Sparkles className="w-4 h-4 text-magenta-600" aria-hidden="true" />
                <span>{t('welcome.simulate')}</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectMode('profile')}
                className="w-full min-h-[44px] bg-paper-card hover:bg-magenta-50/50 text-charcoal py-3 px-6 rounded-xl text-sm font-semibold border border-paper-border hover:border-magenta-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <AtSign className="w-4 h-4 text-charcoal-muted" aria-hidden="true" />
                <span>{t('welcome.pastePublic')}</span>
              </button>
              <p className="text-[11px] text-charcoal-muted text-center">
                {t('welcome.noIg')}
              </p>
            </div>

            {/* Live Privacy Assurance */}
            <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-charcoal-muted">
              <Lock className="w-3.5 h-3.5 text-magenta-600" />
              <span>{t('welcome.liveSession')}</span>
            </div>
          </div>

          {/* Studio Notebook Note */}
          <div className="p-4 bg-paper-card rounded-2xl border border-paper-border flex items-center gap-3.5 shadow-soft">
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
