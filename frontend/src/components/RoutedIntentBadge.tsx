import React from 'react';
import { Intent } from '../api/types';

const LABELS: Record<Intent, string> = {
  ask: 'Hỏi coach',
  rewrite_bio: 'Sửa bio',
  analyze_message: 'Phân tích tin nhắn',
  openers: 'Gợi ý opener',
  profile_context: 'Profile công khai',
};

interface RoutedIntentBadgeProps {
  intent: Intent;
  className?: string;
}

export function intentLabel(intent: Intent): string {
  return LABELS[intent] ?? intent;
}

export const RoutedIntentBadge: React.FC<RoutedIntentBadgeProps> = ({
  intent,
  className = '',
}) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-magenta-50 text-magenta-700 border border-magenta-200 ${className}`}
    title={`Năng lực đã chọn: ${intentLabel(intent)}`}
  >
    {intentLabel(intent)}
  </span>
);
