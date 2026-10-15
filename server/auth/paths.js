import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const serverDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/**
 * Directory for users.json and sessions.json.
 * Default: one level above the backend folder, e.g. /home/devforge/private/auth on cPanel,
 * which is outside public_html and outside the patient data directory.
 */
export function resolveAuthDir(env = process.env) {
  return env.AUTH_DATA_DIR ? path.resolve(env.AUTH_DATA_DIR) : path.resolve(serverDir, '../private/auth');
}

/** Logs whether login is possible. Never throws, so a broken auth file cannot stop the app from serving 401s. */
export async function reportAuthStatus({ authStore, authDir, logger }) {
  try {
    const stat = await fs.stat(authDir).catch(() => null);
    if (stat && (stat.mode & 0o077) !== 0) {
      logger.warn('auth.dir.permissions', { message: 'Auth directory is accessible by group/others; run chmod 700 on it.' });
    }
    const users = await authStore.listUsers();
    const activeUsers = users.filter((user) => user.status === 'active').length;
    if (activeUsers === 0) {
      logger.warn('auth.no_users', { message: 'No active users. Set ADMIN_EMAIL and ADMIN_PASSWORD and restart, or run: node manage-users.js create --email <email>' });
    } else {
      logger.info('auth.ready', { activeUsers });
    }
  } catch (error) {
    logger.error('auth.users.unavailable', { code: error?.code, message: error?.message });
  }
}
