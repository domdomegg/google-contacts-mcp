import {
	describe, it, expect, vi, afterEach,
} from 'vitest';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../index.js';

type FetchCall = {url: string; method: string; body: unknown};

function stubFetch(response: unknown): FetchCall[] {
	const calls: FetchCall[] = [];
	vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
		calls.push({url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body as string) : undefined});
		return new Response(JSON.stringify(response), {status: 200, headers: {'content-type': 'application/json'}});
	}));
	return calls;
}

async function callTool(name: string, args: Record<string, unknown>) {
	const server = createServer({token: 'test-token'});
	const client = new Client({name: 'test', version: '1.0.0'});
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
	return client.callTool({name, arguments: args});
}

const otherContact = {resourceName: 'otherContacts/c1', names: [{displayName: 'Ada Lovelace'}], emailAddresses: [{value: 'ada@example.com'}]};

describe('other contacts', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('other_contacts_list lists other contacts with a names/emails/phones read mask', async () => {
		const calls = stubFetch({otherContacts: [otherContact], nextPageToken: 'next'});

		const result = await callTool('other_contacts_list', {pageSize: 50, pageToken: 'abc'});

		expect(result.isError).toBeFalsy();
		expect(calls).toEqual([{
			method: 'GET',
			url: 'https://people.googleapis.com/v1/otherContacts?readMask=names%2CemailAddresses%2CphoneNumbers&pageSize=50&pageToken=abc',
			body: undefined,
		}]);
		expect(result.structuredContent).toEqual({otherContacts: [otherContact], nextPageToken: 'next'});
	});

	it('other_contacts_search searches other contacts', async () => {
		const calls = stubFetch({results: [{person: otherContact}]});

		const result = await callTool('other_contacts_search', {query: 'ada'});

		expect(result.isError).toBeFalsy();
		expect(calls[0]).toEqual({
			method: 'GET',
			url: 'https://people.googleapis.com/v1/otherContacts:search?query=ada&readMask=names%2CemailAddresses%2CphoneNumbers&pageSize=10',
			body: undefined,
		});
	});

	it('other_contact_copy_to_contacts copies into My Contacts and returns the new person', async () => {
		const calls = stubFetch({resourceName: 'people/c99', etag: 'etag-1', names: [{displayName: 'Ada Lovelace'}]});

		const result = await callTool('other_contact_copy_to_contacts', {resourceName: 'otherContacts/c1'});

		expect(result.isError).toBeFalsy();
		expect(calls[0]).toEqual({
			method: 'POST',
			url: 'https://people.googleapis.com/v1/otherContacts/c1:copyOtherContactToMyContactsGroup',
			body: {copyMask: 'names,emailAddresses,phoneNumbers', readMask: 'names,emailAddresses,phoneNumbers'},
		});
		expect(result.structuredContent).toMatchObject({resourceName: 'people/c99', etag: 'etag-1'});
	});
});
