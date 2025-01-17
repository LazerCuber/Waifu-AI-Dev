"use client";

import type { CoreMessage } from "ai";
import { useAtom } from "jotai";
import { useEffect, useRef, useState, useCallback, useDeferredValue } from "react";
import { IoSend } from "react-icons/io5";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { isLoadingAtom, lastMessageAtom, messageHistoryAtom } from "~/atoms/ChatAtom";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}

export default function ChatInput() {
  const [messages, setMessages] = useAtom(messageHistoryAtom);
  const [lastMessage, setLastMessage] = useAtom(lastMessageAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [input, setInput] = useState("");
  const deferredInput = useDeferredValue(input);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAudioContextReady, setIsAudioContextReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const windowWithSpeech = window as unknown as IWindow;
      const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');
          setInput(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      inputRef.current?.focus(); // Automatically focus on input field
    }
  }, [isListening]);

  useEffect(() => {
    const handleUserGesture = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      setIsAudioContextReady(true);
    };

    const events = ['click', 'touchstart'];
    events.forEach(event => document.addEventListener(event, handleUserGesture));

    return () => {
      events.forEach(event => document.removeEventListener(event, handleUserGesture));
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      }
      audioQueueRef.current = [];
      isPlayingRef.current = false;
    };
  }, []);

  const synthesizeSentence = useCallback(async (sentence: string): Promise<AudioBuffer | null> => {
    try {
      const response = await fetch("/api/synthasize", {
        method: "POST",
        body: JSON.stringify({ message: { content: sentence, role: "assistant" } }),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`Failed to synthesize: ${response.statusText}`);
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
    if (!input.trim()) return;

    setIsLoading(true);
    const newMessages: CoreMessage[] = [...messages, { content: input, role: "user" }];
    setMessages(newMessages);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
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
            playNextSentence();
          }
        }
      }
    } catch (error) {
      console.error("handleSubmit error:", error);
      alert("An error occurred while sending your message.");
      setIsLoading(false);
    }
  }, [messages, input, setMessages, setLastMessage, setIsLoading, synthesizeSentence, playNextSentence, isAudioContextReady]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(new Event('submit') as any);
    }
  };

  return (
    <div className="absolute bottom-10 h-10 w-full max-w-lg px-5" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <form onSubmit={handleSubmit}>
        <div className={`flex w-full items-center overflow-hidden rounded-[12px] bg-white shadow transition-all duration-300 ${isHovered || input ? 'border-[rgb(196,191,228)] shadow-lg scale-105' : 'border-transparent'} border-2`}>
          <div className="flex h-full items-center justify-center px-4">
            <button 
              type="button" 
              onClick={toggleListening}
              disabled={isLoading}
              aria-label={isListening ? "Stop listening" : "Start listening"}
              className={`p-1 rounded-full ${isListening ? 'bg-red-100' : 'hover:bg-gray-100'}`}
            >
              {isListening ? (
                <FaMicrophoneSlash className="text-red-500" />
              ) : (
                <FaMicrophone className="text-gray-500 hover:text-gray-700" />
              )}
            </button>
          </div>
          <input
            ref={inputRef}
            className="h-full flex-1 px-2 py-2 text-neutral-800 outline-none"
            type="text"
            placeholder="Enter your message..."
            onChange={(e) => setInput(e.target.value)}
            value={input}
            onKeyDown={handleKeyDown}
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