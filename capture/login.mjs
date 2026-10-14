// One-time (or when the session expires): sign in by hand on a dedicated profile.
// Launches plain Chrome (no automation flags, so Google and claude.ai allow sign-in).
//   node capture/login.mjs                                   Google test account
//   node capture/login.mjs --profile claude --url <start>    another profile and start page
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { PROFILE_DIR, PROFILE_NAME, CHROME_EXE } from './config.mjs';

const argv = process.argv.slice(2);
const startUrl = argv.includes('--url') ? argv[argv.indexOf('--url') + 1] : 'https://accounts.google.com/';

fs.mkdirSync(PROFILE_DIR, { recursive: true });
console.log(`Profile: ${PROFILE_DIR}`);
console.log(PROFILE_NAME === 'claude'
  ? 'Sign in to claude.ai, open the dashboard, approve Google Drive if asked, then close the Chrome window.'
  : 'Sign in to the test Google account, open the doc once, then close the Chrome window.');
const chrome = spawn(CHROME_EXE, [
  `--user-data-dir=${PROFILE_DIR}`,
  '--no-first-run',
  '--no-default-browser-check',
  startUrl,
], { stdio: 'ignore' });
chrome.on('error', (e) => {
  console.error(`Could not start Chrome at ${CHROME_EXE} (${e.code}). Set TDA_CHROME to chrome.exe's path.`);
  process.exitCode = 1;
});
chrome.on('exit', () => console.log('Chrome closed; session saved in the profile.'));
