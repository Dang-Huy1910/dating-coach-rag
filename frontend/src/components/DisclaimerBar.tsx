import React from 'react';
import { useSession } from '../context/SessionContext';

export const DisclaimerBar: React.FC = () => {
  const { disclaimer } = useSession();

  return (
    <p className="text-[11px] sm:text-xs text-charcoal-muted/75 font-normal leading-relaxed tracking-normal max-w-2xl mx-auto">
      {disclaimer}
    </p>
  );
};
