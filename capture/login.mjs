// One-time (or when the session expires): sign in to the TEST Google account by hand.
// Launches plain Chrome (no automation flags, so Google allows sign-in) on the dedicated profile.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { PROFILE_DIR, CHROME_EXE } from './config.mjs';

fs.mkdirSync(PROFILE_DIR, { recursive: true });
console.log(`Profile: ${PROFILE_DIR}`);
console.log('Sign in to the test Google account, open the doc once, then close the Chrome window.');
const chrome = spawn(CHROME_EXE, [
  `--user-data-dir=${PROFILE_DIR}`,
  '--no-first-run',
  '--no-default-browser-check',
  'https://accounts.google.com/',
], { stdio: 'ignore' });
chrome.on('error', (e) => {
  console.error(`Could not start Chrome at ${CHROME_EXE} (${e.code}). Set TDA_CHROME to chrome.exe's path.`);
  process.exitCode = 1;
});
chrome.on('exit', () => console.log('Chrome closed; session saved in the profile.'));
