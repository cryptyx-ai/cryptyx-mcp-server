import { createRequire } from 'node:module';

// dist/version.js → ../package.json is the package root, both in the repo and in the npm tarball.
const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

export const PACKAGE_VERSION: string = pkg.version;
