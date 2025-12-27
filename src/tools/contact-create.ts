import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	givenName: z.string().optional().describe('First name'),
	familyName: z.string().optional().describe('Last name'),
	emailAddresses: z.array(z.object({
		value: z.string().describe('Email address'),
		type: z.enum(['home', 'work', 'other']).optional().describe('Type of email'),
	})).optional().describe('Email addresses'),
	phoneNumbers: z.array(z.object({
		value: z.string().describe('Phone number'),
		type: z.enum(['home', 'work', 'mobile', 'other']).optional().describe('Type of phone'),
	})).optional().describe('Phone numbers'),
	organization: z.string().optional().describe('Company/organization name'),
	jobTitle: z.string().optional().describe('Job title'),
	notes: z.string().optional().describe('Notes about the contact'),
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

export function registerContactCreate(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_create',
		{
			title: 'Create contact',
			description: 'Create a new contact in Google Contacts.',
			inputSchema,
			outputSchema,
		},
		async ({givenName, familyName, emailAddresses, phoneNumbers, organization, jobTitle, notes}) => {
			const person: Record<string, unknown> = {};

			if (givenName || familyName) {
				person.names = [{givenName, familyName}];
			}

			if (emailAddresses?.length) {
				person.emailAddresses = emailAddresses;
			}

			if (phoneNumbers?.length) {
				person.phoneNumbers = phoneNumbers;
			}

			if (organization || jobTitle) {
				person.organizations = [{name: organization, title: jobTitle}];
			}

			if (notes) {
				person.biographies = [{value: notes, contentType: 'TEXT_PLAIN'}];
			}

			const result = await makePeopleApiCall('POST', '/people:createContact', config.token, person);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
