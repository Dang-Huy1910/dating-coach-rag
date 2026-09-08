import React from 'react';
import { Intent } from '../api/types';
import { tStatic } from '../i18n/LocaleContext';

const INTENT_KEYS: Record<Intent, string> = {
  ask: 'intent.ask',
  rewrite_bio: 'intent.rewrite_bio',
  analyze_message: 'intent.analyze_message',
  openers: 'intent.openers',
  profile_context: 'intent.profile_context',
};

interface RoutedIntentBadgeProps {
  intent: Intent;
  className?: string;
}

export function intentLabel(intent: Intent): string {
  const key = INTENT_KEYS[intent];
  return key ? tStatic(key) : intent;
}

export const RoutedIntentBadge: React.FC<RoutedIntentBadgeProps> = ({
  intent,
  className = '',
}) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-magenta-50 text-magenta-700 border border-magenta-200 ${className}`}
    title={tStatic('intent.chosen', { label: intentLabel(intent) })}
  >
    {intentLabel(intent)}
  </span>
);
