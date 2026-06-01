import { db } from '../dexie/db';
import { supabase } from '../supabase/client';

export interface TargetItem {
  type: 'vocab' | 'grammar';
  id: string;
  trigger: string;
}

/**
 * 1. Generates a dynamic AI system prompt.
 * Queries local Dexie tables to fetch active study vocabulary and grammar items
 * for the current Lesson ID, instructing the AI tutor to guide the student towards using them.
 */
export async function generateSystemPrompt(lessonId: string): Promise<string> {
  try {
    // Fetch user vocabulary matching the lesson (level) that are not mastered and not deleted
    const vocabItems = await db.user_vocabulary
      .where('level')
      .equals(lessonId)
      .and(item => !item.is_deleted && item.status !== 'mastered')
      .toArray();

    // Fetch user grammar matching the lesson (topic/level name matches topic index in Dexie)
    const grammarItems = await db.user_grammar
      .where('topic')
      .equals(lessonId)
      .and(item => !item.is_deleted)
      .toArray();

    const vocabList = vocabItems.map(v => `"${v.word_name}" (Translation: ${v.translation})`).join(', ');
    const grammarList = grammarItems.map(g => `"${g.topic}": ${g.description}`).join('\n');

    return `You are LingoGlide AI, a premium language conversation partner. The student is practicing Lesson ID: "${lessonId}".
Your mission is to guide the user into naturally using the following target vocabulary and grammar structures.

TARGET VOCABULARY TO REINFORCE:
${vocabList || 'None remaining for this lesson! (All mastered)'}

TARGET GRAMMAR SCHEMAS TO REINFORCE:
${grammarList || 'None remaining for this lesson!'}

INSTRUCTIONS:
1. Converse naturally in short, mobile-friendly responses (2-3 sentences max).
2. Proactively ask conversational, open-ended questions that gently nudge the user to use these target words.
3. If they make a grammar mistake, provide polite, micro-visual feedback.
4. Keep the tone warm, highly encouraging, and supportive.`;
  } catch (error) {
    console.error('[SystemPrompt] Error pulling study data from Dexie:', error);
    return 'You are an AI language tutor. Keep conversation friendly and educational.';
  }
}

/**
 * 2. Parses the user voice-to-text transcript.
 * Compares user text against target triggers using boundary-safe, case-insensitive matches.
 * If matched, upgrades status to 'mastered' (status level 3) and fires a targeted background sync task.
 */
export async function processUserResponse(
  userText: string,
  targetItems: TargetItem[]
): Promise<string[]> {
  const matchedIds: string[] = [];
  const cleanInput = userText.toLowerCase().trim();

  for (const item of targetItems) {
    // Boundary-safe escape matching
    const escapedTrigger = escapeRegExp(item.trigger.toLowerCase());
    const regex = new RegExp(`\\b${escapedTrigger}\\b`, 'i');

    if (regex.test(cleanInput)) {
      matchedIds.push(item.id);
      const currentTime = new Date().toISOString();

      try {
        if (item.type === 'vocab') {
          // Update status in local Dexie to Mastered (status "3" / "mastered")
          await db.user_vocabulary.update(item.id, {
            status: 'mastered',
            updated_at: currentTime,
            sync_status: 'pending_update'
          });

          console.log(`[Mastery] Match detected! Vocab item "${item.trigger}" upgraded to Mastered.`);
          // Trigger granular background synchronization
          syncSingleVocabToCloud(item.id);
        } else {
          // Update grammar item in local Dexie
          await db.user_grammar.update(item.id, {
            updated_at: currentTime,
            sync_status: 'pending_update'
          });

          console.log(`[Mastery] Match detected! Grammar topic "${item.trigger}" upgraded to Mastered.`);
          // Trigger granular background synchronization
          syncSingleGrammarToCloud(item.id);
        }
      } catch (err) {
        console.error(`[Mastery] Failed to update local item ID: ${item.id}`, err);
      }
    }
  }

  return matchedIds;
}

// Escapes special characters for use in regular expressions
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 3. Targeted background sync for a specific vocabulary item.
 */
async function syncSingleVocabToCloud(id: string): Promise<void> {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    console.log('[Sync] Device is offline. post-poning background sync.');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const record = await db.user_vocabulary.get(id);
    if (!record) return;

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
      await db.user_vocabulary.update(id, { sync_status: 'synced' });
      console.log(`[Sync] Vocabulary item "${record.word_name}" auto-synced to Supabase.`);
    } else {
      console.error(`[Sync] Supabase vocabulary upsert error for item "${record.word_name}":`, error);
    }
  } catch (err) {
    console.error(`[Sync] Background vocabulary sync exception for ID: ${id}`, err);
  }
}

/**
 * 4. Targeted background sync for a specific grammar item.
 */
async function syncSingleGrammarToCloud(id: string): Promise<void> {
  if (typeof window !== 'undefined' && !navigator.onLine) {
    console.log('[Sync] Device is offline. post-poning background sync.');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const record = await db.user_grammar.get(id);
    if (!record) return;

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
      await db.user_grammar.update(id, { sync_status: 'synced' });
      console.log(`[Sync] Grammar topic "${record.topic}" auto-synced to Supabase.`);
    } else {
      console.error(`[Sync] Supabase grammar upsert error for topic "${record.topic}":`, error);
    }
  } catch (err) {
    console.error(`[Sync] Background grammar sync exception for ID: ${id}`, err);
  }
}
