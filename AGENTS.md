# n8n-nodes-videoapi

n8n community node package for [Video API](https://video-api.io).

## Structure

| Directory | Purpose |
|-----------|---------|
| `nodes/video_api/` | Single node: `VideoApi.node.ts` (operations: `uploadFile`, `aiCut`) |
| `credentials/` | Single credential type: `VideoApiCredentials` (header auth via `x-api-key`) |
| `dist/` | Build output — **gitignored**, registered by n8n via `package.json` `n8n` field |

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TS (`tsc -p tsconfig.build.json`) + copy icons (`gulp build:icons`) |
| `npm run dev` | `tsc --watch` (does NOT copy icons) |
| `npm run lint` | ESLint on `nodes/` and `credentials/` with `--max-warnings=0` |
| `npm run lintfix` | Same as lint with `--fix` |
| `npm run format` | Prettier on `nodes/` and `credentials/` |
| `npm run prepublishOnly` | `build && lint` (runs automatically before `npm publish`) |

## CI/CD

- `.github/workflows/release.yml` uses `cycjimmy/semantic-release-action@v6` for semantic versioning + npm publish
- Triggers: push to `main` or manual `workflow_dispatch`
- Commit conventions: `feat:` → MINOR, `fix:` → PATCH, `BREAKING CHANGE:` / `!:` → MAJOR
- `prepublishOnly` runs `build && lint` automatically before each publish
- Requires `NPM_TOKEN` secret set in GitHub repo settings (npm Automation token)

## Testing locally

```bash
npm run build
bash start-n8n-with-custom-node.sh
```

The script sets `N8N_CUSTOM_EXTENSIONS="$(pwd)/dist"` and runs `n8n start`. Open `http://localhost:5678` and look for the "Video API" node/credential.

## Quirks

- **No test suite** — this repo has no tests.
- **File uploads must use `requestWithAuthentication`**, not `httpRequestWithAuthentication`, because only the former handles `multipart/form-data` via the `formData` option. See `uploadFileToApi` in `VideoApi.node.ts`.
- **`npm run dev` does not copy icons** — `gulp build:icons` runs only in `npm run build`. Icons in `dist/nodes` won't update during watch mode.
- **AI Cut polls synchronously** — the `aiCut` operation blocks the node execution until the job completes (default timeout 5 min, 2s polling interval).
