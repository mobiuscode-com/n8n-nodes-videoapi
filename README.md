# n8n-nodes-videoapi

An [n8n](https://n8n.io) community node for [Video API](https://video-api.io) — AI-powered video and audio processing.

A single **Video API** node exposes the whole service, organized by **Resource** (Video, Audio, Render, File, Job) and **Operation**. Every operation is also searchable by name in the n8n nodes panel.

## Installation

**In n8n (recommended):** Settings → Community Nodes → Install → `@mobiuscode/n8n-nodes-videoapi`. See the [community node install guide](https://docs.n8n.io/integrations/community-nodes/installation/).

**Manual / self-hosted:** install the package into your n8n custom folder:

```bash
cd ~/.n8n/nodes        # create it if it doesn't exist
npm install @mobiuscode/n8n-nodes-videoapi
```

## Credentials

Get an API key from [video-api.io](https://video-api.io), then create a **Video API** credential in n8n:

- **API Key** — sent as the `x-api-key` header.
- **Base URL** — defaults to `https://api.video-api.io`; change it only for a self-hosted/local instance.

n8n validates the key when you save the credential.

## How jobs work

Most media operations create an **asynchronous job**. Every job-creating operation shares a **Job Options** group:

| Option | Default | Description |
|--------|---------|-------------|
| **Wait for Completion** | `true` | Poll the job until it finishes and return the completed job JSON (its `result` field is the output **file ID**). Turn off to return the raw `JobResponse` (with the job `id`) and poll yourself with **Job → Get**. |
| **Download Result as Binary** | `false` | Also download the result file and attach it as **binary** (`data`). Off by default — fetch the file anytime with **File → Download** instead. Only applies while Wait for Completion is on. |
| **Create as Draft** | `false` | Create the job without queueing it. Run it later with **Job → Queue**. (Draft implies "don't wait".) |
| **Polling Interval (Ms)** | `2000` | How often to check job status while waiting. |
| **Timeout (Ms)** | `1800000` | Maximum time to wait for completion (default 30 min). |

A job's output is a **file ID** (`result`). To chain operations, pass that ID into the next operation's file input — the file stays on Video API's servers (upload once, download once at the end).

## Operations

### Video

The three **AI** operations are self-contained: their **Input Mode** accepts **File IDs**, **Binary** (auto-uploaded), or a **URL** (auto-pulled), so a single node can take a source and return a finished video. The URL/Pull download must point to a **direct media file** — a YouTube or web-page URL won't work, and only download content you have the rights to.

| Operation | Description |
|-----------|-------------|
| **AI Cut** | Create a new video by AI-cutting sequences from one or more videos, guided by a prompt. |
| **AI Sequence Extraction** | Extract video sequences from a video by prompt. |
| **AI Social Media Compose** | Compose a social-media video with AI voice-over, music and subtitles. |
| **Caption** | Burn given subtitle text into a video. |
| **Cut** | Cut and merge specific video sequences. |
| **Extract Audio** | Extract the audio track from a video. |
| **Generate Preview** | Generate preview images from a video. |
| **Get Info** | Get video metadata (resolution, duration, FPS…). |
| **Mix In Audio** | Mix an audio file into a video (kept alongside existing audio). |
| **Overlay** | Overlay videos/images over a background video. |
| **Replace Audio** | Replace a video's audio with a given audio file. |
| **Subtitles** | Generate and render subtitles into a video. |
| **Transcode** | Transcode a video to a different format/resolution. |

Non-AI operations take **file IDs** directly — get one with **File → Upload** or **File → Pull** first.

### Audio

| Operation | Description |
|-----------|-------------|
| **Generate From Script** | Text-to-speech voice-over from a script (30 voices). |
| **Get Info** | Get audio metadata (duration). |
| **Transcode** | Convert audio to FLAC / AAC / AAC HQ / MP3. |

### Render

| Operation | Description |
|-----------|-------------|
| **Subtitles** | Render subtitles for an audio or video file (WebM or ZIP). |

### File

| Operation | Description |
|-----------|-------------|
| **Upload** | Upload binary data; returns the file `id`. |
| **Pull** | Download a direct media URL into Video API; returns the resulting file `id`. |
| **Download** | Download a stored file by ID as binary. |
| **Download Zip** | Download multiple files (comma-separated IDs) as a ZIP. |
| **Get Metadata** | Get metadata for a stored file. |
| **Get Download Token** | Get a short-lived download token. |
| **Delete** | Permanently delete a stored file. |

### Job

| Operation | Description |
|-----------|-------------|
| **Get** | Get all information about a job. |
| **List** | List jobs (with page/size/status filters). |
| **Queue** | Transition a `DRAFT` job to `SCHEDULED`. |
| **Delete Draft** | Delete a `DRAFT` job. |

## Example workflows

The [`examples/`](examples/) folder has ready-to-import workflows for the AI operations. Each is a single **Video API** node (Input Mode = URL, Wait for Completion = on, Download Result as Binary = on) that returns the finished file as binary (`data`) — import one, select your Video API credential, and run:

- [`ai-cut.json`](examples/ai-cut.json) — AI-cut a video into a short clip from a prompt.
- [`ai-sequence-extraction.json`](examples/ai-sequence-extraction.json) — extract sequences from a video by prompt.
- [`ai-social-media-compose.json`](examples/ai-social-media-compose.json) — compose a portrait social-media video with voice-over, music and subtitles.

For long videos, swap Wait-on for the poll-loop in **Tips & gotchas** below.

## Tips & gotchas

### Chaining file IDs
The ID fields default to `={{ $json.result }}`, which grabs the file ID from the previous node automatically. Where the ID lives depends on the upstream node:

- After a **job** (AI Cut, Transcode, Pull…) or **Job → Get** → it's in `result`. Its `id` is the **job** ID, not the file.
- After **File → Upload** or **Get Metadata** → it's in `id` (no `result`). Use `={{ $json.id }}` there.
- After **File → Download** → it's in `fileId`.

Override the field anytime; the default is just a convenience for the common case.

### Operations with two inputs (Replace Audio, Mix In Audio, Overlay)
These need **two different files** (e.g. a video **and** an audio). `$json` only refers to the *one* node immediately before, so the auto-default can only fill **one** field correctly — if you leave both on the default they'd point at the **same** file.

Set the second input from its own source using a **named-node reference**:

```
Replace Audio
  Video File ID  = {{ $('Pull Video').item.json.result }}
  Audio File ID  = {{ $('Generate From Script').item.json.result }}
```

(Use `.id` instead of `.result` when the referenced node is a File → Upload.)

### Get Info doesn't return an ID
`Get Info` outputs only metadata (no `id`/`result`), so it **breaks** an ID chain. Put it on a **side branch** off the node whose file you want to inspect, not in the middle of the chain.

### Long-running jobs / large videos
**Wait for Completion = on** blocks the node until the job finishes (capped by the Timeout, default 30 min) and ties up an n8n worker. For big AI renders, use **fire-and-forget + a poll loop** instead:

```
File: Pull/Upload → AI Cut (Input Mode = File IDs, Wait OFF) → Job: Get ◄─────┐
                                                                  │           │
                                                                  ▼           │
                                                          IF status==DONE?    │
                                                          ┌──┴──┐             │
                                                       true│     │false        │
                                                          ▼     ▼             │
                                                  File: Download  Wait 30s ────┘
```

- **AI Cut → Wait OFF** returns the job (`id`) immediately, no blocking, no binary.
- **Job → Get** (`Job ID = {{ $json.id }}`) → **IF** (`{{ $json.status }} == DONE`) → on *false* a **Wait** node (15–30 s) loops back to Job → Get.
- On *true*, **File → Download** (`{{ $json.result }}`) fetches the finished video.
- Pre-resolve the source to a **file ID** (Pull/Upload) and feed AI Cut via **Input Mode = File IDs** — then nothing inside the AI node blocks (URL/Binary modes still pull/upload the source synchronously first).
- Robustness: also branch on `{{ $json.errorReason }} != NONE` so a failed job doesn't loop forever, and optionally stop after N polls.

### Other notes
- **Binary output is opt-in** — jobs return JSON by default (the file ID is in `result`). Turn on **Download Result as Binary** to also get the file as `data`, or fetch it anytime with **File → Download**.
- **Create as Draft = on** doesn't queue the job, so the node won't wait — run it later with **Job → Queue**.

## Credits

Operations consume credits from your Video API account (e.g. AI Cut: 1 credit per 60 s of input; voice generation: 1 credit per 1000 tokens). The returned `JobResponse` includes `estimatedCosts` and `paidCredits`.

## Development

```bash
git clone https://github.com/mobiuscode-com/n8n-nodes-videoapi.git
cd n8n-nodes-videoapi
npm install
npm run build          # tsc + copies icons into dist/
```

To test against a local n8n, point n8n at the build output and start it:

```bash
export N8N_CUSTOM_EXTENSIONS="$(pwd)/dist"
n8n start              # http://localhost:5678
```

Rebuild and restart n8n after changes. Source lives in `nodes/` and `credentials/`; `dist/` is generated.

## Releases

Publishing is automated with [semantic-release](https://github.com/semantic-release/semantic-release): every push to `main` derives the next version from the commit messages ([Conventional Commits](https://www.conventionalcommits.org)), tags it, creates a GitHub release and publishes to npm.

- `fix: …` → patch release (1.0.0 → 1.0.1)
- `feat: …` → minor release (1.0.0 → 1.1.0)
- `feat!: …` or `BREAKING CHANGE:` footer → major release (→ 2.0.0)
- `chore: …`, `docs: …`, … → no release

## License

[MIT](LICENSE.md)

## Resources

- [Video API documentation](https://video-api.io)
- [n8n community nodes](https://docs.n8n.io/integrations/community-nodes/)
