import {
	describe, it, expect, vi, afterEach,
} from 'vitest';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../index.js';

async function callTool(args: Record<string, unknown>) {
	const server = createServer({token: 'test-token'});
	const client = new Client({name: 'test', version: '1.0.0'});
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
	return client.callTool({name: 'contact_photo_update', arguments: args});
}

describe('contact_photo_update', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('asks Google to return the updated photo and passes it back', async () => {
		const person = {resourceName: 'people/c1', etag: 'etag-2', photos: [{url: 'https://lh3.googleusercontent.com/contacts/photo'}]};
		const fetchMock = vi.fn(async () => new Response(JSON.stringify({person}), {status: 200, headers: {'content-type': 'application/json'}}));
		vi.stubGlobal('fetch', fetchMock);

		const result = await callTool({resourceName: 'people/c1', photoBytes: 'aGVsbG8='});

		expect(result.isError).toBeFalsy();
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://people.googleapis.com/v1/people/c1:updateContactPhoto');
		expect(init.method).toBe('PATCH');
		expect(JSON.parse(init.body as string)).toEqual({photoBytes: 'aGVsbG8=', personFields: 'photos'});
		expect(result.structuredContent).toEqual({person});
	});
});
