import Dexie, { Table } from 'dexie';

// ==========================================
// CLIENT-SIDE TYPES & SCHEMAS FOR INDEXEDDB
// ==========================================

export interface LocalProfile {
  id: string; // references auth.users UUID
  updated_at: string;
  username?: string;
  avatar_url?: string;
}

export interface LocalVocabulary {
  id: string; // UUID Primary Key generated locally
  word_name: string;
  translation: string;
  level?: string;
  status: string; // 'new' | 'learning' | 'mastered'
  notes?: string;
  is_deleted: boolean; // Soft-delete indicator
  updated_at: string;
  sync_status: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

export interface LocalGrammar {
  id: string; // UUID Primary Key generated locally
  topic: string;
  description: string;
  example?: string;
  is_deleted: boolean; // Soft-delete indicator
  updated_at: string;
  sync_status: 'synced' | 'pending_insert' | 'pending_update' | 'pending_delete';
}

export interface SyncMetadata {
  key: string; // e.g. 'vocabulary_last_sync'
  value: string; // ISO datetime stamp
}

export class OfflineFirstDB extends Dexie {
  profiles!: Table<LocalProfile>;
  user_vocabulary!: Table<LocalVocabulary>;
  user_grammar!: Table<LocalGrammar>;
  sync_meta!: Table<SyncMetadata>;

  constructor() {
    super('OfflineFirstDB');
    
    this.version(1).stores({
      profiles: 'id, updated_at',
      user_vocabulary: 'id, word_name, level, status, sync_status, updated_at, is_deleted',
      user_grammar: 'id, topic, sync_status, updated_at, is_deleted',
      sync_meta: 'key, value'
    });
  }
}

export const db = new OfflineFirstDB();
