import { INodeProperties } from 'n8n-workflow';
import {
  AUDIO_FORMATS,
  FONT_NAMES,
  SUBTITLE_TYPES,
  VIDEO_OUTPUT_FORMATS,
  VOICES,
} from './helpers';

// Operation value groups (values are globally unique, so fields key off operation alone).
const AI_OPS = ['aiSplit', 'aiCut', 'aiSocialMediaCompose'];
const VIDEO_FORMAT_OPS = ['transcode', 'addSubtitles', 'overlay', 'cut', 'caption', 'aiCut', 'aiSocialMediaCompose'];
const RESOLUTION_OPS = ['cut', 'aiCut', 'aiSocialMediaCompose'];
// Single, unambiguous video input — safe to auto-default to the previous node's file ID.
const CLEAR_VIDEO_ID_OPS = ['transcode', 'addSubtitles', 'generatePreview', 'extractAudio', 'caption', 'getVideoInfo'];
// Operations combining two *different* files (video + audio) — no auto-default; pick each source explicitly.
const TWO_INPUT_VIDEO_OPS = ['replaceAudio', 'mixInAudio'];
const AUDIO_ID_OPS = ['replaceAudio', 'mixInAudio', 'transcodeAudio', 'getAudioInfo'];
const AUDIO_FORMAT_OPS = ['extractAudio', 'transcodeAudio', 'generateFromScript'];
const FILE_ID_OPS = ['downloadFile', 'getFileMetaData', 'deleteFile', 'renderSubtitles'];
const JOB_ID_OPS = ['getJob', 'queueJob', 'deleteDraftJob'];

// Async create-job operations (get the shared Job Options).
export const JOB_OPS = [
  'transcode', 'addSubtitles', 'replaceAudio', 'overlay', 'mixInAudio', 'generatePreview',
  'extractAudio', 'cut', 'caption', 'aiSplit', 'aiCut', 'aiSocialMediaCompose',
  'transcodeAudio', 'generateFromScript', 'renderSubtitles', 'pullFile',
];

// displayOptions.show keyed on operation (+ optional extra conditions).
const show = (operation: string[], extra: Record<string, Array<string | boolean | number>> = {}) => ({
  displayOptions: { show: { operation, ...extra } },
});

// Resource + per-resource Operation dropdowns.
const resourceField: INodeProperties = {
  displayName: 'Resource',
  name: 'resource',
  type: 'options',
  noDataExpression: true,
  options: [
    { name: 'Video', value: 'video' },
    { name: 'Audio', value: 'audio' },
    { name: 'Render', value: 'render' },
    { name: 'File', value: 'file' },
    { name: 'Job', value: 'job' },
  ],
  default: 'video',
};

const videoOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: { show: { resource: ['video'] } },
  options: [
    { name: 'AI Cut', value: 'aiCut', action: 'AI cut and merge videos', description: 'Create a new video by AI-cutting sequences from one or more videos based on a prompt' },
    { name: 'AI Sequence Extraction', value: 'aiSplit', action: 'AI extract video sequences', description: 'Extract video sequences from a video by prompt' },
    { name: 'AI Social Media Compose', value: 'aiSocialMediaCompose', action: 'AI compose a social media video', description: 'Create a social media video with voice-over, music and subtitles' },
    { name: 'Caption', value: 'caption', action: 'Caption a video', description: 'Render given text as subtitles burned into the video' },
    { name: 'Cut', value: 'cut', action: 'Cut and merge a video', description: 'Cut and merge video parts as requested' },
    { name: 'Extract Audio', value: 'extractAudio', action: 'Extract audio from a video', description: 'Extract the audio track from a video file' },
    { name: 'Generate Preview', value: 'generatePreview', action: 'Generate preview images', description: 'Generate preview images from a video file' },
    { name: 'Get Info', value: 'getVideoInfo', action: 'Get video info', description: 'Retrieve metadata for a video (resolution, duration, FPS...)' },
    { name: 'Mix In Audio', value: 'mixInAudio', action: 'Mix audio into a video', description: 'Mix an audio file into a video (kept alongside existing audio)' },
    { name: 'Overlay', value: 'overlay', action: 'Overlay videos', description: 'Overlay one or more videos/images over a background video' },
    { name: 'Replace Audio', value: 'replaceAudio', action: 'Replace a video audio', description: 'Replace the audio of a video with a given audio file' },
    { name: 'Subtitles', value: 'addSubtitles', action: 'Add subtitles to a video', description: 'Generate and render subtitles into a video' },
    { name: 'Transcode', value: 'transcode', action: 'Transcode a video', description: 'Transcode a video to a different format/resolution' },
  ],
  default: 'aiCut',
};

const audioOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: { show: { resource: ['audio'] } },
  options: [
    { name: 'Generate From Script', value: 'generateFromScript', action: 'Generate a voiceover from script', description: 'Text-to-speech: generate an AI voice reading a script' },
    { name: 'Get Info', value: 'getAudioInfo', action: 'Get audio info', description: 'Retrieve metadata for an audio file (duration)' },
    { name: 'Transcode', value: 'transcodeAudio', action: 'Transcode audio', description: 'Convert an audio file to a different format' },
  ],
  default: 'generateFromScript',
};

const renderOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: { show: { resource: ['render'] } },
  options: [
    { name: 'Subtitles', value: 'renderSubtitles', action: 'Render subtitles', description: 'Render subtitles for an audio or video file' },
  ],
  default: 'renderSubtitles',
};

const fileOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: { show: { resource: ['file'] } },
  options: [
    { name: 'Delete', value: 'deleteFile', action: 'Delete a file', description: 'Permanently delete a stored file' },
    { name: 'Download', value: 'downloadFile', action: 'Download a file', description: 'Download a stored file by ID as binary' },
    { name: 'Download Zip', value: 'downloadZip', action: 'Download files as zip', description: 'Download multiple files as a single ZIP archive' },
    { name: 'Get Download Token', value: 'getDlToken', action: 'Get a download token', description: 'Get a short-lived file download token' },
    { name: 'Get Metadata', value: 'getFileMetaData', action: 'Get file metadata', description: 'Retrieve metadata for a stored file' },
    { name: 'Pull', value: 'pullFile', action: 'Pull a file from URL', description: 'Download a file from an external URL into Video API' },
    { name: 'Upload', value: 'uploadFile', action: 'Upload a file', description: 'Upload a video or audio file to Video API' },
  ],
  default: 'uploadFile',
};

const jobOperations: INodeProperties = {
  displayName: 'Operation',
  name: 'operation',
  type: 'options',
  noDataExpression: true,
  displayOptions: { show: { resource: ['job'] } },
  options: [
    { name: 'Delete Draft', value: 'deleteDraftJob', action: 'Delete a draft job', description: 'Delete a job in DRAFT status' },
    { name: 'Get', value: 'getJob', action: 'Get a job', description: 'Get all information about a job' },
    { name: 'List', value: 'listJobs', action: 'List jobs', description: 'List jobs for the current user' },
    { name: 'Queue', value: 'queueJob', action: 'Queue a draft job', description: 'Transition a DRAFT job to SCHEDULED' },
  ],
  default: 'getJob',
};

