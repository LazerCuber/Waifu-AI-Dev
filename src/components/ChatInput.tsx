"use client";

import type { CoreMessage } from "ai";
import { useAtom } from "jotai";
import { useEffect, useRef, useState, useCallback } from "react";
import { IoSend } from "react-icons/io5";
import { isLoadingAtom, lastMessageAtom, messageHistoryAtom } from "~/atoms/ChatAtom";

const API_SYNTHESIZE = "/api/synthasize";
const API_CHAT = "/api/chat";

export const dynamic = "force-dynamic";

const ChatInput: React.FC = () => {
  const [messages, setMessages] = useAtom(messageHistoryAtom);
  const [lastMessage, setLastMessage] = useAtom(lastMessageAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [input, setInput] = useState("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAudioContextReady, setIsAudioContextReady] = useState(false);

  useEffect(() => {
    const handleUserGesture = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume().catch(console.error);
      }
      setIsAudioContextReady(true);
    };

    document.addEventListener('click', handleUserGesture);
    document.addEventListener('touchstart', handleUserGesture);
    return () => {
      document.removeEventListener('click', handleUserGesture);
      document.removeEventListener('touchstart', handleUserGesture);
      audioContextRef.current?.close().catch(console.error);
    };
  }, []);

  const synthesizeSentence = useCallback(async (sentence: string): Promise<AudioBuffer | null> => {
    try {
      const response = await fetch(API_SYNTHESIZE, {
        method: "POST",
        body: JSON.stringify({ message: { content: sentence, role: "assistant" } }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Failed to synthesize: ${response.statusText}`);
      return await audioContextRef.current!.decodeAudioData(await response.arrayBuffer());
    } catch (error) {
      console.error("synthesizeSentence error:", error);
      return null;
    }
  }, []);

  const playSentence = useCallback((audioBuffer: AudioBuffer): Promise<void> => new Promise((resolve) => {
    if (!audioContextRef.current) return resolve();
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(console.error);
    }
    sourceNodeRef.current?.stop();
    sourceNodeRef.current?.disconnect();
    sourceNodeRef.current = audioContextRef.current.createBufferSource();
    sourceNodeRef.current.buffer = audioBuffer;
    sourceNodeRef.current.connect(audioContextRef.current.destination);
    sourceNodeRef.current.onended = () => resolve();
    sourceNodeRef.current.start();
  }), []);

  const playAudioQueue = useCallback(async (): Promise<void> => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    const audio = audioQueueRef.current.shift();
    if (audio) {
      await playSentence(audio);
      playAudioQueue();
    }
  }, [playSentence]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const newMessages: CoreMessage[] = [...messages, { content: input, role: "user" }];
    setMessages(newMessages);
    setInput("");

    try {
      const response = await fetch(API_CHAT, {
        method: "POST",
        body: JSON.stringify({ messages: newMessages }),
        headers: { "Content-Type": "application/json" },
      });
      const textResult = (await response.json()) as CoreMessage;
      setLastMessage(textResult);
      setMessages([...newMessages, textResult]);
      setIsLoading(false);

      if (typeof textResult.content !== 'string') return;

      const sentences = textResult.content.split(/(?<=\.|\?|!)/).map(s => s.trim()).filter(Boolean);
      for (const sentence of sentences) {
        const audioBuffer = await synthesizeSentence(sentence);
        if (audioBuffer) {
          audioQueueRef.current.push(audioBuffer);
          if (!isPlayingRef.current && isAudioContextReady) {
            isPlayingRef.current = true;
            playAudioQueue();
          }
        }
      }
    } catch (error) {
      console.error("handleSubmit error:", error);
      alert("An error occurred while sending your message.");
      setIsLoading(false);
    }
  }, [messages, input, setMessages, setLastMessage, setIsLoading, synthesizeSentence, playAudioQueue, isAudioContextReady]);

  return (
    <div className="absolute bottom-10 h-10 w-full max-w-lg px-5" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <form onSubmit={handleSubmit}>
        <div className={`flex w-full items-center overflow-hidden rounded-[12px] bg-white shadow transition-all duration-300 ${isHovered || input ? 'border-[rgb(196,191,228)] shadow-lg scale-105' : 'border-transparent'} border-2`}>
          <input
            className="h-full flex-1 px-5 py-2 pr-0 text-neutral-800 outline-none"
            type="text"
            placeholder="Enter your message..."
            onChange={(e) => setInput(e.target.value)}
            value={input}
            disabled={isLoading}
            aria-label="Chat input"
          />
          <div className="flex h-full items-center justify-center px-4">
            <button type="submit" disabled={isLoading} aria-label="Send message">
              <IoSend className="text-blue-400 transition-colors hover:text-blue-500" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ChatInput;