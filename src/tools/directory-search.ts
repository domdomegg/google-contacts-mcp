import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';

const inputSchema = {
	query: z.string().describe('Search query - matches against names, email addresses, and phone numbers'),
	pageSize: z.number().min(1).max(500).default(10).describe('Maximum number of results'),
	pageToken: z.string().optional().describe('Page token for pagination'),
};

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
		department: z.string().optional(),
	})).optional(),
	photos: z.array(z.object({
		url: z.string().optional(),
	})).optional(),
}).passthrough();

const outputSchema = z.object({
	people: z.array(personSchema).optional(),
	nextPageToken: z.string().optional(),
	totalSize: z.number().optional(),
});

export function registerDirectorySearch(server: McpServer, config: Config): void {
	server.registerTool(
		'directory_search',
		{
			title: 'Search directory',
			description: 'Search the organization directory for people (coworkers, etc). Requires directory.readonly scope.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: true,
			},
		},
		async ({query, pageSize, pageToken}) => {
			const params = new URLSearchParams();
			params.set('query', query);
			params.set('readMask', 'names,emailAddresses,phoneNumbers,organizations,photos');
			params.set('sources', 'DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE');
			params.set('pageSize', String(pageSize));

			if (pageToken) {
				params.set('pageToken', pageToken);
			}

			const result = await makePeopleApiCall('GET', `/people:searchDirectoryPeople?${params.toString()}`, config.token);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
