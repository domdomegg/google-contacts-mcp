import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	name: z.string().describe('Name of the new contact group (must be unique)'),
}, {});

const outputSchema = z.object({
	resourceName: z.string(),
	etag: z.string().optional(),
	name: z.string().optional(),
	formattedName: z.string().optional(),
	groupType: z.string().optional(),
	memberCount: z.number().optional(),
}).passthrough();

export function registerContactGroupCreate(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_group_create',
		{
			title: 'Create contact group',
			description: 'Create a new contact group (label) in Google Contacts.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
			},
		},
		async ({name}) => {
			const body = {
				contactGroup: {name},
				readGroupFields: 'name,formattedName,groupType,memberCount',
			};

			const result = await makePeopleApiCall('POST', '/contactGroups', config.token, body);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
