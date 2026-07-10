import {
  IBinaryData,
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  NodeOperationError,
} from 'n8n-workflow';

declare function setTimeout(callback: () => void, ms: number): unknown;
declare const Buffer: {
  from(data: unknown, encoding?: string): Buffer;
  isBuffer(obj: unknown): boolean;
};
interface Buffer {
  length: number;
}

export const CREDENTIALS_NAME = 'videoApiCredentials';
export const DEFAULT_BASE_URL = 'https://api.video-api.io';

// Option lists shared with properties.ts.

export const VIDEO_OUTPUT_FORMATS: INodePropertyOptions[] = [
  { name: 'H265 Lossless', value: 'H265_LOSSLESS', description: 'Highest quality, largest file size' },
  { name: 'H265', value: 'H265', description: 'High quality, moderate file size' },
  { name: 'H265 Small', value: 'H265_SMALL', description: 'Good quality, smaller file size' },
  { name: 'H265 Smaller', value: 'H265_SMALLER', description: 'Acceptable quality, smallest file size' },
];

export const AUDIO_FORMATS: INodePropertyOptions[] = [
  { name: 'FLAC', value: 'FLAC' },
  { name: 'AAC HQ', value: 'AAC_HQ' },
  { name: 'AAC', value: 'AAC' },
  { name: 'MP3', value: 'MP3' },
];

export const SUBTITLE_TYPES: INodePropertyOptions[] = [
  { name: 'Simple', value: 'SIMPLE' },
  { name: 'No Highlight', value: 'NO_HIGHLIGHT' },
  { name: 'Simple Sine', value: 'SIMPLE_SINE' },
];

export const FONT_NAMES: INodePropertyOptions[] = [
  'MONTSERRAT_SEMIBOLD', 'MONTSERRAT_BLACK', 'MONTSERRAT_BOLD', 'MONTSERRAT_LIGHT', 'MONTSERRAT_REGULAR',
  'QUICKSAND_REGULAR', 'QUICKSAND_MEDIUM', 'QUICKSAND_BOLD', 'QUICKSAND_LIGHT', 'QUICKSAND_SEMIBOLD',
].map(v => ({ name: v.replace(/_/g, ' '), value: v }));

export const VOICES: INodePropertyOptions[] = [
  'JILLIAN', 'MARCUS', 'ETHAN', 'ANDREA', 'OLIVER', 'RYAN', 'ELENA', 'ZARA', 'ALEX', 'JAMES',
  'CLAIRE', 'DAVID', 'VICTOR', 'DIANA', 'GRACE', 'NATALIE', 'MAYA', 'CHLOE', 'JAMIE', 'SOPHIA',
  'LUNA', 'RICHARD', 'HENRY', 'THOMAS', 'STELLA', 'EMMA', 'SARAH', 'RUBY', 'ROSE', 'JAKE',
].map(v => ({ name: v.charAt(0) + v.slice(1).toLowerCase(), value: v }));

interface JobOptions {
  waitForCompletion?: boolean;
  downloadResult?: boolean;
  draft?: boolean;
  pollingInterval?: number;
  timeout?: number;
}

export interface JobRequestConfig {
  method?: 'POST' | 'GET' | 'DELETE';
  path: string;
  query?: IDataObject;
  body?: unknown;
  // Poll to completion but skip downloading the result (File: Pull only needs the file ID).
  skipDownload?: boolean;
}

// Max length the API accepts for prompt/script/subtitle fields.
export const MAX_TEXT_LENGTH = 8000;

export function checkMaxLength(
  context: IExecuteFunctions,
  value: string,
  fieldLabel: string,
  max = MAX_TEXT_LENGTH,
): void {
  if (value.length > max) {
    throw new NodeOperationError(
      context.getNode(),
      `${fieldLabel} is ${value.length} characters, which exceeds the Video API maximum of ${max}.`,
    );
  }
}