// AI operations — flexible Input Mode (file IDs / binary / URL).
const aiInputFields: INodeProperties[] = [
  {
    displayName: 'Input Mode',
    name: 'inputMode',
    type: 'options',
    options: [
      { name: 'Use File IDs', value: 'fileIds', description: 'Specify Video API file IDs directly' },
      { name: 'Use Binary Input', value: 'binaryInput', description: 'Auto-upload binary data from the previous node' },
      { name: 'Use URL', value: 'url', description: 'Provide a video URL — the API downloads it directly' },
    ],
    default: 'fileIds',
    ...show(AI_OPS),
    description: 'How to provide the video file(s)',
  },
  {
    displayName: 'Binary Property',
    name: 'binaryPropertyNameAiCut',
    type: 'string',
    default: 'data',
    required: true,
    ...show(AI_OPS, { inputMode: ['binaryInput'] }),
    description: 'Name of the binary property containing the video to upload. Comma-separated for multiple files.',
    placeholder: 'data',
  },
  {
    displayName: 'Video URL',
    name: 'videoUrl',
    type: 'string',
    default: '',
    required: true,
    ...show(AI_OPS, { inputMode: ['url'] }),
    description: 'Direct link to the video file (the API downloads it as-is). Must point to an actual media file — a YouTube/web page URL will not work; extract a direct file URL or upload the binary instead.',
    placeholder: 'https://example.com/video.mp4',
  },
  {
    displayName: 'Video Files',
    name: 'videoFileIds',
    type: 'fixedCollection',
    placeholder: 'Add',
    typeOptions: { multipleValues: true },
    default: { video: [{ videoFileId: '={{ $json.result || $json.id }}' }] },
    required: true,
    ...show(AI_OPS, { inputMode: ['fileIds'] }),
    description: 'Video files to use. AI Sequence Extraction uses the first video only.',
    options: [
      {
        displayName: 'Video',
        name: 'video',
        values: [
          {
            displayName: 'Video File ID',
            name: 'videoFileId',
            type: 'string',
            default: '={{ $json.result || $json.id }}',
            required: true,
            description: 'UUID of a video file from Video API. Defaults to the file ID from the previous node — override to set manually.',
            placeholder: 'c133127b-2ca0-4de0-ab03-6ff31672c8dc',
          },
        ],
      },
    ],
  },
];

// Direct file-ID inputs (non-AI operations).
const directIdFields: INodeProperties[] = [
  {
    displayName: 'Video File ID',
    name: 'videoFileId',
    type: 'string',
    default: '={{ $json.result || $json.id }}',
    required: true,
    ...show(CLEAR_VIDEO_ID_OPS),
    description: 'UUID of the video file. Defaults to the file ID from the previous node — override to set manually.',
    placeholder: 'c133127b-2ca0-4de0-ab03-6ff31672c8dc',
  },
  {
    displayName: 'Video File ID',
    name: 'videoFileId',
    type: 'string',
    default: '',
    required: true,
    ...show(TWO_INPUT_VIDEO_OPS),
    description: "UUID of the video file. This op combines two different files (video + audio) — reference the video source explicitly, e.g. {{ $('Pull Video').item.json.result }} (use .id after File → Upload).",
    placeholder: 'c133127b-2ca0-4de0-ab03-6ff31672c8dc',
  },
  {
    displayName: 'Audio File ID',
    name: 'audioFileId',
    type: 'string',
    default: '',
    required: true,
    ...show(AUDIO_ID_OPS),
    description: "UUID of the audio file. Audio usually comes from a separate branch (Generate From Script, an upload, Extract Audio…) — reference it explicitly, e.g. {{ $('Generate From Script').item.json.result }} (use .id after File → Upload).",
  },
  {
    displayName: 'File ID',
    name: 'fileId',
    type: 'string',
    default: '={{ $json.result || $json.id }}',
    required: true,
    ...show(FILE_ID_OPS),
    description: 'UUID of the file',
  },
  {
    displayName: 'Job ID',
    name: 'jobId',
    type: 'string',
    default: '={{ $json.id }}',
    required: true,
    ...show(JOB_ID_OPS),
    description: 'UUID of the job',
  },
];

