import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	pageSize: z.number().min(1).max(1000).default(100).describe('Maximum number of other contacts to return'),
	pageToken: z.string().optional().describe('Page token for pagination'),
}, {});

const personSchema = z.object({
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

const outputSchema = z.object({
	otherContacts: z.array(personSchema).optional(),
	nextPageToken: z.string().optional(),
	totalSize: z.number().optional(),
});

export function registerOtherContactsList(server: McpServer, config: Config): void {
	server.registerTool(
		'other_contacts_list',
		{
			title: 'List other contacts',
			description: 'List "other contacts": people the user has interacted with (e.g. emailed) but not saved as contacts. Returns names, emails, and phone numbers. Use other_contact_copy_to_contacts to save one as a contact.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({pageSize, pageToken}) => {
			const params = new URLSearchParams();
			params.set('readMask', 'names,emailAddresses,phoneNumbers');
			params.set('pageSize', String(pageSize));

			if (pageToken) {
				params.set('pageToken', pageToken);
			}

			const result = await makePeopleApiCall('GET', `/otherContacts?${params.toString()}`, config.token);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
