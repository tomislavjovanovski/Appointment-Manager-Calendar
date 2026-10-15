import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';
import { createAuth, readAuthConfig } from './auth/index.js';
import { createAuthStore } from './auth/authStore.js';
import { bootstrapAdminFromEnv } from './auth/bootstrap.js';
import { reportAuthStatus, resolveAuthDir } from './auth/paths.js';
import { createDataStore } from './dataStore.js';
import { createLogger, exitWithFailure, serializeError, startServer } from './startup.js';

// Keep this file free of top-level await: Passenger loads the startup file with require(),
// and Node's require(esm) rejects module graphs that use top-level await.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);

const DATA_DIR = path.join(__dirname, '../public/data');

const logger = createLogger();

const dataStore = createDataStore({
  dataDir: DATA_DIR,
  patientsFile: path.join(DATA_DIR, 'patients.json'),
  appointmentsFile: path.join(DATA_DIR, 'appointments.json'),
  settingsFile: path.join(DATA_DIR, 'settings.json'),
  googleTokensFile: path.join(DATA_DIR, 'google-tokens.json'),
});

// Authentication data (users, sessions) lives outside the web root and outside the patient data directory.
const AUTH_DIR = resolveAuthDir();
const authStore = createAuthStore({ authDir: AUTH_DIR, logger });
const auth = createAuth({ store: authStore, config: readAuthConfig(), logger });

const app = createApp({ dataStore, dataDir: DATA_DIR, auth });

process.on('uncaughtException', (error, origin) => {
  logger.error('process.uncaughtException', { origin, error: serializeError(error) });
  exitWithFailure();
});

startServer({ app, dataStore, port: PORT, host: HOST, logger })
  .then(() => bootstrapAdminFromEnv({ authStore, logger }))
  .then(() => reportAuthStatus({ authStore, authDir: AUTH_DIR, logger }))
  .catch((error) => {
    logger.error('startup.failed', { error: serializeError(error) });
    exitWithFailure();
  });
