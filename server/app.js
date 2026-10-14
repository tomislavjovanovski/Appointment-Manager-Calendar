import cors from 'cors';
import express from 'express';

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const requireObjectPayload = (payload, entityName) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    const error = new Error(`${entityName} payload must be a JSON object.`);
    error.statusCode = 400;
    throw error;
  }
};

export function createApp({ dataStore, dataDir }) {
  const app = express();

  app.use(cors());
  app.use('/api/settings', express.json({ limit: '512kb' }));
  app.use(express.json());

  app.get('/api/health', asyncRoute(async (_req, res) => {
    const [patients, appointments] = await Promise.all([
      dataStore.getPatients(),
      dataStore.getAppointments(),
    ]);

    res.json({
      ok: true,
      dataDir,
      patientsCount: patients.length,
      appointmentsCount: appointments.length,
    });
  }));

  app.get('/api/patients', asyncRoute(async (_req, res) => {
    res.json(await dataStore.getPatients());
  }));

  app.post('/api/patients', asyncRoute(async (req, res) => {
    requireObjectPayload(req.body, 'Patient');
    const patient = await dataStore.createPatient(req.body);
    res.status(201).json(patient);
  }));

  app.put('/api/patients/:id', asyncRoute(async (req, res) => {
    requireObjectPayload(req.body, 'Patient');
    const patient = await dataStore.updatePatient(req.params.id, req.body);
    res.json(patient);
  }));

  app.delete('/api/patients/:id', asyncRoute(async (req, res) => {
    await dataStore.deletePatient(req.params.id);
    res.json({ success: true });
  }));

  app.get('/api/appointments', asyncRoute(async (_req, res) => {
    res.json(await dataStore.getAppointments());
  }));

  app.post('/api/appointments', asyncRoute(async (req, res) => {
    requireObjectPayload(req.body, 'Appointment');
    const appointment = await dataStore.createAppointment(req.body);
    res.status(201).json(appointment);
  }));

  app.put('/api/appointments/:id', asyncRoute(async (req, res) => {
    requireObjectPayload(req.body, 'Appointment');
    const appointment = await dataStore.updateAppointment(req.params.id, req.body);
    res.json(appointment);
  }));

  app.delete('/api/appointments/:id', asyncRoute(async (req, res) => {
    await dataStore.deleteAppointment(req.params.id);
    res.json({ success: true });
  }));

  app.get('/api/settings', asyncRoute(async (_req, res) => {
    res.json(await dataStore.getSettings());
  }));

  app.put('/api/settings', asyncRoute(async (req, res) => {
    requireObjectPayload(req.body, 'Settings');
    const hasNestedSettings = 'notifications' in req.body || 'appointmentSizes' in req.body;
    const settings = hasNestedSettings
      ? await dataStore.saveSettings(req.body)
      : await dataStore.updateSettings(req.body);
    res.json(settings);
  }));

  // Google Calendar integration is removed; keep the same disabled response for any old client calls.
  app.use('/api/google', (_req, res) => {
    res.status(503).json({ error: 'Google Calendar integration is disabled in this version.' });
  });

  app.use((error, req, res, _next) => {
    const statusCode = error.statusCode || 500;

    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error);

    res.status(statusCode).json({
      error: error.message || 'Internal server error.',
    });
  });

  return app;
}
