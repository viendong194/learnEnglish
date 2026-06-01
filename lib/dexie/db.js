import Dexie from 'dexie';

// Initialize the local-first Dexie database
export const db = new Dexie('EnglishLearnerDB');

// Define database tables and index schemas
db.version(1).stores({
  vocabulary: 'id, word, translation, sync_status, updated_at, is_deleted',
  grammar: 'id, topic, description, sync_status, updated_at, is_deleted',
  sync_meta: 'key, value' // Track synchronization metadata (e.g. last sync timestamps)
});
