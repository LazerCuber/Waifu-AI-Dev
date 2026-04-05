import type { CoreMessage } from "ai";
import { atom } from "jotai";
import type { ChatSession } from "~/lib/db";

// Current chat state
export const messageHistoryAtom = atom<CoreMessage[]>([]);
export const lastMessageAtom = atom<CoreMessage | null>(null);
export const isLoadingAtom = atom(false);
export const displayedTextAtom = atom<string>('');

// Session management
export const currentSessionIdAtom = atom<string | null>(null);
export const chatSessionsAtom = atom<ChatSession[]>([]);

// UI state
export const sidebarOpenAtom = atom<boolean>(false);
export const isInitializedAtom = atom<boolean>(false);

// Emotion tracking for Live2D
export type Emotion = 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry' | 'thinking';
export const currentEmotionAtom = atom<Emotion>('neutral');

// Live2D interaction states
export const isHeadpatActiveAtom = atom<boolean>(false);
export const isPokedAtom = atom<boolean>(false);
export const interactionCooldownAtom = atom<boolean>(false);

// Derived atoms
export const currentSessionAtom = atom((get) => {
  const sessions = get(chatSessionsAtom);
  const currentId = get(currentSessionIdAtom);
  return sessions.find(s => s.id === currentId) || null;
});

export const hasMessagesAtom = atom((get) => {
  const messages = get(messageHistoryAtom);
  return messages.length > 0;
});