// Shared output format / resolution / FPS fields.
const outputFields: INodeProperties[] = [
  {
    displayName: 'Output Format',
    name: 'outputFormat',
    type: 'options',
    options: VIDEO_OUTPUT_FORMATS,
    default: 'H265_LOSSLESS',
    required: true,
    ...show(VIDEO_FORMAT_OPS),
    description: 'Output format for the resulting video',
  },
  {
    displayName: 'Audio Format',
    name: 'audioOutputFormat',
    type: 'options',
    options: AUDIO_FORMATS,
    default: 'MP3',
    required: true,
    ...show(AUDIO_FORMAT_OPS),
    description: 'Output audio format',
  },
  {
    displayName: 'Resolution',
    name: 'resolution',
    type: 'options',
    options: [
      { name: '1080p (1920x1080)', value: '1080p' },
      { name: '720p (1280x720)', value: '720p' },
      { name: '4K (3840x2160)', value: '4k' },
      { name: 'Reel/Portrait (1080x1920)', value: 'reelPortrait' },
      { name: 'Custom', value: 'custom' },
    ],
    default: '1080p',
    required: true,
    ...show(RESOLUTION_OPS),
    description: 'Output video resolution preset',
  },
  {
    displayName: 'Output Width',
    name: 'outputWidth',
    type: 'number',
    default: 1920,
    required: true,
    typeOptions: { minValue: 128, maxValue: 3840 },
    ...show(RESOLUTION_OPS, { resolution: ['custom'] }),
    description: 'Width of the output video in pixels (128-3840)',
  },
  {
    displayName: 'Output Height',
    name: 'outputHeight',
    type: 'number',
    default: 1080,
    required: true,
    typeOptions: { minValue: 128, maxValue: 2160 },
    ...show(RESOLUTION_OPS, { resolution: ['custom'] }),
    description: 'Height of the output video in pixels (128-2160)',
  },
  {
    displayName: 'Output FPS',
    name: 'outputFps',
    type: 'number',
    default: 24,
    required: true,
    typeOptions: { minValue: 1, maxValue: 120 },
    ...show(RESOLUTION_OPS),
    description: 'Frames per second of the resulting video',
  },
];

// Per-operation fields.
const subtitleStyleCollection = (operations: string[], extra: Record<string, Array<string | boolean | number>> = {}): INodeProperties => ({
  displayName: 'Subtitle Style',
  name: 'subtitleStyle',
  type: 'collection',
  placeholder: 'Add Style Option',
  default: {},
  ...show(operations, extra),
  options: [
    { displayName: 'Type', name: 'type', type: 'options', options: SUBTITLE_TYPES, default: 'SIMPLE' },
    { displayName: 'Font', name: 'fontName', type: 'options', options: FONT_NAMES, default: 'MONTSERRAT_BOLD' },
    { displayName: 'Font Size', name: 'fontSize', type: 'number', default: 24, typeOptions: { minValue: 1, maxValue: 100 } },
    { displayName: 'Font Color', name: 'fontColor', type: 'color', default: '#FFFFFF' },
    { displayName: 'Outline Color', name: 'outlineColor', type: 'color', default: '' },
    { displayName: 'Highlight Color', name: 'highlightColor', type: 'color', default: '#FFFF00' },
  ],
});

