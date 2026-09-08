import React from 'react';
import { useI18n } from '../i18n/LocaleContext';

export const DisclaimerBar: React.FC = () => {
  const { t } = useI18n();

  return (
    <p className="text-[11px] sm:text-xs text-charcoal-muted/75 font-normal leading-relaxed tracking-normal max-w-2xl mx-auto">
      {t('disclaimer.ui')}
    </p>
  );
};
