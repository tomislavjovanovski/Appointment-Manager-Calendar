import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Data file paths
const DATA_DIR = path.join(__dirname, '../public/data');
const PATIENTS_FILE = path.join(DATA_DIR, 'patients.json');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const GOOGLE_TOKENS_FILE = path.join(DATA_DIR, 'google-tokens.json');

// Google Calendar setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID || '',
  process.env.GOOGLE_CLIENT_SECRET || '',
  'http://localhost:3000/api/google/callback'
);

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Helper function to read JSON file
async function readJsonFile(filePath, defaultValue = []) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return defaultValue;
  }
}

// Helper function to write JSON file
async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Patients endpoints
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await readJsonFile(PATIENTS_FILE, []);
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read patients' });
  }
});

app.post('/api/patients', async (req, res) => {
  try {
    const patients = await readJsonFile(PATIENTS_FILE, []);
    const newPatient = { ...req.body, id: Date.now().toString() };
    patients.push(newPatient);
    await writeJsonFile(PATIENTS_FILE, patients);
    res.json(newPatient);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

app.put('/api/patients/:id', async (req, res) => {
  try {
    const patients = await readJsonFile(PATIENTS_FILE, []);
    const index = patients.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    patients[index] = { ...patients[index], ...req.body };
    await writeJsonFile(PATIENTS_FILE, patients);
    res.json(patients[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

app.delete('/api/patients/:id', async (req, res) => {
  try {
    const patients = await readJsonFile(PATIENTS_FILE, []);
    const filtered = patients.filter(p => p.id !== req.params.id);
    await writeJsonFile(PATIENTS_FILE, filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// Appointments endpoints
app.get('/api/appointments', async (req, res) => {
  try {
    const appointments = await readJsonFile(APPOINTMENTS_FILE, []);
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read appointments' });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const appointments = await readJsonFile(APPOINTMENTS_FILE, []);
    const newAppointment = { ...req.body, id: Date.now().toString() };
    appointments.push(newAppointment);
    await writeJsonFile(APPOINTMENTS_FILE, appointments);
    res.json(newAppointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

app.put('/api/appointments/:id', async (req, res) => {
  try {
    const appointments = await readJsonFile(APPOINTMENTS_FILE, []);
    const index = appointments.findIndex(a => a.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    appointments[index] = { ...appointments[index], ...req.body };
    await writeJsonFile(APPOINTMENTS_FILE, appointments);
    res.json(appointments[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  try {
    const appointments = await readJsonFile(APPOINTMENTS_FILE, []);
    const filtered = appointments.filter(a => a.id !== req.params.id);
    await writeJsonFile(APPOINTMENTS_FILE, filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

// Settings endpoints
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await readJsonFile(SETTINGS_FILE, {
      workingDays: [1, 2, 3, 4, 5],
      startTime: "09:00",
      endTime: "17:00",
      appointmentSizes: {
        half: { duration: 30, label: "Half Hour" },
        full: { duration: 60, label: "Full Hour" },
        double: { duration: 120, label: "Double Hour" }
      },
      breakTime: 15,
      notifications: {
        emailWebhookUrl: "",
        smsWebhookUrl: "",
        emailNotificationTime: "09:00",
        smsNotificationTime: "09:00",
        enableDayBeforeEmail: true,
        enableSameDayEmail: true,
        enableSameDaySMS: true,
        emailTemplate: "",
        smsTemplate: ""
      }
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    await writeJsonFile(SETTINGS_FILE, req.body);
    res.json(req.body);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Google Calendar Authentication endpoints
app.post('/api/google/auth', (req, res) => {
  const { clientId, clientSecret } = req.body;
  
  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'Client ID and Client Secret are required' });
  }

  oauth2Client.setCredentials({});
  oauth2Client._clientId = clientId;
  oauth2Client._clientSecret = clientSecret;

  const scopes = ['https://www.googleapis.com/auth/calendar'];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });

  res.json({ authUrl: url });
});

app.post('/api/google/callback', async (req, res) => {
  try {
    const { code } = req.body;
    const { tokens } = await oauth2Client.getToken(code);
    
    await writeJsonFile(GOOGLE_TOKENS_FILE, tokens);
    oauth2Client.setCredentials(tokens);
    
    res.json({ success: true, tokens });
  } catch (error) {
    res.status(500).json({ error: 'Failed to exchange code for tokens' });
  }
});

// Google Calendar sync endpoints
app.get('/api/google/events', async (req, res) => {
  try {
    const tokens = await readJsonFile(GOOGLE_TOKENS_FILE, null);
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with Google Calendar' });
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Google Calendar events' });
  }
});

app.post('/api/google/events', async (req, res) => {
  try {
    const tokens = await readJsonFile(GOOGLE_TOKENS_FILE, null);
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with Google Calendar' });
    }

    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const { appointment } = req.body;
    const event = {
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
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create Google Calendar event' });
  }
});

app.get('/api/google/status', async (req, res) => {
  try {
    const tokens = await readJsonFile(GOOGLE_TOKENS_FILE, null);
    res.json({ connected: !!tokens });
  } catch (error) {
    res.json({ connected: false });
  }
});

app.delete('/api/google/disconnect', async (req, res) => {
  try {
    await fs.unlink(GOOGLE_TOKENS_FILE).catch(() => {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Initialize server
async function startServer() {
  await ensureDataDir();
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);