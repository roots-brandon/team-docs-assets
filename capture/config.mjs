import os from 'node:os';
import path from 'node:path';

// Sign-ins live in dedicated Chrome profiles OUTSIDE the repo (the repo is public).
// `--profile <name>` picks one: the default is the Google test account used for Google Docs
// shots; e.g. `--profile claude` holds the owner's claude.ai session for dashboard shots.
const argv = process.argv.slice(2);
export const PROFILE_NAME = argv.includes('--profile') ? argv[argv.indexOf('--profile') + 1] : null;
const profilesRoot = path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), '.local', 'share'), 'team-docs-assets');
export const PROFILE_DIR = process.env.TDA_PROFILE_DIR
  ?? path.join(profilesRoot, PROFILE_NAME ? `chrome-profile-${PROFILE_NAME}` : 'chrome-profile');

export const CHROME_EXE = process.env.TDA_CHROME
  ?? path.join(process.env.ProgramFiles ?? 'C:/Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe');

export const GITHUB_REPO = process.env.TDA_REPO ?? 'roots-brandon/team-docs-assets';
export const DOC_FOLDER = 'google-docs-basics';
export const VIEWPORT = { width: 1280, height: 800 };
export const SCALE = 2;
