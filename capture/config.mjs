import os from 'node:os';
import path from 'node:path';

// Google sign-in lives in a dedicated Chrome profile OUTSIDE the repo (the repo is public).
export const PROFILE_DIR = process.env.TDA_PROFILE_DIR
  ?? path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), '.local', 'share'), 'team-docs-assets', 'chrome-profile');

export const CHROME_EXE = process.env.TDA_CHROME
  ?? path.join(process.env.ProgramFiles ?? 'C:/Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe');

export const GITHUB_REPO = process.env.TDA_REPO ?? 'roots-brandon/team-docs-assets';
export const DOC_FOLDER = 'google-docs-basics';
export const VIEWPORT = { width: 1280, height: 800 };
export const SCALE = 2;
