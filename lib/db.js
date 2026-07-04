'use client';

import Dexie from 'dexie';

// Local-first storage: toàn bộ dữ liệu học nằm trong IndexedDB của trình duyệt.
export const db = new Dexie('LanguageTutorDB');

db.version(1).stores({
  // {id, language, word, reading, meaningVi, example, source, createdAt}
  vocab: 'id, language, word, createdAt',
  // {id, language, name, pattern, explanationVi, example, source, createdAt}
  grammar: 'id, language, name, createdAt',
  // {id, language, topic, videoUrl, videoTitle, videoContext, practiceTargets, messages, createdAt, updatedAt}
  sessions: 'id, language, updatedAt',
});

db.version(2).stores({
  vocab: 'id, language, word, createdAt',
  grammar: 'id, language, name, createdAt',
  sessions: 'id, language, updatedAt',
  // {id: `${language}-${trackKey}-${topicId}`, language, trackKey, completed, completedAt}
  roadmap_progress: 'id, language, trackKey',
});

const now = () => new Date().toISOString();

/**
 * Lưu từ vựng mới vào sổ tay, bỏ qua từ đã có (so word không phân biệt hoa thường).
 * Trả về danh sách các mục thực sự được thêm.
 */
export async function saveVocabItems(items, language, source) {
  if (!items?.length) return [];
  const existing = await db.vocab.where('language').equals(language).toArray();
  const known = new Set(existing.map((v) => v.word.toLowerCase().trim()));
  const fresh = items.filter((it) => it.word && !known.has(it.word.toLowerCase().trim()));
  const records = fresh.map((it) => ({
    id: crypto.randomUUID(),
    language,
    word: it.word.trim(),
    reading: it.reading || '',
    meaningVi: it.meaningVi || '',
    example: it.example || '',
    source: source || '',
    createdAt: now(),
  }));
  if (records.length) await db.vocab.bulkAdd(records);
  return records;
}

/**
 * Lưu điểm ngữ pháp mới, bỏ qua mục trùng tên.
 */
export async function saveGrammarItems(items, language, source) {
  if (!items?.length) return [];
  const existing = await db.grammar.where('language').equals(language).toArray();
  const known = new Set(existing.map((g) => g.name.toLowerCase().trim()));
  const fresh = items.filter((it) => it.name && !known.has(it.name.toLowerCase().trim()));
  const records = fresh.map((it) => ({
    id: crypto.randomUUID(),
    language,
    name: it.name.trim(),
    pattern: it.pattern || '',
    explanationVi: it.explanationVi || '',
    example: it.example || '',
    source: source || '',
    createdAt: now(),
  }));
  if (records.length) await db.grammar.bulkAdd(records);
  return records;
}

/** Danh sách từ/ngữ pháp đã biết — gửi kèm cho AI để tránh ghi chú lặp lại. */
export async function getKnownItems(language) {
  const [vocab, grammar] = await Promise.all([
    db.vocab.where('language').equals(language).toArray(),
    db.grammar.where('language').equals(language).toArray(),
  ]);
  return {
    vocab: vocab.map((v) => v.word).slice(-150),
    grammar: grammar.map((g) => g.name).slice(-100),
  };
}

export async function createSession({ language, topic, videoUrl = '', practiceTargets = null }) {
  const id = crypto.randomUUID();
  await db.sessions.add({
    id,
    language,
    topic,
    videoUrl,
    videoTitle: '',
    videoContext: '',
    practiceTargets,
    messages: [],
    createdAt: now(),
    updatedAt: now(),
  });
  return id;
}

export async function updateSession(id, changes) {
  await db.sessions.update(id, { ...changes, updatedAt: now() });
}

/** Danh sách id các điểm ngữ pháp trong lộ trình đã được đánh dấu hoàn thành. */
export async function getCompletedTopicIds(language, trackKey) {
  const rows = await db.roadmap_progress
    .where('trackKey').equals(trackKey)
    .and((r) => r.language === language && r.completed)
    .toArray();
  return new Set(rows.map((r) => r.id.split('|')[2]));
}

/** Đánh dấu / bỏ đánh dấu hoàn thành một điểm ngữ pháp trong lộ trình. */
export async function setTopicComplete(language, trackKey, topicId, completed) {
  const id = `${language}|${trackKey}|${topicId}`;
  await db.roadmap_progress.put({
    id,
    language,
    trackKey,
    completed,
    completedAt: completed ? now() : null,
  });
}
