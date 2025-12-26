import type { Sql } from 'postgres';

import * as m001 from './001_uuid_v7_function';
import * as m002 from './002_users_table';
import * as m003 from './003_sessions_table';
import * as m004 from './004_conversations_table';
import * as m005 from './005_messages_table';
import * as m006 from './006_triggers';
import * as m007 from './007_user_preferences_table';
import * as m008 from './008_cleanup';
import * as m009 from './009_search_index';
import * as m010 from './010_system_prompt';
import * as m011 from './011_folders';
import * as m012 from './012_shared_conversations';

export interface Migration {
  up: (sql: Sql) => Promise<void>;
  down: (sql: Sql) => Promise<void>;
}

export const migrations: Migration[] = [
  m001,
  m002,
  m003,
  m004,
  m005,
  m006,
  m007,
  m008,
  m009,
  m010,
  m011,
  m012,
];
