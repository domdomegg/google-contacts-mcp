import {
	describe, it, expect, vi, afterEach,
} from 'vitest';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../index.js';

type FetchCall = {url: string; method: string; body: unknown};

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {status, headers: {'content-type': 'application/json'}});
}

function stubFetch(...responses: Response[]): FetchCall[] {
	const calls: FetchCall[] = [];
	vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
		calls.push({url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body as string) : undefined});
		const response = responses.shift();
		if (!response) {
			throw new Error(`Unexpected fetch: ${url}`);
		}

		return response;
	}));
	return calls;
}

async function callTool(args: Record<string, unknown>) {
	const server = createServer({token: 'test-token'});
	const client = new Client({name: 'test', version: '1.0.0'});
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
	return client.callTool({name: 'contact_update', arguments: args});
}

const updated = {resourceName: 'people/c1', etag: 'etag-2'};

describe('contact_update', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('keeps the company when only the job title is updated', async () => {
		const calls = stubFetch(
			jsonResponse({
				resourceName: 'people/c1', etag: 'etag-1', organizations: [{
					metadata: {primary: true}, name: 'Acme', title: 'Engineer', department: 'R&D',
				}],
			}),
			jsonResponse(updated),
		);

		const result = await callTool({resourceName: 'people/c1', etag: 'etag-1', jobTitle: 'CTO'});

		expect(result.isError).toBeFalsy();
		expect(calls[0]).toMatchObject({method: 'GET', url: 'https://people.googleapis.com/v1/people/c1?personFields=names,organizations'});
		expect(calls[1]).toEqual({
			method: 'PATCH',
			url: 'https://people.googleapis.com/v1/people/c1:updateContact?updatePersonFields=organizations',
			body: {etag: 'etag-1', organizations: [{name: 'Acme', title: 'CTO', department: 'R&D'}]},
		});
	});

	it('keeps the family name when only the given name is updated', async () => {
		const calls = stubFetch(
			jsonResponse({
				resourceName: 'people/c1',
				etag: 'etag-1',
				names: [{
					metadata: {primary: true}, displayName: 'Jon Q Smith', unstructuredName: 'Jon Q Smith', givenName: 'Jon', middleName: 'Q', familyName: 'Smith',
				}],
			}),
			jsonResponse(updated),
		);

		await callTool({resourceName: 'people/c1', etag: 'etag-1', givenName: 'John'});

		expect(calls[1]?.url).toBe('https://people.googleapis.com/v1/people/c1:updateContact?updatePersonFields=names');
		expect(calls[1]?.body).toEqual({etag: 'etag-1', names: [{givenName: 'John', middleName: 'Q', familyName: 'Smith'}]});
	});

	it('keeps other organizations and updates the primary one', async () => {
		const calls = stubFetch(
			jsonResponse({
				resourceName: 'people/c1',
				etag: 'etag-1',
				organizations: [
					{metadata: {primary: false}, name: 'Board Co', title: 'Advisor'},
					{metadata: {primary: true}, name: 'Acme', title: 'Engineer'},
				],
			}),
			jsonResponse(updated),
		);

		await callTool({
			resourceName: 'people/c1', etag: 'etag-1', organization: 'NewCo', jobTitle: 'CEO',
		});

		expect(calls[1]?.body).toEqual({
			etag: 'etag-1',
			organizations: [
				{name: 'Board Co', title: 'Advisor'},
				{name: 'NewCo', title: 'CEO'},
			],
		});
	});

	it('creates an organization when the contact has none', async () => {
		const calls = stubFetch(jsonResponse({resourceName: 'people/c1', etag: 'etag-1'}), jsonResponse(updated));

		await callTool({resourceName: 'people/c1', etag: 'etag-1', organization: 'Acme'});

		expect(calls[1]?.body).toEqual({etag: 'etag-1', organizations: [{name: 'Acme'}]});
	});

	it('does not fetch the contact for updates that do not touch names or organizations', async () => {
		const calls = stubFetch(jsonResponse(updated));

		await callTool({resourceName: 'people/c1', etag: 'etag-1', emailAddresses: [{value: 'a@example.com'}]});

		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatchObject({method: 'PATCH', body: {etag: 'etag-1', emailAddresses: [{value: 'a@example.com'}]}});
	});

	it('reports a clear error when the contact changed since it was read', async () => {
		stubFetch(
			jsonResponse({resourceName: 'people/c1', etag: 'etag-2', organizations: [{name: 'Acme'}]}),
			jsonResponse({error: {code: 400, message: 'Request person.etag is different than the current person.etag.', status: 'FAILED_PRECONDITION'}}, 400),
		);

		const result = await callTool({resourceName: 'people/c1', etag: 'etag-1', jobTitle: 'CTO'});

		expect(result.isError).toBe(true);
		expect(JSON.stringify(result.content)).toContain('changed since you read it');
	});
});
