import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';

import {registerContactsList} from './contacts-list.js';
import {registerContactGet} from './contact-get.js';
import {registerContactSearch} from './contact-search.js';
import {registerContactCreate} from './contact-create.js';
import {registerContactUpdate} from './contact-update.js';
import {registerContactDelete} from './contact-delete.js';
import {registerDirectorySearch} from './directory-search.js';

export type {Config} from './types.js';

export function registerAll(server: McpServer, config: Config): void {
	registerContactsList(server, config);
	registerContactGet(server, config);
	registerContactSearch(server, config);
	registerContactCreate(server, config);
	registerContactUpdate(server, config);
	registerContactDelete(server, config);
	registerDirectorySearch(server, config);
}
