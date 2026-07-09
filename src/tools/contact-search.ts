import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	query: z.string().describe('Search query - matches against names, email addresses, and phone numbers'),
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
	organizations: z.array(z.object({
		name: z.string().optional(),
		title: z.string().optional(),
	})).optional(),
	birthdays: z.array(z.object({
		date: z.object({
			year: z.number().optional(),
			month: z.number().optional(),
			day: z.number().optional(),
		}).optional(),
	})).optional(),
	events: z.array(z.object({
		date: z.object({
			year: z.number().optional(),
			month: z.number().optional(),
			day: z.number().optional(),
		}).optional(),
		type: z.string().optional(),
	})).optional(),
	urls: z.array(z.object({
		value: z.string().optional(),
		type: z.string().optional(),
	})).optional(),
	addresses: z.array(z.object({
		formattedValue: z.string().optional(),
		type: z.string().optional(),
		streetAddress: z.string().optional(),
		city: z.string().optional(),
		region: z.string().optional(),
		postalCode: z.string().optional(),
		country: z.string().optional(),
	})).optional(),
	userDefined: z.array(z.object({
		key: z.string().optional(),
		value: z.string().optional(),
	})).optional(),
	photos: z.array(z.object({
		url: z.string().optional(),
	})).optional(),
	nicknames: z.array(z.object({
		value: z.string().optional(),
		type: z.string().optional(),
	})).optional(),
	relations: z.array(z.object({
		person: z.string().optional(),
		type: z.string().optional(),
	})).optional(),
	imClients: z.array(z.object({
		username: z.string().optional(),
		protocol: z.string().optional(),
		type: z.string().optional(),
	})).optional(),
}).passthrough();

const outputSchema = z.object({
	results: z.array(z.object({
		person: personSchema,
	})).optional(),
});

export function registerContactSearch(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_search',
		{
			title: 'Search contacts',
			description: 'Search for contacts by name, email, or phone number.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({query, pageSize}) => {
			const params = new URLSearchParams();
			params.set('query', query);
			params.set('readMask', 'names,emailAddresses,phoneNumbers,organizations,birthdays,events,urls,addresses,userDefined,photos,nicknames,relations,imClients');
			params.set('pageSize', String(pageSize));

			const result = await makePeopleApiCall('GET', `/people:searchContacts?${params.toString()}`, config.token);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
