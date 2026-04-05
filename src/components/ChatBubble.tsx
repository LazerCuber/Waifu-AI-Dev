"use client";

import { useAtom } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import { isLoadingAtom, lastMessageAtom, currentEmotionAtom } from "~/atoms/ChatAtom";

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-primary/60"
          animate={{
            y: [0, -4, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default function ChatBubble() {
  const [message] = useAtom(lastMessageAtom);
  const [isLoading] = useAtom(isLoadingAtom);
  const [emotion] = useAtom(currentEmotionAtom);

  // Clean message content by removing emotion tags
  const cleanMessage = message?.content
    ? (message.content as string).replace(/^\[(happy|sad|surprised|angry|neutral|thinking)\]/i, "").trim()
    : "";

  const shouldShow = isLoading || (message?.role === "assistant" && cleanMessage);

  return (
    <AnimatePresence mode="wait">
      {shouldShow && (
        <motion.div
          key={isLoading ? "loading" : "message"}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ 
            type: "spring", 
            damping: 20, 
            stiffness: 300,
            duration: 0.3 
          }}
          className="absolute top-8 left-1/2 -translate-x-1/2 z-20 max-w-xl w-full px-4"
        >
          <div className="glass rounded-2xl p-4 shadow-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-1">
                <TypingIndicator />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Optional emotion indicator */}
                {emotion !== "neutral" && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-xs text-muted-foreground capitalize">
                      {emotion}
                    </span>
                  </motion.div>
                )}
                
                {/* Message content */}
                <p className="text-center text-foreground font-medium leading-relaxed text-balance">
                  {cleanMessage}
                </p>
              </div>
            )}
          </div>
          
          {/* Speech bubble tail */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            <div className="h-4 w-4 rotate-45 glass border-r border-b border-border/50" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
