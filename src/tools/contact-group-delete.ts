import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	resourceName: z.string().describe('The resource name of the contact group to delete (e.g., "contactGroups/1234")'),
	deleteContacts: z.boolean().default(false).describe('If true, also permanently delete the contacts that are members of this group (defaults to false, which only removes the group/label)'),
}, {});

const outputSchema = z.object({
	success: z.boolean(),
	message: z.string(),
});

export function registerContactGroupDelete(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_group_delete',
		{
			title: 'Delete contact group',
			description: 'Permanently delete a contact group. System groups (e.g. "My Contacts", "Starred") cannot be deleted. By default this only removes the group/label; pass deleteContacts=true to also delete the member contacts.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
			},
		},
		async ({resourceName, deleteContacts}) => {
			const params = new URLSearchParams();
			params.set('deleteContacts', String(deleteContacts));

			await makePeopleApiCall('DELETE', `/${resourceName}?${params.toString()}`, config.token);
			return jsonResult({success: true, message: `Contact group ${resourceName} deleted successfully`});
		},
	);
}
