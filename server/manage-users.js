#!/usr/bin/env node
// Administrator account management for the JSON auth store.
// Passwords are read from a hidden prompt (or the first line of stdin), never from arguments,
// so they do not end up in shell history or the process list.
//
//   node manage-users.js create --email admin@example.com
//   node manage-users.js set-password --email admin@example.com
//   node manage-users.js disable --email admin@example.com
//   node manage-users.js enable --email admin@example.com
//   node manage-users.js list

import { AuthInputError, createAuthStore } from './auth/authStore.js';
import { resolveAuthDir } from './auth/paths.js';
import { PASSWORD_RULES } from './auth/password.js';

const USAGE = `Usage:
  node manage-users.js create --email <email>
  node manage-users.js set-password --email <email>
  node manage-users.js disable --email <email>
  node manage-users.js enable --email <email>
  node manage-users.js list

Auth data directory: ${resolveAuthDir()} (override with AUTH_DATA_DIR)`;

const parseArgs = (argv) => {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === '--email') options.email = rest[++index];
    else if (arg.startsWith('--email=')) options.email = arg.slice('--email='.length);
    else if (arg === '--password' || arg.startsWith('--password=')) {
      throw new AuthInputError('Do not pass passwords as arguments; you will be prompted.', 'EARGS');
    } else throw new AuthInputError(`Unknown argument: ${arg}`, 'EARGS');
  }
  return { command, options };
};

function promptHidden(question) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    let value = '';
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          cleanup();
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          cleanup();
          stdout.write('\n');
          reject(new AuthInputError('Cancelled.', 'ECANCELLED'));
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    stdin.on('data', onData);
  });
}

async function readFirstStdinLine() {
  let data = '';
  for await (const chunk of process.stdin) {
    data += chunk;
    if (data.includes('\n')) break;
  }
  return data.split(/\r?\n/)[0];
}

async function readNewPassword() {
  if (!process.stdin.isTTY) return readFirstStdinLine();
  console.log(`Password must have ${PASSWORD_RULES}.`);
  const password = await promptHidden('New password: ');
  const confirmation = await promptHidden('Repeat password: ');
  if (password !== confirmation) throw new AuthInputError('Passwords do not match.', 'EMISMATCH');
  return password;
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const store = createAuthStore({ authDir: resolveAuthDir() });
  const needsEmail = ['create', 'set-password', 'disable', 'enable'].includes(command);
  if (needsEmail && !options.email) throw new AuthInputError('--email is required.', 'EARGS');

  switch (command) {
    case 'create': {
      // Check first so the operator is not asked for a password that cannot be used.
      if (await store.findUserByEmail(options.email)) {
        throw new AuthInputError('A user with this e-mail already exists.', 'EUSER_EXISTS');
      }
      const user = await store.createUser({ email: options.email, password: await readNewPassword() });
      console.log(`Created ${user.role} ${user.email} (${user.id}).`);
      console.log(`Users file: ${store.usersFile}`);
      break;
    }
    case 'set-password': {
      if (!(await store.findUserByEmail(options.email))) throw new AuthInputError('User not found.', 'EUSER_NOT_FOUND');
      const user = await store.setPassword(options.email, await readNewPassword());
      console.log(`Password updated for ${user.email}. Existing sessions for this user were signed out.`);
      break;
    }
    case 'disable':
    case 'enable': {
      const user = await store.setStatus(options.email, command === 'disable' ? 'disabled' : 'active');
      console.log(`${user.email} is now ${command === 'disable' ? 'disabled (sessions signed out)' : 'active'}.`);
      break;
    }
    case 'list': {
      const users = await store.listUsers();
      if (users.length === 0) console.log('No users.');
      for (const user of users) {
        console.log(`${user.email}\t${user.status}\t${user.role}\t${user.id}\tcreated ${user.createdAt}`);
      }
      break;
    }
    default:
      console.log(USAGE);
      process.exitCode = command ? 1 : 0;
  }
}

main().catch((error) => {
  console.error(`Error: ${error?.message ?? 'Unknown error.'}`);
  process.exitCode = 1;
});
