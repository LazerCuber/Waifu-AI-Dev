"use client";

import type { CoreMessage } from "ai";
import { useAtom } from "jotai";
import { useEffect, useRef, useState, useCallback } from "react";
import { IoSend } from "react-icons/io5";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { isLoadingAtom, lastMessageAtom, messageHistoryAtom } from "~/atoms/ChatAtom";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type SpeechRecognition = any;

export default function ChatInput() {
  const [messages, setMessages] = useAtom(messageHistoryAtom);
  const [lastMessage, setLastMessage] = useAtom(lastMessageAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [input, setInput] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [isAudioContextReady, setIsAudioContextReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        setTranscript(interimTranscript || finalTranscript);
        if (finalTranscript) setInput(prev => prev + finalTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
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

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
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
        const batchSize = 5;
        for (let i = 0; i < sentences.length; i += batchSize) {
          const batch = sentences.slice(i, i + batchSize);
          const audioBuffers = await Promise.all(batch.map(sentence => synthesizeSentence(sentence.trim())));
          
          audioBuffers.forEach(buffer => {
            if (buffer) {
              audioQueueRef.current.push(buffer);
              if (!isPlayingRef.current && isAudioContextReady) {
                isPlayingRef.current = true;
                playNextSentence();
              }
            }
          });
        }
      }
    } catch (error) {
      console.error("handleSubmit error:", error);
      alert("An error occurred while sending your message.");
      setIsLoading(false);
    }
  }, [messages, input, setMessages, setLastMessage, setIsLoading, synthesizeSentence, playNextSentence, isAudioContextReady]);

  return (
    <div className="absolute bottom-10 h-10 w-full max-w-lg px-5" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <form onSubmit={handleSubmit}>
        <div className={`flex w-full items-center overflow-hidden rounded-[12px] bg-white shadow transition-all duration-300 ${isHovered || input ? 'border-[rgb(196,191,228)] shadow-lg scale-105' : 'border-transparent'} border-2`}>
          <button
            type="button"
            onClick={toggleListening}
            disabled={isLoading}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            className={`p-1 rounded-full ${isListening ? 'bg-red-100' : 'hover:bg-gray-100'} mx-4`}
          >
            {isListening ? <FaMicrophoneSlash className="text-red-500" /> : <FaMicrophone className="text-gray-500 hover:text-gray-700" />}
          </button>
          <input
            ref={inputRef}
            className="h-full w-full px-2 py-2 text-neutral-800 outline-none"
            type="text"
            placeholder={isListening ? transcript || "Listening..." : "Enter your message..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSubmit(e as any)}
            disabled={isLoading}
            aria-label="Chat input"
          />
          <button type="submit" disabled={isLoading} aria-label="Send message" className="mx-4">
            <IoSend className="text-blue-400 transition-colors hover:text-blue-500" />
          </button>
        </div>
      </form>
    </div>
  );
}