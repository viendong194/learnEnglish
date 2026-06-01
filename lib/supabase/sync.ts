import { db } from '../dexie/db';
import { supabase } from './client';

export interface SyncResult {
  success: boolean;
  reason?: string;
  error?: any;
}

/**
 * Robust TypeScript synchronization manager.
 * Coordinates bidirectional upserts between local Dexie.js (IndexedDB) and Supabase PostgreSQL (Cloud Backup).
 */
export async function syncLocalToCloud(): Promise<SyncResult> {
  // 1. Verify Internet Connection
  if (typeof window !== 'undefined' && !navigator.onLine) {
    console.log('[Sync] Device is offline. post-poning cloud synchronization.');
    return { success: false, reason: 'offline' };
  }

  // 2. Verify Session Authorization
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (sessionError || !userId) {
    console.log('[Sync] Unauthorized session: Cannot execute synchronization.');
    return { success: false, reason: 'unauthorized' };
  }

  console.log('[Sync] Starting offline-first database synchronization sequence...');

  try {
    // ----------------------------------------------------
    // PHASE 1: PUSH LOCAL OFFLINE EDITS TO CLOUD
    // ----------------------------------------------------
    await pushVocabularyLocalChanges(userId);
    await pushGrammarLocalChanges(userId);

    // ----------------------------------------------------
    // PHASE 2: PULL RECENT CLOUD UPDATES TO INDEXEDDB
    // ----------------------------------------------------
    await pullVocabularyRemoteChanges(userId);
    await pullGrammarRemoteChanges(userId);

    console.log('[Sync] All tables successfully reconciled.');
    return { success: true };
  } catch (error) {
    console.error('[Sync] Operational synchronization failure:', error);
    return { success: false, error };
  }
}

/**
 * Pushes unsaved vocabulary mutations to Supabase
 */
async function pushVocabularyLocalChanges(userId: string): Promise<void> {
  const pending = await db.user_vocabulary
    .where('sync_status')
    .anyOf('pending_insert', 'pending_update', 'pending_delete')
    .toArray();

  if (pending.length === 0) return;

  console.log(`[Sync] Pushing ${pending.length} unsaved vocabulary mutations to Cloud...`);

  for (const record of pending) {
    if (record.sync_status === 'pending_delete') {
      const { error } = await supabase
        .from('user_vocabulary')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id)
        .eq('user_id', userId);

      if (!error) {
        await db.user_vocabulary.delete(record.id);
      } else {
        console.error(`[Sync] Vocabulary deletion sync failed: ${record.id}`, error);
      }
    } else {
      const { error } = await supabase
        .from('user_vocabulary')
        .upsert({
          id: record.id,
          user_id: userId,
          word_name: record.word_name,
          translation: record.translation,
          level: record.level || null,
          status: record.status,
          notes: record.notes || null,
          is_deleted: false,
          updated_at: new Date().toISOString()
        });

      if (!error) {
        await db.user_vocabulary.update(record.id, { sync_status: 'synced' });
      } else {
        console.error(`[Sync] Vocabulary update sync failed: ${record.id}`, error);
      }
    }
  }
}

/**
 * Pushes unsaved grammar mutations to Supabase
 */
async function pushGrammarLocalChanges(userId: string): Promise<void> {
  const pending = await db.user_grammar
    .where('sync_status')
    .anyOf('pending_insert', 'pending_update', 'pending_delete')
    .toArray();

  if (pending.length === 0) return;

  console.log(`[Sync] Pushing ${pending.length} unsaved grammar mutations to Cloud...`);

  for (const record of pending) {
    if (record.sync_status === 'pending_delete') {
      const { error } = await supabase
        .from('user_grammar')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id)
        .eq('user_id', userId);

      if (!error) {
        await db.user_grammar.delete(record.id);
      } else {
        console.error(`[Sync] Grammar deletion sync failed: ${record.id}`, error);
      }
    } else {
      const { error } = await supabase
        .from('user_grammar')
        .upsert({
          id: record.id,
          user_id: userId,
          topic: record.topic,
          description: record.description,
          example: record.example || null,
          is_deleted: false,
          updated_at: new Date().toISOString()
        });

      if (!error) {
        await db.user_grammar.update(record.id, { sync_status: 'synced' });
      } else {
        console.error(`[Sync] Grammar update sync failed: ${record.id}`, error);
      }
    }
  }
}

/**
 * Pulls recent vocabulary updates from Supabase and applies Last-Write-Wins logic
 */
async function pullVocabularyRemoteChanges(userId: string): Promise<void> {
  const meta = await db.sync_meta.get('vocab_last_sync');
  const lastSyncTime = meta ? meta.value : new Date(0).toISOString();
  const currentSyncTime = new Date().toISOString();

  console.log(`[Sync] Querying remote vocabulary updates since: ${lastSyncTime}...`);

  const { data: remoteData, error } = await supabase
    .from('user_vocabulary')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', lastSyncTime);

  if (error) {
    console.error('[Sync] Failed to pull vocabulary updates:', error);
    return;
  }

  if (remoteData && remoteData.length > 0) {
    console.log(`[Sync] Processing ${remoteData.length} remote vocabulary alterations...`);

    for (const remote of remoteData) {
      const local = await db.user_vocabulary.get(remote.id);

      if (remote.is_deleted) {
        if (local) await db.user_vocabulary.delete(remote.id);
        continue;
      }

      const remoteTime = new Date(remote.updated_at).getTime();
      const localTime = local ? new Date(local.updated_at).getTime() : 0;

      // Last-Write-Wins (LWW) resolution
      if (!local || remoteTime > localTime) {
        await db.user_vocabulary.put({
          id: remote.id,
          word_name: remote.word_name,
          translation: remote.translation,
          level: remote.level,
          status: remote.status,
          notes: remote.notes,
          is_deleted: false,
          updated_at: remote.updated_at,
          sync_status: 'synced'
        });
      }
    }
  }

  await db.sync_meta.put({ key: 'vocab_last_sync', value: currentSyncTime });
}

/**
 * Pulls recent grammar updates from Supabase and applies Last-Write-Wins logic
 */
async function pullGrammarRemoteChanges(userId: string): Promise<void> {
  const meta = await db.sync_meta.get('grammar_last_sync');
  const lastSyncTime = meta ? meta.value : new Date(0).toISOString();
  const currentSyncTime = new Date().toISOString();

  console.log(`[Sync] Querying remote grammar updates since: ${lastSyncTime}...`);

  const { data: remoteData, error } = await supabase
    .from('user_grammar')
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', lastSyncTime);

  if (error) {
    console.error('[Sync] Failed to pull grammar updates:', error);
    return;
  }

  if (remoteData && remoteData.length > 0) {
    console.log(`[Sync] Processing ${remoteData.length} remote grammar alterations...`);

    for (const remote of remoteData) {
      const local = await db.user_grammar.get(remote.id);

      if (remote.is_deleted) {
        if (local) await db.user_grammar.delete(remote.id);
        continue;
      }

      const remoteTime = new Date(remote.updated_at).getTime();
      const localTime = local ? new Date(local.updated_at).getTime() : 0;

      // Last-Write-Wins (LWW) resolution
      if (!local || remoteTime > localTime) {
        await db.user_grammar.put({
          id: remote.id,
          topic: remote.topic,
          description: remote.description,
          example: remote.example,
          is_deleted: false,
          updated_at: remote.updated_at,
          sync_status: 'synced'
        });
      }
    }
  }

  await db.sync_meta.put({ key: 'grammar_last_sync', value: currentSyncTime });
}
