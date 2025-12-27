import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	resourceName: z.string().describe('The resource name of the contact (e.g., "people/c12345")'),
}, {});

const outputSchema = z.object({
	resourceName: z.string(),
	etag: z.string().optional(),
	names: z.array(z.object({
		displayName: z.string().optional(),
		givenName: z.string().optional(),
		familyName: z.string().optional(),
		middleName: z.string().optional(),
	})).optional(),
	emailAddresses: z.array(z.object({
		value: z.string().optional(),
		type: z.string().optional(),
	})).optional(),
	phoneNumbers: z.array(z.object({
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
	organizations: z.array(z.object({
		name: z.string().optional(),
		title: z.string().optional(),
		department: z.string().optional(),
	})).optional(),
	biographies: z.array(z.object({
		value: z.string().optional(),
	})).optional(),
	birthdays: z.array(z.object({
		date: z.object({
			year: z.number().optional(),
			month: z.number().optional(),
			day: z.number().optional(),
		}).optional(),
	})).optional(),
	urls: z.array(z.object({
		value: z.string().optional(),
		type: z.string().optional(),
	})).optional(),
	photos: z.array(z.object({
		url: z.string().optional(),
	})).optional(),
	memberships: z.array(z.object({
		contactGroupMembership: z.object({
			contactGroupResourceName: z.string().optional(),
		}).optional(),
	})).optional(),
}).passthrough();

export function registerContactGet(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_get',
		{
			title: 'Get contact',
			description: 'Get detailed information about a single contact by resource name.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({resourceName}) => {
			const params = new URLSearchParams();
			params.set('personFields', 'names,emailAddresses,phoneNumbers,addresses,organizations,biographies,birthdays,urls,photos,memberships');

			const result = await makePeopleApiCall('GET', `/${resourceName}?${params.toString()}`, config.token);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
