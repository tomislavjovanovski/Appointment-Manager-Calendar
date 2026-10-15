import { useEffect, useState } from 'react';
import type { Appointment } from '@/types/appointment';

export function useCurrentAppointment() {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const interval = window.setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return (appointment: Appointment) =>
    (appointment.status == null || appointment.status === 'scheduled') &&
    Date.parse(appointment.startTime) <= now &&
    now < Date.parse(appointment.endTime);
}
