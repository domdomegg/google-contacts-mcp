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
		type: z.string().optional().describe('Type of email. Predefined values are "home", "work", or "other"; any other string is treated as a custom label.'),
	})).optional().describe('Email addresses'),
	phoneNumbers: z.array(z.object({
		value: z.string().describe('Phone number'),
		type: z.string().optional().describe('Type of phone. Predefined values are "home", "work", "mobile", "homeFax", "workFax", "otherFax", "pager", "workMobile", "workPager", "main", "googleVoice", or "other"; any other string is treated as a custom label.'),
	})).optional().describe('Phone numbers'),
	organization: z.string().optional().describe('Company/organization name'),
	jobTitle: z.string().optional().describe('Job title'),
	notes: z.string().optional().describe('Notes about the contact'),
	urls: z.array(z.object({
		value: z.string().describe('URL'),
		type: z.string().optional().describe('Type of URL. Predefined values are "home", "work", "other", "homePage", "blog", "profile", "ftp", or "reservations"; any other string is treated as a custom label.'),
	})).optional().describe('URLs (e.g., website, blog, social media profile)'),
	birthday: z.object({
		year: z.number().optional().describe('Year (omit if unknown)'),
		month: z.number().min(1).max(12).describe('Month (1-12)'),
		day: z.number().min(1).max(31).describe('Day of month'),
	}).optional().describe('Birthday'),
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
}).passthrough();

export function registerContactCreate(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_create',
		{
			title: 'Create contact',
			description: 'Create a new contact in Google Contacts.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
			},
		},
		async ({givenName, familyName, emailAddresses, phoneNumbers, organization, jobTitle, notes, urls, birthday}) => {
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

			if (urls?.length) {
				person.urls = urls;
			}

			if (birthday) {
				person.birthdays = [{date: birthday}];
			}

			const result = await makePeopleApiCall('POST', '/people:createContact', config.token, person);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
