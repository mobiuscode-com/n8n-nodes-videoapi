import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class VideoApiCredentials implements ICredentialType {
  name = 'videoApiCredentials';
  displayName = 'Video API';
  documentationUrl = 'https://video-api.io';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Your Video API key, sent as the x-api-key header',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.video-api.io',
      description: 'Video API base URL. Change this for self-hosted or local instances.',
      placeholder: 'https://api.video-api.io',
    },
  ];
  
  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        'x-api-key': '={{$credentials.apiKey}}',
      },
    },
  };

  // Lets n8n verify the API key when the credential is saved.
  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{($credentials.baseUrl || "https://api.video-api.io").replace(/\\/+$/, "")}}',
      url: '/v1/job',
      qs: { size: 1 },
    },
  };
}