/**
 * Creates the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD (for example set in the cPanel
 * "Setup Node.js App" screen), so no SSH session is needed. It only acts while no users exist;
 * once any user exists the variables are ignored and should be removed.
 * Never throws and never logs the password, so a bad value cannot stop the app from starting.
 */
export async function bootstrapAdminFromEnv({ authStore, env = process.env, logger }) {
  const email = env.ADMIN_EMAIL?.trim();
  const password = env.ADMIN_PASSWORD;
  if (!email && !password) return { status: 'not_configured' };
  if (!email || !password) {
    logger?.warn?.('auth.bootstrap.incomplete', { message: 'Set both ADMIN_EMAIL and ADMIN_PASSWORD to create the first administrator.' });
    return { status: 'incomplete' };
  }

  try {
    const users = await authStore.listUsers();
    if (users.length > 0) {
      logger?.warn?.('auth.bootstrap.ignored', { message: 'Users already exist; remove ADMIN_EMAIL and ADMIN_PASSWORD from the environment.' });
      return { status: 'users_exist' };
    }
    const user = await authStore.createUser({ email, password });
    logger?.info?.('auth.bootstrap.created', {
      email: user.email,
      message: 'First administrator created; remove ADMIN_EMAIL and ADMIN_PASSWORD from the environment.',
    });
    return { status: 'created', user };
  } catch (error) {
    // Another Passenger process created the same administrator at the same time.
    if (error?.code === 'EUSER_EXISTS') return { status: 'users_exist' };
    logger?.error?.('auth.bootstrap.failed', { code: error?.code, message: error?.message });
    return { status: 'failed', code: error?.code };
  }
}
