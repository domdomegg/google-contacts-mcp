import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	resourceName: z.string().describe('The resource name of the contact group (e.g., "contactGroups/1234")'),
	resourceNamesToAdd: z.array(z.string()).optional().describe('Resource names of contacts to add to the group (e.g., "people/c12345")'),
	resourceNamesToRemove: z.array(z.string()).optional().describe('Resource names of contacts to remove from the group (e.g., "people/c12345")'),
}, {});

const outputSchema = z.object({
	notFoundResourceNames: z.array(z.string()).optional(),
}).passthrough();

export function registerContactGroupMembersModify(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_group_members_modify',
		{
			title: 'Modify contact group members',
			description: 'Add or remove contacts from a contact group. Use this to manage which contacts belong to a group/label.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
			},
		},
		async ({resourceName, resourceNamesToAdd, resourceNamesToRemove}) => {
			const body = {
				resourceNamesToAdd,
				resourceNamesToRemove,
			};

			const result = await makePeopleApiCall('POST', `/${resourceName}:modify`, config.token, body);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
