# n8n-nodes-videoapi

**IMPORTANT: This is still work in progress and not yet ready for production. Use at your own risk.**

This is an n8n community node package for [Video API](https://video-api.io) — an API for AI-powered video processing.

## Features

- **AI Cut** — Cut and merge videos using AI based on a text prompt
- **Upload File** — Upload a video or audio file to Video API

## Installation

Follow the [n8n community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

```
@mobiuscode/n8n-nodes-videoapi
```

## Credentials

You need a Video API key from [video-api.io](https://video-api.io).

In n8n, create a new **Video API** credential and paste your API key.

## Operations

### Upload File

Uploads a video or audio file to Video API and returns the file ID.

**Input:** Binary data from a previous node (e.g. HTTP Request, Read Binary File)
**Output:** JSON with `id`, `fileName`, `size`, `contentType`, `uploadedAt`

### AI Cut

Cuts and merges video using AI based on a prompt. Handles the full job lifecycle — submits the job, polls until complete, and returns the result video as binary data.

**Input modes:**

| Mode | Description |
|------|-------------|
| **Use File IDs** | Provide one or more Video API file UUIDs directly. Use `{{ $json.id }}` to reference a previous Upload File node. |
| **Use Binary Input** | Pass binary data from a previous node — the node uploads it automatically before cutting. |
| **Use URL** | Provide a public video URL — the API downloads it directly, no binary data needed. |

**Parameters:**

| Parameter | Description |
|-----------|-------------|
| Prompt | Text instructions for the AI (max 8000 characters) |
| Resolution | Output resolution preset (720p / 1080p / 4K / Reel Portrait / Custom) |
| Output FPS | Frames per second (1–120, default 24) |
| Output Format | H265 Lossless / H265 / H265 Small / H265 Smaller |

**Output:** JSON (job info including `result` file ID) + binary `data` (the result video)

## Example Workflow

An example workflow is included: `Ai Video Cutting.json`

It demonstrates a simple AI cut pipeline with upload and polling steps.

## Credits

Video processing operations consume credits from your Video API account. AI Cut costs 1 credit per 60 seconds of input video.

## Resources

- [Video API documentation](https://docs.video-api.io)
- [n8n community nodes](https://docs.n8n.io/integrations/community-nodes/)
