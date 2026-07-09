import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	pageSize: z.number().min(1).max(1000).default(100).describe('Maximum number of contacts to return'),
	pageToken: z.string().optional().describe('Page token for pagination'),
	sortOrder: z.enum(['LAST_MODIFIED_ASCENDING', 'LAST_MODIFIED_DESCENDING', 'FIRST_NAME_ASCENDING', 'LAST_NAME_ASCENDING']).optional().describe('Sort order for results'),
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
	connections: z.array(personSchema).optional(),
	nextPageToken: z.string().optional(),
	totalPeople: z.number().optional(),
	totalItems: z.number().optional(),
});

export function registerContactsList(server: McpServer, config: Config): void {
	server.registerTool(
		'contacts_list',
		{
			title: 'List contacts',
			description: 'List contacts from the user\'s Google Contacts. Returns names, emails, phone numbers, organizations, birthdays, events, URLs, addresses, nicknames, relations, IM usernames, and custom fields.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({pageSize, pageToken, sortOrder}) => {
			const params = new URLSearchParams();
			params.set('personFields', 'names,emailAddresses,phoneNumbers,organizations,birthdays,events,urls,addresses,userDefined,photos,nicknames,relations,imClients');
			params.set('pageSize', String(pageSize));

			if (pageToken) {
				params.set('pageToken', pageToken);
			}

			if (sortOrder) {
				params.set('sortOrder', sortOrder);
			}

			const result = await makePeopleApiCall('GET', `/people/me/connections?${params.toString()}`, config.token);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
