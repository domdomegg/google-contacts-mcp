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
	birthdays: z.array(z.object({
		date: z.object({
			year: z.number().optional().describe('Year (omit if unknown)'),
			month: z.number().min(1).max(12).describe('Month (1-12)'),
			day: z.number().min(1).max(31).describe('Day of month'),
		}).describe('Date of birth'),
	})).optional().describe('Birthdays (replaces existing)'),
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
	nicknames: z.array(z.object({
		value: z.string().describe('Nickname'),
		type: z.string().optional().describe('Type of nickname. Predefined values are "default", "maidenName", "initials", "gplus", or "otherName"; any other string is treated as a custom label.'),
	})).optional().describe('Nicknames (replaces existing)'),
	relations: z.array(z.object({
		person: z.string().describe('Name of the related person'),
		type: z.string().optional().describe('Type of relation. Predefined values are "spouse", "child", "mother", "father", "parent", "brother", "sister", "friend", "relative", "domesticPartner", "manager", "assistant", "referredBy", or "partner"; any other string is treated as a custom label.'),
	})).optional().describe('Relations to other people (replaces existing)'),
	imClients: z.array(z.object({
		username: z.string().describe('IM username/handle'),
		protocol: z.string().optional().describe('IM protocol. Predefined values are "aim", "gtalk", "icq", "jabber", "msn", "netMeeting", "qq", "skype", or "yahoo"; any other string is treated as a custom protocol.'),
		type: z.string().optional().describe('Type of IM. Predefined values are "home", "work", or "other"; any other string is treated as a custom label.'),
	})).optional().describe('Instant messenger usernames (replaces existing)'),
	genders: z.array(z.object({
		value: z.string().describe('Gender. Use "male", "female", or "other" — the People API stores anything else (including "unspecified" and custom values) as "other", without erroring. Put pronouns or a self-described gender in addressMeAs, which is preserved verbatim.'),
		addressMeAs: z.string().optional().describe('Free-form pronouns used to address the person, e.g. "he/him", "she/her", "they/them"'),
	})).optional().describe('Gender (replaces existing)'),
	externalIds: z.array(z.object({
		value: z.string().describe('External ID value'),
		type: z.string().optional().describe('Type of external ID. Predefined values are "account", "customer", "loginId", "network", or "organization"; any other string is treated as a custom label.'),
	})).optional().describe('External IDs (replaces existing)'),
	clientData: z.array(z.object({
		key: z.string().describe('Client data key/namespace'),
		value: z.string().describe('Client data value'),
	})).optional().describe('Arbitrary client-scoped key-value data, private to the app that wrote it (replaces existing)'),
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
	genders: z.array(z.object({
		value: z.string().optional(),
		formattedValue: z.string().optional(),
		addressMeAs: z.string().optional(),
	})).optional(),
	externalIds: z.array(z.object({
		value: z.string().optional(),
		type: z.string().optional(),
	})).optional(),
	clientData: z.array(z.object({
		key: z.string().optional(),
		value: z.string().optional(),
	})).optional(),
}).passthrough();

type ApiEntry = Record<string, unknown> & {metadata?: {primary?: boolean; source?: {type?: string}}};

// Read-only or derived name fields that must not be sent back, otherwise they can override the structured fields we set
const DERIVED_NAME_FIELDS = ['metadata', 'displayName', 'displayNameLastFirst', 'unstructuredName'];

// Only the contact's own data may be written back: a linked Google or Workspace profile can contribute names and organizations too
function contactSourced(entries: ApiEntry[] | undefined): ApiEntry[] {
	return (entries ?? []).filter((entry) => !entry.metadata?.source?.type || entry.metadata.source.type === 'CONTACT');
}

function withoutKeys(entry: ApiEntry, keys: string[]): Record<string, unknown> {
	return Object.fromEntries(Object.entries(entry).filter(([key]) => !keys.includes(key)));
}

// The People API replaces every field listed in updatePersonFields, so merge partial changes into the current values
function mergeNames(current: ApiEntry[] | undefined, givenName: string | undefined, familyName: string | undefined): Record<string, unknown>[] {
	const [currentName] = contactSourced(current);
	const existing = currentName ? withoutKeys(currentName, DERIVED_NAME_FIELDS) : {};
	return [{
		...existing,
		...(givenName !== undefined && {givenName}),
		...(familyName !== undefined && {familyName}),
	}];
}

function mergeOrganizations(current: ApiEntry[] | undefined, organization: string | undefined, jobTitle: string | undefined): Record<string, unknown>[] {
	const entries = contactSourced(current).map((entry) => ({primary: entry.metadata?.primary === true, value: withoutKeys(entry, ['metadata'])}));
	const updates = {
		...(organization !== undefined && {name: organization}),
		...(jobTitle !== undefined && {title: jobTitle}),
	};

	if (entries.length === 0) {
		return [updates];
	}

	const primaryIndex = Math.max(0, entries.findIndex((entry) => entry.primary));
	return entries.map((entry, i) => (i === primaryIndex ? {...entry.value, ...updates} : entry.value));
}

function isEtagMismatch(error: unknown): boolean {
	return error instanceof Error && error.message.startsWith('People API error: 400') && (error.message.includes('FAILED_PRECONDITION') || /etag/i.test(error.message));
}

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
		async ({resourceName, etag, givenName, familyName, emailAddresses, phoneNumbers, organization, jobTitle, notes, urls, addresses, birthdays, events, customFields, nicknames, relations, imClients, genders, externalIds, clientData}) => {
			const person: Record<string, unknown> = {etag};
			const updatePersonFields: string[] = [];

			const updatesNames = givenName !== undefined || familyName !== undefined;
			const updatesOrganizations = organization !== undefined || jobTitle !== undefined;
			let current: {names?: ApiEntry[]; organizations?: ApiEntry[]} = {};
			if (updatesNames || updatesOrganizations) {
				current = await makePeopleApiCall('GET', `/${resourceName}?personFields=names,organizations&sources=READ_SOURCE_TYPE_CONTACT`, config.token) as typeof current;
			}

			if (updatesNames) {
				person.names = mergeNames(current.names, givenName, familyName);
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

			if (updatesOrganizations) {
				person.organizations = mergeOrganizations(current.organizations, organization, jobTitle);
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

			if (birthdays !== undefined) {
				person.birthdays = birthdays;
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

			if (nicknames !== undefined) {
				person.nicknames = nicknames;
				updatePersonFields.push('nicknames');
			}

			if (relations !== undefined) {
				person.relations = relations;
				updatePersonFields.push('relations');
			}

			if (imClients !== undefined) {
				person.imClients = imClients;
				updatePersonFields.push('imClients');
			}

			if (genders !== undefined) {
				person.genders = genders;
				updatePersonFields.push('genders');
			}

			if (externalIds !== undefined) {
				person.externalIds = externalIds;
				updatePersonFields.push('externalIds');
			}

			if (clientData !== undefined) {
				person.clientData = clientData;
				updatePersonFields.push('clientData');
			}

			const params = new URLSearchParams();
			params.set('updatePersonFields', updatePersonFields.join(','));

			let result: unknown;
			try {
				result = await makePeopleApiCall('PATCH', `/${resourceName}:updateContact?${params.toString()}`, config.token, person);
			} catch (error) {
				if (isEtagMismatch(error)) {
					throw new Error(`Contact ${resourceName} changed since you read it (etag mismatch). Re-read it with contact_get and retry with the new etag.`, {cause: error});
				}

				throw error;
			}

			return jsonResult(outputSchema.parse(result));
		},
	);
}
