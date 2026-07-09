import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	resourceName: z.string().describe('The resource name of the contact (e.g., "people/c12345")'),
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

export function registerContactPhotoDelete(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_photo_delete',
		{
			title: 'Delete contact photo',
			description: 'Remove the photo from a contact, reverting to the default avatar.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
			},
		},
		async ({resourceName}) => {
			const result = await makePeopleApiCall('DELETE', `/${resourceName}:deleteContactPhoto`, config.token);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
