# team-docs-assets

Public images for team docs. One folder per doc (`google-docs-basics/<id>.png`).
Link images by commit SHA, never `main`:

    https://raw.githubusercontent.com/roots-brandon/team-docs-assets/<sha>/google-docs-basics/<id>.png

## Capture job (`capture/`)

1. `npm install`
2. `npm run login` – opens Chrome on a dedicated profile stored outside the repo
   (`%LOCALAPPDATA%\team-docs-assets\chrome-profile`). Sign in to the **test** Google
   account, open the doc once, close Chrome. Repeat only when the session expires.
3. Sync `capture/queue.json` from the doc's "Screenshot queue" tab.
4. `npm run capture:dry` – visible browser, writes PNGs, no push. Check the images.
5. `npm run capture` – headless, then commits, pushes, and prints `id -> raw URL`.

Each queue id needs a recipe in `capture/recipes.mjs` (steps, highlight targets, crop).
The job hides the doc title, account avatar/email, and share controls before every shot,
and crops tight to the menu or dialog. Never commit auth state: the profile lives outside
the repo and `.gitignore` blocks `.auth/` and `*.storage.json`.
