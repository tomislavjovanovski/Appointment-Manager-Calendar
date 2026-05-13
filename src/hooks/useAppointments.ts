import { useState, useCallback } from 'react';
import { Appointment } from '@/types/appointment';
import { appointmentsStorage } from '@/lib/storage';

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await appointmentsStorage.getAll();
      setAppointments(data);
    } catch (err) {
      setError('Failed to load appointments');
      console.error('Error loading appointments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createAppointment = useCallback(async (appointment: Omit<Appointment, 'id' | 'createdAt'>) => {
    setLoading(true);
    setError(null);
    try {
      const newAppointment = await appointmentsStorage.add(appointment);
      setAppointments(prev => [...prev, newAppointment]);
      return newAppointment;
    } catch (err) {
      setError('Failed to create appointment');
      console.error('Error creating appointment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAppointment = useCallback(async (id: string, updates: Partial<Appointment>) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await appointmentsStorage.update(id, updates);
      setAppointments(prev => prev.map(apt => apt.id === id ? updated : apt));
      return updated;
    } catch (err) {
      setError('Failed to update appointment');
      console.error('Error updating appointment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAppointment = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await appointmentsStorage.delete(id);
      setAppointments(prev => prev.filter(apt => apt.id !== id));
    } catch (err) {
      setError('Failed to delete appointment');
      console.error('Error deleting appointment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAppointmentsByPatient = useCallback(async (patientId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await appointmentsStorage.getByPatient(patientId);
      return data;
    } catch (err) {
      setError('Failed to load patient appointments');
      console.error('Error loading patient appointments:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    appointments,
    loading,
    error,
    loadAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentsByPatient,
  };
}
