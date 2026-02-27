/**
 * Build Windows installers (.exe + .msi) without code signing.
 * Unsets signing env vars so electron-builder skips the winCodeSign download,
 * which fails on Windows without Admin/Developer Mode (symlink creation).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const env = { ...process.env };
delete env.WIN_CSC_LINK;
delete env.WIN_CSC_KEY_PASSWORD;
env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

const convert = spawnSync('node', [path.join(__dirname, 'convert-icon.js')], {
  stdio: 'inherit',
  env,
  shell: true,
});
if (convert.status !== 0) process.exit(convert.status || 1);

const builder = spawnSync(
  'npx',
  ['electron-builder', '--win'],
  { stdio: 'inherit', env, shell: true }
);
process.exit(builder.status || 0);
