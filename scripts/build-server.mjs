// Builds a complete, self-contained backend deployment folder in dist-server/:
//   index.js        - the web application, bundled (Passenger startup file)
//   manage-users.js - the admin CLI, bundled
//   package.json    - marks the folder as ESM; no dependencies to install
// Deploying the backend = uploading the contents of dist-server/ to the backend app
// directory. No node_modules and no other source files are needed on the host.
// Bundling matters for cold starts: a fresh Passenger spawn reads one file instead of
// hundreds of node_modules files (the dominant cost when the host page cache is cold).
import { build } from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(rootDir, 'dist-server');

// Express and its dependencies are CommonJS; in an ESM bundle their require() calls to
// Node built-ins survive, so a module-scope require must exist.
const banner = `import { createRequire as __bundleCreateRequire } from 'module';
const require = __bundleCreateRequire(import.meta.url);
`;

const result = await build({
  entryPoints: [
    path.join(rootDir, 'server/index.js'),
    path.join(rootDir, 'server/manage-users.js'),
  ],
  outdir: outDir,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  banner: { js: banner },
  logLevel: 'info',
  metafile: true,
});

// The bundles keep their .js names, so Passenger's configured startup file and the
// documented `node manage-users.js` commands do not change; this package.json makes
// Node treat them as ESM when deployed outside the repo.
await fs.writeFile(path.join(outDir, 'package.json'), `${JSON.stringify({
  type: 'module',
  scripts: {
    start: 'node index.js',
    users: 'node manage-users.js',
  },
}, null, 2)}\n`);

const bytes = Object.values(result.metafile.outputs).reduce((sum, output) => sum + output.bytes, 0);
console.log(`Built deployable backend in ${path.relative(rootDir, outDir)}/ (${Math.round(bytes / 1024)} KiB).`);
