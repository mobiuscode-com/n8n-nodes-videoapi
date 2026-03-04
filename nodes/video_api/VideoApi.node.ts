import {
  IBinaryData,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
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

const API_BASE = 'https://api.video-api.io';

async function uploadFileToApi(
  context: IExecuteFunctions,
  itemIndex: number,
  binaryPropertyName: string,
): Promise<any> {
  const binaryData = context.helpers.assertBinaryData(itemIndex, binaryPropertyName);
  const fileBuffer = await context.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
  const fileName = binaryData.fileName || 'upload.mp4';

  // Uses the legacy requestWithAuthentication helper because it correctly handles
  // multipart/form-data via the `formData` option (axios-based httpRequestWithAuthentication does not).
  const response = await context.helpers.requestWithAuthentication.call(
    context,
    'videoApiCredentials',
    {
      method: 'POST',
      uri: `${API_BASE}/v1/file`,
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

async function pollJob(
  context: IExecuteFunctions,
  jobId: string,
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
      'videoApiCredentials',
      {
        method: 'GET',
        url: `${API_BASE}/v1/job/${jobId}`,
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

export class VideoApi implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Video API',
    name: 'videoApi',
    icon: 'file:video-api-logo.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Process videos with Video API - AI cutting, transcoding, audio extraction and more',
    documentationUrl: 'https://video-api.io',
    defaults: {
      name: 'Video API',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'videoApiCredentials',
        required: true,
      },
    ],

    properties: [
      // Operation selection
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Upload File',
            value: 'uploadFile',
            description: 'Upload a video or audio file to Video API',
            action: 'Upload a file',
          },
          {
            name: 'AI Cut',
            value: 'aiCut',
            description: 'Cut and merge videos using AI based on a prompt',
            action: 'AI cut a video',
          },
        ],
        default: 'uploadFile',
      },

      // === Upload File fields ===
      {
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        required: true,
        displayOptions: {
          show: {
            operation: ['uploadFile'],
          },
        },
        description: 'Name of the binary property containing the file to upload',
        placeholder: 'data',
      },

      // === AI Cut fields ===

      // Input mode selector
      {
        displayName: 'Input Mode',
        name: 'inputMode',
        type: 'options',
        options: [
          {
            name: 'Use File IDs',
            value: 'fileIds',
            description: 'Specify Video API file IDs directly',
          },
          {
            name: 'Use Binary Input',
            value: 'binaryInput',
            description: 'Upload binary data from previous node automatically',
          },
          {
            name: 'Use URL',
            value: 'url',
            description: 'Provide a video URL — the API downloads it directly',
          },
        ],
        default: 'fileIds',
        displayOptions: {
          show: {
            operation: ['aiCut'],
          },
        },
        description: 'How to provide video files for AI cutting',
      },

      // Binary property name for auto-upload
      {
        displayName: 'Binary Property',
        name: 'binaryPropertyNameAiCut',
        type: 'string',
        default: 'data',
        required: true,
        displayOptions: {
          show: {
            operation: ['aiCut'],
            inputMode: ['binaryInput'],
          },
        },
        description: 'Name of the binary property containing the video to upload. Comma-separated for multiple files.',
        placeholder: 'data',
      },

      // Video URL for pull mode
      {
        displayName: 'Video URL',
        name: 'videoUrl',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['aiCut'],
            inputMode: ['url'],
          },
        },
        description: 'URL of the video file to download and process',
        placeholder: 'https://example.com/video.mp4',
      },

      // Video File IDs (fixedCollection)
      {
        displayName: 'Video Files',
        name: 'videoFileIds',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        default: {},
        required: true,
        displayOptions: {
          show: {
            operation: ['aiCut'],
            inputMode: ['fileIds'],
          },
        },
        description: 'Video files to use for AI cutting',
        options: [
          {
            displayName: 'Video',
            name: 'video',
            values: [
              {
                displayName: 'Video File ID',
                name: 'videoFileId',
                type: 'string',
                default: '',
                required: true,
                description: 'UUID of a video file from Video API',
                placeholder: 'c133127b-2ca0-4de0-ab03-6ff31672c8dc',
              },
            ],
          },
        ],
      },

      // Prompt
      {
        displayName: 'Prompt',
        name: 'prompt',
        type: 'string',
        typeOptions: {
          rows: 4,
        },
        default: '',
        required: true,
        displayOptions: {
          show: {
            operation: ['aiCut'],
          },
        },
        description: 'Prompt for the AI to know how the final video should look like',
        placeholder: 'Create a fast-paced 20 seconds trailer from the given video',
      },

      // Resolution preset
      {
        displayName: 'Resolution',
        name: 'resolution',
        type: 'options',
        options: [
          {
            name: '1080p (1920x1080)',
            value: '1080p',
          },
          {
            name: '720p (1280x720)',
            value: '720p',
          },
          {
            name: '4K (3840x2160)',
            value: '4k',
          },
          {
            name: 'Reel/Portrait (1080x1920)',
            value: 'reelPortrait',
          },
          {
            name: 'Custom',
            value: 'custom',
          },
        ],
        default: '1080p',
        required: true,
        displayOptions: {
          show: {
            operation: ['aiCut'],
          },
        },
        description: 'Output video resolution preset',
      },

      // Custom width
      {
        displayName: 'Output Width',
        name: 'outputWidth',
        type: 'number',
        default: 1920,
        required: true,
        typeOptions: {
          minValue: 128,
          maxValue: 3840,
        },
        displayOptions: {
          show: {
            operation: ['aiCut'],
            resolution: ['custom'],
          },
        },
        description: 'Width of the output video in pixels (128-3840)',
      },

      // Custom height
      {
        displayName: 'Output Height',
        name: 'outputHeight',
        type: 'number',
        default: 1080,
        required: true,
        typeOptions: {
          minValue: 128,
          maxValue: 2160,
        },
        displayOptions: {
          show: {
            operation: ['aiCut'],
            resolution: ['custom'],
          },
        },
        description: 'Height of the output video in pixels (128-2160)',
      },

      // Output FPS
      {
        displayName: 'Output FPS',
        name: 'outputFps',
        type: 'number',
        default: 24,
        required: true,
        typeOptions: {
          minValue: 1,
          maxValue: 120,
        },
        displayOptions: {
          show: {
            operation: ['aiCut'],
          },
        },
        description: 'Frames per second (FPS) of the resulting video',
      },

      // Output Format
      {
        displayName: 'Output Format',
        name: 'outputFormat',
        type: 'options',
        options: [
          {
            name: 'H265 Lossless',
            value: 'H265_LOSSLESS',
            description: 'Highest quality, largest file size',
          },
          {
            name: 'H265',
            value: 'H265',
            description: 'High quality, moderate file size',
          },
          {
            name: 'H265 Small',
            value: 'H265_SMALL',
            description: 'Good quality, smaller file size',
          },
          {
            name: 'H265 Smaller',
            value: 'H265_SMALLER',
            description: 'Acceptable quality, smallest file size',
          },
        ],
        default: 'H265_LOSSLESS',
        required: true,
        displayOptions: {
          show: {
            operation: ['aiCut'],
          },
        },
        description: 'Output format for audio and video of the resulting video',
      },

      // Advanced Options
      {
        displayName: 'Advanced Options',
        name: 'advancedOptions',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions: {
          show: {
            operation: ['aiCut'],
          },
        },
        options: [
          {
            displayName: 'Polling Interval (ms)',
            name: 'pollingInterval',
            type: 'number',
            default: 2000,
            description: 'How often to check job status in milliseconds',
            typeOptions: {
              minValue: 500,
            },
          },
          {
            displayName: 'Timeout (ms)',
            name: 'timeout',
            type: 'number',
            default: 300000,
            description: 'Maximum time to wait for job completion (5 minutes = 300000ms)',
            typeOptions: {
              minValue: 10000,
            },
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;

        if (operation === 'uploadFile') {
          const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
          const uploadResponse = await uploadFileToApi(this, i, binaryPropertyName);

          returnData.push({
            json: uploadResponse,
            pairedItem: { item: i },
          });

        } else if (operation === 'aiCut') {
          const inputMode = this.getNodeParameter('inputMode', i) as string;
          const advancedOptions = this.getNodeParameter('advancedOptions', i) as {
            pollingInterval?: number;
            timeout?: number;
          };
          const pollingInterval = advancedOptions.pollingInterval ?? 2000;
          const timeout = advancedOptions.timeout ?? 300000;

          // --- Gather video file IDs ---
          let videoFileIds: string[] = [];

          if (inputMode === 'binaryInput') {
            const binaryPropertyNames = (this.getNodeParameter('binaryPropertyNameAiCut', i) as string)
              .split(',')
              .map(n => n.trim())
              .filter(n => n.length > 0);

            for (const propName of binaryPropertyNames) {
              const resp = await uploadFileToApi(this, i, propName);
              videoFileIds.push(resp.id as string);
            }

          } else if (inputMode === 'url') {
            const videoUrl = this.getNodeParameter('videoUrl', i) as string;

            const pullResponse = await this.helpers.httpRequestWithAuthentication.call(
              this,
              'videoApiCredentials',
              {
                method: 'POST',
                url: `${API_BASE}/v1/file/pull`,
                body: { url: videoUrl },
                json: true,
              },
            );

            const pullJob = await pollJob(this, pullResponse.id as string, pollingInterval, timeout);
            videoFileIds.push(pullJob.result as string);

          } else {
            const videoFileIdsData = this.getNodeParameter('videoFileIds', i) as {
              video?: Array<{ videoFileId: string }>;
            };
            videoFileIds = videoFileIdsData.video?.map(v => v.videoFileId).filter(id => id.length > 0) || [];
          }

          if (videoFileIds.length === 0) {
            throw new NodeOperationError(this.getNode(), 'At least one video file ID is required');
          }

          if (videoFileIds.length > 10) {
            throw new NodeOperationError(this.getNode(), 'Maximum of 10 video file IDs allowed');
          }

          // --- Resolve resolution ---
          const resolution = this.getNodeParameter('resolution', i) as string;
          let outputWidth: number;
          let outputHeight: number;

          switch (resolution) {
            case '720p':    outputWidth = 1280; outputHeight = 720;  break;
            case '4k':      outputWidth = 3840; outputHeight = 2160; break;
            case 'reelPortrait': outputWidth = 1080; outputHeight = 1920; break;
            case 'custom':
              outputWidth = this.getNodeParameter('outputWidth', i) as number;
              outputHeight = this.getNodeParameter('outputHeight', i) as number;
              break;
            case '1080p':
            default:        outputWidth = 1920; outputHeight = 1080; break;
          }

          // Step 1: Start AI cut job
          const cutResponse = await this.helpers.httpRequestWithAuthentication.call(
            this,
            'videoApiCredentials',
            {
              method: 'POST',
              url: `${API_BASE}/v1/video/ai/cut`,
              body: {
                outputSize: { width: outputWidth, height: outputHeight },
                outputFps: this.getNodeParameter('outputFps', i) as number,
                outputFormat: this.getNodeParameter('outputFormat', i) as string,
                videoFileIds,
                prompt: this.getNodeParameter('prompt', i) as string,
              },
              json: true,
            },
          );

          // Step 2: Poll for job completion
          const job = await pollJob(this, cutResponse.id as string, pollingInterval, timeout);

          // Step 3: Download result file as binary
          let binaryOutput: Record<string, IBinaryData> | undefined;
          const resultFileId = job.result as string | undefined;

          if (resultFileId) {
            const [metaData, fileBuffer] = await Promise.all([
              this.helpers.httpRequestWithAuthentication.call(
                this,
                'videoApiCredentials',
                {
                  method: 'GET',
                  url: `${API_BASE}/v1/file/${resultFileId}/meta-data`,
                  json: true,
                },
              ),
              this.helpers.httpRequestWithAuthentication.call(
                this,
                'videoApiCredentials',
                {
                  method: 'GET',
                  url: `${API_BASE}/v1/file/${resultFileId}`,
                  encoding: 'arraybuffer',
                  json: false,
                },
              ),
            ]);

            const binaryData = await this.helpers.prepareBinaryData(
              Buffer.from(fileBuffer as ArrayBuffer),
              (metaData.fileName as string) || 'output.mp4',
              (metaData.contentType as string) || 'video/mp4',
            );

            binaryOutput = { data: binaryData };
          }

          // Step 4: Return job data + binary
          returnData.push({
            json: job,
            binary: binaryOutput,
            pairedItem: { item: i },
          });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { success: false, error: error instanceof Error ? error.message : String(error) },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
