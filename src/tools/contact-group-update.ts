import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	resourceName: z.string().describe('The resource name of the contact group to update (e.g., "contactGroups/1234")'),
	etag: z.string().describe('The etag from the contact group (required to prevent conflicts)'),
	name: z.string().describe('New name for the contact group'),
}, {});

const outputSchema = z.object({
	resourceName: z.string(),
	etag: z.string().optional(),
	name: z.string().optional(),
	formattedName: z.string().optional(),
	groupType: z.string().optional(),
	memberCount: z.number().optional(),
}).passthrough();

export function registerContactGroupUpdate(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_group_update',
		{
			title: 'Update contact group',
			description: 'Rename an existing contact group. Use contact_group_get first to retrieve the current etag. System groups (e.g. "My Contacts", "Starred") cannot be renamed.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
			},
		},
		async ({resourceName, etag, name}) => {
			const body = {
				contactGroup: {etag, name},
				readGroupFields: 'name,formattedName,groupType,memberCount',
			};

			const result = await makePeopleApiCall('PUT', `/${resourceName}`, config.token, body);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
