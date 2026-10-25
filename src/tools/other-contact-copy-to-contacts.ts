import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	resourceName: z.string().describe('The resource name of the other contact to copy (e.g., "otherContacts/c12345")'),
}, {});

const outputSchema = z.object({
	resourceName: z.string(),
	etag: z.string().optional(),
	names: z.array(z.object({
		displayName: z.string().optional(),
		givenName: z.string().optional(),
		familyName: z.string().optional(),
	})).optional(),
	emailAddresses: z.array(z.object({
		value: z.string().optional(),
		type: z.string().optional(),
	})).optional(),
	phoneNumbers: z.array(z.object({
		value: z.string().optional(),
		type: z.string().optional(),
	})).optional(),
}).passthrough();

export function registerOtherContactCopyToContacts(server: McpServer, config: Config): void {
	server.registerTool(
		'other_contact_copy_to_contacts',
		{
			title: 'Copy other contact to contacts',
			description: 'Save an "other contact" as a regular contact (copies its names, emails, and phone numbers into "My Contacts"). Returns the new contact, whose people/... resource name and etag can be used with contact_update.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
			},
		},
		async ({resourceName}) => {
			const result = await makePeopleApiCall('POST', `/${resourceName}:copyOtherContactToMyContactsGroup`, config.token, {
				copyMask: 'names,emailAddresses,phoneNumbers',
				readMask: 'names,emailAddresses,phoneNumbers',
			});
			return jsonResult(outputSchema.parse(result));
		},
	);
}
