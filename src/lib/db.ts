import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CoreMessage } from 'ai';

export interface ChatSession {
  id: string;
  title: string;
  messages: CoreMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface WaifuDB extends DBSchema {
  chatSessions: {
    key: string;
    value: ChatSession;
    indexes: { 'by-updated': Date };
  };
}

const DB_NAME = 'waifu-ai-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<WaifuDB> | null = null;

async function getDB(): Promise<IDBPDatabase<WaifuDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<WaifuDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore('chatSessions', { keyPath: 'id' });
      store.createIndex('by-updated', 'updatedAt');
    },
  });
  
  return dbInstance;
}

export async function getAllSessions(): Promise<ChatSession[]> {
  const db = await getDB();
  const sessions = await db.getAllFromIndex('chatSessions', 'by-updated');
  return sessions.reverse(); // Most recent first
}

export async function getSession(id: string): Promise<ChatSession | undefined> {
  const db = await getDB();
  return db.get('chatSessions', id);
}

export async function createSession(title?: string): Promise<ChatSession> {
  const db = await getDB();
  const now = new Date();
  const session: ChatSession = {
    id: crypto.randomUUID(),
    title: title || 'New Chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.put('chatSessions', session);
  return session;
}

export async function updateSession(
  id: string,
  updates: Partial<Pick<ChatSession, 'title' | 'messages'>>
): Promise<ChatSession | undefined> {
  const db = await getDB();
  const session = await db.get('chatSessions', id);
  
  if (!session) return undefined;
  
  const updated: ChatSession = {
    ...session,
    ...updates,
    updatedAt: new Date(),
  };
  
  // Auto-generate title from first user message if still "New Chat"
  if (updated.title === 'New Chat' && updated.messages.length > 0) {
    const firstUserMessage = updated.messages.find(m => m.role === 'user');
    if (firstUserMessage && typeof firstUserMessage.content === 'string') {
      updated.title = firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
    }
  }
  
  await db.put('chatSessions', updated);
  return updated;
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('chatSessions', id);
}

export async function clearAllSessions(): Promise<void> {
  const db = await getDB();
  await db.clear('chatSessions');
}

// Helper to generate title from messages
export function generateTitleFromMessages(messages: CoreMessage[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (firstUserMessage && typeof firstUserMessage.content === 'string') {
    const content = firstUserMessage.content.trim();
    return content.slice(0, 50) + (content.length > 50 ? '...' : '');
  }
  return 'New Chat';
}
