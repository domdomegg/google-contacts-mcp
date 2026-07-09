import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	resourceName: z.string().describe('The resource name of the contact (e.g., "people/c12345")'),
	photoBytes: z.string().describe('The photo to set, as base64-encoded JPEG or PNG image bytes'),
}, {});

const outputSchema = z.object({
	person: z.object({
		resourceName: z.string().optional(),
		etag: z.string().optional(),
		photos: z.array(z.object({
			url: z.string().optional(),
			default: z.boolean().optional(),
		})).optional(),
	}).passthrough().optional(),
}).passthrough();

export function registerContactPhotoUpdate(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_photo_update',
		{
			title: 'Update contact photo',
			description: 'Set (or replace) the photo for a contact. Provide the image as base64-encoded JPEG or PNG bytes.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
			},
		},
		async ({resourceName, photoBytes}) => {
			const result = await makePeopleApiCall('POST', `/${resourceName}:updateContactPhoto`, config.token, {photoBytes});
			return jsonResult(outputSchema.parse(result));
		},
	);
}
