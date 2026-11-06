import { useEffect, useMemo, useState } from 'react';
import type { Appointment } from '@/types/appointment';
import { deriveDocumentationReminders } from '@/lib/documentationReminders';

export function useDocumentationReminders(appointments: Appointment[], onReturn: () => void) {
  const [now, setNow] = useState(Date.now);
  const result = useMemo(() => deriveDocumentationReminders(appointments, now), [appointments, now]);

  useEffect(() => {
    let refreshTimeout: number | undefined;
    const returnToApp = () => {
      if (document.visibilityState !== 'visible') return;
      setNow(Date.now());
      window.clearTimeout(refreshTimeout);
      refreshTimeout = window.setTimeout(onReturn, 0);
    };
    window.addEventListener('focus', returnToApp);
    document.addEventListener('visibilitychange', returnToApp);
    return () => {
      window.clearTimeout(refreshTimeout);
      window.removeEventListener('focus', returnToApp);
      document.removeEventListener('visibilitychange', returnToApp);
    };
  }, [onReturn]);

  useEffect(() => {
    if (document.visibilityState !== 'visible') return;
    const timeout = window.setTimeout(() => setNow(Date.now()), Math.max(0, result.nextBoundary - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [result.nextBoundary, now]);
  const invalidIds = result.invalidIds.join(',');
  useEffect(() => {
    if (invalidIds) console.warn('Documentation reminders: appointments have invalid dates:', invalidIds);
  }, [invalidIds]);
  return result;
}
