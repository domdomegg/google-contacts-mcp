import {z} from 'zod';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';
import {makePeopleApiCall} from '../utils/contacts-api.js';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const inputSchema = strictSchemaWithAliases({
	resourceName: z.string().describe('The resource name of the contact to update (e.g., "people/c12345")'),
	etag: z.string().describe('The etag from the contact (required to prevent conflicts)'),
	givenName: z.string().optional().describe('First name'),
	familyName: z.string().optional().describe('Last name'),
	emailAddresses: z.array(z.object({
		value: z.string().describe('Email address'),
		type: z.string().optional().describe('Type of email. Predefined values are "home", "work", or "other"; any other string is treated as a custom label.'),
	})).optional().describe('Email addresses (replaces existing)'),
	phoneNumbers: z.array(z.object({
		value: z.string().describe('Phone number'),
		type: z.string().optional().describe('Type of phone. Predefined values are "home", "work", "mobile", "homeFax", "workFax", "otherFax", "pager", "workMobile", "workPager", "main", "googleVoice", or "other"; any other string is treated as a custom label.'),
	})).optional().describe('Phone numbers (replaces existing)'),
	organization: z.string().optional().describe('Company/organization name'),
	jobTitle: z.string().optional().describe('Job title'),
	notes: z.string().optional().describe('Notes about the contact'),
	urls: z.array(z.object({
		value: z.string().describe('URL'),
		type: z.string().optional().describe('Type of URL. Predefined values are "home", "work", "other", "homePage", "blog", "profile", "ftp", or "reservations"; any other string is treated as a custom label (e.g. "LinkedIn" for a LinkedIn profile).'),
	})).optional().describe('URLs (replaces existing)'),
	addresses: z.array(z.object({
		streetAddress: z.string().optional().describe('Street address'),
		city: z.string().optional().describe('City'),
		region: z.string().optional().describe('State/region'),
		postalCode: z.string().optional().describe('Postal/ZIP code'),
		country: z.string().optional().describe('Country'),
		type: z.string().optional().describe('Type of address. Predefined values are "home", "work", or "other"; any other string is treated as a custom label.'),
	})).optional().describe('Postal addresses (replaces existing)'),
	birthday: z.object({
		year: z.number().optional().describe('Year (omit if unknown)'),
		month: z.number().min(1).max(12).describe('Month (1-12)'),
		day: z.number().min(1).max(31).describe('Day of month'),
	}).optional().describe('Birthday'),
	events: z.array(z.object({
		date: z.object({
			year: z.number().optional().describe('Year (omit if unknown)'),
			month: z.number().min(1).max(12).describe('Month (1-12)'),
			day: z.number().min(1).max(31).describe('Day of month'),
		}).describe('Date of the event'),
		type: z.string().optional().describe('Type of event. Predefined values are "anniversary" or "other"; any other string is treated as a custom label.'),
	})).optional().describe('Special dates (replaces existing)'),
	customFields: z.array(z.object({
		key: z.string().describe('Field name/label'),
		value: z.string().describe('Field value'),
	})).optional().describe('Custom fields (replaces existing)'),
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
	addresses: z.array(z.object({
		formattedValue: z.string().optional(),
		type: z.string().optional(),
		streetAddress: z.string().optional(),
		city: z.string().optional(),
		region: z.string().optional(),
		postalCode: z.string().optional(),
		country: z.string().optional(),
	})).optional(),
	events: z.array(z.object({
		date: z.object({
			year: z.number().optional(),
			month: z.number().optional(),
			day: z.number().optional(),
		}).optional(),
		type: z.string().optional(),
	})).optional(),
	userDefined: z.array(z.object({
		key: z.string().optional(),
		value: z.string().optional(),
	})).optional(),
}).passthrough();

export function registerContactUpdate(server: McpServer, config: Config): void {
	server.registerTool(
		'contact_update',
		{
			title: 'Update contact',
			description: 'Update an existing contact. Use contact_get first to retrieve the current etag.',
			inputSchema,
			outputSchema,
			annotations: {
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: true,
			},
		},
		async ({resourceName, etag, givenName, familyName, emailAddresses, phoneNumbers, organization, jobTitle, notes, urls, addresses, birthday, events, customFields}) => {
			const person: Record<string, unknown> = {etag};
			const updatePersonFields: string[] = [];

			if (givenName !== undefined || familyName !== undefined) {
				person.names = [{givenName, familyName}];
				updatePersonFields.push('names');
			}

			if (emailAddresses !== undefined) {
				person.emailAddresses = emailAddresses;
				updatePersonFields.push('emailAddresses');
			}

			if (phoneNumbers !== undefined) {
				person.phoneNumbers = phoneNumbers;
				updatePersonFields.push('phoneNumbers');
			}

			if (organization !== undefined || jobTitle !== undefined) {
				person.organizations = [{name: organization, title: jobTitle}];
				updatePersonFields.push('organizations');
			}

			if (notes !== undefined) {
				person.biographies = [{value: notes, contentType: 'TEXT_PLAIN'}];
				updatePersonFields.push('biographies');
			}

			if (urls !== undefined) {
				person.urls = urls;
				updatePersonFields.push('urls');
			}

			if (addresses !== undefined) {
				person.addresses = addresses;
				updatePersonFields.push('addresses');
			}

			if (birthday !== undefined) {
				person.birthdays = [{date: birthday}];
				updatePersonFields.push('birthdays');
			}

			if (events !== undefined) {
				person.events = events;
				updatePersonFields.push('events');
			}

			if (customFields !== undefined) {
				person.userDefined = customFields;
				updatePersonFields.push('userDefined');
			}

			const params = new URLSearchParams();
			params.set('updatePersonFields', updatePersonFields.join(','));

			const result = await makePeopleApiCall('PATCH', `/${resourceName}:updateContact?${params.toString()}`, config.token, person);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