export async function getBaseUrl(context: IExecuteFunctions): Promise<string> {
  const credentials = await context.getCredentials(CREDENTIALS_NAME);
  const baseUrl = ((credentials.baseUrl as string) || DEFAULT_BASE_URL).trim();
  return (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

// Authenticated request for the simple (non-job) endpoints.
export async function apiRequest(
  context: IExecuteFunctions,
  baseUrl: string,
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  options: Record<string, unknown> = {},
): Promise<any> {
  return context.helpers.httpRequestWithAuthentication.call(context, CREDENTIALS_NAME, {
    method,
    url: `${baseUrl}${path}`,
    json: true,
    ...options,
  });
}

export async function uploadFileToApi(
  context: IExecuteFunctions,
  itemIndex: number,
  baseUrl: string,
  binaryPropertyName: string,
): Promise<any> {
  const binaryData = context.helpers.assertBinaryData(itemIndex, binaryPropertyName);
  const fileBuffer = await context.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
  const fileName = binaryData.fileName || 'upload.mp4';

  // requestWithAuthentication handles multipart/form-data; httpRequestWithAuthentication does not.
  const response = await context.helpers.requestWithAuthentication.call(
    context,
    CREDENTIALS_NAME,
    {
      method: 'POST',
      uri: `${baseUrl}/v1/file`,
      formData: {
        file: {
          value: fileBuffer,
          options: { filename: fileName },
        },
      },
    },
  );
  return typeof response === 'string' ? JSON.parse(response) : response;
}

export async function pollJob(
  context: IExecuteFunctions,
  jobId: string,
  baseUrl: string,
  pollingInterval: number,
  timeout: number,
): Promise<any> {
  const startTime = Date.now();
  let job: any;

  while (true) {
    if (Date.now() - startTime > timeout) {
      throw new NodeOperationError(
        context.getNode(),
        `Job polling timeout after ${timeout}ms. Job ID: ${jobId}`,
      );
    }

    if (job) {
      await new Promise<void>(resolve => setTimeout(() => resolve(), pollingInterval));
    }

    job = await context.helpers.httpRequestWithAuthentication.call(
      context,
      CREDENTIALS_NAME,
      {
        method: 'GET',
        url: `${baseUrl}/v1/job/${encodeURIComponent(jobId)}`,
        json: true,
      },
    );

    if (job.status === 'DONE') {
      if (job.errorReason && job.errorReason !== 'NONE') {
        throw new NodeOperationError(
          context.getNode(),
          `Job failed (${job.errorReason}): ${job.error || 'Unknown error'}`,
        );
      }
      break;
    }
  }

  return job;
}

export async function downloadFileAsBinary(
  context: IExecuteFunctions,
  baseUrl: string,
  fileId: string,
): Promise<Record<string, IBinaryData>> {
  const [metaData, fileBuffer] = await Promise.all([
    context.helpers.httpRequestWithAuthentication.call(context, CREDENTIALS_NAME, {
      method: 'GET',
      url: `${baseUrl}/v1/file/${encodeURIComponent(fileId)}/meta-data`,
      json: true,
    }),
    context.helpers.httpRequestWithAuthentication.call(context, CREDENTIALS_NAME, {
      method: 'GET',
      url: `${baseUrl}/v1/file/${encodeURIComponent(fileId)}`,
      encoding: 'arraybuffer',
      json: false,
    }),
  ]);

  const binaryData = await context.helpers.prepareBinaryData(
    Buffer.from(fileBuffer as ArrayBuffer),
    (metaData.fileName as string) || 'output.mp4',
    (metaData.contentType as string) || 'application/octet-stream',
  );

  return { data: binaryData };
}

// Submit a job, then either return it immediately or poll to completion and download the result.
export async function runJobOperation(
  context: IExecuteFunctions,
  i: number,
  baseUrl: string,
  config: JobRequestConfig,
): Promise<INodeExecutionData> {
  const jobOptions = context.getNodeParameter('jobOptions', i, {}) as JobOptions;
  // Draft jobs are never queued, so don't poll — return the draft immediately (queue later).
  const wait = jobOptions.waitForCompletion !== false && !jobOptions.draft;
  const pollingInterval = jobOptions.pollingInterval ?? 2000;
  const timeout = jobOptions.timeout ?? 1800000;

  const qs: IDataObject = { ...(config.query || {}) };
  if (jobOptions.draft) {
    qs.draft = true;
  }

  const submitResponse = await context.helpers.httpRequestWithAuthentication.call(
    context,
    CREDENTIALS_NAME,
    {
      method: config.method ?? 'POST',
      url: `${baseUrl}${config.path}`,
      qs,
      body: config.body,
      json: true,
    },
  );

  if (!wait) {
    return { json: submitResponse, pairedItem: { item: i } };
  }

  const job = await pollJob(context, submitResponse.id as string, baseUrl, pollingInterval, timeout);

  let binary: Record<string, IBinaryData> | undefined;
  if (jobOptions.downloadResult && !config.skipDownload && job.result) {
    binary = await downloadFileAsBinary(context, baseUrl, job.result as string);
  }

  return { json: job, binary, pairedItem: { item: i } };
}

export function resolveResolution(
  context: IExecuteFunctions,
  i: number,
): { width: number; height: number } {
  const resolution = context.getNodeParameter('resolution', i) as string;
  switch (resolution) {
    case '720p': return { width: 1280, height: 720 };
    case '4k': return { width: 3840, height: 2160 };
    case 'reelPortrait': return { width: 1080, height: 1920 };
    case 'custom':
      return {
        width: context.getNodeParameter('outputWidth', i) as number,
        height: context.getNodeParameter('outputHeight', i) as number,
      };
    case '1080p':
    default: return { width: 1920, height: 1080 };
  }
}

// Build the nested SubtitleStyle body from the flat collection field.
export function buildSubtitleStyle(
  context: IExecuteFunctions,
  i: number,
  parameterName = 'subtitleStyle',
): any {
  const style = context.getNodeParameter(parameterName, i, {}) as {
    type?: string;
    fontName?: string;
    fontSize?: number;
    fontColor?: string;
    outlineColor?: string;
    highlightColor?: string;
  };

  const font: any = {
    name: style.fontName || 'MONTSERRAT_BOLD',
    size: style.fontSize ?? 24,
    color: style.fontColor || '#FFFFFF',
  };
  if (style.outlineColor) {
    font.outlineColor = style.outlineColor;
  }

  return {
    type: style.type || 'SIMPLE',
    font,
    highlightColor: style.highlightColor || '#FFFF00',
  };
}

// Resolve the AI ops' Input Mode (File IDs / Binary upload / URL pull) into a list of file IDs.
export async function resolveFileInput(
  context: IExecuteFunctions,
  i: number,
  baseUrl: string,
): Promise<string[]> {
  const inputMode = context.getNodeParameter('inputMode', i) as string;
  const jobOptions = context.getNodeParameter('jobOptions', i, {}) as JobOptions;
  const pollingInterval = jobOptions.pollingInterval ?? 2000;
  const timeout = jobOptions.timeout ?? 1800000;

  if (inputMode === 'binaryInput') {
    const propertyNames = (context.getNodeParameter('binaryPropertyNameAiCut', i) as string)
      .split(',')
      .map(n => n.trim())
      .filter(n => n.length > 0);

    const ids: string[] = [];
    for (const propName of propertyNames) {
      const resp = await uploadFileToApi(context, i, baseUrl, propName);
      ids.push(resp.id as string);
    }
    return ids;
  }

  if (inputMode === 'url') {
    const videoUrl = context.getNodeParameter('videoUrl', i) as string;
    const pullResponse = await context.helpers.httpRequestWithAuthentication.call(
      context,
      CREDENTIALS_NAME,
      {
        method: 'POST',
        url: `${baseUrl}/v1/file/pull`,
        body: { url: videoUrl },
        json: true,
      },
    );
    const pullJob = await pollJob(context, pullResponse.id as string, baseUrl, pollingInterval, timeout);
    return [pullJob.result as string];
  }

  const data = context.getNodeParameter('videoFileIds', i) as {
    video?: Array<{ videoFileId: string }>;
  };
  return (data.video || []).map(v => v.videoFileId).filter(id => id && id.length > 0);
}
