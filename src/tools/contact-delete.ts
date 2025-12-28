import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	resourceName: z.string().describe('The resource name of the contact to delete (e.g., "people/c12345")'),
}, {});

const outputSchema = z.object({
	success: z.boolean(),
	message: z.string(),
});

export function registerContactDelete(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_delete',
		{
			title: 'Delete contact',
			description: 'Permanently delete a contact from Google Contacts.',
			inputSchema,
			outputSchema,
		},
		async ({resourceName}) => {
			await makePeopleApiCall('DELETE', `/${resourceName}:deleteContact`, config.token);
			return jsonResult({success: true, message: `Contact ${resourceName} deleted successfully`});
		},
	);
}
