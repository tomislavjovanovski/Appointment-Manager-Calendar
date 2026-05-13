import { useState, useCallback } from 'react';
import { Patient } from '@/types/appointment';
import { patientsStorage } from '@/lib/storage';

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await patientsStorage.getAll();
      setPatients(data);
    } catch (err) {
      setError('Failed to load patients');
      console.error('Error loading patients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPatient = useCallback(async (patient: Omit<Patient, 'id' | 'createdAt'>) => {
    setLoading(true);
    setError(null);
    try {
      const newPatient = await patientsStorage.add(patient);
      setPatients(prev => [...prev, newPatient]);
      return newPatient;
    } catch (err) {
      setError('Failed to create patient');
      console.error('Error creating patient:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePatient = useCallback(async (id: string, updates: Partial<Patient>) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await patientsStorage.update(id, updates);
      setPatients(prev => prev.map(patient => patient.id === id ? updated : patient));
      return updated;
    } catch (err) {
      setError('Failed to update patient');
      console.error('Error updating patient:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePatient = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await patientsStorage.delete(id);
      setPatients(prev => prev.filter(patient => patient.id !== id));
    } catch (err) {
      setError('Failed to delete patient');
      console.error('Error deleting patient:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPatientById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const allPatients = await patientsStorage.getAll();
      const patient = allPatients.find(p => p.id === id);
      return patient || null;
    } catch (err) {
      setError('Failed to load patient');
      console.error('Error loading patient:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    patients,
    loading,
    error,
    loadPatients,
    createPatient,
    updatePatient,
    deletePatient,
    getPatientById,
  };
}
