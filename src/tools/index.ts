import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {Config} from './types.js';

import {registerContactsList} from './contacts-list.js';
import {registerContactGet} from './contact-get.js';
import {registerContactSearch} from './contact-search.js';
import {registerContactCreate} from './contact-create.js';
import {registerContactUpdate} from './contact-update.js';
import {registerContactDelete} from './contact-delete.js';
import {registerContactPhotoUpdate} from './contact-photo-update.js';
import {registerContactPhotoDelete} from './contact-photo-delete.js';
import {registerDirectorySearch} from './directory-search.js';
import {registerContactGroupsList} from './contact-groups-list.js';
import {registerContactGroupGet} from './contact-group-get.js';
import {registerContactGroupCreate} from './contact-group-create.js';
import {registerContactGroupUpdate} from './contact-group-update.js';
import {registerContactGroupDelete} from './contact-group-delete.js';
import {registerContactGroupMembersModify} from './contact-group-members-modify.js';

export type {Config} from './types.js';

export function registerAll(server: McpServer, config: Config): void {
	registerContactsList(server, config);
	registerContactGet(server, config);
	registerContactSearch(server, config);
	registerContactCreate(server, config);
	registerContactUpdate(server, config);
	registerContactDelete(server, config);
	registerContactPhotoUpdate(server, config);
	registerContactPhotoDelete(server, config);
	registerDirectorySearch(server, config);
	registerContactGroupsList(server, config);
	registerContactGroupGet(server, config);
	registerContactGroupCreate(server, config);
	registerContactGroupUpdate(server, config);
	registerContactGroupDelete(server, config);
	registerContactGroupMembersModify(server, config);
}
