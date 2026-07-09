import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	resourceName: z.string().describe('The resource name of the contact group (e.g., "contactGroups/myContacts" or "contactGroups/1234")'),
	maxMembers: z.number().min(1).max(10000).default(1000).describe('Maximum number of member resource names to return'),
}, {});

const outputSchema = z.object({
	resourceName: z.string(),
	etag: z.string().optional(),
	name: z.string().optional(),
	formattedName: z.string().optional(),
	groupType: z.string().optional(),
	memberCount: z.number().optional(),
	memberResourceNames: z.array(z.string()).optional(),
}).passthrough();

export function registerContactGroupGet(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_group_get',
		{
			title: 'Get contact group',
			description: 'Get detailed information about a single contact group, including its member resource names.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({resourceName, maxMembers}) => {
			const params = new URLSearchParams();
			params.set('maxMembers', String(maxMembers));
			params.set('groupFields', 'name,formattedName,groupType,memberCount,memberResourceNames');

			const result = await makePeopleApiCall('GET', `/${resourceName}?${params.toString()}`, config.token);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
