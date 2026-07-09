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
		type: z.string().optional().describe('Type of URL. Predefined values are "home", "work", "other", "homePage", "blog", "profile", "ftp", or "reservations"; any other string is treated as a custom label (e.g. "LinkedIn" for a LinkedIn profile).'),
	})).optional().describe('URLs (e.g., website, blog, social media profile)'),
	addresses: z.array(z.object({
		streetAddress: z.string().optional().describe('Street address'),
		city: z.string().optional().describe('City'),
		region: z.string().optional().describe('State/region'),
		postalCode: z.string().optional().describe('Postal/ZIP code'),
		country: z.string().optional().describe('Country'),
		type: z.string().optional().describe('Type of address. Predefined values are "home", "work", or "other"; any other string is treated as a custom label.'),
	})).optional().describe('Postal addresses'),
	birthdays: z.array(z.object({
		date: z.object({
			year: z.number().optional().describe('Year (omit if unknown)'),
			month: z.number().min(1).max(12).describe('Month (1-12)'),
			day: z.number().min(1).max(31).describe('Day of month'),
		}).describe('Date of birth'),
	})).optional().describe('Birthdays'),
	events: z.array(z.object({
		date: z.object({
			year: z.number().optional().describe('Year (omit if unknown)'),
			month: z.number().min(1).max(12).describe('Month (1-12)'),
			day: z.number().min(1).max(31).describe('Day of month'),
		}).describe('Date of the event'),
		type: z.string().optional().describe('Type of event. Predefined values are "anniversary" or "other"; any other string is treated as a custom label.'),
	})).optional().describe('Special dates (e.g., anniversaries)'),
	customFields: z.array(z.object({
		key: z.string().describe('Field name/label'),
		value: z.string().describe('Field value'),
	})).optional().describe('Custom fields (arbitrary key-value pairs)'),
	nicknames: z.array(z.object({
		value: z.string().describe('Nickname'),
		type: z.string().optional().describe('Type of nickname. Predefined values are "default", "maidenName", "initials", "gplus", or "otherName"; any other string is treated as a custom label.'),
	})).optional().describe('Nicknames'),
	relations: z.array(z.object({
		person: z.string().describe('Name of the related person'),
		type: z.string().optional().describe('Type of relation. Predefined values are "spouse", "child", "mother", "father", "parent", "brother", "sister", "friend", "relative", "domesticPartner", "manager", "assistant", "referredBy", or "partner"; any other string is treated as a custom label.'),
	})).optional().describe('Relations to other people (e.g. spouse, manager)'),
	imClients: z.array(z.object({
		username: z.string().describe('IM username/handle'),
		protocol: z.string().optional().describe('IM protocol. Predefined values are "aim", "gtalk", "icq", "jabber", "msn", "netMeeting", "qq", "skype", or "yahoo"; any other string is treated as a custom protocol.'),
		type: z.string().optional().describe('Type of IM. Predefined values are "home", "work", or "other"; any other string is treated as a custom label.'),
	})).optional().describe('Instant messenger usernames'),
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
		async ({givenName, familyName, emailAddresses, phoneNumbers, organization, jobTitle, notes, urls, addresses, birthdays, events, customFields, nicknames, relations, imClients}) => {
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

			if (addresses?.length) {
				person.addresses = addresses;
			}

			if (birthdays?.length) {
				person.birthdays = birthdays;
			}

			if (events?.length) {
				person.events = events;
			}

			if (customFields?.length) {
				person.userDefined = customFields;
			}

			if (nicknames?.length) {
				person.nicknames = nicknames;
			}

			if (relations?.length) {
				person.relations = relations;
			}

			if (imClients?.length) {
				person.imClients = imClients;
			}

			const result = await makePeopleApiCall('POST', '/people:createContact', config.token, person);
			return jsonResult(outputSchema.parse(result));
		},
	);
}