const operationSpecificFields: INodeProperties[] = [
  // --- AI Cut / AI Sequence Extraction prompt ---
  {
    displayName: 'Prompt',
    name: 'prompt',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    required: true,
    ...show(['aiCut', 'aiSplit']),
    description: 'Prompt describing how the final video should look (max 8000 characters)',
    placeholder: 'Create a fast-paced 20 seconds trailer from the given video',
  },
  // --- enableSmartCrop (aiCut + social compose) ---
  {
    displayName: 'Enable Smart Crop',
    name: 'enableSmartCrop',
    type: 'boolean',
    default: true,
    ...show(['aiCut', 'aiSocialMediaCompose']),
    description: 'Whether to use optimal crop (instead of center crop) when changing aspect ratio',
  },
  // --- AI Social Media Compose ---
  {
    displayName: 'Script',
    name: 'script',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    required: true,
    ...show(['aiSocialMediaCompose', 'generateFromScript']),
    description: 'Voice-over script. May include stage directions / instructions. Max 8000 characters for Social Media Compose.',
    placeholder: 'Welcome to our channel! Today we are...',
  },
  {
    displayName: 'Voice',
    name: 'voice',
    type: 'options',
    options: VOICES,
    default: 'JILLIAN',
    required: true,
    ...show(['aiSocialMediaCompose', 'generateFromScript']),
    description: 'AI voice to use for the voice-over',
  },
  {
    displayName: 'Add Music',
    name: 'music',
    type: 'boolean',
    default: true,
    ...show(['aiSocialMediaCompose']),
    description: 'Whether to auto-choose and mix in fitting background music',
  },
  {
    displayName: 'Add Subtitles',
    name: 'enableSubtitles',
    type: 'boolean',
    default: true,
    ...show(['aiSocialMediaCompose']),
    description: 'Whether to render subtitles into the composed video',
  },
  {
    displayName: 'Additional Prompt',
    name: 'additionalPrompt',
    type: 'string',
    typeOptions: { rows: 2 },
    default: '',
    ...show(['aiSocialMediaCompose']),
    description: 'Optional additional prompt for cutting/composing the video',
  },
  subtitleStyleCollection(['aiSocialMediaCompose'], { enableSubtitles: [true] }),

  // --- Subtitle Style for Subtitles / Caption / Render Subtitles ---
  subtitleStyleCollection(['addSubtitles', 'caption', 'renderSubtitles']),

  // --- Subtitles (addSubtitles) ---
  {
    displayName: 'Spelling Script',
    name: 'subtitleScript',
    type: 'string',
    typeOptions: { rows: 2 },
    default: '',
    ...show(['addSubtitles']),
    description: 'Optional script used to auto-correct spelling of generated subtitles',
  },

  // --- Caption ---
  {
    displayName: 'Subtitle Text',
    name: 'subtitle',
    type: 'string',
    typeOptions: { rows: 4 },
    default: '',
    required: true,
    ...show(['caption']),
    description: 'Subtitle text to render (max 8000 characters)',
  },
  {
    displayName: 'Subtitle Speed Factor',
    name: 'subtitleSpeedFactor',
    type: 'number',
    default: 1,
    required: true,
    typeOptions: { minValue: 0.1, maxValue: 10, numberPrecision: 2 },
    ...show(['caption']),
    description: 'Speed multiplier for subtitle timing (0.1-10)',
  },
  {
    displayName: 'Length Precedence',
    name: 'lengthPrecedence',
    type: 'options',
    options: [
      { name: 'Video', value: 'VIDEO', description: 'Output length follows the video' },
      { name: 'Subtitles', value: 'SUBTITLES', description: 'Output length follows the subtitles' },
    ],
    default: 'VIDEO',
    required: true,
    ...show(['caption']),
    description: 'Whether the output length is controlled by the video or the subtitles',
  },

  // --- Replace Audio / Mix In Audio volume ---
  {
    displayName: 'Audio Volume',
    name: 'audioVolume',
    type: 'number',
    default: 100,
    required: true,
    typeOptions: { minValue: 0, maxValue: 100 },
    ...show(['mixInAudio']),
    description: 'Volume of the mixed-in audio (0-100)',
  },

  // --- Transcode (video) optional output options ---
  {
    displayName: 'Transcode Options',
    name: 'transcodeOptions',
    type: 'collection',
    placeholder: 'Add Option',
    default: {},
    ...show(['transcode']),
    options: [
      { displayName: 'Output Width', name: 'outputWidth', type: 'number', default: 0, typeOptions: { minValue: -1, maxValue: 3840 }, description: '0 = keep source, -1 = auto from aspect ratio' },
      { displayName: 'Output Height', name: 'outputHeight', type: 'number', default: 0, typeOptions: { minValue: -1, maxValue: 2160 }, description: '0 = keep source, -1 = auto from aspect ratio' },
      { displayName: 'Output FPS', name: 'outputFps', type: 'number', default: 0, typeOptions: { minValue: 0 }, description: '0 = keep source FPS' },
    ],
  },

  // --- Generate Preview ---
  {
    displayName: 'Start Offset (Seconds)',
    name: 'offset',
    type: 'number',
    default: 0,
    required: true,
    typeOptions: { minValue: 0 },
    ...show(['generatePreview']),
    description: 'Start offset in seconds',
  },
  {
    displayName: 'Offset Between Images (Seconds)',
    name: 'offsetBetweenImages',
    type: 'number',
    default: 1,
    required: true,
    typeOptions: { minValue: 0.1, maxValue: 9999 },
    ...show(['generatePreview']),
    description: 'Seconds between preview images',
  },
  {
    displayName: 'Target Width',
    name: 'targetWidth',
    type: 'number',
    default: 320,
    required: true,
    typeOptions: { minValue: 1, maxValue: 3840 },
    ...show(['generatePreview']),
    description: 'Width of preview images (height auto-calculated)',
  },
  {
    displayName: 'Max Amount',
    name: 'maxAmount',
    type: 'number',
    default: 10,
    required: true,
    typeOptions: { minValue: 1, maxValue: 9999 },
    ...show(['generatePreview']),
    description: 'Maximum number of preview images',
  },
  {
    displayName: 'Output Type',
    name: 'previewOutputType',
    type: 'options',
    options: [
      { name: 'Stitched JPG', value: 'STITCHED_JPG' },
      { name: 'ZIP', value: 'ZIP' },
    ],
    default: 'STITCHED_JPG',
    required: true,
    ...show(['generatePreview']),
    description: 'How preview images are returned',
  },

  // --- Overlay ---
  {
    displayName: 'Background Video File ID',
    name: 'backgroundVideoFileId',
    type: 'string',
    default: '',
    required: true,
    ...show(['overlay']),
    description: "UUID of the background/base video. Overlay combines two different files — reference the background source explicitly, e.g. {{ $('Pull Video').item.json.result }} (use .id after File → Upload).",
  },
  {
    displayName: 'Overlays',
    name: 'overlays',
    type: 'fixedCollection',
    placeholder: 'Add',
    typeOptions: { multipleValues: true },
    default: { overlay: [{ videoFileId: '', start: 0, stop: 0, offsetX: 0, offsetY: 0 }] },
    required: true,
    ...show(['overlay']),
    options: [
      {
        displayName: 'Overlay',
        name: 'overlay',
        values: [
          { displayName: 'Video File ID', name: 'videoFileId', type: 'string', default: '', required: true, description: "UUID of the overlay file — a different file than the background; reference its source explicitly, e.g. {{ $('Upload Logo').item.json.id }}." },
          { displayName: 'Start (Seconds)', name: 'start', type: 'number', default: 0 },
          { displayName: 'Stop (Seconds)', name: 'stop', type: 'number', default: 0 },
          { displayName: 'Offset X', name: 'offsetX', type: 'number', default: 0 },
          { displayName: 'Offset Y', name: 'offsetY', type: 'number', default: 0 },
        ],
      },
    ],
  },

  // --- Cut ---
  {
    displayName: 'Sequences',
    name: 'sequences',
    type: 'fixedCollection',
    placeholder: 'Add',
    typeOptions: { multipleValues: true },
    default: { sequence: [{ videoFileId: '={{ $json.result || $json.id }}', start: 0, end: 0, cropOffsetX: 0, cropOffsetY: 0 }] },
    required: true,
    ...show(['cut']),
    description: 'Video parts to cut and merge in order',
    options: [
      {
        displayName: 'Sequence',
        name: 'sequence',
        values: [
          { displayName: 'Video File ID', name: 'videoFileId', type: 'string', default: '={{ $json.result || $json.id }}', required: true },
          { displayName: 'Start (Seconds)', name: 'start', type: 'number', default: 0, required: true },
          { displayName: 'End (Seconds)', name: 'end', type: 'number', default: 0, description: 'Leave at 0 to go to the end of the clip' },
          { displayName: 'Crop Offset X', name: 'cropOffsetX', type: 'number', default: 0 },
          { displayName: 'Crop Offset Y', name: 'cropOffsetY', type: 'number', default: 0 },
        ],
      },
    ],
  },

  // --- Render Subtitles target ---
  {
    displayName: 'Render Width',
    name: 'renderWidth',
    type: 'number',
    default: 1080,
    required: true,
    typeOptions: { minValue: 128 },
    ...show(['renderSubtitles']),
    description: 'Width of the rendered subtitles output',
  },
  {
    displayName: 'Render FPS',
    name: 'renderFps',
    type: 'number',
    default: 30,
    required: true,
    typeOptions: { minValue: 25, maxValue: 60 },
    ...show(['renderSubtitles']),
    description: 'Frames per second of the rendered output (25-60)',
  },
  {
    displayName: 'Output Type',
    name: 'renderOutputType',
    type: 'options',
    options: [
      { name: 'WebM', value: 'WEB_M' },
      { name: 'ZIP', value: 'ZIP' },
    ],
    default: 'WEB_M',
    required: true,
    ...show(['renderSubtitles']),
    description: 'How the rendered subtitles are returned',
  },
];

