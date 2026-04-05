"use client";

import { useAtom } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PanelLeftClose, 
  PanelLeft, 
  Plus, 
  MessageSquare, 
  Trash2,
  Settings,
} from "lucide-react";
import { 
  sidebarOpenAtom, 
  chatSessionsAtom, 
  currentSessionIdAtom,
  messageHistoryAtom,
  lastMessageAtom,
} from "~/atoms/ChatAtom";
import { createSession, deleteSession, getAllSessions, getSession } from "~/lib/db";
import { useCallback, useEffect } from "react";
import ChatHistoryItem from "./ChatHistoryItem";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useAtom(sidebarOpenAtom);
  const [sessions, setSessions] = useAtom(chatSessionsAtom);
  const [currentSessionId, setCurrentSessionId] = useAtom(currentSessionIdAtom);
  const [, setMessages] = useAtom(messageHistoryAtom);
  const [, setLastMessage] = useAtom(lastMessageAtom);

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      const loadedSessions = await getAllSessions();
      setSessions(loadedSessions);
      
      // If no current session but sessions exist, load the most recent
      if (!currentSessionId && loadedSessions.length > 0) {
        const mostRecent = loadedSessions[0];
        if (mostRecent) {
          setCurrentSessionId(mostRecent.id);
          setMessages(mostRecent.messages);
          if (mostRecent.messages.length > 0) {
            const lastMsg = mostRecent.messages[mostRecent.messages.length - 1];
            if (lastMsg?.role === 'assistant') {
              setLastMessage(lastMsg);
            }
          }
        }
      }
    };
    loadSessions();
  }, [currentSessionId, setCurrentSessionId, setMessages, setLastMessage, setSessions]);

  const handleNewChat = useCallback(async () => {
    const session = await createSession();
    setSessions(prev => [session, ...prev]);
    setCurrentSessionId(session.id);
    setMessages([]);
    setLastMessage(null);
  }, [setCurrentSessionId, setMessages, setLastMessage, setSessions]);

  const handleSelectSession = useCallback(async (id: string) => {
    const session = await getSession(id);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      if (session.messages.length > 0) {
        const lastMsg = session.messages[session.messages.length - 1];
        if (lastMsg?.role === 'assistant') {
          setLastMessage(lastMsg);
        } else {
          setLastMessage(null);
        }
      } else {
        setLastMessage(null);
      }
    }
  }, [setCurrentSessionId, setMessages, setLastMessage]);

  const handleDeleteSession = useCallback(async (id: string) => {
    await deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    
    // If we deleted the current session, switch to another or create new
    if (currentSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      if (remaining.length > 0 && remaining[0]) {
        handleSelectSession(remaining[0].id);
      } else {
        handleNewChat();
      }
    }
  }, [currentSessionId, sessions, handleSelectSession, handleNewChat, setSessions]);

  return (
    <>
      {/* Toggle Button - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg glass hover:bg-accent transition-colors focus-ring"
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isOpen ? (
          <PanelLeftClose className="h-5 w-5 text-foreground" />
        ) : (
          <PanelLeft className="h-5 w-5 text-foreground" />
        )}
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-foreground/10 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 z-40 flex h-full w-72 flex-col glass-strong"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 p-4 pt-16">
              <h2 className="text-lg font-semibold text-foreground">Chats</h2>
              <button
                onClick={handleNewChat}
                className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors focus-ring"
                aria-label="New chat"
              >
                <Plus className="h-5 w-5 text-foreground" />
              </button>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No chats yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Start a new conversation
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {sessions.map((session) => (
                    <ChatHistoryItem
                      key={session.id}
                      session={session}
                      isActive={session.id === currentSessionId}
                      onSelect={() => handleSelectSession(session.id)}
                      onDelete={() => handleDeleteSession(session.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/50 p-4">
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-ring"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
