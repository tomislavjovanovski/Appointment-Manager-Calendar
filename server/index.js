import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import { createDataStore } from './dataStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);

const DATA_DIR = path.join(__dirname, '../public/data');
const PATIENTS_FILE = path.join(DATA_DIR, 'patients.json');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const GOOGLE_TOKENS_FILE = path.join(DATA_DIR, 'google-tokens.json');

const dataStore = createDataStore({
  dataDir: DATA_DIR,
  patientsFile: PATIENTS_FILE,
  appointmentsFile: APPOINTMENTS_FILE,
  settingsFile: SETTINGS_FILE,
  googleTokensFile: GOOGLE_TOKENS_FILE,
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID || '',
  process.env.GOOGLE_CLIENT_SECRET || '',
  `http://localhost:${PORT}/api/google/callback`
);

app.use(cors());
app.use(express.json());

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

app.get('/api/health', asyncRoute(async (_req, res) => {
  const [patients, appointments] = await Promise.all([
    dataStore.getPatients(),
    dataStore.getAppointments(),
  ]);

  res.json({
    ok: true,
    dataDir: DATA_DIR,
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

app.post('/api/google/auth', asyncRoute(async (req, res) => {
  const { clientId, clientSecret } = req.body ?? {};

  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'Client ID and Client Secret are required.' });
  }

  oauth2Client.setCredentials({});
  oauth2Client._clientId = clientId;
  oauth2Client._clientSecret = clientSecret;

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });

  res.json({ authUrl: url });
}));

app.post('/api/google/callback', asyncRoute(async (req, res) => {
  const { code } = req.body ?? {};
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required.' });
  }

  const { tokens } = await oauth2Client.getToken(code);
  await dataStore.saveGoogleTokens(tokens);
  oauth2Client.setCredentials(tokens);

  res.json({ success: true, tokens });
}));

app.get('/api/google/events', asyncRoute(async (req, res) => {
  const tokens = await dataStore.getGoogleTokens();
  if (!tokens) {
    return res.status(401).json({ error: 'Not authenticated with Google Calendar.' });
  }

  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const { startDate, endDate } = req.query;

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
    timeMax: endDate ? new Date(endDate).toISOString() : undefined,
    singleEvents: true,
    orderBy: 'startTime',
  });

  res.json(response.data.items || []);
}));

app.post('/api/google/events', asyncRoute(async (req, res) => {
  const tokens = await dataStore.getGoogleTokens();
  if (!tokens) {
    return res.status(401).json({ error: 'Not authenticated with Google Calendar.' });
  }

  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const { appointment } = req.body ?? {};

  if (!appointment) {
    return res.status(400).json({ error: 'Appointment payload is required.' });
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    resource: {
      summary: `${appointment.patientName} - ${appointment.type}`,
      description: appointment.notes || '',
      start: {
        dateTime: `${appointment.date}T${appointment.startTime}:00`,
        timeZone: 'UTC',
      },
      end: {
        dateTime: `${appointment.date}T${appointment.endTime}:00`,
        timeZone: 'UTC',
      },
    },
  });

  res.json(response.data);
}));

app.get('/api/google/status', asyncRoute(async (_req, res) => {
  const tokens = await dataStore.getGoogleTokens();
  res.json({ connected: Boolean(tokens) });
}));

app.delete('/api/google/disconnect', asyncRoute(async (_req, res) => {
  await dataStore.deleteGoogleTokens();
  res.json({ success: true });
}));

app.use((error, req, res, _next) => {
  const statusCode = error.statusCode || 500;

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error);

  res.status(statusCode).json({
    error: error.message || 'Internal server error.',
  });
});

async function startServer() {
  await dataStore.initialize();

  const server = app.listen(PORT, HOST, () => {
    console.log(`Backend server running on http://${HOST}:${PORT}`);
  });

  server.on('error', (error) => {
    console.error('Backend server failed to start', error);
  });
}

startServer().catch((error) => {
  console.error('Failed to initialize backend server', error);
  process.exitCode = 1;
});