// File & Job utility fields.
const fileJobFields: INodeProperties[] = [
  {
    displayName: 'Binary Property',
    name: 'binaryPropertyName',
    type: 'string',
    default: 'data',
    required: true,
    ...show(['uploadFile']),
    description: 'Name of the binary property containing the file to upload',
    placeholder: 'data',
  },
  {
    displayName: 'File URL',
    name: 'pullUrl',
    type: 'string',
    default: '',
    required: true,
    ...show(['pullFile']),
    description: 'Direct link to a media file to download into Video API. Must be the actual file URL — a YouTube/web page link will store the HTML page, not the video.',
    placeholder: 'https://example.com/video.mp4',
  },
  {
    displayName: 'File IDs',
    name: 'zipFileIds',
    type: 'string',
    default: '',
    required: true,
    ...show(['downloadZip']),
    description: 'Comma-separated list of file IDs to include in the ZIP',
  },
  {
    displayName: 'Filters',
    name: 'jobFilters',
    type: 'collection',
    placeholder: 'Add Filter',
    default: {},
    ...show(['listJobs']),
    options: [
      { displayName: 'Page', name: 'page', type: 'number', default: 0, typeOptions: { minValue: 0 } },
      { displayName: 'Size', name: 'size', type: 'number', default: 20, typeOptions: { minValue: 1, maxValue: 20 } },
      {
        displayName: 'Status',
        name: 'status',
        type: 'options',
        options: [
          { name: 'Draft', value: 'DRAFT' },
          { name: 'Scheduled', value: 'SCHEDULED' },
          { name: 'Running', value: 'RUNNING' },
          { name: 'Done', value: 'DONE' },
        ],
        default: 'DONE',
      },
    ],
  },
];

