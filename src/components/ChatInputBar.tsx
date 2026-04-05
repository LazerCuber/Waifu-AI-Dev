"use client";

import type { CoreMessage } from "ai";
import { useAtom } from "jotai";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Loader2 } from "lucide-react";
import { 
  isLoadingAtom, 
  lastMessageAtom, 
  messageHistoryAtom,
  currentSessionIdAtom,
  chatSessionsAtom,
  currentEmotionAtom,
  type Emotion,
} from "~/atoms/ChatAtom";
import { updateSession, createSession } from "~/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type SpeechRecognition = any;

export default function ChatInputBar() {
  const [messages, setMessages] = useAtom(messageHistoryAtom);
  const [, setLastMessage] = useAtom(lastMessageAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [currentSessionId, setCurrentSessionId] = useAtom(currentSessionIdAtom);
  const [sessions, setSessions] = useAtom(chatSessionsAtom);
  const [, setCurrentEmotion] = useAtom(currentEmotionAtom);
  
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isAudioContextReady, setIsAudioContextReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);

        let interimTranscript = "";
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        transcriptTimeoutRef.current = setTimeout(() => {
          setTranscript(interimTranscript || finalTranscript);
          if (finalTranscript) setInput((prev) => prev + finalTranscript);
        }, 100);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);
    };
  }, []);

  // Audio context setup
  useEffect(() => {
    const handleUserGesture = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
      setIsAudioContextReady(true);
    };

    ["click", "touchstart"].forEach((event) =>
      document.addEventListener(event, handleUserGesture)
    );

    return () => {
      ["click", "touchstart"].forEach((event) =>
        document.removeEventListener(event, handleUserGesture)
      );
      audioContextRef.current?.close();
      sourceNodeRef.current?.stop();
      sourceNodeRef.current?.disconnect();
      audioQueueRef.current = [];
      isPlayingRef.current = false;
    };
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setTranscript("");
      inputRef.current?.focus();
    }
    setIsListening((prev) => !prev);
  }, [isListening]);

  const synthesizeSentence = useCallback(async (sentence: string): Promise<AudioBuffer | null> => {
    try {
      const response = await fetch("/api/synthasize", {
        method: "POST",
        body: JSON.stringify({ message: { content: sentence, role: "assistant" } }),
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to synthesize: ${errorData.details || response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return await audioContextRef.current!.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error("synthesizeSentence error:", error);
      return null;
    }
  }, []);

  const playSentence = useCallback((audioBuffer: AudioBuffer): Promise<void> => {
    return new Promise((resolve) => {
      if (!audioContextRef.current) return resolve();
      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(console.error);
      }
      sourceNodeRef.current?.stop();
      sourceNodeRef.current?.disconnect();
      sourceNodeRef.current = audioContextRef.current.createBufferSource();
      sourceNodeRef.current.buffer = audioBuffer;
      sourceNodeRef.current.connect(audioContextRef.current.destination);
      sourceNodeRef.current.onended = () => resolve();
      sourceNodeRef.current.start();
    });
  }, []);

  const playNextSentence = useCallback(async (): Promise<void> => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    const audio = audioQueueRef.current.shift();
    if (audio) await playSentence(audio);
    playNextSentence();
  }, [playSentence]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    const newMessages: CoreMessage[] = [...messages, { content: input, role: "user" }];
    setMessages(newMessages);
    setInput("");
    setTranscript("");

    // Ensure we have a session
    let sessionId = currentSessionId;
    if (!sessionId) {
      const newSession = await createSession();
      setSessions((prev) => [newSession, ...prev]);
      sessionId = newSession.id;
      setCurrentSessionId(sessionId);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: newMessages }),
        headers: { "Content-Type": "application/json" },
      });
      const textResult = (await response.json()) as CoreMessage & { emotion?: string };
      
      // Extract and set emotion
      const emotionMatch = (textResult.content as string).match(/^\[(happy|sad|surprised|angry|neutral|thinking)\]/i);
      if (emotionMatch) {
        setCurrentEmotion(emotionMatch[1].toLowerCase() as Emotion);
      }
      
      setLastMessage(textResult);
      const updatedMessages = [...newMessages, textResult];
      setMessages(updatedMessages);
      setIsLoading(false);

      // Save to IndexedDB
      if (sessionId) {
        const updated = await updateSession(sessionId, { messages: updatedMessages });
        if (updated) {
          setSessions((prev) =>
            prev.map((s) => (s.id === sessionId ? updated : s))
          );
        }
      }

      // Synthesize and play audio
      if (typeof textResult.content === "string") {
        const cleanContent = textResult.content.replace(/^\[(happy|sad|surprised|angry|neutral|thinking)\]/i, "").trim();
        const sentences = cleanContent.match(/[^.!?]+[.!?]+|\S+/g) || [];
        for (const sentence of sentences) {
          const buffer = await synthesizeSentence(sentence.trim());
          if (buffer) {
            audioQueueRef.current.push(buffer);
            if (!isPlayingRef.current && isAudioContextReady) {
              isPlayingRef.current = true;
              playNextSentence();
            }
          }
        }
      }
    } catch (error) {
      console.error("handleSubmit error:", error);
      setIsLoading(false);
    }
  }, [
    messages,
    input,
    currentSessionId,
    setMessages,
    setLastMessage,
    setIsLoading,
    setCurrentSessionId,
    setSessions,
    setCurrentEmotion,
    synthesizeSentence,
    playNextSentence,
    isAudioContextReady,
    isLoading,
  ]);

  const showPlaceholder = isListening ? transcript || "Listening..." : "Type a message...";

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-20">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div
          className={`
            flex items-center gap-2 rounded-2xl glass p-2 transition-all duration-300
            ${isFocused || input ? "shadow-lg ring-2 ring-primary/20" : "shadow-md"}
          `}
        >
          {/* Microphone button */}
          <motion.button
            type="button"
            onClick={toggleListening}
            disabled={isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors focus-ring
              ${isListening 
                ? "bg-destructive/10 text-destructive" 
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
              }
            `}
            aria-label={isListening ? "Stop listening" : "Start listening"}
          >
            <AnimatePresence mode="wait">
              {isListening ? (
                <motion.div
                  key="mic-off"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <MicOff className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="mic-on"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Mic className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                handleSubmit(e as any);
              }
            }}
            placeholder={showPlaceholder}
            disabled={isLoading}
            className="flex-1 bg-transparent px-2 py-2 text-foreground placeholder:text-muted-foreground outline-none"
            aria-label="Chat input"
          />

          {/* Send button */}
          <motion.button
            type="submit"
            disabled={isLoading || !input.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`
              flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors focus-ring
              ${input.trim() 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "bg-muted text-muted-foreground"
              }
            `}
            aria-label="Send message"
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  exit={{ scale: 0 }}
                  transition={{ rotate: { repeat: Infinity, duration: 1, ease: "linear" } }}
                >
                  <Loader2 className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Send className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.form>

      {/* Listening indicator */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2"
          >
            <div className="flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs text-destructive font-medium">Recording</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
