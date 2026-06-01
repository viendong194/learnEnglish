import { db } from '../dexie/db';
import { supabase } from './client';

/**
 * Perform a full bidirectional synchronization between local Dexie.js and remote Supabase PostgreSQL.
 * Designed to run immediately when connection recovers or periodically while online.
 */
export async function runSync() {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    console.log('[Sync] Offline: Skipping synchronization');
    return { success: false, reason: 'offline' };
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (sessionError || !userId) {
    console.log('[Sync] Unauthorized: User must be authenticated to sync');
    return { success: false, reason: 'unauthorized' };
  }

  console.log('[Sync] Initiating bidirectional database synchronization...');

  try {
    // ----------------------------------------------------
    // PHASE 1: PUSH LOCAL OFFLINE CHANGES TO CLOUD (VOCAB & GRAMMAR)
    // ----------------------------------------------------
    await pushLocalChanges('vocabulary', userId);
    await pushLocalChanges('grammar', userId);

    // ----------------------------------------------------
    // PHASE 2: PULL REMOTE CLOUD CHANGES TO LOCAL (VOCAB & GRAMMAR)
    // ----------------------------------------------------
    await pullRemoteChanges('vocabulary', userId);
    await pullRemoteChanges('grammar', userId);

    console.log('[Sync] Database synchronization successfully completed.');
    return { success: true };
  } catch (error) {
    console.error('[Sync] Error during database synchronization:', error);
    return { success: false, error };
  }
}

/**
 * Push offline local writes to Supabase
 */
async function pushLocalChanges(table, userId) {
  const pendingRecords = await db[table]
    .where('sync_status')
    .anyOf('pending_insert', 'pending_update', 'pending_delete')
    .toArray();

  if (pendingRecords.length === 0) return;

  console.log(`[Sync] Pushing ${pendingRecords.length} pending local records to remote table: ${table}...`);

  for (const record of pendingRecords) {
    if (record.sync_status === 'pending_delete') {
      // Perform soft delete on Supabase side
      const { error } = await supabase
        .from(table)
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id)
        .eq('user_id', userId);

      if (!error) {
        // If remote deletion was accepted, permanently clear from local DB
        await db[table].delete(record.id);
      } else {
        console.error(`[Sync] Failed to push deletion for ID: ${record.id}`, error);
      }
    } else {
      // Compile standard parameters
      const payload = {
        id: record.id,
        user_id: userId,
        updated_at: new Date().toISOString(),
        is_deleted: false,
        ...(table === 'vocabulary' 
          ? { word: record.word, translation: record.translation, notes: record.notes } 
          : { topic: record.topic, description: record.description, example: record.example }
        )
      };

      const { error } = await supabase
        .from(table)
        .upsert(payload);

      if (!error) {
        await db[table].update(record.id, { sync_status: 'synced' });
      } else {
        console.error(`[Sync] Failed to push update for ID: ${record.id}`, error);
      }
    }
  }
}

/**
 * Pull new remote cloud updates since last sync, resolving conflicts via Last-Write-Wins (LWW)
 */
async function pullRemoteChanges(table, userId) {
  const lastSyncRecord = await db.sync_meta.get(`${table}_last_sync`);
  const lastSyncTime = lastSyncRecord ? lastSyncRecord.value : new Date(0).toISOString();
  const currentSyncTime = new Date().toISOString();

  console.log(`[Sync] Pulling remote updates for ${table} since: ${lastSyncTime}...`);

  const { data: remoteRecords, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .gt('updated_at', lastSyncTime);

  if (error) {
    console.error(`[Sync] Error pulling remote records for ${table}:`, error);
    return;
  }

  if (!remoteRecords || remoteRecords.length === 0) {
    await db.sync_meta.put({ key: `${table}_last_sync`, value: currentSyncTime });
    return;
  }

  console.log(`[Sync] Processing ${remoteRecords.length} remote changes for ${table}...`);

  for (const remoteRecord of remoteRecords) {
    const localRecord = await db[table].get(remoteRecord.id);

    if (remoteRecord.is_deleted) {
      if (localRecord) {
        await db[table].delete(remoteRecord.id);
      }
      continue;
    }

    // Conflict resolution: Last-Write-Wins (LWW)
    const remoteUpdatedAt = new Date(remoteRecord.updated_at).getTime();
    const localUpdatedAt = localRecord ? new Date(localRecord.updated_at).getTime() : 0;

    if (!localRecord || remoteUpdatedAt > localUpdatedAt) {
      // Overwrite or create local record with updated values
      const baseLocalFields = {
        id: remoteRecord.id,
        updated_at: remoteRecord.updated_at,
        is_deleted: false,
        sync_status: 'synced',
        ...(table === 'vocabulary'
          ? { word: remoteRecord.word, translation: remoteRecord.translation, notes: remoteRecord.notes }
          : { topic: remoteRecord.topic, description: remoteRecord.description, example: remoteRecord.example }
        )
      };

      await db[table].put(baseLocalFields);
    }
  }

  await db.sync_meta.put({ key: `${table}_last_sync`, value: currentSyncTime });
}