// Shared Job Options (wait / draft / polling).
const jobOptionsField: INodeProperties = {
  displayName: 'Job Options',
  name: 'jobOptions',
  type: 'collection',
  placeholder: 'Add Option',
  default: {},
  ...show(JOB_OPS),
  options: [
    { displayName: 'Wait for Completion', name: 'waitForCompletion', type: 'boolean', default: true, description: 'Whether to poll the job until it finishes and return the completed job (including the result file ID). Turn off for long jobs and poll with a Job → Get loop instead (see README).' },
    { displayName: 'Download Result as Binary', name: 'downloadResult', type: 'boolean', default: false, description: 'Whether to also download the result file and attach it as binary (data). Off by default — the job JSON still contains the result file ID; fetch it later with File → Download. Only applies when Wait for Completion is on.' },
    { displayName: 'Create as Draft', name: 'draft', type: 'boolean', default: false, description: 'Whether to create the job as a draft (not queued). Use Job: Queue to run it later.' },
    { displayName: 'Polling Interval (Ms)', name: 'pollingInterval', type: 'number', default: 2000, typeOptions: { minValue: 500 }, description: 'How often to check job status, in milliseconds' },
    { displayName: 'Timeout (Ms)', name: 'timeout', type: 'number', default: 1800000, typeOptions: { minValue: 10000 }, description: 'Maximum time to wait for job completion, in milliseconds (default 30 min)' },
  ],
};

export const videoApiProperties: INodeProperties[] = [
  resourceField,
  videoOperations,
  audioOperations,
  renderOperations,
  fileOperations,
  jobOperations,
  ...aiInputFields,
  ...directIdFields,
  ...outputFields,
  ...operationSpecificFields,
  ...fileJobFields,
  jobOptionsField,
];
