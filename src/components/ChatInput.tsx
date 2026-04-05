"use client";

import type { CoreMessage } from "ai";
import { useAtom } from "jotai";
import { useEffect, useRef, useState, useCallback } from "react";
import { isLoadingAtom, lastMessageAtom, messageHistoryAtom } from "~/atoms/ChatAtom";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type SpeechRecognition = any;

export default function ChatInput() {
  const [messages, setMessages] = useAtom(messageHistoryAtom);
  const [, setLastMessage] = useAtom(lastMessageAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
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

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);
        
        let interimTranscript = '', finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          else interimTranscript += event.results[i][0].transcript;
        }

        transcriptTimeoutRef.current = setTimeout(() => {
          setTranscript(interimTranscript || finalTranscript);
          if (finalTranscript) setInput(prev => prev + finalTranscript);
        }, 100);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleUserGesture = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
      setIsAudioContextReady(true);
    };
    ['click', 'touchstart'].forEach(event => document.addEventListener(event, handleUserGesture));
    return () => {
      ['click', 'touchstart'].forEach(event => document.removeEventListener(event, handleUserGesture));
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
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    if (isListening) recognitionRef.current.stop();
    else {
      recognitionRef.current.start();
      setTranscript("");
      inputRef.current?.focus();
    }
    setIsListening(prev => !prev);
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
      if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume().catch(console.error);
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
  
      if (typeof textResult.content === 'string') {
        const sentences = textResult.content.match(/[^.!?]+[.!?]+|\S+/g) || [];
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
      alert("An error occurred while sending your message.");
      setIsLoading(false);
    }
  }, [messages, input, setMessages, setLastMessage, setIsLoading, synthesizeSentence, playNextSentence, isAudioContextReady, isLoading]);

  const showActive = isFocused || input || isListening;

  return (
    <div className="absolute bottom-8 w-full max-w-md px-6 z-20">
      <form onSubmit={handleSubmit}>
        <div 
          className={`
            flex items-center gap-3 px-4 py-3
            border border-white/10
            rounded-2xl
            transition-all duration-300 ease-out
            ${showActive ? 'border-white/30 shadow-lg shadow-black/5' : ''}
          `}
        >
          {/* Mic Button */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={isLoading}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            className={`
              flex items-center justify-center
              w-8 h-8 rounded-full
              transition-all duration-200
              ${isListening 
                ? 'bg-red-500/20 text-red-400' 
                : 'text-white/50 hover:text-white/80 hover:bg-white/10'
              }
            `}
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </button>

          {/* Input */}
          <input
            ref={inputRef}
            className="
              flex-1 bg-transparent
              text-white/90 text-sm
              placeholder:text-white/40
              outline-none
            "
            type="text"
            placeholder={isListening ? (transcript || "Listening...") : "Message..."}
            value={input}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSubmit(e as any)}
            disabled={isLoading}
            aria-label="Chat input"
          />

          {/* Send Button */}
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()} 
            aria-label="Send message"
            className={`
              flex items-center justify-center
              w-8 h-8 rounded-full
              transition-all duration-200
              ${input.trim() 
                ? 'bg-white/20 text-white hover:bg-white/30' 
                : 'text-white/30 cursor-not-allowed'
              }
            `}
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="m5 12 7-7 7 7"/>
                <path d="M12 19V5"/>
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
