import React, { useState } from 'react';
import { SessionProvider } from './context/SessionContext';
import { Header, AppMode } from './components/Header';
import { HealthNotice } from './components/HealthNotice';
import { Toast } from './components/Toast';
import { WelcomeView } from './views/WelcomeView';
import { AskCoachView } from './views/AskCoachView';
import { BioStudioView } from './views/BioStudioView';
import { MessageView } from './views/MessageView';
import { OpenersView } from './views/OpenersView';

const AppContent: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>('welcome');
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleSelectMode = (mode: AppMode, prompt?: string) => {
    if (prompt) {
      setInitialPrompt(prompt);
    }
    setCurrentMode(mode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCurrentView = () => {
    switch (currentMode) {
      case 'welcome':
        return <WelcomeView onSelectMode={handleSelectMode} />;
      case 'ask':
        return <AskCoachView initialPrompt={initialPrompt} onToast={showToast} />;
      case 'bio':
        return <BioStudioView onToast={showToast} />;
      case 'message':
        return <MessageView onToast={showToast} />;
      case 'openers':
        return (
          <OpenersView
            onToast={showToast}
            onNavigateToMessage={() => handleSelectMode('message')}
          />
        );
      default:
        return <WelcomeView onSelectMode={handleSelectMode} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-paper text-charcoal selection:bg-magenta-100 selection:text-magenta-800">
      <Header
        currentMode={currentMode}
        onModeChange={(mode) => handleSelectMode(mode)}
        onResetSessionNotify={() => showToast('Đã khởi tạo phiên tư vấn mới.')}
      />

      <div className="pt-28 sm:pt-24 w-full flex-1">
        <HealthNotice />
        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
          {renderCurrentView()}
        </main>
      </div>

      <Toast message={toastMessage} />

      {/* Footer */}
      <footer className="w-full bg-paper-card border-t border-paper-border py-10 shadow-[0_-1px_8px_rgba(0,0,0,0.02)]">
        <div className="max-w-4xl mx-auto px-4 text-center flex flex-col items-center gap-2">
          <p className="font-editorial text-lg sm:text-xl text-charcoal italic leading-relaxed">
            “Chậm lại để hiểu mình trước khi bước vào thế giới của người khác.”
          </p>
          <p className="text-xs text-charcoal-muted font-mono mt-1">
            © Coach Dating Communication Lab. RAG-grounded relationship discernment workspace.
          </p>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
};

export default App;

