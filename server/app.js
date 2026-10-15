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

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127(?:\.\d{1,3}){3}|\[::1\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/i;

const createCorsOptions = (config) => ({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin) return callback(null, false);
    const allowed = config.allowedOrigins.includes(origin) || (config.allowLocalOrigins && LOCAL_ORIGIN.test(origin));
    return callback(null, allowed);
  },
});

export function createApp({ dataStore, dataDir, auth }) {
  // Fail closed: the API must never start without authentication.
  if (!auth?.router || !auth?.requireSession || !auth?.requireCsrf || !auth?.config) {
    throw new Error('createApp requires the auth module.');
  }

  const app = express();
  app.disable('x-powered-by');

  app.use('/api', cors(createCorsOptions(auth.config)));

  // Public, lightweight liveness check: no file reads, no data, no paths.
  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true });
  });

  app.use('/api/auth', auth.router);

  // Everything else under /api requires a valid session (and a CSRF token for writes).
  // Registered before the body parsers so unauthenticated bodies are never parsed.
  app.use('/api', auth.requireSession, auth.requireCsrf, (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use('/api/settings', express.json({ limit: '512kb' }));
  app.use(express.json());

  app.get('/api/health/details', asyncRoute(async (_req, res) => {
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

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  app.use((error, req, res, _next) => {
    const statusCode = error.statusCode || error.status || 500;
    // Only client errors and explicitly exposable errors return their message; 5xx stay generic.
    const expose = error.expose ?? statusCode < 500;

    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
      name: error.name,
      code: error.code,
      message: error.message,
      stack: statusCode >= 500 ? error.stack : undefined,
    });

    res.status(statusCode).json({
      error: expose && error.message ? error.message : 'Internal server error.',
    });
  });

  return app;
}
