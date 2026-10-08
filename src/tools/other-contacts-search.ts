import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	query: z.string().describe('Search query - prefix-matches against names, email addresses, and phone numbers'),
	pageSize: z.number().min(1).max(30).default(10).describe('Maximum number of results (max 30)'),
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
	results: z.array(z.object({
		person: personSchema,
	})).optional(),
});

export function registerOtherContactsSearch(server: McpServer, config: Config): void {
	server.registerTool(
		'other_contacts_search',
		{
			title: 'Search other contacts',
			description: 'Search "other contacts" (people the user has interacted with but not saved) by name, email, or phone number. The first search after a while can return no results while Google warms its cache; retry once if a search unexpectedly comes back empty.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({query, pageSize}) => {
			const params = new URLSearchParams();
			params.set('query', query);
			params.set('readMask', 'names,emailAddresses,phoneNumbers');
			params.set('pageSize', String(pageSize));

			const result = await makePeopleApiCall('GET', `/otherContacts:search?${params.toString()}`, config.token);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
