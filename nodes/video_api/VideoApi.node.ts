import {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

import { videoApiProperties } from './properties';
import {
  apiRequest,
  buildSubtitleStyle,
  checkMaxLength,
  downloadFileAsBinary,
  getBaseUrl,
  resolveFileInput,
  resolveResolution,
  runJobOperation,
  uploadFileToApi,
} from './helpers';

declare const Buffer: {
  from(data: unknown, encoding?: string): Buffer;
  isBuffer(obj: unknown): boolean;
};
interface Buffer {
  length: number;
}

export class VideoApi implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Video API',
    name: 'videoApi',
    icon: 'file:videoapilogo3.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Process videos and audio with Video API — AI cutting, transcoding, subtitles, rendering and more',
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
    properties: videoApiProperties,
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const baseUrl = await getBaseUrl(this);

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        let result: INodeExecutionData;

        switch (operation) {
          // Video — create-job operations
          case 'transcode': {
            const transcodeOptions = this.getNodeParameter('transcodeOptions', i, {}) as IDataObject;
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/video/transcode',
              body: {
                videoFileId: this.getNodeParameter('videoFileId', i),
                outputFormat: this.getNodeParameter('outputFormat', i),
                ...transcodeOptions,
              },
            });
            break;
          }

          case 'addSubtitles': {
            const script = this.getNodeParameter('subtitleScript', i, '') as string;
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/video/subtitles',
              body: {
                videoFileId: this.getNodeParameter('videoFileId', i),
                outputFormat: this.getNodeParameter('outputFormat', i),
                style: buildSubtitleStyle(this, i),
                ...(script ? { script } : {}),
              },
            });
            break;
          }

          case 'replaceAudio': {
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/video/replace-audio',
              body: {
                videoFileId: this.getNodeParameter('videoFileId', i),
                audioFileId: this.getNodeParameter('audioFileId', i),
              },
            });
            break;
          }

          case 'overlay': {
            const overlaysData = this.getNodeParameter('overlays', i, {}) as {
              overlay?: Array<{ videoFileId: string; start?: number; stop?: number; offsetX?: number; offsetY?: number }>;
            };
            const overlays = (overlaysData.overlay || []).map(o => ({
              videoFileId: o.videoFileId,
              start: o.start ?? 0,
              stop: o.stop ?? 0,
              offset: { x: o.offsetX ?? 0, y: o.offsetY ?? 0 },
            }));
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/video/overlay',
              body: {
                backgroundVideoFileId: this.getNodeParameter('backgroundVideoFileId', i),
                outputFormat: this.getNodeParameter('outputFormat', i),
                overlays,
              },
            });
            break;
          }

          case 'mixInAudio': {
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/video/mix-in-audio',
              body: {
                videoFileId: this.getNodeParameter('videoFileId', i),
                audioFileId: this.getNodeParameter('audioFileId', i),
                audioVolume: this.getNodeParameter('audioVolume', i),
              },
            });
            break;
          }

          case 'generatePreview': {
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/video/generate-preview',
              body: {
                videoFileId: this.getNodeParameter('videoFileId', i),
                offset: this.getNodeParameter('offset', i),
                offsetBetweenImages: this.getNodeParameter('offsetBetweenImages', i),
                targetWidth: this.getNodeParameter('targetWidth', i),
                maxAmount: this.getNodeParameter('maxAmount', i),
                outputType: this.getNodeParameter('previewOutputType', i),
              },
            });
            break;
          }

          case 'extractAudio': {
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/video/extract-audio',
              body: {
                videoFileId: this.getNodeParameter('videoFileId', i),
                audioFormat: this.getNodeParameter('audioOutputFormat', i),
              },
            });
            break;
          }

          case 'cut': {
            const sequencesData = this.getNodeParameter('sequences', i, {}) as {
              sequence?: Array<{ videoFileId: string; start: number; end?: number; cropOffsetX?: number; cropOffsetY?: number }>;
            };
            const sequences = (sequencesData.sequence || []).map(s => ({
              videoFileId: s.videoFileId,
              start: s.start,
              ...(s.end ? { end: s.end } : {}),
              ...(s.cropOffsetX || s.cropOffsetY ? { cropOffset: { x: s.cropOffsetX ?? 0, y: s.cropOffsetY ?? 0 } } : {}),
            }));
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/video/cut',
              body: {
                sequences,
                outputSize: resolveResolution(this, i),
                outputFps: this.getNodeParameter('outputFps', i),
                outputFormat: this.getNodeParameter('outputFormat', i),
              },
            });
            break;
          }

          case 'caption': {
            const subtitle = this.getNodeParameter('subtitle', i) as string;
            checkMaxLength(this, subtitle, 'Subtitle Text');
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/video/caption',
              body: {
                videoFileId: this.getNodeParameter('videoFileId', i),
                outputFormat: this.getNodeParameter('outputFormat', i),
                subtitle,
                subtitleSpeedFactor: this.getNodeParameter('subtitleSpeedFactor', i),
                subtitleStyle: buildSubtitleStyle(this, i),
                lengthPrecedence: this.getNodeParameter('lengthPrecedence', i),
              },
            });
            break;
          }

          // Video — AI operations
          case 'aiSplit': {
            const fileIds = await resolveFileInput(this, i, baseUrl);
            if (fileIds.length === 0) {
              throw new NodeOperationError(this.getNode(), 'At least one video file is required');
            }
            const prompt = this.getNodeParameter('prompt', i) as string;
            checkMaxLength(this, prompt, 'Prompt');
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/video/ai/split',
              body: {
                videoFileId: fileIds[0],
                prompt,
              },
            });
            break;
          }

          case 'aiCut': {
            const fileIds = await resolveFileInput(this, i, baseUrl);
            if (fileIds.length === 0) {
              throw new NodeOperationError(this.getNode(), 'At least one video file is required');
            }
            if (fileIds.length > 100) {
              throw new NodeOperationError(this.getNode(), 'A maximum of 100 video files is allowed');
            }
            const prompt = this.getNodeParameter('prompt', i) as string;
            checkMaxLength(this, prompt, 'Prompt');
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/video/ai/cut',
              body: {
                videoFileIds: fileIds,
                outputSize: resolveResolution(this, i),
                outputFps: this.getNodeParameter('outputFps', i),
                outputFormat: this.getNodeParameter('outputFormat', i),
                prompt,
                enableSmartCrop: this.getNodeParameter('enableSmartCrop', i),
              },
            });
            break;
          }

          case 'aiSocialMediaCompose': {
            const fileIds = await resolveFileInput(this, i, baseUrl);
            if (fileIds.length === 0) {
              throw new NodeOperationError(this.getNode(), 'At least one video file is required');
            }
            if (fileIds.length > 100) {
              throw new NodeOperationError(this.getNode(), 'A maximum of 100 video files is allowed');
            }
            const enableSubtitles = this.getNodeParameter('enableSubtitles', i) as boolean;
            const additionalPrompt = this.getNodeParameter('additionalPrompt', i, '') as string;
            const composeScript = this.getNodeParameter('script', i) as string;
            checkMaxLength(this, composeScript, 'Script');
            checkMaxLength(this, additionalPrompt, 'Additional Prompt');
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/video/ai/social-media-compose',
              body: {
                videoFileIds: fileIds,
                outputSize: resolveResolution(this, i),
                outputFps: this.getNodeParameter('outputFps', i),
                outputFormat: this.getNodeParameter('outputFormat', i),
                script: composeScript,
                voice: this.getNodeParameter('voice', i),
                music: this.getNodeParameter('music', i),
                enableSmartCrop: this.getNodeParameter('enableSmartCrop', i),
                subtitleStyle: enableSubtitles ? buildSubtitleStyle(this, i) : null,
                ...(additionalPrompt ? { additionalPrompt } : {}),
              },
            });
            break;
          }

          // Video — info
          case 'getVideoInfo': {
            const info = await apiRequest(this, baseUrl, 'GET', `/v1/video/${encodeURIComponent(this.getNodeParameter('videoFileId', i) as string)}`);
            result = { json: info, pairedItem: { item: i } };
            break;
          }

          // Audio
          case 'transcodeAudio': {
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/audio/transcode',
              body: {
                audioFileId: this.getNodeParameter('audioFileId', i),
                outputFormat: this.getNodeParameter('audioOutputFormat', i),
              },
            });
            break;
          }

          case 'generateFromScript': {
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/audio/generate/script',
              body: {
                script: this.getNodeParameter('script', i),
                voice: this.getNodeParameter('voice', i),
                outputFormat: this.getNodeParameter('audioOutputFormat', i),
              },
            });
            break;
          }

          case 'getAudioInfo': {
            const info = await apiRequest(this, baseUrl, 'GET', `/v1/audio/${encodeURIComponent(this.getNodeParameter('audioFileId', i) as string)}`);
            result = { json: info, pairedItem: { item: i } };
            break;
          }

          // Render
          case 'renderSubtitles': {
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/render/subtitles',
              body: {
                fileId: this.getNodeParameter('fileId', i),
                renderTarget: {
                  width: this.getNodeParameter('renderWidth', i),
                  fps: this.getNodeParameter('renderFps', i),
                },
                style: buildSubtitleStyle(this, i),
                outputType: this.getNodeParameter('renderOutputType', i),
              },
            });
            break;
          }

          // File
          case 'uploadFile': {
            const uploadResponse = await uploadFileToApi(this, i, baseUrl, this.getNodeParameter('binaryPropertyName', i) as string);
            result = { json: uploadResponse, pairedItem: { item: i } };
            break;
          }

          case 'pullFile': {
            result = await runJobOperation(this, i, baseUrl, {
              path: '/v1/file/pull',
              body: { url: this.getNodeParameter('pullUrl', i) },
              skipDownload: true,
            });
            break;
          }

          case 'downloadFile': {
            const fileId = this.getNodeParameter('fileId', i) as string;
            const binary = await downloadFileAsBinary(this, baseUrl, fileId);
            result = { json: { fileId }, binary, pairedItem: { item: i } };
            break;
          }

          case 'getFileMetaData': {
            const meta = await apiRequest(this, baseUrl, 'GET', `/v1/file/${encodeURIComponent(this.getNodeParameter('fileId', i) as string)}/meta-data`);
            result = { json: meta, pairedItem: { item: i } };
            break;
          }

          case 'deleteFile': {
            await apiRequest(this, baseUrl, 'DELETE', `/v1/file/${encodeURIComponent(this.getNodeParameter('fileId', i) as string)}`, { json: false });
            result = { json: { success: true }, pairedItem: { item: i } };
            break;
          }

          case 'downloadZip': {
            const ids = (this.getNodeParameter('zipFileIds', i) as string)
              .split(',')
              .map(id => id.trim())
              .filter(id => id.length > 0);
            if (ids.length === 0) {
              throw new NodeOperationError(this.getNode(), 'At least one file ID is required');
            }
            const query = ids.map(id => `ids=${encodeURIComponent(id)}`).join('&');
            const zipBuffer = await apiRequest(this, baseUrl, 'GET', `/v1/file/zip?${query}`, {
              encoding: 'arraybuffer',
              json: false,
            });
            const binaryData = await this.helpers.prepareBinaryData(
              Buffer.from(zipBuffer as ArrayBuffer),
              'files.zip',
              'application/zip',
            );
            result = { json: { fileIds: ids }, binary: { data: binaryData }, pairedItem: { item: i } };
            break;
          }

          case 'getDlToken': {
            const token = await apiRequest(this, baseUrl, 'GET', '/v1/file/dl-token');
            result = { json: token, pairedItem: { item: i } };
            break;
          }

          // Job
          case 'getJob': {
            const job = await apiRequest(this, baseUrl, 'GET', `/v1/job/${encodeURIComponent(this.getNodeParameter('jobId', i) as string)}`);
            result = { json: job, pairedItem: { item: i } };
            break;
          }

          case 'listJobs': {
            const filters = this.getNodeParameter('jobFilters', i, {}) as IDataObject;
            const jobs = await apiRequest(this, baseUrl, 'GET', '/v1/job', { qs: filters });
            result = { json: jobs, pairedItem: { item: i } };
            break;
          }

          case 'queueJob': {
            const job = await apiRequest(this, baseUrl, 'POST', `/v1/job/${encodeURIComponent(this.getNodeParameter('jobId', i) as string)}/queue`);
            result = { json: job, pairedItem: { item: i } };
            break;
          }

          case 'deleteDraftJob': {
            await apiRequest(this, baseUrl, 'DELETE', `/v1/job/${encodeURIComponent(this.getNodeParameter('jobId', i) as string)}`, { json: false });
            result = { json: { success: true }, pairedItem: { item: i } };
            break;
          }

          default:
            throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
        }

        returnData.push(result);
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
