import React, { useState } from 'react';
import { SessionProvider, useSession } from './context/SessionContext';
import { Header, AppMode } from './components/Header';
import { DisclaimerBar } from './components/DisclaimerBar';
import { EvalBadge } from './components/EvalBadge';
import { HealthNotice } from './components/HealthNotice';
import { Toast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WelcomeView } from './views/WelcomeView';
import { AskCoachView } from './views/AskCoachView';
import { BioStudioView } from './views/BioStudioView';
import { MessageView } from './views/MessageView';
import { OpenersView } from './views/OpenersView';
import { ProfileContextView } from './views/ProfileContextView';
import { KnowledgeView } from './views/KnowledgeView';
import { ChatSimulationView } from './views/ChatSimulationView';

const AppContent: React.FC = () => {
  const { sessionId } = useSession();
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
    let view: React.ReactNode;
    switch (currentMode) {
      case 'welcome':
        view = <WelcomeView onSelectMode={handleSelectMode} />;
        break;
      case 'ask':
        view = <AskCoachView initialPrompt={initialPrompt} onToast={showToast} />;
        break;
      case 'bio':
        view = <BioStudioView onToast={showToast} />;
        break;
      case 'message':
        view = <MessageView onToast={showToast} />;
        break;
      case 'openers':
        view = (
          <OpenersView
            onToast={showToast}
            onNavigateToMessage={() => handleSelectMode('message')}
          />
        );
        break;
      case 'profile':
        view = <ProfileContextView key={sessionId ?? 'none'} onToast={showToast} />;
        break;
      case 'library':
        view = <KnowledgeView onToast={showToast} />;
        break;
      case 'simulate':
        view = <ChatSimulationView onToast={showToast} />;
        break;
      default:
        view = <WelcomeView onSelectMode={handleSelectMode} />;
    }
    return (
      <ErrorBoundary key={currentMode} label={currentMode}>
        {view}
      </ErrorBoundary>
    );
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-paper text-charcoal selection:bg-magenta-100 selection:text-magenta-800">
      <Header
        currentMode={currentMode}
        onModeChange={(mode) => handleSelectMode(mode)}
        onResetSessionNotify={() => showToast('Đã khởi tạo phiên tư vấn mới.')}
      />

      <div className="pt-24 sm:pt-20 w-full flex-1">
        <HealthNotice />
        <main className="w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
          {renderCurrentView()}
        </main>
      </div>

      <Toast message={toastMessage} />

      {/* Footer */}
      <footer className="w-full bg-paper-card/80 border-t border-paper-border/80 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center flex flex-col items-center gap-3">
          <p className="font-editorial text-lg sm:text-xl text-charcoal italic leading-relaxed">
            “Chậm lại để hiểu mình trước khi bước vào thế giới của người khác.”
          </p>
          <p className="text-xs text-charcoal-muted font-mono">
            © Coach Dating Communication Lab. RAG-grounded relationship discernment workspace.
          </p>
          <EvalBadge />
          <DisclaimerBar />
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

