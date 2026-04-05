"use client";

import { useEffect, useState, useCallback } from "react";
import { useAtom } from "jotai";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "~/components/Sidebar";
import ChatInputBar from "~/components/ChatInputBar";
import ChatBubble from "~/components/ChatBubble";
import { 
  isInitializedAtom, 
  currentSessionIdAtom, 
  chatSessionsAtom 
} from "~/atoms/ChatAtom";
import { createSession, getAllSessions } from "~/lib/db";

// Dynamic import for Live2D model (client-side only)
const Model = dynamic(() => import("~/components/Model"), { 
  ssr: false,
  loading: () => <ModelLoader />
});

function ModelLoader() {
  return (
    <div className="flex items-center justify-center">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-primary/60"
            animate={{
              y: [0, -8, 0],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Background() {
  return (
    <div className="fixed inset-0 z-0">
      {/* Gradient background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-soft-pink/30 via-background to-soft-blue/30"
      />
      {/* Optional background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url(/one.avif)" }}
      />
      {/* Subtle noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4xIi8+PC9zdmc+')]" />
    </div>
  );
}

export default function Page() {
  const [ready, setReady] = useState(false);
  const [isInitialized, setIsInitialized] = useAtom(isInitializedAtom);
  const [currentSessionId, setCurrentSessionId] = useAtom(currentSessionIdAtom);
  const [, setSessions] = useAtom(chatSessionsAtom);

  // Load Live2D Cubism SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/live2dcubismcore.min.js";
    script.defer = true;
    script.onload = () => setReady(true);
    script.onerror = () => console.error("Failed to load Live2D Cubism SDK");
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Initialize chat session
  useEffect(() => {
    const initializeSession = async () => {
      if (isInitialized) return;
      
      const sessions = await getAllSessions();
      setSessions(sessions);
      
      if (sessions.length === 0) {
        // Create initial session
        const newSession = await createSession("Welcome Chat");
        setSessions([newSession]);
        setCurrentSessionId(newSession.id);
      } else if (!currentSessionId && sessions[0]) {
        setCurrentSessionId(sessions[0].id);
      }
      
      setIsInitialized(true);
    };

    initializeSession();
  }, [isInitialized, currentSessionId, setCurrentSessionId, setIsInitialized, setSessions]);

  return (
    <main className="relative flex h-screen w-full flex-col overflow-hidden">
      <Background />
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
        {/* Live2D Model Container */}
        <div className="relative flex h-full w-full items-center justify-center">
          <AnimatePresence mode="wait">
            {!ready ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <ModelLoader />
                <p className="text-sm text-muted-foreground">Loading model...</p>
              </motion.div>
            ) : (
              <motion.div
                key="model"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative h-full w-full"
              >
                {/* Speech Bubble */}
                <ChatBubble />
                
                {/* Live2D Model */}
                <Model />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Chat Input Bar */}
        <ChatInputBar />
      </div>
    </main>
  );
}
